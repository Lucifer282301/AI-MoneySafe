const router = require("express").Router();
const auth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const ctrl = require("../controllers/authController");

router.post("/signup", authLimiter, ctrl.signup);
router.post("/login", authLimiter, ctrl.login);
router.post("/refresh", authLimiter, ctrl.refresh);
router.post("/logout", ctrl.logout);

router.get("/me", auth, ctrl.me);
router.patch("/me", auth, authLimiter, ctrl.updateProfile);
router.delete("/me", auth, ctrl.deleteAccount);
router.post("/change-password", auth, authLimiter, ctrl.changePassword);
router.patch("/currency", auth, ctrl.updateCurrency);
router.patch("/settings", auth, ctrl.updateSettings);
router.post("/avatar", auth, ctrl.setAvatar);
router.delete("/avatar", auth, ctrl.removeAvatar);

module.exports = router;
