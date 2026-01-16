-- CreateEnum
CREATE TYPE "QCTestType" AS ENUM ('GRAVITY', 'TEMPERATURE', 'PH', 'DISSOLVED_O2', 'TURBIDITY', 'COLOR', 'BITTERNESS', 'ALCOHOL', 'CARBONATION', 'APPEARANCE', 'AROMA', 'TASTE', 'MICROBIOLOGICAL');

-- CreateEnum
CREATE TYPE "QCTestStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'PASSED', 'WARNING', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "QCTestPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "QCTest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "lotId" TEXT,
    "testType" "QCTestType" NOT NULL,
    "status" "QCTestStatus" NOT NULL DEFAULT 'SCHEDULED',
    "priority" "QCTestPriority" NOT NULL DEFAULT 'MEDIUM',
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "completedDate" TIMESTAMP(3),
    "minValue" DECIMAL(10,4),
    "maxValue" DECIMAL(10,4),
    "targetValue" DECIMAL(10,4),
    "result" DECIMAL(10,4),
    "unit" TEXT,
    "notes" TEXT,
    "performedBy" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QCTest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QCTest_tenantId_status_idx" ON "QCTest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "QCTest_tenantId_batchId_idx" ON "QCTest"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "QCTest_scheduledDate_idx" ON "QCTest"("scheduledDate");

-- AddForeignKey
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QCTest" ADD CONSTRAINT "QCTest_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
