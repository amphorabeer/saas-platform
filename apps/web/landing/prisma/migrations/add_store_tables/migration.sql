-- Migration: Add Store-related tables to ep-weathered-haze (landing DB)
-- Source: packages/database/prisma/schema.prisma
-- Does NOT alter existing tables (Organization, User, Store, StoreEmployee, etc.)

-- ============================================
-- ENUMS (create only if not exists)
-- ============================================

DO $$ BEGIN
  CREATE TYPE "LoyaltyTier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "LoyaltyTransactionType" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'EXPIRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TransferOrderStatus" AS ENUM ('DRAFT', 'SENT', 'RECEIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreSaleStatus" AS ENUM ('COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIAL_REFUND');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreReturnStatus" AS ENUM ('STORE_RETURN_PENDING', 'STORE_RETURN_APPROVED', 'STORE_RETURN_COMPLETED', 'STORE_RETURN_REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StorePurchaseStatus" AS ENUM ('STORE_PO_DRAFT', 'STORE_PO_ORDERED', 'STORE_PO_PARTIAL', 'STORE_PO_RECEIVED', 'STORE_PO_CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreMovementType" AS ENUM ('STOCK_IN', 'STOCK_OUT', 'STOCK_ADJUSTMENT', 'STOCK_TRANSFER', 'STOCK_RETURN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreDiscountType" AS ENUM ('DISCOUNT_PERCENTAGE', 'DISCOUNT_FIXED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreRole" AS ENUM ('STORE_OWNER', 'STORE_MANAGER', 'STORE_CASHIER', 'STORE_INVENTORY_CLERK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreDeviceType" AS ENUM ('RECEIPT_PRINTER', 'FISCAL_PRINTER', 'BARCODE_SCANNER', 'WEIGHT_SCALE', 'CASH_DRAWER', 'BANK_TERMINAL', 'CUSTOMER_DISPLAY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StoreIntegrationType" AS ENUM ('RS_GE', 'WOOCOMMERCE', 'SHOPIFY', 'GLOVO', 'EXTRA_GE', 'BANK_TBC', 'BANK_BOG', 'BANK_LIBERTY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'CARD', 'CHECK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================
-- TABLES (IF NOT EXISTS - skips existing)
-- ============================================

-- Store (in case not yet created)
CREATE TABLE IF NOT EXISTS "Store" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "address" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "taxId" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'GEL',
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
  "logoUrl" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Store_slug_key" ON "Store"("slug");
CREATE INDEX IF NOT EXISTS "Store_tenantId_idx" ON "Store"("tenantId");

-- StoreEmployee (in case not yet created)
CREATE TABLE IF NOT EXISTS "StoreEmployee" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "role" TEXT NOT NULL DEFAULT 'STORE_CASHIER',
  "pin" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreEmployee_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "StoreEmployee_storeId_idx" ON "StoreEmployee"("storeId");

-- ProductCategory
CREATE TABLE IF NOT EXISTS "ProductCategory" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameKa" TEXT,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "parentId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- StoreTaxRule
CREATE TABLE IF NOT EXISTS "StoreTaxRule" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rate" DECIMAL(5,2) NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "StoreTaxRule_pkey" PRIMARY KEY ("id")
);

-- StoreProduct
CREATE TABLE IF NOT EXISTS "StoreProduct" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "categoryId" TEXT,
  "sku" TEXT NOT NULL,
  "barcode" TEXT,
  "name" TEXT NOT NULL,
  "nameKa" TEXT,
  "description" TEXT,
  "imageUrl" TEXT,
  "costPrice" DECIMAL(10,2) NOT NULL,
  "sellingPrice" DECIMAL(10,2) NOT NULL,
  "wholesalePrice" DECIMAL(10,2),
  "currentStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "minStock" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "maxStock" DECIMAL(10,3),
  "unit" TEXT NOT NULL DEFAULT 'piece',
  "taxRuleId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isFavorite" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- StorePriceHistory
CREATE TABLE IF NOT EXISTS "StorePriceHistory" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "costPrice" DECIMAL(10,2) NOT NULL,
  "sellingPrice" DECIMAL(10,2) NOT NULL,
  "changedBy" TEXT,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorePriceHistory_pkey" PRIMARY KEY ("id")
);

-- StoreSupplier
CREATE TABLE IF NOT EXISTS "StoreSupplier" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactPerson" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "bankAccount" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreSupplier_pkey" PRIMARY KEY ("id")
);

-- StoreCustomer
CREATE TABLE IF NOT EXISTS "StoreCustomer" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "notes" TEXT,
  "totalPurchases" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
  "loyaltyTier" "LoyaltyTier" NOT NULL DEFAULT 'BRONZE',
  "totalLifetimePurchases" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreCustomer_pkey" PRIMARY KEY ("id")
);

-- Sale
CREATE TABLE IF NOT EXISTS "Sale" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "saleNumber" TEXT NOT NULL,
  "customerId" TEXT,
  "employeeId" TEXT,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "discountType" "StoreDiscountType",
  "total" DECIMAL(10,2) NOT NULL,
  "paidAmount" DECIMAL(10,2) NOT NULL,
  "changeAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "status" "StoreSaleStatus" NOT NULL DEFAULT 'COMPLETED',
  "notes" TEXT,
  "receiptPrinted" BOOLEAN NOT NULL DEFAULT false,
  "fiscalPrinted" BOOLEAN NOT NULL DEFAULT false,
  "fiscalNumber" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- SaleItem
CREATE TABLE IF NOT EXISTS "SaleItem" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "productName" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unitPrice" DECIMAL(10,2) NOT NULL,
  "costPrice" DECIMAL(10,2) NOT NULL,
  "discount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "SaleItem_pkey" PRIMARY KEY ("id")
);

-- SalePayment
CREATE TABLE IF NOT EXISTS "SalePayment" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "reference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalePayment_pkey" PRIMARY KEY ("id")
);

-- SaleReturn
CREATE TABLE IF NOT EXISTS "SaleReturn" (
  "id" TEXT NOT NULL,
  "saleId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "refundAmount" DECIMAL(10,2) NOT NULL,
  "refundMethod" "PaymentMethod" NOT NULL,
  "status" "StoreReturnStatus" NOT NULL DEFAULT 'STORE_RETURN_PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "SaleReturn_pkey" PRIMARY KEY ("id")
);

-- SaleReturnItem
CREATE TABLE IF NOT EXISTS "SaleReturnItem" (
  "id" TEXT NOT NULL,
  "returnId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "refundAmount" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "SaleReturnItem_pkey" PRIMARY KEY ("id")
);

-- StorePurchaseOrder
CREATE TABLE IF NOT EXISTS "StorePurchaseOrder" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "supplierId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "subtotal" DECIMAL(10,2) NOT NULL,
  "taxAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL,
  "status" "StorePurchaseStatus" NOT NULL DEFAULT 'STORE_PO_DRAFT',
  "notes" TEXT,
  "expectedDate" TIMESTAMP(3),
  "receivedDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StorePurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- StorePurchaseItem
CREATE TABLE IF NOT EXISTS "StorePurchaseItem" (
  "id" TEXT NOT NULL,
  "purchaseOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unitCost" DECIMAL(10,2) NOT NULL,
  "receivedQty" DECIMAL(10,3) NOT NULL DEFAULT 0,
  "total" DECIMAL(10,2) NOT NULL,
  CONSTRAINT "StorePurchaseItem_pkey" PRIMARY KEY ("id")
);

-- StockMovement
CREATE TABLE IF NOT EXISTS "StockMovement" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" "StoreMovementType" NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "previousStock" DECIMAL(10,3) NOT NULL,
  "newStock" DECIMAL(10,3) NOT NULL,
  "reason" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "performedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- TransferOrder
CREATE TABLE IF NOT EXISTS "TransferOrder" (
  "id" TEXT NOT NULL,
  "fromStoreId" TEXT NOT NULL,
  "toStoreId" TEXT NOT NULL,
  "transferNumber" TEXT NOT NULL,
  "status" "TransferOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "sentAt" TIMESTAMP(3),
  "receivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TransferOrder_pkey" PRIMARY KEY ("id")
);

-- TransferOrderItem
CREATE TABLE IF NOT EXISTS "TransferOrderItem" (
  "id" TEXT NOT NULL,
  "transferOrderId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unitCost" DECIMAL(10,2),
  CONSTRAINT "TransferOrderItem_pkey" PRIMARY KEY ("id")
);

-- StoreLoyaltyConfig
CREATE TABLE IF NOT EXISTS "StoreLoyaltyConfig" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "pointsPerGel" INTEGER NOT NULL DEFAULT 1,
  "redemptionRate" INTEGER NOT NULL DEFAULT 100,
  "minRedemptionPoints" INTEGER NOT NULL DEFAULT 100,
  "expirationDays" INTEGER,
  "bronzeMinSpend" DECIMAL(12,2),
  "silverMinSpend" DECIMAL(12,2),
  "goldMinSpend" DECIMAL(12,2),
  "platinumMinSpend" DECIMAL(12,2),
  "goldDiscountPercent" DECIMAL(5,2),
  "platinumDiscountPercent" DECIMAL(5,2),
  CONSTRAINT "StoreLoyaltyConfig_pkey" PRIMARY KEY ("id")
);

-- StoreLoyaltyTransaction
CREATE TABLE IF NOT EXISTS "StoreLoyaltyTransaction" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "type" "LoyaltyTransactionType" NOT NULL,
  "points" INTEGER NOT NULL,
  "saleId" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreLoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- StorePaymentConfig
CREATE TABLE IF NOT EXISTS "StorePaymentConfig" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "PaymentMethod" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "StorePaymentConfig_pkey" PRIMARY KEY ("id")
);

-- StoreReceiptConfig
CREATE TABLE IF NOT EXISTS "StoreReceiptConfig" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "headerText" TEXT,
  "footerText" TEXT,
  "showLogo" BOOLEAN NOT NULL DEFAULT true,
  "showTaxId" BOOLEAN NOT NULL DEFAULT true,
  "showBarcode" BOOLEAN NOT NULL DEFAULT false,
  "paperWidth" INTEGER NOT NULL DEFAULT 80,
  CONSTRAINT "StoreReceiptConfig_pkey" PRIMARY KEY ("id")
);

-- StoreDeviceConfig
CREATE TABLE IF NOT EXISTS "StoreDeviceConfig" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "deviceType" "StoreDeviceType" NOT NULL,
  "name" TEXT NOT NULL,
  "connectionType" TEXT NOT NULL,
  "settings" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreDeviceConfig_pkey" PRIMARY KEY ("id")
);

-- StoreIntegration
CREATE TABLE IF NOT EXISTS "StoreIntegration" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "type" "StoreIntegrationType" NOT NULL,
  "name" TEXT NOT NULL,
  "credentials" JSONB,
  "settings" JSONB,
  "lastSyncAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StoreIntegration_pkey" PRIMARY KEY ("id")
);

-- ============================================
-- FOREIGN KEYS & INDEXES
-- ============================================

-- StoreEmployee -> Store (if not already present)
DO $$ BEGIN
  ALTER TABLE "StoreEmployee" ADD CONSTRAINT "StoreEmployee_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ProductCategory
DO $$ BEGIN
  ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCategory_storeId_slug_key" ON "ProductCategory"("storeId", "slug");
CREATE INDEX IF NOT EXISTS "ProductCategory_storeId_idx" ON "ProductCategory"("storeId");

-- StoreTaxRule
DO $$ BEGIN
  ALTER TABLE "StoreTaxRule" ADD CONSTRAINT "StoreTaxRule_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StoreTaxRule_storeId_idx" ON "StoreTaxRule"("storeId");

-- StoreProduct
DO $$ BEGIN
  ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_taxRuleId_fkey" FOREIGN KEY ("taxRuleId") REFERENCES "StoreTaxRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "StoreProduct_storeId_sku_key" ON "StoreProduct"("storeId", "sku");
CREATE INDEX IF NOT EXISTS "StoreProduct_storeId_idx" ON "StoreProduct"("storeId");
CREATE INDEX IF NOT EXISTS "StoreProduct_categoryId_idx" ON "StoreProduct"("categoryId");
CREATE INDEX IF NOT EXISTS "StoreProduct_barcode_idx" ON "StoreProduct"("barcode");

-- StorePriceHistory
DO $$ BEGIN
  ALTER TABLE "StorePriceHistory" ADD CONSTRAINT "StorePriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StorePriceHistory_productId_idx" ON "StorePriceHistory"("productId");

-- StoreSupplier
DO $$ BEGIN
  ALTER TABLE "StoreSupplier" ADD CONSTRAINT "StoreSupplier_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "StoreSupplier_storeId_name_key" ON "StoreSupplier"("storeId", "name");
CREATE INDEX IF NOT EXISTS "StoreSupplier_storeId_idx" ON "StoreSupplier"("storeId");

-- StoreCustomer
DO $$ BEGIN
  ALTER TABLE "StoreCustomer" ADD CONSTRAINT "StoreCustomer_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StoreCustomer_storeId_idx" ON "StoreCustomer"("storeId");
CREATE INDEX IF NOT EXISTS "StoreCustomer_phone_idx" ON "StoreCustomer"("phone");

-- Sale
DO $$ BEGIN
  ALTER TABLE "Sale" ADD CONSTRAINT "Sale_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "StoreCustomer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "Sale" ADD CONSTRAINT "Sale_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "StoreEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_storeId_saleNumber_key" ON "Sale"("storeId", "saleNumber");
CREATE INDEX IF NOT EXISTS "Sale_storeId_idx" ON "Sale"("storeId");
CREATE INDEX IF NOT EXISTS "Sale_storeId_createdAt_idx" ON "Sale"("storeId", "createdAt");
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx" ON "Sale"("customerId");

-- SaleItem
DO $$ BEGIN
  ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "SaleItem_saleId_idx" ON "SaleItem"("saleId");
CREATE INDEX IF NOT EXISTS "SaleItem_productId_idx" ON "SaleItem"("productId");

-- SalePayment
DO $$ BEGIN
  ALTER TABLE "SalePayment" ADD CONSTRAINT "SalePayment_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "SalePayment_saleId_idx" ON "SalePayment"("saleId");

-- SaleReturn
DO $$ BEGIN
  ALTER TABLE "SaleReturn" ADD CONSTRAINT "SaleReturn_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "SaleReturn_saleId_idx" ON "SaleReturn"("saleId");

-- SaleReturnItem
DO $$ BEGIN
  ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "SaleReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "SaleReturnItem" ADD CONSTRAINT "SaleReturnItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "SaleReturnItem_returnId_idx" ON "SaleReturnItem"("returnId");
CREATE INDEX IF NOT EXISTS "SaleReturnItem_productId_idx" ON "SaleReturnItem"("productId");

-- StorePurchaseOrder
DO $$ BEGIN
  ALTER TABLE "StorePurchaseOrder" ADD CONSTRAINT "StorePurchaseOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StorePurchaseOrder" ADD CONSTRAINT "StorePurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "StoreSupplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "StorePurchaseOrder_storeId_orderNumber_key" ON "StorePurchaseOrder"("storeId", "orderNumber");
CREATE INDEX IF NOT EXISTS "StorePurchaseOrder_storeId_idx" ON "StorePurchaseOrder"("storeId");
CREATE INDEX IF NOT EXISTS "StorePurchaseOrder_supplierId_idx" ON "StorePurchaseOrder"("supplierId");

-- StorePurchaseItem
DO $$ BEGIN
  ALTER TABLE "StorePurchaseItem" ADD CONSTRAINT "StorePurchaseItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "StorePurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StorePurchaseItem" ADD CONSTRAINT "StorePurchaseItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StorePurchaseItem_purchaseOrderId_idx" ON "StorePurchaseItem"("purchaseOrderId");
CREATE INDEX IF NOT EXISTS "StorePurchaseItem_productId_idx" ON "StorePurchaseItem"("productId");

-- StockMovement
DO $$ BEGIN
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StockMovement_storeId_idx" ON "StockMovement"("storeId");
CREATE INDEX IF NOT EXISTS "StockMovement_productId_idx" ON "StockMovement"("productId");
CREATE INDEX IF NOT EXISTS "StockMovement_storeId_createdAt_idx" ON "StockMovement"("storeId", "createdAt");

-- TransferOrder
DO $$ BEGIN
  ALTER TABLE "TransferOrder" ADD CONSTRAINT "TransferOrder_fromStoreId_fkey" FOREIGN KEY ("fromStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TransferOrder" ADD CONSTRAINT "TransferOrder_toStoreId_fkey" FOREIGN KEY ("toStoreId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- TransferOrderItem
DO $$ BEGIN
  ALTER TABLE "TransferOrderItem" ADD CONSTRAINT "TransferOrderItem_transferOrderId_fkey" FOREIGN KEY ("transferOrderId") REFERENCES "TransferOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "TransferOrderItem" ADD CONSTRAINT "TransferOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "StoreProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "TransferOrderItem_transferOrderId_idx" ON "TransferOrderItem"("transferOrderId");
CREATE INDEX IF NOT EXISTS "TransferOrderItem_productId_idx" ON "TransferOrderItem"("productId");

-- StoreLoyaltyConfig
DO $$ BEGIN
  ALTER TABLE "StoreLoyaltyConfig" ADD CONSTRAINT "StoreLoyaltyConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "StoreLoyaltyConfig_storeId_key" ON "StoreLoyaltyConfig"("storeId");

-- StoreLoyaltyTransaction
DO $$ BEGIN
  ALTER TABLE "StoreLoyaltyTransaction" ADD CONSTRAINT "StoreLoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "StoreCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- StorePaymentConfig
DO $$ BEGIN
  ALTER TABLE "StorePaymentConfig" ADD CONSTRAINT "StorePaymentConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StorePaymentConfig_storeId_idx" ON "StorePaymentConfig"("storeId");

-- StoreReceiptConfig
DO $$ BEGIN
  ALTER TABLE "StoreReceiptConfig" ADD CONSTRAINT "StoreReceiptConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "StoreReceiptConfig_storeId_key" ON "StoreReceiptConfig"("storeId");

-- StoreDeviceConfig
DO $$ BEGIN
  ALTER TABLE "StoreDeviceConfig" ADD CONSTRAINT "StoreDeviceConfig_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StoreDeviceConfig_storeId_idx" ON "StoreDeviceConfig"("storeId");

-- StoreIntegration
DO $$ BEGIN
  ALTER TABLE "StoreIntegration" ADD CONSTRAINT "StoreIntegration_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "StoreIntegration_storeId_idx" ON "StoreIntegration"("storeId");
