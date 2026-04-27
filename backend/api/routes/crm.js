const { Router } = require("express");
const prisma = require("../lib/prisma");
const { authenticateUser } = require("../middleware/auth");
const { requireFormAccess } = require("../middleware/formAccess");

const router = Router();

router.use(authenticateUser);

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

function isTransientDatabaseError(error) {
  const errorCode = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();

  return (
    errorCode === "P1001" ||
    message.includes("can't reach database server") ||
    message.includes("connection reset") ||
    message.includes("terminating connection")
  );
}

async function wait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function retryPrismaOperation(operation, attempts = 3) {
  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || i === attempts - 1) {
        throw error;
      }

      await wait(300 * (i + 1));
    }
  }

  throw lastError;
}

async function fetchValuesUsingGoogleSheetsApi({ sheetId, sheetName, googleAccessToken }) {
  const normalizedSheetName = String(sheetName || "Form Responses 1").replace(/'/g, "''");
  const range = `'${normalizedSheetName}'!A:ZZ`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${googleAccessToken}`
    }
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not fetch sheet values via Google Sheets API");
  }

  const values = Array.isArray(payload.values) ? payload.values : [];
  if (values.length < 1) {
    return { headers: [], rows: [], source: "google-sheets-api" };
  }

  const headers = values[0].map((value) => String(value || "").trim());
  const rows = values.slice(1).map((row) => row.map((value) => String(value || "").trim()));

  return { headers, rows, source: "google-sheets-api" };
}

async function fetchCsvFromSheet({ sheetId, sheetName, googleAccessToken }) {
  if (googleAccessToken) {
    try {
      const sheetValues = await fetchValuesUsingGoogleSheetsApi({
        sheetId,
        sheetName,
        googleAccessToken
      });

      if (sheetValues.headers.length > 0) {
        return sheetValues;
      }
    } catch (error) {
      throw new Error(
        `Google Sheets API access failed for this account. Ensure the signed-in Google account has access to this sheet and tab name is correct. Details: ${error.message}`
      );
    }
  }

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

router.get("/me", async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name
    }
  });
});

router.get("/forms", async (req, res) => {
  try {
    const forms = await prisma.formConnection.findMany({
      where: {
        permissions: {
          some: {
            userId: req.user.id
          }
        }
      },
      orderBy: { createdAt: "desc" },
      include: {
        permissions: {
          where: { userId: req.user.id },
          select: {
            accessLevel: true
          }
        },
        _count: {
          select: { respondents: true }
        }
      }
    });

    const hydratedForms = forms.map((form) => ({
      ...form,
      accessLevel: form.permissions?.[0]?.accessLevel || "VIEW"
    }));

    return res.status(200).json({ forms: hydratedForms });
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
    const form = await prisma.$transaction(async (tx) => {
      const created = await tx.formConnection.create({
        data: {
          name,
          sheetId,
          sheetName: sheetName || "Form Responses 1"
        }
      });

      await tx.formPermission.create({
        data: {
          userId: req.user.id,
          formConnectionId: created.id,
          accessLevel: "OWNER"
        }
      });

      return created;
    });

    return res.status(201).json({ form });
  } catch (error) {
    return res.status(500).json({ message: "Could not create form connection", detail: error.message });
  }
});

router.post("/forms/:id/sync", requireFormAccess("EDIT"), async (req, res) => {
  const { id } = req.params;
  const { googleAccessToken } = req.body || {};

  const form = await prisma.formConnection.findUnique({ where: { id } });
  if (!form) {
    return res.status(404).json({ message: "Form connection not found" });
  }

  const syncRun = await retryPrismaOperation(() =>
    prisma.syncRun.create({
      data: {
        formConnectionId: form.id,
        status: "running"
      }
    })
  );

  try {
    const { headers, rows, source } = await fetchCsvFromSheet({
      sheetId: form.sheetId,
      sheetName: form.sheetName,
      googleAccessToken: googleAccessToken ? String(googleAccessToken) : undefined
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

      await retryPrismaOperation(() =>
        prisma.respondent.upsert({
          where: {
            formConnectionId_sourceRowNumber: {
              formConnectionId: form.id,
              sourceRowNumber
            }
          },
          create: payload,
          update: payload
        })
      );

      importedCount += 1;
    }

    await retryPrismaOperation(() =>
      prisma.formConnection.update({
        where: { id: form.id },
        data: { lastSyncedAt: new Date() }
      })
    );

    await retryPrismaOperation(() =>
      prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "success",
          importedCount,
          completedAt: new Date()
        }
      })
    );

    return res.status(200).json({ message: `Sync complete via ${source}`, importedCount });
  } catch (error) {
    await retryPrismaOperation(() =>
      prisma.syncRun.update({
        where: { id: syncRun.id },
        data: {
          status: "failed",
          errorMessage: error.message,
          completedAt: new Date()
        }
      })
    );

    return res.status(400).json({ message: error.message });
  }
});

router.get("/forms/:id/access", requireFormAccess("OWNER"), async (req, res) => {
  const { id } = req.params;

  try {
    const permissions = await prisma.formPermission.findMany({
      where: { formConnectionId: id },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return res.status(200).json({ permissions });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch form access list", detail: error.message });
  }
});

router.post("/forms/:id/access", requireFormAccess("OWNER"), async (req, res) => {
  const { id } = req.params;
  const { email, accessLevel } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const level = String(accessLevel || "").toUpperCase();

  if (!normalizedEmail) {
    return res.status(400).json({ message: "email is required" });
  }

  if (!["VIEW", "EDIT"].includes(level)) {
    return res.status(400).json({ message: "accessLevel must be VIEW or EDIT" });
  }

  try {
    const targetUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!targetUser) {
      return res.status(404).json({
        message:
          "User not found. They must register or sign in at least once before access can be granted."
      });
    }

    const permission = await prisma.formPermission.upsert({
      where: {
        userId_formConnectionId: {
          userId: targetUser.id,
          formConnectionId: id
        }
      },
      create: {
        userId: targetUser.id,
        formConnectionId: id,
        accessLevel: level
      },
      update: {
        accessLevel: level
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    return res.status(200).json({ permission });
  } catch (error) {
    return res.status(500).json({ message: "Could not update access", detail: error.message });
  }
});

router.get("/respondents", async (req, res) => {
  const { formId, q } = req.query;

  try {
    const respondents = await prisma.respondent.findMany({
      where: {
        formConnection: {
          permissions: {
            some: {
              userId: req.user.id
            }
          }
        },
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
    const visibleFormsFilter = {
      permissions: {
        some: {
          userId: _req.user.id
        }
      }
    };

    const [formsCount, respondentsCount, syncRunsCount] = await Promise.all([
      prisma.formConnection.count({ where: visibleFormsFilter }),
      prisma.respondent.count({
        where: {
          formConnection: visibleFormsFilter
        }
      }),
      prisma.syncRun.count({
        where: {
          formConnection: visibleFormsFilter
        }
      })
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
