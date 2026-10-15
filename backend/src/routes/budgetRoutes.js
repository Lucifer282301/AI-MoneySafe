const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/budgetController");

router.use(auth);
router.get("/", ctrl.overview);
router.post("/", ctrl.setBudget);
router.delete("/", ctrl.remove);

module.exports = router;
