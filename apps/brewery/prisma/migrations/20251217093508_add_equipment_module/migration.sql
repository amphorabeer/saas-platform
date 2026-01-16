-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InventoryCategory" AS ENUM ('RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD', 'CONSUMABLE');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('PURCHASE', 'CONSUMPTION', 'PRODUCTION', 'ADJUSTMENT', 'ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'WASTE', 'SALE', 'RETURN', 'REVERSAL', 'TRANSFER');

-- CreateEnum
CREATE TYPE "IngredientCategory" AS ENUM ('MALT', 'HOPS', 'YEAST', 'ADJUNCT', 'WATER_CHEMISTRY');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('PLANNED', 'BREWING', 'FERMENTING', 'CONDITIONING', 'READY', 'PACKAGING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TimelineEventType" AS ENUM ('CREATED', 'STARTED', 'MASH', 'BOIL', 'TRANSFER', 'GRAVITY_READING', 'DRY_HOP', 'TEMPERATURE_CHANGE', 'NOTE', 'COMPLETED', 'INGREDIENTS_RESERVED', 'BREWING_STARTED', 'MASH_COMPLETE', 'BOIL_COMPLETE', 'TRANSFER_TO_FERMENTER', 'FERMENTATION_STARTED', 'DRY_HOP_ADDED', 'CONDITIONING_STARTED', 'READY_FOR_PACKAGING', 'PACKAGING_STARTED', 'PACKAGING_COMPLETE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TankType" AS ENUM ('FERMENTER', 'BRITE', 'UNITANK', 'KETTLE', 'MASH_TUN', 'HLT');

-- CreateEnum
CREATE TYPE "TankStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "OccupationPhase" AS ENUM ('FERMENTATION', 'CONDITIONING', 'STORAGE');

-- CreateEnum
CREATE TYPE "PackageType" AS ENUM ('KEG_50', 'KEG_30', 'KEG_20', 'BOTTLE_750', 'BOTTLE_500', 'BOTTLE_330', 'CAN_500', 'CAN_330');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('RETAIL', 'WHOLESALE', 'DISTRIBUTOR', 'RESTAURANT', 'BAR', 'EXPORT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'DRAFT', 'PROCESSING');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('FERMENTER', 'UNITANK', 'BRITE', 'KETTLE', 'MASH_TUN', 'HLT', 'PUMP', 'CHILLER', 'FILTER', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('OPERATIONAL', 'NEEDS_MAINTENANCE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE');

-- CreateEnum
CREATE TYPE "TankCapability" AS ENUM ('FERMENTING', 'CONDITIONING');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL DEFAULT 'STARTER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdBy" TEXT,
    "name" TEXT NOT NULL,
    "style" TEXT,
    "abv" DECIMAL(4,2),
    "ibu" INTEGER,
    "color" INTEGER,
    "og" DECIMAL(5,4),
    "fg" DECIMAL(5,4),
    "batchSize" DECIMAL(10,2),
    "boilTime" INTEGER,
    "efficiency" DECIMAL(5,2),
    "description" TEXT,
    "notes" TEXT,
    "process" JSONB,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "name" TEXT NOT NULL,
    "category" "IngredientCategory" NOT NULL,
    "amount" DECIMAL(10,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "additionTime" INTEGER,
    "specs" JSONB,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "InventoryCategory" NOT NULL DEFAULT 'RAW_MATERIAL',
    "ingredientType" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'kg',
    "reorderPoint" DECIMAL(10,3),
    "supplier" TEXT,
    "location" TEXT,
    "specs" JSONB,
    "cachedBalance" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "costPerUnit" DECIMAL(10,4),
    "balanceUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLedger" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "batchId" TEXT,
    "orderId" TEXT,
    "packagingId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'PLANNED',
    "volume" DECIMAL(10,2) NOT NULL,
    "originalGravity" DECIMAL(5,4),
    "currentGravity" DECIMAL(5,4),
    "finalGravity" DECIMAL(5,4),
    "abv" DECIMAL(4,2),
    "tankId" TEXT,
    "plannedDate" TIMESTAMP(3) NOT NULL,
    "brewedAt" TIMESTAMP(3),
    "fermentationStartedAt" TIMESTAMP(3),
    "conditioningStartedAt" TIMESTAMP(3),
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchIngredient" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "name" TEXT NOT NULL,
    "category" "IngredientCategory" NOT NULL,
    "plannedAmount" DECIMAL(10,3) NOT NULL,
    "actualAmount" DECIMAL(10,3),
    "unit" TEXT NOT NULL,
    "lotNumber" TEXT,
    "addedAt" TIMESTAMP(3),

    CONSTRAINT "BatchIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GravityReading" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "gravity" DECIMAL(5,4) NOT NULL,
    "temperature" DECIMAL(4,1) NOT NULL,
    "notes" TEXT,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GravityReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchTimeline" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "type" "TimelineEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "data" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchTimeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tank" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TankType" NOT NULL,
    "capacity" DECIMAL(10,2) NOT NULL,
    "status" "TankStatus" NOT NULL DEFAULT 'AVAILABLE',
    "currentBatchId" TEXT,
    "location" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TankOccupation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "phase" "OccupationPhase" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "TankOccupation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackagingRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "volumeTotal" DECIMAL(10,2) NOT NULL,
    "lotNumber" TEXT,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackagingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL DEFAULT 'RETAIL',
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "taxId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "orderedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "packageType" "PackageType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(12,2) NOT NULL,
    "batchId" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "metadata" JSONB,
    "correlationId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngredientCatalog" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'grain',
    "name" TEXT NOT NULL,
    "supplier" TEXT,
    "origin" TEXT,
    "specs" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngredientCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "EquipmentType" NOT NULL,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "capacity" INTEGER,
    "model" TEXT,
    "manufacturer" TEXT,
    "serialNumber" TEXT,
    "location" TEXT,
    "workingPressure" DOUBLE PRECISION,
    "currentTemp" DOUBLE PRECISION,
    "currentPressure" DOUBLE PRECISION,
    "capabilities" "TankCapability"[],
    "installationDate" TIMESTAMP(3),
    "warrantyDate" TIMESTAMP(3),
    "lastCIP" TIMESTAMP(3),
    "nextCIP" TIMESTAMP(3),
    "lastMaintenance" TIMESTAMP(3),
    "nextMaintenance" TIMESTAMP(3),
    "cipIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "inspectionIntervalDays" INTEGER NOT NULL DEFAULT 30,
    "annualMaintenanceDays" INTEGER NOT NULL DEFAULT 365,
    "currentBatchId" TEXT,
    "currentBatchNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "duration" INTEGER,
    "performedBy" TEXT,
    "cost" DOUBLE PRECISION,
    "partsUsed" TEXT[],
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CIPLog" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "cipType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "temperature" DOUBLE PRECISION,
    "causticConcentration" DOUBLE PRECISION,
    "performedBy" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CIPLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemReport" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "problemType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "description" TEXT NOT NULL,
    "reportedDate" TIMESTAMP(3) NOT NULL,
    "reportedBy" TEXT NOT NULL,
    "resolvedDate" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Recipe_tenantId_isActive_idx" ON "Recipe"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_tenantId_name_key" ON "Recipe"("tenantId", "name");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_inventoryItemId_idx" ON "RecipeIngredient"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_category_isActive_idx" ON "InventoryItem"("tenantId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_tenantId_sku_key" ON "InventoryItem"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "InventoryLedger_tenantId_itemId_createdAt_idx" ON "InventoryLedger"("tenantId", "itemId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLedger_tenantId_batchId_idx" ON "InventoryLedger"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "InventoryLedger_tenantId_createdAt_idx" ON "InventoryLedger"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLedger_itemId_idx" ON "InventoryLedger"("itemId");

-- CreateIndex
CREATE INDEX "Batch_tenantId_status_idx" ON "Batch"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Batch_tenantId_tankId_idx" ON "Batch"("tenantId", "tankId");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_tenantId_batchNumber_key" ON "Batch"("tenantId", "batchNumber");

-- CreateIndex
CREATE INDEX "BatchIngredient_batchId_idx" ON "BatchIngredient"("batchId");

-- CreateIndex
CREATE INDEX "GravityReading_batchId_recordedAt_idx" ON "GravityReading"("batchId", "recordedAt");

-- CreateIndex
CREATE INDEX "BatchTimeline_batchId_createdAt_idx" ON "BatchTimeline"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "Tank_tenantId_status_idx" ON "Tank"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Tank_tenantId_name_key" ON "Tank"("tenantId", "name");

-- CreateIndex
CREATE INDEX "TankOccupation_tenantId_tankId_endedAt_idx" ON "TankOccupation"("tenantId", "tankId", "endedAt");

-- CreateIndex
CREATE INDEX "PackagingRun_tenantId_batchId_idx" ON "PackagingRun"("tenantId", "batchId");

-- CreateIndex
CREATE INDEX "Customer_tenantId_isActive_idx" ON "Customer"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_tenantId_name_key" ON "Customer"("tenantId", "name");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_status_idx" ON "SalesOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_customerId_idx" ON "SalesOrder"("tenantId", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_tenantId_orderNumber_key" ON "SalesOrder"("tenantId", "orderNumber");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_userId_idx" ON "AuditLog"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "IngredientCatalog_type_isActive_idx" ON "IngredientCatalog"("type", "isActive");

-- CreateIndex
CREATE INDEX "Equipment_tenantId_idx" ON "Equipment"("tenantId");

-- CreateIndex
CREATE INDEX "Equipment_type_idx" ON "Equipment"("type");

-- CreateIndex
CREATE INDEX "Equipment_status_idx" ON "Equipment"("status");

-- CreateIndex
CREATE INDEX "MaintenanceLog_equipmentId_idx" ON "MaintenanceLog"("equipmentId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_status_idx" ON "MaintenanceLog"("status");

-- CreateIndex
CREATE INDEX "CIPLog_equipmentId_idx" ON "CIPLog"("equipmentId");

-- CreateIndex
CREATE INDEX "CIPLog_date_idx" ON "CIPLog"("date");

-- CreateIndex
CREATE INDEX "ProblemReport_equipmentId_idx" ON "ProblemReport"("equipmentId");

-- CreateIndex
CREATE INDEX "ProblemReport_status_idx" ON "ProblemReport"("status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLedger" ADD CONSTRAINT "InventoryLedger_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchIngredient" ADD CONSTRAINT "BatchIngredient_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GravityReading" ADD CONSTRAINT "GravityReading_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchTimeline" ADD CONSTRAINT "BatchTimeline_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tank" ADD CONSTRAINT "Tank_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TankOccupation" ADD CONSTRAINT "TankOccupation_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "Tank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackagingRun" ADD CONSTRAINT "PackagingRun_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrder" ADD CONSTRAINT "SalesOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CIPLog" ADD CONSTRAINT "CIPLog_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProblemReport" ADD CONSTRAINT "ProblemReport_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
