const { Router } = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { authenticateUser, issueAppToken } = require("../middleware/auth");

const router = Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    company: user.company,
    role: user.role,
    marketingOptIn: user.marketingOptIn
  };
}

router.post("/signup", async (req, res) => {
  const {
    name,
    email,
    password,
    company,
    role,
    marketingOptIn = false
  } = req.body || {};

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const trimmedName = String(name || "").trim();
  const trimmedCompany = String(company || "").trim();
  const trimmedRole = String(role || "").trim();

  if (!trimmedName || !normalizedEmail || !password || !trimmedCompany) {
    return res.status(400).json({
      message: "name, company, email and password are required"
    });
  }

  if (String(password).length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser?.passwordHash) {
      return res.status(409).json({ message: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(String(password), 12);

    const user = existingUser
      ? await prisma.user.update({
          where: { email: normalizedEmail },
          data: {
            passwordHash,
            name: trimmedName,
            company: trimmedCompany,
            role: trimmedRole || null,
            marketingOptIn: Boolean(marketingOptIn)
          }
        })
      : await prisma.user.create({
          data: {
            email: normalizedEmail,
            passwordHash,
            name: trimmedName,
            company: trimmedCompany,
            role: trimmedRole || null,
            marketingOptIn: Boolean(marketingOptIn)
          }
        });

    const token = issueAppToken(user);

    return res.status(201).json({
      message: "Registration successful",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not register user", detail: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();

  if (!normalizedEmail || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordMatches = await bcrypt.compare(String(password), user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = issueAppToken(user);

    return res.status(200).json({
      message: "Login successful",
      token,
      user: sanitizeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not sign in", detail: error.message });
  }
});

router.get("/me", authenticateUser, async (req, res) => {
  return res.status(200).json({ user: sanitizeUser(req.user) });
});

module.exports = router;
