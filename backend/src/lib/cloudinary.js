const cloudinary = require("cloudinary").v2;
const env = require("../config/env");

if (env.cloudinaryEnabled) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

// Upload a base64 image. Returns the HTTPS URL, or null if Cloudinary isn't configured.
async function uploadReceipt(base64, mimeType, userId) {
  if (!env.cloudinaryEnabled) return null;
  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${base64}`,
    {
      folder: `moneysafe/receipts/${userId}`,
      resource_type: "image",
    },
  );
  return result.secure_url;
}

async function uploadImage(base64, mimeType, userId, folder = "avatars") {
  if (!env.cloudinaryEnabled) return null;
  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${base64}`,
    {
      folder: `moneysafe/${folder}/${userId}`,
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    },
  );
  return result.secure_url;
}

// Best-effort cleanup when a user deletes their account
async function deleteUserReceipts(userId) {
  if (!env.cloudinaryEnabled) return;
  try {
    await cloudinary.api.delete_resources_by_prefix(
      `moneysafe/receipts/${userId}/`,
    );
  } catch (err) {
    console.error("Could not delete receipts:", err.message);
  }
}

module.exports = { uploadReceipt, uploadImage, deleteUserReceipts };
