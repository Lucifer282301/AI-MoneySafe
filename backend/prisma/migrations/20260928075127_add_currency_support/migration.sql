-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "amountBase" DOUBLE PRECISION,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR',
ADD COLUMN     "exchangeRate" DOUBLE PRECISION DEFAULT 1.0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
