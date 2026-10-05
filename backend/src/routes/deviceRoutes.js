const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/deviceController");

router.use(auth);
router.post("/", ctrl.register);
router.delete("/", ctrl.unregister);
router.post("/test", ctrl.test);

module.exports = router;
