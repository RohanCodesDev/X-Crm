const { Router } = require("express");
const { authenticateUser } = require("../middleware/auth");
const { requireFormAccess } = require("../middleware/formAccess");
const prisma = require("../lib/prisma");
const { fetchCsvFromSheet, upsertRespondentsFromRows } = require("../lib/formSync");
const { sendEmailMessage, verifyMailerConnection } = require("../sendemail/service");
const {
  renderTemplate,
  htmlToText,
  extractTemplateVariables,
  buildTemplateVariablesForRespondent
} = require("../sendemail/template");

const router = Router();

router.use(authenticateUser);

router.get("/health", async (_req, res) => {
  try {
    await verifyMailerConnection();
    return res.status(200).json({ status: "ok", service: "sendemail" });
  } catch (error) {
    return res.status(503).json({ status: "error", message: error.message });
  }
});

router.post("/send", async (req, res) => {
  try {
    const result = await sendEmailMessage(req.body || {});
    return res.status(200).json({ message: "Email sent", result });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/certificate", async (req, res) => {
  try {
    const {
      to,
      cc,
      bcc,
      subject,
      replyTo,
      variables,
      certificateTemplateHtml,
      emailTemplateHtml,
      emailTemplateText,
      certificateFilename,
      certificateContentType,
      certificateBase64
    } = req.body || {};

    if (!to || !subject || !emailTemplateHtml || !certificateTemplateHtml) {
      return res.status(400).json({
        message:
          "to, subject, emailTemplateHtml and certificateTemplateHtml are required."
      });
    }

    const renderedCertificate = renderTemplate(certificateTemplateHtml, variables);

    const attachments = [];

    if (certificateBase64) {
      attachments.push({
        filename: certificateFilename || "certificate.pdf",
        content: certificateBase64,
        encoding: "base64",
        contentType: certificateContentType || "application/pdf"
      });
    } else {
      attachments.push({
        filename: certificateFilename || "certificate.html",
        content: renderedCertificate,
        contentType: certificateContentType || "text/html"
      });
    }

    const result = await sendEmailMessage({
      to,
      cc,
      bcc,
      subject,
      replyTo,
      templateHtml: emailTemplateHtml,
      templateText: emailTemplateText || htmlToText(emailTemplateHtml),
      variables,
      attachments
    });

    return res.status(200).json({
      message: "Certificate email sent",
      certificateAttachedAs: certificateBase64 ? "base64-file" : "html-file",
      result
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

router.post("/forms/:id/send", requireFormAccess("VIEW"), async (req, res) => {
  try {
    const formId = String(req.params.id || "");
    const {
      subject,
      templateHtml,
      templateText,
      globalVariables,
      syncBeforeSend = true,
      dryRun = false,
      strictVariables = true,
      limit,
      from,
      replyTo,
      cc,
      bcc
    } = req.body || {};

    if (!subject || !templateHtml) {
      return res.status(400).json({ message: "subject and templateHtml are required." });
    }

    const form = await prisma.formConnection.findUnique({ where: { id: formId } });
    if (!form) {
      return res.status(404).json({ message: "Form connection not found" });
    }

    if (syncBeforeSend) {
      const syncRun = await prisma.syncRun.create({
        data: {
          formConnectionId: form.id,
          status: "running"
        }
      });

      try {
        const { headers, rows } = await fetchCsvFromSheet({
          sheetId: form.sheetId,
          sheetName: form.sheetName
        });

        const importedCount = await upsertRespondentsFromRows({
          prisma,
          formConnectionId: form.id,
          headers,
          rows
        });

        await prisma.formConnection.update({
          where: { id: form.id },
          data: { lastSyncedAt: new Date() }
        });

        await prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "success",
            importedCount,
            completedAt: new Date()
          }
        });
      } catch (syncError) {
        await prisma.syncRun.update({
          where: { id: syncRun.id },
          data: {
            status: "failed",
            errorMessage: syncError.message,
            completedAt: new Date()
          }
        });

        return res.status(400).json({
          message: `Could not sync latest form rows before email send: ${syncError.message}`
        });
      }
    }

    const take = Number(limit || 0) > 0 ? Number(limit) : undefined;
    const respondents = await prisma.respondent.findMany({
      where: {
        formConnectionId: form.id,
        email: { not: null }
      },
      orderBy: { sourceRowNumber: "asc" },
      ...(take ? { take } : {})
    });

    if (!respondents.length) {
      return res.status(400).json({
        message: "No respondents with email found. Sync form data first and ensure an email column exists."
      });
    }

    const placeholders = extractTemplateVariables(`${subject}\n${templateHtml}\n${templateText || ""}`);
    const sampleVariables = buildTemplateVariablesForRespondent({
      respondent: respondents[0],
      form,
      globalVariables
    });

    const missingVariables = placeholders.filter((key) => !(key in sampleVariables));
    if (strictVariables && missingVariables.length > 0) {
      return res.status(400).json({
        message: "Some template variables are not available from form data.",
        missingVariables,
        availableVariablesPreview: Object.keys(sampleVariables).slice(0, 50)
      });
    }

    if (dryRun) {
      const preview = respondents.slice(0, 3).map((respondent) => {
        const variables = buildTemplateVariablesForRespondent({
          respondent,
          form,
          globalVariables
        });

        return {
          respondentId: respondent.id,
          to: respondent.email,
          renderedSubject: renderTemplate(subject, variables),
          renderedHtmlSample: renderTemplate(templateHtml, variables).slice(0, 500)
        };
      });

      return res.status(200).json({
        message: "Dry run complete",
        formId: form.id,
        recipientsFound: respondents.length,
        placeholders,
        missingVariables,
        preview
      });
    }

    let sentCount = 0;
    const failures = [];

    for (const respondent of respondents) {
      const variables = buildTemplateVariablesForRespondent({
        respondent,
        form,
        globalVariables
      });

      try {
        await sendEmailMessage({
          to: respondent.email,
          subject,
          templateHtml,
          templateText,
          variables,
          from,
          replyTo,
          cc,
          bcc
        });
        sentCount += 1;
      } catch (error) {
        failures.push({
          respondentId: respondent.id,
          to: respondent.email,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: "Form email run completed",
      formId: form.id,
      recipientsTried: respondents.length,
      sentCount,
      failedCount: failures.length,
      failures
    });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
});

module.exports = router;