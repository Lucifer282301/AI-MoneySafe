const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const {
  cleanText,
  parseAccountType,
  parseBalance,
} = require("../lib/validate");

exports.list = asyncHandler(async (req, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.userId },
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });
  res.json(accounts);
});

// POST /api/accounts  { name, type, balance }
exports.create = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const name = cleanText(body.name, 40);
  if (!name) throw new HttpError(400, "Account name is required");

  const count = await prisma.account.count({ where: { userId: req.userId } });
  if (count >= 10) throw new HttpError(400, "You can add up to 10 accounts");

  const account = await prisma.account.create({
    data: {
      userId: req.userId,
      name,
      type: parseAccountType(body.type),
      balance: body.balance === undefined ? 0 : parseBalance(body.balance),
    },
  });
  res.status(201).json(account);
});

// PATCH /api/accounts/:id  { name?, type?, balance? }
exports.update = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const existing = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new HttpError(404, "Account not found");

  const data = {};
  if (body.name !== undefined) {
    const name = cleanText(body.name, 40);
    if (!name) throw new HttpError(400, "Account name cannot be empty");
    data.name = name;
  }
  if (body.type !== undefined) data.type = parseAccountType(body.type);
  if (body.balance !== undefined) data.balance = parseBalance(body.balance);

  const account = await prisma.account.update({
    where: { id: existing.id },
    data,
  });
  res.json(account);
});

// DELETE /api/accounts/:id : its transactions stay, just unlinked from the account
exports.remove = asyncHandler(async (req, res) => {
  const { count } = await prisma.account.deleteMany({
    where: { id: req.params.id, userId: req.userId },
  });
  if (count === 0) throw new HttpError(404, "Account not found");
  res.json({ success: true });
});
