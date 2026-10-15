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

const isConfigured = () => env.cloudinaryEnabled;

// Upload a base64 receipt image. Returns the HTTPS URL, or null if Cloudinary isn't configured.
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

// Profile photo: cropped to a 256 px square around the face, replaces the previous photo
async function uploadAvatar(base64, mimeType, userId) {
  if (!env.cloudinaryEnabled) return null;
  const result = await cloudinary.uploader.upload(
    `data:${mimeType};base64,${base64}`,
    {
      folder: `moneysafe/avatars/${userId}`,
      public_id: "avatar",
      overwrite: true,
      invalidate: true,
      resource_type: "image",
      transformation: [
        { width: 256, height: 256, crop: "fill", gravity: "face" },
      ],
    },
  );
  return `${result.secure_url}?v=${result.version}`;
}

async function deleteAvatar(userId) {
  if (!env.cloudinaryEnabled) return;
  try {
    await cloudinary.uploader.destroy(`moneysafe/avatars/${userId}/avatar`, {
      invalidate: true,
    });
  } catch (err) {
    console.error("Could not delete avatar:", err.message);
  }
}

// Best-effort cleanup when a user deletes their account
async function deleteUserReceipts(userId) {
  if (!env.cloudinaryEnabled) return;
  try {
    await cloudinary.api.delete_resources_by_prefix(
      `moneysafe/receipts/${userId}/`,
    );
    await cloudinary.api.delete_resources_by_prefix(
      `moneysafe/avatars/${userId}/`,
    );
  } catch (err) {
    console.error("Could not delete uploaded images:", err.message);
  }
}

module.exports = {
  isConfigured,
  uploadReceipt,
  uploadAvatar,
  deleteAvatar,
  deleteUserReceipts,
};
