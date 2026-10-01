const router = require("express").Router();
const auth = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimiter");
const ctrl = require("../controllers/aiController");

router.use(auth); // sets req.userId first...

router.use(aiLimiter); // ...so the limiter can count per user

router.post("/extract", ctrl.extractReceipt);
router.post("/chat", ctrl.chat);

module.exports = router;
