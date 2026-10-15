const router = require("express").Router();
const auth = require("../middleware/auth");
const insights = require("../controllers/insightsController");
const overview = require("../controllers/overviewController");
const safety = require("../controllers/safetyController");

router.use(auth);
router.get("/overview", overview.overview);
router.get("/insights/spending", insights.spending);
router.get("/safety", safety.overview);

module.exports = router;
