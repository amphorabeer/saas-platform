/*
  Warnings:

  - The values [IN_PRODUCTION] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LotPhase" AS ENUM ('FERMENTATION', 'CONDITIONING', 'BRIGHT', 'PACKAGING');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReadingType" AS ENUM ('GRAVITY', 'TEMPERATURE', 'PH', 'PRESSURE', 'DISSOLVED_O2', 'TURBIDITY');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('FERMENT_TO_CONDITION', 'CONDITION_TO_BRIGHT', 'TANK_TO_TANK', 'BLEND', 'SPLIT');

-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED');
ALTER TABLE "SalesOrder" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "SalesOrder" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "OrderStatus_old";
ALTER TABLE "SalesOrder" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "targetOg" DECIMAL(5,4);

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "yeastStrain" TEXT;

-- AlterTable
ALTER TABLE "Tank" ADD COLUMN     "capabilities" "TankCapability"[] DEFAULT ARRAY[]::"TankCapability"[],
ADD COLUMN     "currentLotId" TEXT,
ADD COLUMN     "currentPhase" "LotPhase",
ADD COLUMN     "defaultTurnaroundHours" INTEGER DEFAULT 4,
ADD COLUMN     "maxFillPercent" INTEGER DEFAULT 95,
ADD COLUMN     "minFillPercent" INTEGER DEFAULT 20;

-- CreateTable
CREATE TABLE "BlendingConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requireRecipeMatch" BOOLEAN NOT NULL DEFAULT false,
    "requireYeastMatch" BOOLEAN NOT NULL DEFAULT true,
    "requirePhaseMatch" BOOLEAN NOT NULL DEFAULT true,
    "requireStyleMatch" BOOLEAN NOT NULL DEFAULT false,
    "maxBlendSources" INTEGER NOT NULL DEFAULT 4,
    "allowOverCapacity" BOOLEAN NOT NULL DEFAULT false,
    "maxAgeDifferenceHours" INTEGER NOT NULL DEFAULT 48,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlendingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "lotCode" TEXT NOT NULL,
    "phase" "LotPhase" NOT NULL DEFAULT 'FERMENTATION',
    "status" "LotStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedVolume" DECIMAL(10,2) NOT NULL,
    "actualVolume" DECIMAL(10,2),
    "notes" TEXT,
    "parentLotId" TEXT,
    "splitRatio" DECIMAL(5,2),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotBatch" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "volumeContribution" DECIMAL(10,2) NOT NULL,
    "batchPercentage" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotReading" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "readingType" "ReadingType" NOT NULL,
    "value" DECIMAL(10,4) NOT NULL,
    "unit" TEXT NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "phase" "LotPhase" NOT NULL,
    "plannedStart" TIMESTAMP(3) NOT NULL,
    "plannedEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PLANNED',
    "plannedVolume" DECIMAL(10,2) NOT NULL,
    "actualVolume" DECIMAL(10,2),
    "isBlendTarget" BOOLEAN NOT NULL DEFAULT false,
    "isSplitSource" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TankAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transferCode" TEXT NOT NULL,
    "sourceLotId" TEXT,
    "sourceTankId" TEXT NOT NULL,
    "destLotId" TEXT,
    "destTankId" TEXT NOT NULL,
    "transferType" "TransferType" NOT NULL,
    "volume" DECIMAL(10,2) NOT NULL,
    "plannedAt" TIMESTAMP(3) NOT NULL,
    "executedAt" TIMESTAMP(3),
    "status" "TransferStatus" NOT NULL DEFAULT 'PLANNED',
    "measuredLoss" DECIMAL(10,2),
    "lossReason" TEXT,
    "performedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlendingConfig_tenantId_key" ON "BlendingConfig"("tenantId");

-- CreateIndex
CREATE INDEX "Lot_tenantId_status_idx" ON "Lot"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_tenantId_lotCode_key" ON "Lot"("tenantId", "lotCode");

-- CreateIndex
CREATE UNIQUE INDEX "LotBatch_lotId_batchId_key" ON "LotBatch"("lotId", "batchId");

-- CreateIndex
CREATE INDEX "LotReading_lotId_readingType_idx" ON "LotReading"("lotId", "readingType");

-- CreateIndex
CREATE INDEX "TankAssignment_tenantId_status_idx" ON "TankAssignment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TankAssignment_tenantId_tankId_idx" ON "TankAssignment"("tenantId", "tankId");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_tenantId_transferCode_key" ON "Transfer"("tenantId", "transferCode");

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_parentLotId_fkey" FOREIGN KEY ("parentLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBatch" ADD CONSTRAINT "LotBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBatch" ADD CONSTRAINT "LotBatch_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotReading" ADD CONSTRAINT "LotReading_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotReading" ADD CONSTRAINT "LotReading_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destLotId_fkey" FOREIGN KEY ("destLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destTankId_fkey" FOREIGN KEY ("destTankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceLotId_fkey" FOREIGN KEY ("sourceLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceTankId_fkey" FOREIGN KEY ("sourceTankId") REFERENCES "Tank"("id") ON DELETE CASCADE ON UPDATE CASCADE;
