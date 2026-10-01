const bcrypt = require("bcrypt");
const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const {
  issueTokens,
  rotateRefreshToken,
  revokeRefreshToken,
} = require("../lib/tokens");
const { deleteUserReceipts } = require("../lib/cloudinary");

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
const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  currency: u.currency,
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
  if (!user || !valid) throw new HttpError(401, "Invalid email or password");

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

exports.savePushToken = asyncHandler(async (req, res) => {
  const pushToken = String((req.body || {}).pushToken || "").trim();

  if (!pushToken) {
    throw new HttpError(400, "Push token is required");
  }

  const user = await prisma.user.update({
    where: { id: req.userId },
    data: { pushToken },
  });

  res.json(publicUser(user));
});

exports.me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "User not found");
  res.json(publicUser(user));
});

exports.updateCurrency = asyncHandler(async (req, res) => {
  const currency = String((req.body || {}).currency || "")
    .trim()
    .toUpperCase();
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

exports.deleteAccount = asyncHandler(async (req, res) => {
  const password = String((req.body || {}).password || "");
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) throw new HttpError(404, "User not found");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new HttpError(403, "Incorrect password");

  await deleteUserReceipts(user.id);
  // Transactions, budgets and refresh tokens are removed by onDelete: Cascade
  await prisma.user.delete({ where: { id: user.id } });
  res.json({ success: true });
});
