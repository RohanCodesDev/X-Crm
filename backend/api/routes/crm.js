const { Router } = require("express");
const prisma = require("../lib/prisma");
const { fetchCsvFromSheet, upsertRespondentsFromRows } = require("../lib/formSync");

const router = Router();

router.use((_req, res, next) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      message: "DATABASE_URL is missing. Add it in backend/.env before using CRM APIs."
    });
  }

  return next();
});

router.get("/forms", async (_req, res) => {
  try {
    const forms = await prisma.formConnection.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { respondents: true }
        }
      }
    });

    return res.status(200).json({ forms });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch forms", detail: error.message });
  }
});

router.post("/forms", async (req, res) => {
  const { name, sheetId, sheetName } = req.body || {};

  if (!name || !sheetId) {
    return res.status(400).json({ message: "name and sheetId are required" });
  }

  try {
    const form = await prisma.formConnection.create({
      data: {
        name,
        sheetId,
        sheetName: sheetName || "Form Responses 1"
      }
    });

    return res.status(201).json({ form });
  } catch (error) {
    return res.status(500).json({ message: "Could not create form connection", detail: error.message });
  }
});

router.post("/forms/:id/sync", async (req, res) => {
  const { id } = req.params;

  const form = await prisma.formConnection.findUnique({ where: { id } });
  if (!form) {
    return res.status(404).json({ message: "Form connection not found" });
  }

  const syncRun = await prisma.syncRun.create({
    data: {
      formConnectionId: form.id,
      status: "running"
    }
  });

  try {
    const { headers, rows, source } = await fetchCsvFromSheet({
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

    return res.status(200).json({ message: `Sync complete via ${source}`, importedCount });
  } catch (error) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: "failed",
        errorMessage: error.message,
        completedAt: new Date()
      }
    });

    return res.status(400).json({ message: error.message });
  }
});

router.get("/respondents", async (req, res) => {
  const { formId, q } = req.query;

  try {
    const respondents = await prisma.respondent.findMany({
      where: {
        ...(formId ? { formConnectionId: String(formId) } : {}),
        ...(q
          ? {
              OR: [
                { email: { contains: String(q), mode: "insensitive" } },
                { name: { contains: String(q), mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      include: {
        formConnection: {
          select: { id: true, name: true }
        }
      }
    });

    return res.status(200).json({ respondents });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch respondents", detail: error.message });
  }
});

router.get("/respondents/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const respondent = await prisma.respondent.findUnique({
      where: { id: String(id) },
      include: {
        formConnection: {
          select: {
            id: true,
            name: true,
            sheetName: true,
            status: true
          }
        }
      }
    });

    if (!respondent) {
      return res.status(404).json({ message: "Respondent not found" });
    }

    return res.status(200).json({ respondent });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch respondent details", detail: error.message });
  }
});

router.get("/campaigns/summary", async (_req, res) => {
  try {
    const [totalRespondents, emailableRespondents, forms] = await Promise.all([
      prisma.respondent.count(),
      prisma.respondent.count({
        where: {
          email: {
            not: null
          }
        }
      }),
      prisma.formConnection.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          _count: {
            select: { respondents: true }
          }
        }
      })
    ]);

    return res.status(200).json({
      totalRespondents,
      emailableRespondents,
      forms: forms.map((form) => ({
        id: form.id,
        name: form.name,
        respondents: form._count?.respondents || 0
      }))
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch campaign summary", detail: error.message });
  }
});

router.post("/campaigns/preview", async (req, res) => {
  const { campaignType = "blast", q, limit = 20 } = req.body || {};
  const safeLimit = Math.max(1, Math.min(Number(limit) || 20, 200));

  try {
    const recipientsCount = await prisma.respondent.count({
      where: {
        email: { not: null },
        ...(q
          ? {
              OR: [
                { email: { contains: String(q), mode: "insensitive" } },
                { name: { contains: String(q), mode: "insensitive" } }
              ]
            }
          : {})
      }
    });

    const sampleRecipients = await prisma.respondent.findMany({
      where: {
        email: { not: null },
        ...(q
          ? {
              OR: [
                { email: { contains: String(q), mode: "insensitive" } },
                { name: { contains: String(q), mode: "insensitive" } }
              ]
            }
          : {})
      },
      orderBy: { createdAt: "desc" },
      take: safeLimit,
      select: {
        id: true,
        name: true,
        email: true,
        formConnection: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const suggestedSubject =
      campaignType === "sequence"
        ? "Your next step after submitting the form"
        : "Quick update from our team";

    const suggestedCta =
      campaignType === "sequence"
        ? "Schedule your qualification call"
        : "Reply to this email to connect";

    return res.status(200).json({
      campaignType,
      recipientsCount,
      sampleRecipients,
      suggestedSubject,
      suggestedCta
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not prepare campaign preview", detail: error.message });
  }
});

router.delete("/forms/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.formConnection.findUnique({
      where: { id: String(id) },
      include: {
        _count: {
          select: {
            respondents: true,
            syncRuns: true,
            permissions: true
          }
        }
      }
    });

    if (!existing) {
      return res.status(404).json({ message: "Form connection not found" });
    }

    await prisma.formConnection.delete({ where: { id: existing.id } });

    return res.status(200).json({
      message: `Deleted ${existing.name}`,
      deletedRespondents: existing._count.respondents,
      deletedSyncRuns: existing._count.syncRuns,
      deletedPermissions: existing._count.permissions
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not delete form", detail: error.message });
  }
});

router.get("/stats", async (_req, res) => {
  try {
    const [formsCount, respondentsCount, syncRunsCount] = await Promise.all([
      prisma.formConnection.count(),
      prisma.respondent.count(),
      prisma.syncRun.count()
    ]);

    return res.status(200).json({
      connectedForms: formsCount,
      totalRespondents: respondentsCount,
      syncRuns: syncRunsCount,
      campaigns: 0
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch stats", detail: error.message });
  }
});

module.exports = router;
