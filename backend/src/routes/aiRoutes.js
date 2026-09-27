const router = require("express").Router();
const multer = require("multer");

const auth = require("../middleware/auth");
const ctrl = require("../controllers/aiController");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

router.use(auth);

router.post("/extract", upload.single("bill"), ctrl.extractReceipt);
router.post("/chat", ctrl.chat);

module.exports = router;
