function parseCsv(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length < 2) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((cell) => cell.trim()));

  return { headers, rows };
}

function inferEmail(rowData) {
  const entries = Object.entries(rowData || {});
  const emailEntry = entries.find(([key]) => key.toLowerCase().includes("email"));
  return emailEntry ? emailEntry[1] : null;
}

function inferName(rowData) {
  const entries = Object.entries(rowData || {});
  const nameEntry = entries.find(([key]) => key.toLowerCase().includes("name"));
  return nameEntry ? nameEntry[1] : null;
}

async function fetchCsvFromSheet({ sheetId, sheetName }) {
  const candidates = [
    {
      label: "gviz-with-sheet",
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
        sheetName || "Form Responses 1"
      )}`
    },
    {
      label: "gviz-default-sheet",
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`
    },
    {
      label: "export-gid-0",
      url: `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`
    }
  ];

  const errors = [];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate.url);
      const body = await response.text();

      if (!response.ok) {
        errors.push(`${candidate.label}: HTTP ${response.status}`);
        continue;
      }

      const { headers, rows } = parseCsv(body);

      if (headers.length === 0) {
        errors.push(`${candidate.label}: CSV had no header row`);
        continue;
      }

      return { csvText: body, headers, rows, source: candidate.label };
    } catch (error) {
      errors.push(`${candidate.label}: ${error.message}`);
    }
  }

  throw new Error(
    `Could not read sheet data. Check tab name and sharing. For this no-OAuth mode, set Google Sheet sharing to "Anyone with the link - Viewer". Diagnostics: ${errors.join(
      " | "
    )}`
  );
}

async function upsertRespondentsFromRows({ prisma, formConnectionId, headers, rows }) {
  let importedCount = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const rowValues = rows[i];
    const sourceRowNumber = i + 2;
    const rawData = {};

    for (let j = 0; j < headers.length; j += 1) {
      rawData[headers[j] || `field_${j + 1}`] = rowValues[j] || "";
    }

    const payload = {
      formConnectionId,
      sourceRowNumber,
      rawData,
      email: inferEmail(rawData),
      name: inferName(rawData)
    };

    await prisma.respondent.upsert({
      where: {
        formConnectionId_sourceRowNumber: {
          formConnectionId,
          sourceRowNumber
        }
      },
      create: payload,
      update: payload
    });

    importedCount += 1;
  }

  return importedCount;
}

module.exports = {
  fetchCsvFromSheet,
  upsertRespondentsFromRows
};