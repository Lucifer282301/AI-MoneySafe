const router = require("express").Router();

const {
  signup,
  login,
  refresh,
  logout,
  savePushToken,
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

module.exports = router;
