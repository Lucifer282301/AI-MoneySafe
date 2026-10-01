require("dotenv").config();

const parseCsv = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const required = ["DATABASE_URL", "JWT_SECRET", "GEMINI_API_KEY"];
const missing = required.filter((key) => !process.env[key]);

if (missing.length) {
  console.error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

if ((process.env.JWT_SECRET || "").length < 32) {
  console.error("JWT_SECRET must be at least 32 characters long.");
  process.exit(1);
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 4000,

  jwtSecret: process.env.JWT_SECRET,
  accessTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS) || 30,

  geminiKey: process.env.GEMINI_API_KEY,
  geminiModels: parseCsv(
    process.env.GEMINI_MODELS ||
      "gemini-3.5-flash,gemini-3.5-flash-lite,gemini-2.5-flash",
  ),

  cloudinaryEnabled: Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET,
  ),

  corsOrigins: parseCsv(process.env.CORS_ORIGINS),
};
