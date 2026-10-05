const router = require("express").Router();
const auth = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimiter");
const ctrl = require("../controllers/authController");

router.post("/signup", authLimiter, ctrl.signup);
router.post("/login", authLimiter, ctrl.login);
router.post("/refresh", authLimiter, ctrl.refresh);
router.post("/logout", ctrl.logout);

router.post("/push-token", auth, ctrl.savePushToken);

router.get("/me", auth, ctrl.me);
router.patch("/me", auth, ctrl.updateProfile);
router.post("/change-password", auth, authLimiter, ctrl.changePassword);
router.patch("/currency", auth, ctrl.updateCurrency);
router.delete("/me", auth, ctrl.deleteAccount);

module.exports = router;
