-- CreateEnum
CREATE TYPE "HaccpJournalType" AS ENUM ('SANITATION', 'INCOMING_CONTROL', 'PEST_CONTROL', 'WASTE_MANAGEMENT', 'TEMPERATURE', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "CcpType" AS ENUM ('BOILING', 'VESSEL_SANITATION');

-- CreateEnum
CREATE TYPE "CcpResult" AS ENUM ('PASS', 'FAIL', 'CORRECTIVE_ACTION');

-- CreateEnum
CREATE TYPE "SopType" AS ENUM ('CLEANING', 'CALIBRATION', 'PERSONNEL_HYGIENE', 'HAND_WASHING', 'WASTE', 'PEST', 'CHEMICALS');

-- CreateTable
CREATE TABLE "HaccpJournal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "HaccpJournalType" NOT NULL,
    "data" JSONB NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HaccpJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CcpLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ccpType" "CcpType" NOT NULL,
    "batchId" TEXT,
    "temperature" DOUBLE PRECISION,
    "duration" INTEGER,
    "phLevel" DOUBLE PRECISION,
    "visualCheck" BOOLEAN,
    "result" "CcpResult" NOT NULL,
    "correctiveAction" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CcpLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SopCompletion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sopType" "SopType" NOT NULL,
    "completedBy" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SopCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HaccpSupplier" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "products" TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HaccpSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HaccpJournal_tenantId_idx" ON "HaccpJournal"("tenantId");

-- CreateIndex
CREATE INDEX "HaccpJournal_type_idx" ON "HaccpJournal"("type");

-- CreateIndex
CREATE INDEX "HaccpJournal_recordedAt_idx" ON "HaccpJournal"("recordedAt");

-- CreateIndex
CREATE INDEX "CcpLog_tenantId_idx" ON "CcpLog"("tenantId");

-- CreateIndex
CREATE INDEX "CcpLog_batchId_idx" ON "CcpLog"("batchId");

-- CreateIndex
CREATE INDEX "CcpLog_recordedAt_idx" ON "CcpLog"("recordedAt");

-- CreateIndex
CREATE INDEX "SopCompletion_tenantId_idx" ON "SopCompletion"("tenantId");

-- CreateIndex
CREATE INDEX "SopCompletion_sopType_idx" ON "SopCompletion"("sopType");

-- CreateIndex
CREATE INDEX "SopCompletion_completedAt_idx" ON "SopCompletion"("completedAt");

-- CreateIndex
CREATE INDEX "HaccpSupplier_tenantId_idx" ON "HaccpSupplier"("tenantId");

-- AddForeignKey
ALTER TABLE "HaccpJournal" ADD CONSTRAINT "HaccpJournal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaccpJournal" ADD CONSTRAINT "HaccpJournal_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcpLog" ADD CONSTRAINT "CcpLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcpLog" ADD CONSTRAINT "CcpLog_recordedBy_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CcpLog" ADD CONSTRAINT "CcpLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopCompletion" ADD CONSTRAINT "SopCompletion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SopCompletion" ADD CONSTRAINT "SopCompletion_completedBy_fkey" FOREIGN KEY ("completedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HaccpSupplier" ADD CONSTRAINT "HaccpSupplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
