const router = require("express").Router();

const {
  signup,
  login,
  refresh,
  logout,
  savePushToken,
  currency,
} = require("../controllers/authController");

const auth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");

// ==========================================
// PUBLIC AUTH ROUTES
// ==========================================
router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

// ==========================================
// PROTECTED ROUTES
// ==========================================
router.post("/push-token", auth, savePushToken);

// ==========================================
// CURRENCY PREFERENCE
// ==========================================
router.patch("/currency", auth, currency);

module.exports = router;
