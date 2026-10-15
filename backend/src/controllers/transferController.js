const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { round2 } = require("../lib/dates");
const { computeSafeToSpend } = require("../lib/finance");
const { parseAmount } = require("../lib/validate");
const { shape } = require("./goalController");

// Validates a transfer request and loads what it touches. Nothing is changed here.
async function load(userId, body = {}) {
  const goal = await prisma.goal.findFirst({
    where: { id: String(body.goalId || ""), userId },
  });
  if (!goal) throw new HttpError(404, "Goal not found");

  const amount = parseAmount(body.amount);
  const remaining = round2(goal.targetAmount - goal.savedAmount);
  if (remaining <= 0)
    throw new HttpError(400, "This goal is already fully funded");
  if (amount > remaining)
    throw new HttpError(
      400,
      `This goal only needs ${remaining.toFixed(2)} more`,
    );

  // Use the chosen account, otherwise the first checking account (or none if the user has no accounts)
  let account;
  if (body.accountId) {
    account = await prisma.account.findFirst({
      where: { id: String(body.accountId), userId },
    });
    if (!account) throw new HttpError(400, "Account not found");
  } else {
    account = await prisma.account.findFirst({
      where: { userId, type: "CHECKING" },
      orderBy: { createdAt: "asc" },
    });
  }
  if (account && account.balance < amount) {
    throw new HttpError(
      400,
      `There is not enough in ${account.name} for this transfer`,
    );
  }
  return { goal, account, amount };
}

// POST /api/transfers/preview  { goalId, amount, accountId? } : shows the result, moves nothing
exports.preview = asyncHandler(async (req, res) => {
  const { goal, account, amount } = await load(req.userId, req.body);
  const safe = await computeSafeToSpend(req.userId);

  const after = goal.savedAmount + amount;
  const warnings = [];
  if (amount > safe.safeToSpend) {
    warnings.push({
      code: "USES_BUFFER",
      message:
        "This is more than your safe-to-spend amount, so it dips into your buffer or upcoming bills.",
    });
  }

  res.json({
    amount,
    goal: {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      before: goal.savedAmount,
      after: round2(after),
      pctBefore: Math.round((goal.savedAmount / goal.targetAmount) * 100),
      pctAfter: Math.min(100, Math.round((after / goal.targetAmount) * 100)),
    },
    account: account
      ? {
          id: account.id,
          name: account.name,
          before: account.balance,
          after: round2(account.balance - amount),
        }
      : null,
    safeToSpend: {
      before: safe.safeToSpend,
      after: round2(Math.max(0, safe.safeToSpend - amount)),
    },
    warnings,
  });
});

// POST /api/transfers  { goalId, amount, accountId? } : the user's approval; this moves the money
exports.create = asyncHandler(async (req, res) => {
  const { goal, account, amount } = await load(req.userId, req.body);

  const updated = await prisma.$transaction(async (db) => {
    if (account) {
      await db.account.update({
        where: { id: account.id },
        data: { balance: { decrement: amount } },
      });
    }
    await db.goalContribution.create({
      data: { goalId: goal.id, accountId: account ? account.id : null, amount },
    });
    return db.goal.update({
      where: { id: goal.id },
      data: { savedAmount: { increment: amount } },
    });
  });

  res.status(201).json({ goal: shape(updated) });
});
