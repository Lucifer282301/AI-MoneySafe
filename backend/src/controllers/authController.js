const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
} = require("../lib/tokens");
const {
  deleteUserReceipts,
  uploadAvatar,
  deleteAvatar,
  isConfigured,
} = require("../lib/cloudinary");
const { parseBalance } = require("../lib/validate");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CURRENCIES = [
  "INR",
  "USD",
  "EUR",
  "GBP",
  "AED",
  "AUD",
  "CAD",
  "SGD",
  "JPY",
];
const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  currency: u.currency,
  avatarUrl: u.avatarUrl,
  safetyBuffer: u.safetyBuffer,
});

exports.signup = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "")
    .trim()
    .slice(0, 80);
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");

  if (!name || !email || !password)
    throw new HttpError(400, "All fields are required");
  if (!EMAIL_RE.test(email))
    throw new HttpError(400, "Enter a valid email address");
  if (password.length < 8)
    throw new HttpError(400, "Password must be at least 8 characters");
  if (password.length > 72)
    throw new HttpError(400, "Password must be 72 characters or fewer");

  const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({
      data: { name, email, password: hashed },
    });
  } catch (err) {
    if (err.code === "P2002")
      throw new HttpError(409, "Email already registered");
    throw err;
  }

  const tokens = await issueTokens(user.id);
  res.status(201).json({ ...tokens, user: publicUser(user) });
});

exports.login = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const email = String(body.email || "")
    .trim()
    .toLowerCase();
  const password = String(body.password || "");

  const user = await prisma.user.findUnique({ where: { email } });
  // Always run bcrypt so timing doesn't reveal whether the email exists
  const valid = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_HASH,
  );
  if (!user || !valid)
    throw new HttpError(
      401,
      "Email or password doesn't match. Check and try again.",
    );

  const tokens = await issueTokens(user.id);
  res.json({ ...tokens, user: publicUser(user) });
});

exports.refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken !== "string" || !refreshToken) {
    throw new HttpError(400, "refreshToken is required");
  }
  const tokens = await rotateRefreshToken(refreshToken);
  if (!tokens) throw new HttpError(401, "Refresh token invalid or expired");
  res.json(tokens);
});

exports.logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (typeof refreshToken === "string" && refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ success: true });
});

exports.me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "User not found");
  res.json(publicUser(user));
});

// PATCH /api/auth/me  { name?, email?, currentPassword? }
exports.updateProfile = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "User not found");

  const data = {};

  if (body.name !== undefined) {
    const name = String(body.name).trim().slice(0, 80);
    if (!name) throw new HttpError(400, "Name cannot be empty");
    if (name !== user.name) data.name = name;
  }

  if (body.email !== undefined) {
    const email = String(body.email).trim().toLowerCase();
    if (!EMAIL_RE.test(email))
      throw new HttpError(400, "Enter a valid email address");

    if (email !== user.email) {
      // Changing the email needs the current password
      const valid = await bcrypt.compare(
        String(body.currentPassword || ""),
        user.password,
      );
      if (!valid)
        throw new HttpError(
          403,
          "Enter your current password to change your email",
        );
      data.email = email;
    }
  }

  if (Object.keys(data).length === 0) {
    return res.json(publicUser(user)); // nothing changed
  }

  try {
    const updated = await prisma.user.update({ where: { id: user.id }, data });
    res.json(publicUser(updated));
  } catch (err) {
    if (err.code === "P2002")
      throw new HttpError(409, "That email is already in use");
    throw err;
  }
});

// POST /api/auth/change-password  { currentPassword, newPassword }
// Signs out every other device and returns a fresh token pair for this one.
exports.changePassword = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (newPassword.length < 8)
    throw new HttpError(400, "New password must be at least 8 characters");
  if (newPassword.length > 72)
    throw new HttpError(400, "New password must be 72 characters or fewer");
  if (newPassword === currentPassword) {
    throw new HttpError(
      400,
      "New password must be different from the current one",
    );
  }

  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "User not found");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new HttpError(403, "Current password is incorrect");

  const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  // One transaction: new password saved and every old session revoked together
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { password: hashed } }),
    prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
  ]);

  const tokens = await issueTokens(user.id);
  res.json(tokens);
});

exports.updateCurrency = asyncHandler(async (req, res) => {
  const currency = String((req.body || {}).currency || "").toUpperCase();
  if (!CURRENCIES.includes(currency)) {
    throw new HttpError(
      400,
      `Currency must be one of: ${CURRENCIES.join(", ")}`,
    );
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { currency },
  });
  res.json(publicUser(user));
});

// PATCH /api/auth/settings  { safetyBuffer }  (the amount "Safe to spend" always keeps aside)
exports.updateSettings = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const data = {};
  if (body.safetyBuffer !== undefined) {
    const buffer = parseBalance(body.safetyBuffer);
    if (buffer < 0) throw new HttpError(400, "Buffer cannot be negative");
    data.safetyBuffer = buffer;
  }
  const user = await prisma.user.update({ where: { id: req.userId }, data });
  res.json(publicUser(user));
});

// POST /api/auth/avatar  { image: base64, mimeType }
exports.setAvatar = asyncHandler(async (req, res) => {
  const { image, mimeType } = req.body || {};
  if (!isConfigured())
    throw new HttpError(503, "Photo upload is not set up on the server");
  if (typeof image !== "string" || image.length < 100)
    throw new HttpError(400, "A base64 image is required");
  if (!IMAGE_TYPES.includes(mimeType))
    throw new HttpError(400, "Use a JPEG, PNG or WebP image");

  const avatarUrl = await uploadAvatar(image, mimeType, req.userId);
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { avatarUrl },
  });
  res.json(publicUser(user));
});

exports.removeAvatar = asyncHandler(async (req, res) => {
  await deleteAvatar(req.userId);
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { avatarUrl: null },
  });
  res.json(publicUser(user));
});

exports.deleteAccount = asyncHandler(async (req, res) => {
  const password = String((req.body || {}).password || "");
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new HttpError(403, "Incorrect password");

  await deleteUserReceipts(user.id);
  // Everything else is removed by onDelete: Cascade
  await prisma.user.delete({ where: { id: user.id } });
  res.json({ success: true });
});
