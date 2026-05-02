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

module.exports = {
  buildTemplateVariablesForRespondent,
  extractTemplateVariables,
  htmlToText,
  renderTemplate
};