const { Router } = require("express");
const prisma = require("../lib/prisma");

const router = Router();

router.use((_req, res, next) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      message: "DATABASE_URL is missing. Add it in backend/.env before using CRM APIs."
    });
  }

  return next();
});

function parseCsv(csvText) {
  const lines = csvText
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
  const entries = Object.entries(rowData);
  const emailEntry = entries.find(([key]) => key.toLowerCase().includes("email"));
  return emailEntry ? emailEntry[1] : null;
}

function inferName(rowData) {
  const entries = Object.entries(rowData);
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

    let importedCount = 0;

    for (let i = 0; i < rows.length; i += 1) {
      const rowValues = rows[i];
      const sourceRowNumber = i + 2;
      const rawData = {};

      for (let j = 0; j < headers.length; j += 1) {
        rawData[headers[j] || `field_${j + 1}`] = rowValues[j] || "";
      }

      const payload = {
        formConnectionId: form.id,
        sourceRowNumber,
        rawData,
        email: inferEmail(rawData),
        name: inferName(rawData)
      };

      await prisma.respondent.upsert({
        where: {
          formConnectionId_sourceRowNumber: {
            formConnectionId: form.id,
            sourceRowNumber
          }
        },
        create: payload,
        update: payload
      });

      importedCount += 1;
    }

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
