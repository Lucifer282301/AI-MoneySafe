const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/transferController");

router.use(auth);
router.post("/preview", ctrl.preview);
router.post("/", ctrl.create);

module.exports = router;
