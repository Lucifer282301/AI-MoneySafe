const prisma = require("../lib/prisma");
const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { sendToUser, isPushConfigured } = require("../lib/push");

exports.register = asyncHandler(async (req, res) => {
  const { token, platform } = req.body || {};
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    throw new HttpError(400, "A valid device token is required");
  }
  const p = platform === "ios" || platform === "android" ? platform : "unknown";

  // If this device was registered under another account, move it to this one
  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId: req.userId, platform: p },
    create: { token, platform: p, userId: req.userId },
  });

  res.json({ success: true });
});

exports.unregister = asyncHandler(async (req, res) => {
  const { token } = req.body || {};
  if (typeof token !== "string" || !token) {
    throw new HttpError(400, "token is required");
  }
  await prisma.deviceToken.deleteMany({ where: { token, userId: req.userId } });
  res.json({ success: true });
});

exports.test = asyncHandler(async (req, res) => {
  if (!isPushConfigured()) {
    throw new HttpError(
      503,
      "Push notifications are not configured on the server",
    );
  }
  await sendToUser(req.userId, {
    title: "MoneySafe",
    body: "Push notifications are working.",
    data: { type: "test", screen: "Budgets" },
  });
  res.json({ success: true });
});
