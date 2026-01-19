-- ============================================
-- LOT-BASED SCHEDULER TABLES
-- ============================================

-- 1. Create Enums
DO $$ BEGIN
    CREATE TYPE "LotPhase" AS ENUM ('FERMENTATION', 'CONDITIONING', 'BRIGHT', 'PACKAGING');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "LotStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "AssignmentStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "TransferType" AS ENUM ('FERMENT_TO_CONDITION', 'CONDITION_TO_BRIGHT', 'TANK_TO_TANK', 'BLEND', 'SPLIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "TransferStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "ReadingType" AS ENUM ('GRAVITY', 'TEMPERATURE', 'PH', 'PRESSURE', 'DISSOLVED_O2', 'TURBIDITY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE "TankCapability" AS ENUM ('FERMENTATION', 'CONDITIONING', 'SERVING', 'STORAGE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Create Lot table
CREATE TABLE IF NOT EXISTS "Lot" (
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

-- 3. Create LotBatch table
CREATE TABLE IF NOT EXISTS "LotBatch" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "volumeContribution" DECIMAL(10,2) NOT NULL,
    "batchPercentage" DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LotBatch_pkey" PRIMARY KEY ("id")
);

-- 4. Create TankAssignment table
CREATE TABLE IF NOT EXISTS "TankAssignment" (
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

-- 5. Create Transfer table
CREATE TABLE IF NOT EXISTS "Transfer" (
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

-- 6. Create LotReading table
CREATE TABLE IF NOT EXISTS "LotReading" (
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

-- 7. Create BlendingConfig table
CREATE TABLE IF NOT EXISTS "BlendingConfig" (
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

-- 8. Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS "Lot_tenantId_lotCode_key" ON "Lot"("tenantId", "lotCode");
CREATE INDEX IF NOT EXISTS "Lot_tenantId_status_idx" ON "Lot"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Lot_tenantId_phase_idx" ON "Lot"("tenantId", "phase");

CREATE UNIQUE INDEX IF NOT EXISTS "LotBatch_lotId_batchId_key" ON "LotBatch"("lotId", "batchId");
CREATE INDEX IF NOT EXISTS "LotBatch_batchId_idx" ON "LotBatch"("batchId");

CREATE INDEX IF NOT EXISTS "TankAssignment_tenantId_tankId_idx" ON "TankAssignment"("tenantId", "tankId");
CREATE INDEX IF NOT EXISTS "TankAssignment_tenantId_status_idx" ON "TankAssignment"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "TankAssignment_tankId_plannedStart_plannedEnd_idx" ON "TankAssignment"("tankId", "plannedStart", "plannedEnd");

CREATE UNIQUE INDEX IF NOT EXISTS "Transfer_tenantId_transferCode_key" ON "Transfer"("tenantId", "transferCode");
CREATE INDEX IF NOT EXISTS "Transfer_tenantId_status_idx" ON "Transfer"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "Transfer_sourceLotId_idx" ON "Transfer"("sourceLotId");
CREATE INDEX IF NOT EXISTS "Transfer_destLotId_idx" ON "Transfer"("destLotId");

CREATE INDEX IF NOT EXISTS "LotReading_lotId_readingType_recordedAt_idx" ON "LotReading"("lotId", "readingType", "recordedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "BlendingConfig_tenantId_key" ON "BlendingConfig"("tenantId");

-- 9. Add Tank columns (using TEXT[] for now, will be converted to enum array)
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "capabilities" "TankCapability"[] DEFAULT ARRAY[]::"TankCapability"[];
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "minFillPercent" INTEGER DEFAULT 20;
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "maxFillPercent" INTEGER DEFAULT 95;
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "defaultTurnaroundHours" INTEGER DEFAULT 4;
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "currentLotId" TEXT;
ALTER TABLE "Tank" ADD COLUMN IF NOT EXISTS "currentPhase" "LotPhase";

-- 10. Add Recipe yeastStrain
ALTER TABLE "Recipe" ADD COLUMN IF NOT EXISTS "yeastStrain" TEXT;

-- 11. Add Batch targetOg
ALTER TABLE "Batch" ADD COLUMN IF NOT EXISTS "targetOg" DECIMAL(5,4);

-- 12. Add foreign keys
DO $$ BEGIN
    ALTER TABLE "Lot" ADD CONSTRAINT "Lot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Lot" ADD CONSTRAINT "Lot_parentLotId_fkey" FOREIGN KEY ("parentLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LotBatch" ADD CONSTRAINT "LotBatch_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LotBatch" ADD CONSTRAINT "LotBatch_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "TankAssignment" ADD CONSTRAINT "TankAssignment_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_sourceLotId_fkey" FOREIGN KEY ("sourceLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destLotId_fkey" FOREIGN KEY ("destLotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "LotReading" ADD CONSTRAINT "LotReading_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE "BlendingConfig" ADD CONSTRAINT "BlendingConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;













