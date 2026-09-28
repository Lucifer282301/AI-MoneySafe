const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload a base64 image string, returns the hosted URL
async function uploadReceipt(base64Image, userId) {
  const result = await cloudinary.uploader.upload(
    `data:image/jpeg;base64,${base64Image}`,
    {
      folder: `moneysafe/receipts/${userId}`, // organizes by user
      resource_type: "image",
    },
  );
  return result.secure_url; // permanent HTTPS URL
}

module.exports = { uploadReceipt };
