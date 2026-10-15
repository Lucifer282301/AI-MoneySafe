const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

require("dotenv").config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing from environment variables");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

module.exports = prisma;
