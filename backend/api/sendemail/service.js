const nodemailer = require("nodemailer");
const { htmlToText, renderTemplate } = require("./template");

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER and SMTP_PASS are required for email sending.");
  }

  return {
    host,
    port,
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: { user, pass }
  };
}

let cachedTransporter = null;

function getTransporter() {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport(getSmtpConfig());
  }

  return cachedTransporter;
}

function normalizeAttachments(attachments = []) {
  return attachments
    .filter(Boolean)
    .map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      path: attachment.path,
      encoding: attachment.encoding,
      contentType: attachment.contentType
    }))
    .filter((attachment) => attachment.content || attachment.path);
}

async function sendEmailMessage(payload) {
  const {
    to,
    cc,
    bcc,
    replyTo,
    subject,
    from,
    templateHtml,
    templateText,
    variables,
    attachments
  } = payload;

  if (!to || !subject || !templateHtml) {
    throw new Error("to, subject and templateHtml are required.");
  }

  const html = renderTemplate(templateHtml, variables);
  const text = templateText
    ? renderTemplate(templateText, variables)
    : htmlToText(html);

  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: from || process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    cc,
    bcc,
    replyTo,
    subject: renderTemplate(subject, variables),
    html,
    text,
    attachments: normalizeAttachments(attachments)
  });

  return {
    accepted: info.accepted,
    rejected: info.rejected,
    messageId: info.messageId,
    response: info.response
  };
}

async function verifyMailerConnection() {
  const transporter = getTransporter();
  await transporter.verify();
}

module.exports = {
  sendEmailMessage,
  verifyMailerConnection
};