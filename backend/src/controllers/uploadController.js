const HttpError = require("../lib/httpError");
const asyncHandler = require("../middleware/asyncHandler");
const { isConfigured, uploadReceipt } = require("../lib/cloudinary");

const IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

// POST /api/uploads/receipt  { image: base64, mimeType } : stores a receipt image without reading it with AI
exports.receipt = asyncHandler(async (req, res) => {
  const { image, mimeType } = req.body || {};
  if (!isConfigured())
    throw new HttpError(503, "Image upload is not set up on the server");
  if (typeof image !== "string" || image.length < 100)
    throw new HttpError(400, "A base64 image is required");
  if (!IMAGE_TYPES.includes(mimeType))
    throw new HttpError(400, "Use a JPEG, PNG or WebP image");

  const receiptUrl = await uploadReceipt(image, mimeType, req.userId);
  res.status(201).json({ receiptUrl });
});
