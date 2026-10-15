/*
  Warnings:

  - You are about to drop the column `amountBase` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `exchangeRate` on the `transactions` table. All the data in the column will be lost.
  - You are about to drop the column `pushToken` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `budget_alerts` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,category,period]` on the table `budgets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CHECKING', 'SAVINGS');

-- CreateEnum
CREATE TYPE "TxSource" AS ENUM ('MANUAL', 'LINKED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('NONE', 'PENDING', 'CONFIRMED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('MEDIUM', 'HIGH');

-- DropForeignKey
ALTER TABLE "budget_alerts" DROP CONSTRAINT "budget_alerts_budgetId_fkey";

-- DropIndex
DROP INDEX "budgets_userId_category_key";

-- DropIndex
DROP INDEX "users_pushToken_key";

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "period" TEXT NOT NULL DEFAULT '2000-01';

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "amountBase",
DROP COLUMN "currency",
DROP COLUMN "exchangeRate",
ADD COLUMN     "accountId" TEXT,
ADD COLUMN     "flagReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "location" TEXT,
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "riskLevel" "RiskLevel",
ADD COLUMN     "source" "TxSource" NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "pushToken";

-- DropTable
DROP TABLE "budget_alerts";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "savedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthlyContribution" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "contributionDay" INTEGER NOT NULL DEFAULT 15,
    "targetDate" TIMESTAMP(3),
    "priority" BOOLEAN NOT NULL DEFAULT false,
    "icon" TEXT NOT NULL DEFAULT 'target',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_contributions" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goalId" TEXT NOT NULL,
    "accountId" TEXT,

    CONSTRAINT "goal_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "goals_userId_idx" ON "goals"("userId");

-- CreateIndex
CREATE INDEX "goal_contributions_goalId_createdAt_idx" ON "goal_contributions"("goalId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_category_period_key" ON "budgets"("userId", "category", "period");

-- CreateIndex
CREATE INDEX "transactions_userId_reviewStatus_idx" ON "transactions"("userId", "reviewStatus");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
