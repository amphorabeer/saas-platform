-- CreateEnum
CREATE TYPE "LotPhase" AS ENUM ('FERMENTATION', 'CONDITIONING', 'BRIGHT', 'PACKAGING');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('FERMENT_TO_CONDITION', 'CONDITION_TO_BRIGHT', 'TANK_TO_TANK', 'BLEND', 'SPLIT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReadingType" AS ENUM ('GRAVITY', 'TEMPERATURE', 'PH', 'PRESSURE', 'DISSOLVED_O2', 'TURBIDITY');

-- CreateEnum
CREATE TYPE "TankCapability" AS ENUM ('FERMENTATION', 'CONDITIONING', 'SERVING', 'STORAGE');

-- AlterTable: Add new fields to Tank
ALTER TABLE "Tank" ADD COLUMN     "capabilities" "TankCapability"[] DEFAULT ARRAY[]::"TankCapability"[],
ADD COLUMN     "minFillPercent" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "maxFillPercent" INTEGER NOT NULL DEFAULT 95,
ADD COLUMN     "defaultTurnaroundHours" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "currentLotId" TEXT,
ADD COLUMN     "currentPhase" "LotPhase";

-- AlterTable: Add yeastStrain to Recipe
ALTER TABLE "Recipe" ADD COLUMN     "yeastStrain" TEXT;

-- CreateTable: Lot
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
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LotBatch
CREATE TABLE "LotBatch" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "volumeContribution" DECIMAL(10,2) NOT NULL,
    "batchPercentage" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable: TankAssignment
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TankAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Transfer
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable: LotReading
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

-- CreateTable: BlendingConfig
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlendingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lot_tenantId_lotCode_key" ON "Lot"("tenantId", "lotCode");

-- CreateIndex
CREATE INDEX "Lot_tenantId_status_idx" ON "Lot"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Lot_tenantId_phase_idx" ON "Lot"("tenantId", "phase");

-- CreateIndex
CREATE UNIQUE INDEX "LotBatch_lotId_batchId_key" ON "LotBatch"("lotId", "batchId");

-- CreateIndex
CREATE INDEX "LotBatch_batchId_idx" ON "LotBatch"("batchId");

-- CreateIndex
CREATE INDEX "TankAssignment_tenantId_tankId_idx" ON "TankAssignment"("tenantId", "tankId");

-- CreateIndex
CREATE INDEX "TankAssignment_tenantId_status_idx" ON "TankAssignment"("tenantId", "status");

-- CreateIndex
CREATE INDEX "TankAssignment_tankId_plannedStart_plannedEnd_idx" ON "TankAssignment"("tankId", "plannedStart", "plannedEnd");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_tenantId_transferCode_key" ON "Transfer"("tenantId", "transferCode");

-- CreateIndex
CREATE INDEX "Transfer_tenantId_status_idx" ON "Transfer"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Transfer_sourceLotId_idx" ON "Transfer"("sourceLotId");

-- CreateIndex
CREATE INDEX "Transfer_destLotId_idx" ON "Transfer"("destLotId");

-- CreateIndex
CREATE INDEX "LotReading_lotId_readingType_recordedAt_idx" ON "LotReading"("lotId", "readingType", "recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BlendingConfig_tenantId_key" ON "BlendingConfig"("tenantId");

-- Note: Tank.currentLotId foreign key will be added after Lot table is created
-- This is handled by Prisma automatically via the relation definition

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_parentLotId_fkey" FOREIGN KEY ("parentLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBatch" ADD CONSTRAINT "LotBatch_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotBatch" ADD CONSTRAINT "LotBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceLotId_fkey" FOREIGN KEY ("sourceLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destLotId_fkey" FOREIGN KEY ("destLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotReading" ADD CONSTRAINT "LotReading_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlendingConfig" ADD CONSTRAINT "BlendingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

