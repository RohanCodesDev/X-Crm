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
