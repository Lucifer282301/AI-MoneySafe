const prisma = require("../lib/prisma");
const asyncHandler = require("../middleware/asyncHandler");
const { computeSafeToSpend, suggestSaving } = require("../lib/finance");

// GET /api/overview : everything the Home screen needs in one call
exports.overview = asyncHandler(async (req, res) => {
  const safe = await computeSafeToSpend(req.userId);

  const [accounts, pendingCount, firstPending, suggestion, recent] =
    await Promise.all([
      prisma.account.findMany({
        where: { userId: req.userId },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      }),
      prisma.transaction.count({
        where: { userId: req.userId, reviewStatus: "PENDING" },
      }),
      prisma.transaction.findFirst({
        where: { userId: req.userId, reviewStatus: "PENDING" },
        orderBy: { createdAt: "desc" },
      }),
      suggestSaving(req.userId, safe),
      prisma.transaction.findMany({
        where: { userId: req.userId, reviewStatus: { not: "DISPUTED" } },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
    ]);

  res.json({
    today: new Date().toISOString().slice(0, 10),
    safe,
    accounts,
    attention: firstPending
      ? {
          count: pendingCount,
          transactionId: firstPending.id,
          merchant: firstPending.merchant,
          amount: firstPending.amount,
        }
      : null,
    suggestion,
    recent,
  });
});
