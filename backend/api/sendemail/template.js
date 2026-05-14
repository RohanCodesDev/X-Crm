function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toSnakeCase(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toCamelCase(input) {
  const snake = toSnakeCase(input);
  if (!snake) {
    return "";
  }

  return snake.replace(/_([a-z0-9])/g, (_m, c) => c.toUpperCase());
}

function renderTemplate(template, variables = {}) {
  if (!template) {
    return "";
  }

  let output = String(template);

  for (const [key, value] of Object.entries(variables)) {
    const pattern = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
    output = output.replace(pattern, value == null ? "" : String(value));
  }

  return output;
}

function htmlToText(html) {
  if (!html) {
    return "";
  }

  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTemplateVariables(template) {
  const source = String(template || "");
  const regex = /{{\s*([^{}]+?)\s*}}/g;
  const keys = new Set();
  let match = regex.exec(source);

  while (match) {
    keys.add(String(match[1] || "").trim());
    match = regex.exec(source);
  }

  return Array.from(keys);
}

function buildTemplateVariablesForRespondent({ respondent, form, globalVariables = {} }) {
  const rawData = respondent?.rawData && typeof respondent.rawData === "object" ? respondent.rawData : {};
  const variables = {
    ...globalVariables,
    formId: form?.id || respondent?.formConnectionId || "",
    formName: form?.name || "",
    respondentId: respondent?.id || "",
    name: respondent?.name || "",
    email: respondent?.email || "",
    sourceRowNumber: respondent?.sourceRowNumber || ""
  };

  for (const [key, value] of Object.entries(rawData)) {
    const strValue = value == null ? "" : String(value);
    const snakeKey = toSnakeCase(key);
    const camelKey = toCamelCase(key);

    if (key) {
      variables[key] = strValue;
    }

    if (snakeKey) {
      variables[snakeKey] = strValue;
    }

    if (camelKey) {
      variables[camelKey] = strValue;
    }
  }

  return variables;
}

function wrapInPremiumTemplate(content) {
  const emailBody = String(content || "")
    .replace(/\n/g, "<br/>")
    .trim();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f8f9fa;
    }
    .email-wrapper {
      background-color: #f8f9fa;
      padding: 40px 20px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .email-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      text-align: center;
      color: white;
    }
    .email-body {
      padding: 32px 24px;
      color: #333333;
      line-height: 1.6;
      font-size: 15px;
    }
    .email-body p {
      margin: 0 0 16px 0;
    }
    .email-body br {
      display: block;
      margin: 8px 0;
    }
    .email-footer {
      background-color: #f8f9fa;
      padding: 24px;
      text-align: center;
      font-size: 13px;
      color: #666666;
      border-top: 1px solid #e9ecef;
    }
    .divider {
      height: 1px;
      background-color: #e9ecef;
      margin: 24px 0;
    }
    a {
      color: #667eea;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h2 style="margin: 0; font-size: 24px; font-weight: 600;">Message</h2>
      </div>
      <div class="email-body">
        ${emailBody}
      </div>
      <div class="email-footer">
        <p style="margin: 0;">This is an automated message. Please do not reply directly to this email.</p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

module.exports = {
  buildTemplateVariablesForRespondent,
  extractTemplateVariables,
  htmlToText,
  renderTemplate,
  wrapInPremiumTemplate
};