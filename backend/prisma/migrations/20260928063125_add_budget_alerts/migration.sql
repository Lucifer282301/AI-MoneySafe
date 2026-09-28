-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pushToken" TEXT;

-- CreateTable
CREATE TABLE "budget_alerts" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_alerts_budgetId_threshold_month_key" ON "budget_alerts"("budgetId", "threshold", "month");

-- AddForeignKey
ALTER TABLE "budget_alerts" ADD CONSTRAINT "budget_alerts_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
