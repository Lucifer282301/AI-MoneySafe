const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/goalController");

router.use(auth);
router.get("/", ctrl.list);
router.post("/", ctrl.create);
router.patch("/:id", ctrl.update);
router.delete("/:id", ctrl.remove);

module.exports = router;
