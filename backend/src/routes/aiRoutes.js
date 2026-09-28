const router = require("express").Router();
const multer = require("multer");

const auth = require("../middleware/auth");
const ctrl = require("../controllers/aiController");
const { aiLimiter } = require("../middleware/rateLimiter");

// ==========================================
// MULTER CONFIGURATION
// ==========================================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, WEBP, and PDF files are allowed."));
    }
  },
});

// ==========================================
// AUTHENTICATION
// ==========================================
router.use(auth);

// ==========================================
// AI RATE LIMIT
// ==========================================
router.use(aiLimiter);

// ==========================================
// RECEIPT EXTRACTION
// POST /api/ai/extract
// ==========================================
router.post("/extract", upload.single("bill"), ctrl.extractReceipt);

// ==========================================
// AI CHAT
// POST /api/ai/chat
// ==========================================
router.post("/chat", ctrl.chat);

module.exports = router;
