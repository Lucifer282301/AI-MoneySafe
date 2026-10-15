const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { round2 } = require("../lib/dates");
const { suggestSaving } = require("../lib/finance");
const { cleanText, parseAmount, parseDate } = require("../lib/validate");

const ICONS = [
  "target",
  "umbrella",
  "airplane",
  "laptop",
  "home",
  "car",
  "school",
  "heart",
  "gift",
];

// The next date the planned monthly contribution is due (never moved automatically)
function nextDueOn(day) {
  const now = new Date();
  let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day));
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  if (d < today)
    d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, day));
  return d.toISOString().slice(0, 10);
}

function shape(goal) {
  const remaining = Math.max(0, round2(goal.targetAmount - goal.savedAmount));
  return {
    id: goal.id,
    name: goal.name,
    icon: goal.icon,
    priority: goal.priority,
    targetAmount: goal.targetAmount,
    savedAmount: goal.savedAmount,
    remaining,
    percent: Math.min(
      100,
      Math.round((goal.savedAmount / goal.targetAmount) * 100),
    ),
    completed: remaining === 0,
    monthlyContribution: goal.monthlyContribution,
    contributionDay: goal.contributionDay,
    nextDueOn:
      goal.monthlyContribution > 0 && remaining > 0
        ? nextDueOn(goal.contributionDay)
        : null,
    targetDate: goal.targetDate
      ? goal.targetDate.toISOString().slice(0, 10)
      : null,
  };
}

function parseFields(body, partial) {
  const data = {};
  if (!partial || body.name !== undefined) {
    const name = cleanText(body.name, 40);
    if (!name) throw new HttpError(400, "Goal name is required");
    data.name = name;
  }
  if (!partial || body.targetAmount !== undefined)
    data.targetAmount = parseAmount(body.targetAmount, "Target");
  if (body.monthlyContribution !== undefined) {
    const n = Number(body.monthlyContribution);
    if (!Number.isFinite(n) || n < 0 || n > 1e9)
      throw new HttpError(400, "Monthly amount must be 0 or more");
    data.monthlyContribution = round2(n);
  }
  if (body.contributionDay !== undefined) {
    const day = Number(body.contributionDay);
    if (!Number.isInteger(day) || day < 1 || day > 28)
      throw new HttpError(400, "Day must be between 1 and 28");
    data.contributionDay = day;
  }
  if (body.targetDate !== undefined)
    data.targetDate = body.targetDate ? parseDate(body.targetDate) : null;
  if (body.priority !== undefined) data.priority = Boolean(body.priority);
  if (body.icon !== undefined) {
    if (!ICONS.includes(body.icon))
      throw new HttpError(400, `Icon must be one of: ${ICONS.join(", ")}`);
    data.icon = body.icon;
  }
  return data;
}

// GET /api/goals
exports.list = asyncHandler(async (req, res) => {
  const goals = await prisma.goal.findMany({
    where: { userId: req.userId },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });

  const shaped = goals.map(shape);
  const suggestion = await suggestSaving(req.userId);

  res.json({
    goals: shaped,
    totalSaved: round2(goals.reduce((s, g) => s + g.savedAmount, 0)),
    plannedMonthly: round2(
      goals
        .filter((g) => g.savedAmount < g.targetAmount)
        .reduce((s, g) => s + g.monthlyContribution, 0),
    ),
    suggestion,
  });
});

// POST /api/goals
exports.create = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const count = await prisma.goal.count({ where: { userId: req.userId } });
  if (count >= 20) throw new HttpError(400, "You can have up to 20 goals");

  const data = parseFields(body, false);

  const goal = await prisma.$transaction(async (db) => {
    // Only one goal is the priority goal
    if (data.priority)
      await db.goal.updateMany({
        where: { userId: req.userId },
        data: { priority: false },
      });
    return db.goal.create({ data: { ...data, userId: req.userId } });
  });
  res.status(201).json(shape(goal));
});

// PATCH /api/goals/:id
exports.update = asyncHandler(async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new HttpError(404, "Goal not found");

  const data = parseFields(req.body || {}, true);

  const goal = await prisma.$transaction(async (db) => {
    if (data.priority)
      await db.goal.updateMany({
        where: { userId: req.userId },
        data: { priority: false },
      });
    return db.goal.update({ where: { id: existing.id }, data });
  });
  res.json(shape(goal));
});

// DELETE /api/goals/:id?returnToAccountId=...   (savings go back to the chosen account)
exports.remove = asyncHandler(async (req, res) => {
  const existing = await prisma.goal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!existing) throw new HttpError(404, "Goal not found");

  const accountId = req.query.returnToAccountId
    ? String(req.query.returnToAccountId)
    : null;
  let account = null;
  if (accountId) {
    account = await prisma.account.findFirst({
      where: { id: accountId, userId: req.userId },
    });
    if (!account) throw new HttpError(400, "Account not found");
  }

  if (existing.savedAmount > 0 && !account) {
    const anyAccount = await prisma.account.count({
      where: { userId: req.userId },
    });
    if (anyAccount > 0) {
      throw new HttpError(
        400,
        "This goal has savings. Choose an account to return them to.",
      );
    }
  }

  await prisma.$transaction(async (db) => {
    if (account && existing.savedAmount > 0) {
      await db.account.update({
        where: { id: account.id },
        data: { balance: { increment: existing.savedAmount } },
      });
    }
    await db.goal.delete({ where: { id: existing.id } });
  });
  res.json({ success: true });
});

module.exports.shape = shape;
