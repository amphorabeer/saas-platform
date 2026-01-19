# Brewery Project Structure

This document provides a comprehensive overview of the Brewery Management System codebase structure, database models, API routes, and finance-related components.

## Project Overview

The brewery system is a multi-tenant SaaS application built with Next.js, TypeScript, Prisma, and PostgreSQL. It manages the complete brewing lifecycle from recipe management to sales and inventory tracking.

---

## 1. File Structure (TypeScript/TSX Files)

### Core Application Files
```
apps/brewery/src/
├── middleware.ts                    # Next.js middleware
├── types/index.ts                   # TypeScript type definitions
├── app/
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Dashboard/home page
│   ├── settings/page.tsx            # Settings page
│   │
│   ├── calendar/                    # Calendar & Scheduling
│   │   ├── page.tsx                 # Main calendar view
│   │   ├── OrdersCalendar.tsx
│   │   ├── UpcomingEvents.tsx
│   │   ├── TankTimeline.tsx
│   │   └── ...
│   │
│   ├── sales/                       # Sales Management
│   │   ├── page.tsx                 # Sales dashboard
│   │   ├── customers/
│   │   │   ├── page.tsx             # Customers list
│   │   │   └── [id]/page.tsx        # Customer detail
│   │   ├── products/page.tsx        # Products catalog
│   │   ├── orders/
│   │   │   ├── page.tsx             # Orders list
│   │   │   └── [id]/page.tsx        # Order detail
│   │   └── kegs/page.tsx            # Keg tracking
│   │
│   ├── finances/                    # Financial Management
│   │   ├── page.tsx                 # Finances dashboard
│   │   ├── invoices/page.tsx        # Invoices
│   │   ├── expenses/page.tsx        # Expenses
│   │   ├── income/page.tsx          # Income tracking
│   │   └── reports/page.tsx         # Financial reports
│   │
│   ├── inventory/                   # Inventory Management
│   │   ├── page.tsx                 # Main inventory page
│   │   ├── kegs/page.tsx            # Keg inventory
│   │   └── [id]/page.tsx            # Item detail
│   │
│   ├── production/                  # Production Management
│   │   ├── page.tsx                 # Production overview
│   │   ├── [id]/page.tsx            # Batch detail
│   │   └── lot/[lotId]/page.tsx     # Lot detail
│   │
│   ├── recipes/page.tsx             # Recipe management
│   │
│   ├── quality/                     # Quality Control
│   │   ├── page.tsx
│   │   ├── batches/page.tsx
│   │   └── tests/page.tsx
│   │
│   ├── lots/[lotId]/page.tsx        # Lot tracking
│   ├── fermentation/page.tsx        # Fermentation tracking
│   │
│   └── api/                         # API Routes (see section 3)
│
├── components/
│   ├── layout/                      # Layout components
│   ├── sales/
│   │   └── NewOrderModal.tsx        # Order creation modal
│   ├── inventory/                   # Inventory components
│   ├── production/                  # Production components
│   ├── fermentation/                # Fermentation components
│   ├── finances/                    # Finance components
│   │   ├── TransactionModal.tsx
│   │   ├── PaymentModal.tsx
│   │   ├── InvoiceModal.tsx
│   │   ├── ExpenseCard.tsx
│   │   └── FinancialChart.tsx
│   └── ui/                          # UI components
│
├── lib/                             # Utility libraries
│   ├── api-middleware.ts            # API middleware (withTenant)
│   └── utils.ts                     # Helper functions
│
└── data/
    └── financeData.ts               # Mock finance data
```

---

## 2. Database Schema (Prisma Models)

### Core Models

#### **Tenant** - Multi-tenancy
- `id`, `name`, `slug`, `plan`, `isActive`
- Relations: Users, Batches, Customers, Equipment, Inventory, Kegs, Recipes, Orders, Tanks

#### **User** - Authentication & Authorization
- `id`, `tenantId`, `email`, `name`, `role`, `isActive`
- Roles: OPERATOR, ADMIN, MANAGER

#### **Recipe** - Beer Recipes
- `id`, `tenantId`, `name`, `style`, `abv`, `ibu`, `color`, `og`, `fg`
- Relations: Batches, RecipeIngredients

#### **Batch** - Production Batches
- `id`, `tenantId`, `batchNumber`, `recipeId`, `status`, `volume`, `packagedVolume`
- Status: PLANNED, BREWING, FERMENTING, CONDITIONING, READY, PACKAGING, COMPLETED, CANCELLED
- Relations: Recipe, Tank, Keg, PackagingRun, BatchTimeline, GravityReading

#### **Tank** - Fermentation/Conditioning Tanks
- `id`, `tenantId`, `name`, `type`, `capacity`, `status`
- Types: FERMENTATION, CONDITIONING, BRIGHT, BLENDING
- Relations: Batches, TankAssignments, Occupations

#### **PackagingRun** - Packaging Operations
- `id`, `tenantId`, `batchId`, `packageType`, `quantity`, `volumeTotal`
- Package Types: KEG_50, KEG_30, KEG_20, BOTTLE_750, BOTTLE_500, BOTTLE_330, CAN_500, CAN_330

#### **Keg** - Physical Keg Tracking
- `id`, `tenantId`, `kegNumber`, `size`, `status`, `condition`, `batchId`, `customerId`, `orderId`
- Status: AVAILABLE, FILLED, WITH_CUSTOMER, IN_TRANSIT, CLEANING, DAMAGED, LOST
- Relations: Batch, Customer, KegMovement

#### **KegMovement** - Keg History/Audit
- `id`, `tenantId`, `kegId`, `action`, `fromStatus`, `toStatus`
- Actions: CREATED, FILLED, SHIPPED, RETURNED, CLEANED, DAMAGED, LOST, REPAIRED

#### **Customer** - Customer Management
- `id`, `tenantId`, `name`, `type`, `email`, `phone`, `address`, `city`, `taxId`
- `kegReturnDays`, `kegDepositRequired`
- Types: RETAIL, WHOLESALE, RESTAURANT, BAR
- Relations: Keg, SalesOrder

#### **SalesOrder** - Sales Orders
- `id`, `tenantId`, `orderNumber`, `customerId`, `status`, `paymentStatus`, `totalAmount`
- Status: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED
- Payment Status: PENDING, PARTIAL, PAID, OVERDUE, REFUNDED
- Relations: Customer, OrderItem

#### **OrderItem** - Order Line Items
- `id`, `orderId`, `productName`, `packageType`, `quantity`, `unitPrice`, `totalPrice`, `batchId`
- Relations: SalesOrder

#### **InventoryItem** - Inventory Management
- `id`, `tenantId`, `sku`, `name`, `category`, `ingredientType`, `unit`, `reorderPoint`
- `cachedBalance`, `costPerUnit`, `specs` (JSON)
- Categories: RAW_MATERIAL, PACKAGING, INGREDIENT
- Relations: InventoryLedger, RecipeIngredient

#### **InventoryLedger** - Inventory Transactions
- `id`, `tenantId`, `itemId`, `quantity`, `type`, `batchId`, `orderId`, `packagingId`
- Types: PURCHASE, CONSUMPTION, ADJUSTMENT, WASTE, PRODUCTION
- Relations: InventoryItem, Batch

#### **Lot** - Lot Tracking (Blending)
- `id`, `tenantId`, `lotCode`, `phase`, `status`
- Phases: FERMENTATION, CONDITIONING, BRIGHT, PACKAGED
- Relations: LotBatch, LotReading, TankAssignment, Transfer

#### **Equipment** - Equipment Management
- `id`, `tenantId`, `name`, `type`, `status`, `capacity`, `manufacturer`, `serialNumber`
- Relations: CIPLog, MaintenanceLog, ProblemReport

#### **QCTest** - Quality Control Tests
- `id`, `tenantId`, `batchId`, `lotId`, `testType`, `result`, `notes`

### Finance-Related Models

**Currently, there are NO dedicated finance models in the Prisma schema.** Financial data appears to be:
- Tracked via `SalesOrder` (income) with `paymentStatus` and `totalAmount`
- Tracked via `OrderItem` (product sales) with `unitPrice` and `totalPrice`
- Mock data in `financeData.ts` (expenses, invoices, transactions)

**Potential Finance Models to Add:**
- `Transaction` - General financial transactions
- `Invoice` - Customer invoices (separate from orders)
- `Payment` - Payment records linked to orders/invoices
- `Expense` - Expense tracking
- `Account` - Chart of accounts
- `BankAccount` - Bank account management

---

## 3. API Routes

### Authentication & Health
- `GET/POST /api/auth/[...nextauth]/route.ts` - NextAuth authentication
- `GET /api/health/route.ts` - Health check

### Batches (Production)
- `GET/POST /api/batches/route.ts` - List/create batches
- `GET/PATCH/DELETE /api/batches/[id]/route.ts` - Batch CRUD
- `POST /api/batches/[id]/start-brewing/route.ts`
- `POST /api/batches/[id]/start-fermentation/route.ts`
- `POST /api/batches/[id]/start-packaging/route.ts`
- `POST /api/batches/[id]/transfer-conditioning/route.ts`
- `POST /api/batches/[id]/transfer/route.ts`
- `POST /api/batches/[id]/mark-ready/route.ts`
- `POST /api/batches/[id]/complete/route.ts`
- `POST /api/batches/[id]/cancel/route.ts`
- `POST /api/batches/[id]/gravity/route.ts`
- `GET /api/batches/[id]/gravity-readings/route.ts`
- `GET /api/batches/[id]/timeline/route.ts`
- `GET /api/batches/[id]/lots/route.ts`
- `POST /api/batches/blend/route.ts` - Batch blending

### Recipes
- `GET/POST /api/recipes/route.ts` - List/create recipes
- `GET/PATCH/DELETE /api/recipes/[id]/route.ts` - Recipe CRUD
- `GET/POST /api/recipes/[id]/ingredients/route.ts` - Recipe ingredients
- `GET/PATCH/DELETE /api/recipes/[id]/ingredients/[ingredientId]/route.ts`

### Inventory
- `GET/POST /api/inventory/route.ts` - List/create inventory items
- `GET/PATCH/DELETE /api/inventory/[id]/route.ts` - Item CRUD
- `POST /api/inventory/[id]/purchase/route.ts` - Record purchase
- `POST /api/inventory/[id]/adjust/route.ts` - Manual adjustment
- `POST /api/inventory/[id]/waste/route.ts` - Record waste
- `POST /api/inventory/deduct/route.ts` - Deduct inventory
- `GET /api/inventory/[id]/movements/route.ts` - Item movement history
- `GET/DELETE /api/inventory/[id]/movements/[movementId]/route.ts`
- `GET/PATCH /api/inventory/[id]/specs/route.ts` - Item specifications
- `GET /api/inventory/cleaning/route.ts` - Cleaning supplies
- `GET /api/inventory/manufacturers/route.ts` - Manufacturers list

### Kegs
- `GET/POST /api/kegs/route.ts` - List/create kegs
- `GET/PATCH/DELETE /api/kegs/[id]/route.ts` - Keg CRUD
- `POST /api/kegs/[id]/fill/route.ts` - Fill keg
- `POST /api/kegs/[id]/ship/route.ts` - Ship keg to customer
- `POST /api/kegs/[id]/return/route.ts` - Return keg from customer
- `GET /api/kegs/[id]/movements/route.ts` - Keg movement history
- `POST /api/kegs/assign/route.ts` - Assign kegs to order

### Orders (Sales)
- `GET/POST /api/orders/route.ts` - List/create orders
- Note: Individual order routes are handled via `/api/orders?orderId=[id]`

### Customers
- `GET/POST /api/customers/route.ts` - List/create customers
- `GET/PATCH/DELETE /api/customers/[id]/route.ts` - Customer CRUD

### Products
- `GET /api/products/route.ts` - Finished goods catalog (from PackagingRun + Keg table)
  - Filters: `packageType`, `availableOnly`
  - Returns: Products with `totalProduced`, `soldQuantity`, `availableQuantity`

### Packaging
- `POST /api/packaging/route.ts` - Create packaging run
- `POST /api/packaging/start/route.ts` - Start packaging process

### Fermentation & Conditioning
- `POST /api/fermentation/start/route.ts` - Start fermentation
- `POST /api/conditioning/start/route.ts` - Start conditioning

### Lots (Blending)
- `GET/POST /api/lots/route.ts` - List/create lots
- `GET/PATCH/DELETE /api/lots/[id]/route.ts` - Lot CRUD
- `GET /api/lots/active/route.ts` - Active lots
- `POST /api/lots/phase/route.ts` - Change lot phase

### Tanks
- `GET/POST /api/tanks/route.ts` - List/create tanks
- `GET /api/tanks/availability/route.ts` - Tank availability
- `GET /api/tanks/active-assignments/route.ts` - Active tank assignments

### Tank Assignments
- `POST /api/tank-assignments/[id]/complete/route.ts` - Complete assignment
- `POST /api/tank-assignments/[id]/mark-bright/route.ts` - Mark as bright
- `POST /api/tank-assignments/[id]/start-packaging/route.ts` - Start packaging

### Equipment
- `GET/POST /api/equipment/route.ts` - List/create equipment
- `GET/PATCH/DELETE /api/equipment/[id]/route.ts` - Equipment CRUD
- `GET/POST /api/equipment/[id]/maintenance/route.ts` - Maintenance logs
- `GET/POST /api/equipment/[id]/cip/route.ts` - CIP logs

### Maintenance
- `GET/POST /api/maintenance/route.ts` - Maintenance records

### CIP Logs
- `GET/POST /api/cip-logs/route.ts` - CIP cleaning logs

### Quality Control
- `GET/POST /api/quality/route.ts` - QC tests

### Scheduling & Calendar
- `GET /api/scheduler/calendar/route.ts` - Calendar data
- `POST /api/scheduler/plan-fermentation/route.ts` - Plan fermentation
- `POST /api/scheduler/plan-transfer/route.ts` - Plan transfer
- `POST /api/scheduler/lot/[id]/start/route.ts` - Start lot
- `POST /api/scheduler/lot/[id]/complete/route.ts` - Complete lot
- `GET/PATCH/DELETE /api/scheduler/block/[id]/route.ts` - Calendar blocks
- `GET /api/calendar/assignments/route.ts` - Calendar assignments

### Ingredients Catalog
- `GET /api/ingredients/catalog/route.ts` - Ingredients catalog
- `GET /api/ingredients/catalog-detail/route.ts` - Catalog detail

### Audit
- `GET /api/audit/route.ts` - Audit logs

### Debug (Development)
- `GET /api/debug/all-inventory/route.ts` - Debug inventory
- `GET /api/debug/inventory-item/route.ts` - Debug inventory item

---

## 4. Finance-Related Files

### Frontend Pages
- `apps/brewery/src/app/finances/page.tsx` - Main finances dashboard
- `apps/brewery/src/app/finances/invoices/page.tsx` - Invoices management
- `apps/brewery/src/app/finances/expenses/page.tsx` - Expenses tracking
- `apps/brewery/src/app/finances/income/page.tsx` - Income tracking
- `apps/brewery/src/app/finances/reports/page.tsx` - Financial reports

### Components
- `apps/brewery/src/components/finances/TransactionModal.tsx` - Transaction entry modal
- `apps/brewery/src/components/finances/PaymentModal.tsx` - Payment entry modal
- `apps/brewery/src/components/finances/InvoiceModal.tsx` - Invoice creation modal
- `apps/brewery/src/components/finances/ExpenseCard.tsx` - Expense card component
- `apps/brewery/src/components/finances/FinancialChart.tsx` - Financial charts/graphs
- `apps/brewery/src/components/finances/index.ts` - Component exports

### Data
- `apps/brewery/src/data/financeData.ts` - Mock finance data (transactions, invoices, expenses)

### Archive
- `apps/brewery/src/app/finances.zip` - Archived finance files (if any)

---

## 5. Finance Database Status

### Current State
**No dedicated finance models exist in the Prisma schema.** Financial functionality currently relies on:

1. **SalesOrder Model** (Income):
   - `totalAmount` (Decimal) - Order total
   - `paymentStatus` (enum: PENDING, PARTIAL, PAID, OVERDUE, REFUNDED)
   - `orderedAt`, `shippedAt`, `deliveredAt` (timestamps)

2. **OrderItem Model** (Product Sales):
   - `unitPrice`, `totalPrice` (Decimal)
   - Product sales revenue tracking

3. **Mock Data** (`financeData.ts`):
   - Expenses (by category: ingredients, packaging, salary, rent, utilities, equipment)
   - Invoices (incoming/outgoing)
   - Transactions (income/expense)
   - Monthly financial summaries

### Recommended Finance Models

To fully implement finance functionality, consider adding:

```prisma
model Transaction {
  id          String   @id @default(cuid())
  tenantId    String
  type        TransactionType  // INCOME, EXPENSE, TRANSFER
  category    String?
  amount      Decimal  @db.Decimal(12, 2)
  description String?
  date        DateTime
  accountId   String?
  orderId     String?  // Link to SalesOrder
  invoiceId   String?  // Link to Invoice
  createdBy   String
  createdAt   DateTime @default(now())
  
  account     Account? @relation(...)
  order       SalesOrder? @relation(...)
  invoice     Invoice? @relation(...)
  
  @@index([tenantId, date])
  @@index([tenantId, type])
}

model Invoice {
  id            String   @id @default(cuid())
  tenantId      String
  invoiceNumber String
  customerId    String
  orderId       String?  // Optional link to SalesOrder
  amount        Decimal  @db.Decimal(12, 2)
  paidAmount    Decimal  @default(0) @db.Decimal(12, 2)
  status        InvoiceStatus  // DRAFT, SENT, PAID, OVERDUE, CANCELLED
  dueDate       DateTime?
  issuedAt      DateTime @default(now())
  paidAt        DateTime?
  createdAt     DateTime @default(now())
  
  customer      Customer @relation(...)
  order         SalesOrder? @relation(...)
  payments      Payment[]
  
  @@unique([tenantId, invoiceNumber])
  @@index([tenantId, status])
}

model Payment {
  id          String   @id @default(cuid())
  tenantId    String
  invoiceId   String?
  orderId     String?
  amount      Decimal  @db.Decimal(12, 2)
  method      PaymentMethod  // CASH, BANK_TRANSFER, CARD, CHECK
  reference   String?
  date        DateTime @default(now())
  createdBy   String
  createdAt   DateTime @default(now())
  
  invoice     Invoice? @relation(...)
  order       SalesOrder? @relation(...)
  
  @@index([tenantId, date])
}

model Expense {
  id          String   @id @default(cuid())
  tenantId    String
  category    ExpenseCategory
  vendor      String?
  amount      Decimal  @db.Decimal(12, 2)
  description String?
  receiptUrl  String?
  date        DateTime
  createdBy   String
  createdAt   DateTime @default(now())
  
  @@index([tenantId, date])
  @@index([tenantId, category])
}

model Account {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  type        AccountType  // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  balance     Decimal  @default(0) @db.Decimal(12, 2)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  transactions Transaction[]
  
  @@unique([tenantId, name])
}
```

---

## 6. Key Technologies & Patterns

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS (custom theme)

### Key Patterns
- **Multi-tenancy**: All models include `tenantId`, filtered via `withTenant` middleware
- **Audit Trail**: `AuditLog` model for system-wide audit logging
- **Inventory Ledger**: Double-entry style inventory tracking via `InventoryLedger`
- **Status Enums**: Extensive use of Prisma enums for status tracking
- **Cascade Deletes**: Relations use `onDelete: Cascade` where appropriate
- **Soft Deletes**: `isActive` flags on key models (User, Customer, InventoryItem, Recipe)

### API Middleware
- `withTenant` - Extracts tenant ID from request, validates access, provides `RouteContext`
- All API routes use `withTenant` wrapper for tenant isolation

### State Management
- React hooks (`useState`, `useEffect`, `useMemo`)
- Local state for most UI components
- Direct API calls (no global state library currently)

---

## 7. Important Notes

### Finance Implementation Status
- **Current**: Finance pages exist but use mock data from `financeData.ts`
- **Database**: No finance models in Prisma schema yet
- **Income**: Tracked via `SalesOrder` and `OrderItem`
- **Expenses**: Currently only in mock data, not persisted
- **Invoices**: Not linked to orders yet, mock data only
- **Payments**: Not tracked separately, only via `SalesOrder.paymentStatus`

### Keg Management
- Kegs are tracked in dedicated `Keg` table (not InventoryItem)
- Status-based lifecycle: AVAILABLE → FILLED → WITH_CUSTOMER → (RETURNED) → AVAILABLE
- Movement history tracked in `KegMovement` table

### Product Availability
- Products calculated from:
  - **Kegs**: Count of `FILLED` kegs from `Keg` table
  - **Bottles/Cans**: `PackagingRun` quantities minus `OrderItem` sold quantities
- Real-time availability tracking in `/api/products`

### Packaging Workflow
- Packaging creates `PackagingRun` records
- Updates `Batch.packagedVolume`
- Deducts inventory materials (labels, bottles, caps, kegs)
- Does NOT automatically mark batch as COMPLETED

---

## 8. Next Steps for Finance Module

1. **Create Prisma Models** (see section 5)
2. **Migrate Database**: `npx prisma migrate dev --name add-finance-models`
3. **Create API Routes**:
   - `/api/finances/transactions` - Transaction CRUD
   - `/api/finances/invoices` - Invoice CRUD
   - `/api/finances/payments` - Payment recording
   - `/api/finances/expenses` - Expense tracking
   - `/api/finances/reports` - Financial reports
4. **Update Frontend**: Replace mock data with API calls
5. **Link to Orders**: Connect invoices/payments to SalesOrder
6. **Add Reporting**: Revenue vs expenses, profit margins, cash flow

---

**Generated**: 2026-01-10  
**Project**: Brewery Management System  
**Version**: 1.0
