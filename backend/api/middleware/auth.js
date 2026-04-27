const prisma = require("../lib/prisma");
const jwt = require("jsonwebtoken");

function getBearerToken(req) {
  const rawHeader = req.headers.authorization || "";
  if (!rawHeader.startsWith("Bearer ")) {
    return null;
  }

  return rawHeader.slice("Bearer ".length).trim();
}

async function verifyGoogleIdToken(idToken) {
  const response = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error_description || payload.error || "Invalid Google ID token");
  }

  if (String(payload.email_verified) !== "true") {
    throw new Error("Google account email is not verified");
  }

  const expectedClientId = process.env.GOOGLE_CLIENT_ID;
  if (expectedClientId && payload.aud !== expectedClientId) {
    throw new Error("Google token audience mismatch");
  }

  return payload;
}

function getJwtSecret() {
  return process.env.JWT_SECRET || "dev_only_change_me";
}

function issueAppToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      provider: "app"
    },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

async function upsertFromGooglePayload(googlePayload) {
  const email = String(googlePayload.email || "").toLowerCase();

  if (!email) {
    throw new Error("Google token did not include an email");
  }

  return prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: googlePayload.name || null,
      googleSub: googlePayload.sub || null
    },
    update: {
      name: googlePayload.name || null,
      googleSub: googlePayload.sub || null
    }
  });
}

async function authenticateUser(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Missing Authorization header"
    });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    const userId = String(decoded?.sub || "");

    if (!userId) {
      throw new Error("Invalid app token");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(401).json({ message: "User for token was not found" });
    }

    req.user = user;
    return next();
  } catch (_jwtError) {
    try {
      const googlePayload = await verifyGoogleIdToken(token);
      const user = await upsertFromGooglePayload(googlePayload);

      req.user = user;
      return next();
    } catch (googleError) {
      return res.status(401).json({ message: googleError.message || "Authentication failed" });
    }
  }
}

async function authenticateGoogleUser(req, res, next) {
  const token = getBearerToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Missing Authorization header. Send a Google ID token as Bearer token."
    });
  }

  try {
    const googlePayload = await verifyGoogleIdToken(token);
    const user = await upsertFromGooglePayload(googlePayload);

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: error.message || "Authentication failed" });
  }
}

module.exports = {
  authenticateGoogleUser,
  authenticateUser,
  issueAppToken
};
