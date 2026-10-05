const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/transactionController");

router.use(auth);

// Fixed paths must come before "/:id"
router.get("/summary", ctrl.summary);
router.get("/trend", ctrl.trend);
router.get("/export.csv", ctrl.exportCsv);

router.get("/", ctrl.getAll);
router.post("/", ctrl.create);
router.put("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
