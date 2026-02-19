-- Manual migration: add finance module tables and enums.
-- Run this on the database if using shared DB (e.g. from landing).
-- Creates: Supplier, RestaurantInvoice, RestaurantInvoiceItem, RestaurantInvoicePayment, PurchaseInvoice, PurchaseInvoiceItem, PurchasePayment, ExpenseCategory, Expense + enums.

-- Enums
CREATE TYPE "InvoiceType" AS ENUM ('SALE', 'PROFORMA', 'CREDIT');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PurchaseStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL', 'OVERDUE', 'CANCELLED');

-- Supplier
CREATE TABLE "Supplier" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "taxId" TEXT,
  "contact" TEXT,
  "email" TEXT,
  "address" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Supplier_restaurantId_idx" ON "Supplier"("restaurantId");

-- RestaurantInvoice (finance module; avoids conflict with SaaS Invoice)
CREATE TABLE "RestaurantInvoice" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "type" "InvoiceType" NOT NULL DEFAULT 'SALE',
  "customerName" TEXT NOT NULL,
  "customerPhone" TEXT,
  "customerEmail" TEXT,
  "customerAddress" TEXT,
  "customerTaxId" TEXT,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "notes" TEXT,
  "orderId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RestaurantInvoice_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RestaurantInvoice" ADD CONSTRAINT "RestaurantInvoice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RestaurantInvoice" ADD CONSTRAINT "RestaurantInvoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RestaurantOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "RestaurantInvoice_restaurantId_invoiceNumber_key" ON "RestaurantInvoice"("restaurantId", "invoiceNumber");
CREATE INDEX "RestaurantInvoice_restaurantId_idx" ON "RestaurantInvoice"("restaurantId");
CREATE INDEX "RestaurantInvoice_status_idx" ON "RestaurantInvoice"("status");
CREATE INDEX "RestaurantInvoice_dueDate_idx" ON "RestaurantInvoice"("dueDate");

-- RestaurantInvoiceItem
CREATE TABLE "RestaurantInvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT "RestaurantInvoiceItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RestaurantInvoiceItem" ADD CONSTRAINT "RestaurantInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "RestaurantInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RestaurantInvoiceItem_invoiceId_idx" ON "RestaurantInvoiceItem"("invoiceId");

-- RestaurantInvoicePayment
CREATE TABLE "RestaurantInvoicePayment" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "RestaurantInvoicePayment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RestaurantInvoicePayment" ADD CONSTRAINT "RestaurantInvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "RestaurantInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "RestaurantInvoicePayment_invoiceId_idx" ON "RestaurantInvoicePayment"("invoiceId");

-- PurchaseInvoice
CREATE TABLE "PurchaseInvoice" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "invoiceNumber" TEXT NOT NULL,
  "supplierId" TEXT,
  "supplierName" TEXT NOT NULL,
  "supplierTaxId" TEXT,
  "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dueDate" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "taxAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "attachmentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "PurchaseInvoice_restaurantId_idx" ON "PurchaseInvoice"("restaurantId");
CREATE INDEX "PurchaseInvoice_supplierId_idx" ON "PurchaseInvoice"("supplierId");
CREATE INDEX "PurchaseInvoice_status_idx" ON "PurchaseInvoice"("status");

-- PurchaseInvoiceItem
CREATE TABLE "PurchaseInvoiceItem" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "ingredientId" TEXT,
  "description" TEXT NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
  "unit" TEXT,
  "unitPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "totalPrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
  CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "PurchaseInvoiceItem_purchaseId_idx" ON "PurchaseInvoiceItem"("purchaseId");

-- PurchasePayment
CREATE TABLE "PurchasePayment" (
  "id" TEXT NOT NULL,
  "purchaseId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "notes" TEXT,
  CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "PurchasePayment_purchaseId_idx" ON "PurchasePayment"("purchaseId");

-- ExpenseCategory
CREATE TABLE "ExpenseCategory" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "icon" TEXT,
  "color" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ExpenseCategory_restaurantId_name_key" ON "ExpenseCategory"("restaurantId", "name");
CREATE INDEX "ExpenseCategory_restaurantId_idx" ON "ExpenseCategory"("restaurantId");

-- Expense
CREATE TABLE "Expense" (
  "id" TEXT NOT NULL,
  "restaurantId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "date" DATE NOT NULL,
  "isRecurring" BOOLEAN NOT NULL DEFAULT false,
  "recurringType" TEXT,
  "paymentMethod" TEXT,
  "notes" TEXT,
  "attachmentUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Expense_restaurantId_idx" ON "Expense"("restaurantId");
CREATE INDEX "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX "Expense_date_idx" ON "Expense"("date");
