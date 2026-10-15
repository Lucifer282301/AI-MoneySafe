const router = require("express").Router();
const auth = require("../middleware/auth");
const { aiLimiter } = require("../middleware/rateLimiter");
const ctrl = require("../controllers/uploadController");

router.use(auth);
router.use(aiLimiter); // uploads cost money too, so share the AI limit
router.post("/receipt", ctrl.receipt);

module.exports = router;
