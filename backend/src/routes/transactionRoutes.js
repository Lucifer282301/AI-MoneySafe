const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/transactionController");

// Every route below requires a valid JWT (auth middleware runs first)
router.use(auth);

router.get("/", ctrl.getAll);
router.get("/summary", ctrl.summary);
router.post("/", ctrl.create);
router.delete("/:id", ctrl.remove);

module.exports = router;
