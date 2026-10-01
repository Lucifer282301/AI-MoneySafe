const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const env = require("../config/env");

const sha256 = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

function signAccessToken(userId) {
  return jwt.sign({ userId }, env.jwtSecret, {
    expiresIn: env.accessTtl,
    algorithm: "HS256",
  });
}

async function createRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString("hex");
  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(token),
      userId,
      expiresAt: new Date(Date.now() + env.refreshDays * 24 * 60 * 60 * 1000),
    },
  });
  return token;
}

async function issueTokens(userId) {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId),
    createRefreshToken(userId),
  ]);
  return { accessToken, refreshToken };
}

// Exchange a refresh token for a new pair. Returns null if invalid/expired/already used.
async function rotateRefreshToken(token) {
  const saved = await prisma.refreshToken.findUnique({
    where: { tokenHash: sha256(token) },
  });
  if (!saved) return null;

  const { count } = await prisma.refreshToken.deleteMany({
    where: { id: saved.id },
  });
  if (count === 0) return null; // someone else already used it
  if (saved.expiresAt < new Date()) return null;

  return issueTokens(saved.userId);
}

async function revokeRefreshToken(token) {
  await prisma.refreshToken.deleteMany({ where: { tokenHash: sha256(token) } });
}

module.exports = { issueTokens, rotateRefreshToken, revokeRefreshToken };
