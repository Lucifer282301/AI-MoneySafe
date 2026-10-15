const prisma = require("../lib/prisma");
const asyncHandler = require("../middleware/asyncHandler");

// GET /api/safety : payments paused for review, and the safety setup
exports.overview = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [pending, disputedCount, devices] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: req.userId, reviewStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.transaction.count({
      where: {
        userId: req.userId,
        reviewStatus: "DISPUTED",
        updatedAt: { gte: since },
      },
    }),
    prisma.deviceToken.count({ where: { userId: req.userId } }),
  ]);

  res.json({
    state: pending.length > 0 ? "REVIEW_NEEDED" : "ALL_CLEAR",
    pending: pending.map((t) => ({
      id: t.id,
      merchant: t.merchant,
      amount: t.amount,
      category: t.category,
      date: t.date,
      createdAt: t.createdAt,
      paymentMethod: t.paymentMethod,
      location: t.location,
      riskLevel: t.riskLevel,
      reasons: t.flagReasons,
    })),
    pendingCount: pending.length,
    disputedCount,
    realtimeAlerts: devices > 0, // push notifications are registered on at least one device
  });
});
