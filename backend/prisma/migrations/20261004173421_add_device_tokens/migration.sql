/*
  Warnings:

  - Added the required column `updatedAt` to the `device_tokens` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "device_tokens" ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'unknown',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
