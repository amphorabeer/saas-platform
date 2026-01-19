# 🏢 SaaS Platform - სრული პროექტის ანალიზი

**განახლების თარიღი**: 2025 წლის იანვარი  
**ვერსია**: 0.0.0 (Development)  
**ენა**: ქართული (Georgian) + English

---

## 📋 შინაარსი

1. [პროექტის მიმოხილვა](#1-პროექტის-მიმოხილვა)
2. [ტექნიკური არქიტექტურა](#2-ტექნიკური-არქიტექტურა)
3. [მონორეპოს სტრუქტურა](#3-მონორეპოს-სტრუქტურა)
4. [Brewery მოდული (ძირითადი)](#4-brewery-მოდული-ძირითადი)
5. [მონაცემთა ბაზის არქიტექტურა](#5-მონაცემთა-ბაზის-არქიტექტურა)
6. [API არქიტექტურა](#6-api-არქიტექტურა)
7. [Frontend არქიტექტურა](#7-frontend-არქიტექტურა)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Multi-Tenancy](#9-multi-tenancy)
10. [Development Workflow](#10-development-workflow)
11. [ბოლო ცვლილებები და Fixes](#11-ბოლო-ცვლილებები-და-fixes)
12. [ცნობილი პრობლემები](#12-ცნობილი-პრობლემები)
13. [მნიშვნელოვანი ფაილები](#13-მნიშვნელოვანი-ფაილები)

---

## 1. პროექტის მიმოხილვა

### 1.1 რა არის ეს პროექტი?

**SaaS Multi-Module Platform** არის მრავალმოდულური, multi-tenant SaaS პლატფორმა, რომელიც გთავაზობთ ბიზნეს მართვის სისტემებს სხვადასხვა ინდუსტრიისთვის.

### 1.2 მხარდაჭერილი მოდულები

1. **🍺 Brewery** (`apps/brewery/`) - ლუდსახარშის მართვის სისტემა ⭐ **ყველაზე განვითარებული**
2. **🏨 Hotel** (`apps/hotel/`) - სასტუმროს PMS სისტემა
3. **🍽️ Restaurant** (`apps/restaurant/`) - რესტორნის მართვის სისტემა
4. **💅 Beauty** - სილამაზის სალონის მართვის სისტემა
5. **🛍️ Shop** - მაღაზიის მართვის სისტემა
6. **🍷 Winery** - ღვინის მართვის სისტემა
7. **🥃 Distillery** - სპირტის მართვის სისტემა

### 1.3 ძირითადი მახასიათებლები

- ✅ **Multi-Tenancy**: სრული tenant isolation, თითოეულ tenant-ს აქვს საკუთარი მონაცემები
- ✅ **Self-Service Registration**: მომხმარებლებს შეუძლიათ თავად დარეგისტრირდნენ
- ✅ **RBAC**: Role-Based Access Control (OWNER, ADMIN, MANAGER, BREWER, VIEWER)
- ✅ **Subscription Management**: მოდულებზე დაფუძნებული გამოწერები
- ✅ **Module-Based**: თითოეული მოდული არის დამოუკიდებელი Next.js აპლიკაცია
- ✅ **Monorepo**: Turborepo + pnpm workspaces

---

## 2. ტექნიკური არქიტექტურა

### 2.1 Core Tech Stack

| კატეგორია | ტექნოლოგია | ვერსია |
|-----------|------------|--------|
| **Framework** | Next.js | 14.0.4 (App Router) |
| **Language** | TypeScript | 5.3+ (strict mode) |
| **Runtime** | Node.js | 18+ |
| **Package Manager** | pnpm | 8.15.0 |
| **Build System** | Turborepo | 1.11.0 |
| **Database** | PostgreSQL | 15+ |
| **ORM** | Prisma | 5.22.0 |
| **Auth** | NextAuth.js | 4.24.5 |
| **State** | Zustand | 5.0.9 |
| **Styling** | Tailwind CSS | 3.4.0 |
| **UI Library** | shadcn/ui + Custom | - |
| **Forms** | React Hook Form + Zod | 7.49.0 / 3.22.4 |
| **Cache** | Upstash Redis | 1.34.0 |

### 2.2 Frontend Stack

- **React**: 18.2.0
- **Next.js App Router**: Server Components + Client Components
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icons
- **FullCalendar**: Calendar/timeline views
- **Chart.js + react-chartjs-2**: Data visualization
- **@dnd-kit**: Drag and drop functionality

### 2.3 Backend Stack

- **Next.js API Routes**: Server-side logic
- **Prisma Client**: Database access
- **NextAuth.js**: Authentication & sessions
- **Zod**: Runtime validation
- **moment.js**: Date/time handling

### 2.4 Infrastructure

- **Local Dev**: Docker Compose (PostgreSQL + Redis)
- **Production**: Not yet deployed (see deployment section)
- **Database**: PostgreSQL 15+
- **Cache**: Upstash Redis (cloud) / Local Redis (dev)

---

## 3. მონორეპოს სტრუქტურა

### 3.1 Root Structure

```
saas-platform/
├── apps/                    # Individual Next.js applications
│   ├── brewery/            # 🍺 Brewery Management (port 3020)
│   ├── hotel/              # 🏨 Hotel PMS (port 3010)
│   ├── restaurant/         # 🍽️ Restaurant (port 3011)
│   └── web/                # Landing + Super Admin
│       ├── landing/        # Marketing site (port 3000)
│       └── super-admin/    # Platform admin (port 3001)
│
├── packages/               # Shared packages (workspace dependencies)
│   ├── auth/               # NextAuth configuration
│   ├── database/           # Prisma schemas & client
│   ├── ui/                 # Shared UI components
│   ├── types/              # Shared TypeScript types
│   ├── utils/              # Utility functions
│   ├── config/             # Shared configuration
│   ├── redis/              # Redis client
│   ├── observability/      # Sentry integration
│   └── brewery-domain/    # Brewery domain logic
│
├── docker-compose.yml      # Local dev: PostgreSQL + Redis
├── Dockerfile              # Production Docker image
├── package.json            # Root package.json
├── pnpm-workspace.yaml     # pnpm workspace config
├── turbo.json              # Turborepo pipeline config
└── tsconfig.json           # Root TypeScript config
```

### 3.2 Workspace Packages

**Shared Packages** (imported as `@saas-platform/[package]`):

- `@saas-platform/database` - Prisma client with retry logic
- `@saas-platform/auth` - NextAuth configuration
- `@saas-platform/ui` - Shared UI components
- `@saas-platform/types` - Shared TypeScript types
- `@saas-platform/utils` - Utility functions
- `@saas-platform/config` - Environment configuration

### 3.3 Port Allocation

| App | Port | Description |
|-----|------|-------------|
| Landing | 3000 | Marketing website |
| Super Admin | 3001 | Platform administration |
| Hotel | 3010 | Hotel PMS |
| Restaurant | 3011 | Restaurant management |
| Brewery | 3020 | Brewery management ⭐ |

---

## 4. Brewery მოდული (ძირითადი)

### 4.1 მიმოხილვა

**Location**: `apps/brewery/`  
**Port**: `3020`  
**Status**: ✅ Fully functional, production-ready  
**Language**: Georgian (ქართული) interface

### 4.2 ძირითადი Features

#### 4.2.1 Production Management
- **Batch Lifecycle**: PLANNED → BREWING → FERMENTING → CONDITIONING → READY → PACKAGING → COMPLETED
- **Recipe Management**: Recipe creation, ingredient management, batch size calculation
- **Tank Scheduling**: Resource allocation, capacity management
- **Equipment Management**: Tanks, fermenters, conditioning tanks, brewhouse equipment
- **Split Batches**: 1 batch → multiple tanks (split fermentation/conditioning)
- **Blend Batches**: Multiple batches → 1 lot (blending)

#### 4.2.2 Calendar System
- **Resource Timeline**: Visual timeline for tanks and equipment
- **Drag-and-Drop**: Schedule batches by dragging
- **Multi-Resource View**: See all tanks on one timeline
- **Event Colors**: Status-based color coding
- **File**: `apps/brewery/src/app/calendar/page.tsx`

#### 4.2.3 Inventory Management
- **Ingredients**: Grain, hops, yeast, adjuncts, water chemistry, cleaning supplies
- **Packaging Materials**: Bottles, cans, caps, labels, kegs
- **Real-time Stock**: Live inventory tracking
- **Inventory Ledger**: Transaction history
- **Stock Alerts**: Low stock warnings
- **File**: `apps/brewery/src/app/inventory/page.tsx`

#### 4.2.4 Quality Control
- **QC Tests**: Scheduled quality tests
- **Sensory Evaluations**: Taste, aroma, appearance
- **Test Results**: Track pass/fail with values
- **Batch History**: Quality history per batch
- **File**: `apps/brewery/src/app/quality/page.tsx`

#### 4.2.5 Sales & Products
- **Product Catalog**: Beer products with pricing
- **Sales Orders**: Order management
- **Packaging Runs**: Track packaged volume
- **Customer Management**: Customer database
- **Keg Management**: Keg tracking and movements
- **Files**: `apps/brewery/src/app/sales/`

#### 4.2.6 Financial Management
- **Transactions**: All financial transactions
- **Invoices**: Invoice generation and tracking
- **Payments**: Payment processing
- **Expenses**: Expense tracking
- **Budgets**: Budget planning
- **Suppliers**: Supplier management
- **Files**: `apps/brewery/src/app/finances/`

### 4.3 Database Schema (Brewery)

**Location**: `apps/brewery/prisma/schema.prisma`

**Key Models**:
- `Batch` - Production batches
- `Recipe` - Beer recipes
- `Lot` - Production lots (can contain multiple batches for blending)
- `LotBatch` - Junction table (Lot ↔ Batch)
- `Tank` - Fermentation/conditioning tanks
- `TankAssignment` - Tank allocations to lots
- `Equipment` - Equipment (tanks, brewhouse, etc.)
- `InventoryItem` - Inventory items
- `PackagingRun` - Packaging records
- `Product` - Beer products
- `SalesOrder` - Sales orders
- `GravityReading` - Gravity measurements
- `QCTest` - Quality control tests
- `Transfer` - Transfer records (fermentation → conditioning)

**Important Relationships**:
- `Batch` → `Recipe` (many-to-one)
- `Batch` → `Lot` (many-to-many via `LotBatch`)
- `Lot` → `TankAssignment` (one-to-many)
- `TankAssignment` → `Tank` (many-to-one)
- `TankAssignment` → `Equipment` (many-to-one)

### 4.4 API Routes Structure

**Base Path**: `/api/`

#### Production APIs:
- `GET/POST /api/batches` - List/create batches
- `GET/PUT/DELETE /api/batches/[id]` - Batch details
- `POST /api/batches/[id]/start-brewing` - Start brewing
- `POST /api/batches/[id]/start-fermentation` - Start fermentation
- `POST /api/batches/[id]/mark-ready` - Mark batch as ready
- `POST /api/batches/[id]/package` - Start packaging
- `POST /api/batches/[id]/complete` - Complete batch
- `GET /api/batches/[id]/gravity-readings` - Gravity readings
- `GET /api/batches/[id]/timeline` - Batch timeline

#### Lot APIs:
- `GET /api/lots` - List lots (lot-centric view)
- `GET /api/lots/[id]` - Lot details
- `PATCH /api/lots/phase` - Update lot phase
- `GET /api/lots/active` - Active lots for blending

#### Fermentation APIs:
- `POST /api/fermentation/start` - Start fermentation (legacy)
- `POST /api/conditioning/start` - Start conditioning

#### Packaging APIs:
- `GET/POST /api/packaging` - List/create packaging runs
- `POST /api/packaging/start` - Start packaging process

#### Inventory APIs:
- `GET/POST /api/inventory` - List/create inventory items
- `GET /api/inventory/[id]` - Item details
- `POST /api/inventory/[id]/purchase` - Record purchase
- `POST /api/inventory/[id]/deduct` - Deduct inventory
- `POST /api/inventory/[id]/adjust` - Manual adjustment
- `GET /api/inventory/[id]/ledger` - Transaction ledger

#### Tank APIs:
- `GET /api/tanks` - List tanks
- `GET /api/tanks/availability` - Check tank availability
- `GET /api/tanks/active-assignments` - Active tank assignments

#### Equipment APIs:
- `GET/POST /api/equipment` - List/create equipment
- `GET/PUT /api/equipment/[id]` - Equipment details
- `POST /api/equipment/[id]/cip` - Record CIP
- `POST /api/equipment/[id]/maintenance` - Record maintenance

#### Recipe APIs:
- `GET/POST /api/recipes` - List/create recipes
- `GET/PUT /api/recipes/[id]` - Recipe details
- `POST /api/recipes/[id]/ingredients` - Add ingredient

#### Quality APIs:
- `GET/POST /api/quality` - QC tests

#### Sales APIs:
- `GET/POST /api/orders` - Sales orders
- `GET/POST /api/products` - Products
- `GET/POST /api/customers` - Customers
- `GET/POST /api/kegs` - Keg management

#### Financial APIs:
- `GET/POST /api/finances/transactions` - Transactions
- `GET/POST /api/finances/invoices` - Invoices
- `GET/POST /api/finances/payments` - Payments
- `GET/POST /api/finances/expenses` - Expenses
- `GET/POST /api/finances/budgets` - Budgets
- `GET/POST /api/finances/suppliers` - Suppliers

### 4.5 Frontend Pages

**Main Pages**:
- `/production` - Production dashboard (lot-centric view)
- `/production/[id]` - Batch detail page
- `/calendar` - Calendar/timeline view
- `/fermentation` - Fermentation tanks view
- `/inventory` - Inventory management
- `/recipes` - Recipe management
- `/quality` - Quality control
- `/sales` - Sales management
- `/finances` - Financial management
- `/equipment` - Equipment management
- `/reports` - Reports and analytics

### 4.6 Key Components

**Location**: `apps/brewery/src/components/`

#### Production Components:
- `StartBrewingModal.tsx` - Start brewing process
- `StartFermentationModalV2.tsx` - Start fermentation (with split/blend support)
- `TransferToConditioningModalV2.tsx` - Transfer to conditioning
- `PackagingModal.tsx` - Packaging interface
- `EditBatchModal.tsx` - Edit batch details

#### Calendar Components:
- `TankTimeline.tsx` - Tank timeline visualization
- `TankRow.tsx` - Tank row in calendar
- `BrewDayBadge.tsx` - Brew day indicator
- `AddEventModal.tsx` - Add calendar event

#### Fermentation Components:
- `TankCard.tsx` - Tank card display
- `TankDetailModal.tsx` - Tank details modal

#### Shared UI:
- `BatchStatusBadge.tsx` - Status badge component
- `ProgressBar.tsx` - Progress indicator
- `BlendBadge.tsx` - Blend indicator

### 4.7 State Management

**Zustand Store**: `apps/brewery/src/store/breweryStore.ts`

**Key State**:
- Equipment list
- Batches
- Recipes
- Inventory items
- Real-time updates

---

## 5. მონაცემთა ბაზის არქიტექტურა

### 5.1 Schema Structure

**Main Schema**: `packages/database/prisma/schema.prisma`
- Multi-tenant models (Tenant, User, Organization)
- Shared models across modules

**Module Schemas**:
- `apps/brewery/prisma/schema.prisma` - Brewery-specific models
- `apps/hotel/prisma/schema.prisma` - Hotel-specific models

### 5.2 Multi-Tenancy Pattern

**Every model has**:
```prisma
model SomeModel {
  id       String @id @default(cuid())
  tenantId String
  // ... other fields
  tenant   Tenant @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
}
```

**Data Isolation**: All queries must include `tenantId` filter

### 5.3 Key Models (Brewery)

#### Batch Model
```prisma
model Batch {
  id            String   @id @default(cuid())
  tenantId      String
  batchNumber   String
  recipeId      String
  status        BatchStatus
  volume        Decimal
  packagedVolume Decimal?
  // ... dates, gravity, etc.
  LotBatch      LotBatch[]
}
```

#### Lot Model (Lot-Centric Design)
```prisma
model Lot {
  id            String   @id @default(cuid())
  tenantId      String
  lotCode       String   // e.g., "FERM-20260115-FYLXEJ" or "COND-20260115-FYLXEJ-A"
  phase         LotPhase // FERMENTATION, CONDITIONING, BRIGHT, PACKAGING
  status        LotStatus // PLANNED, ACTIVE, COMPLETED
  parentLotId   String?  // For split lots
  LotBatch      LotBatch[]
  TankAssignment TankAssignment[]
}
```

**Important**: Lot-centric design means:
- Production page shows **Lots**, not Batches
- A Lot can contain multiple Batches (blending)
- A Batch can be split into multiple Lots (split fermentation)

#### TankAssignment Model
```prisma
model TankAssignment {
  id          String   @id @default(cuid())
  tenantId    String
  lotId       String
  tankId      String
  phase       LotPhase
  status      AssignmentStatus // PLANNED, ACTIVE, COMPLETED
  plannedStart DateTime
  plannedEnd   DateTime
  actualEnd    DateTime?
  Lot         Lot      @relation(...)
  Equipment   Equipment @relation(...)
}
```

### 5.4 Enums

**LotPhase**:
- `FERMENTATION`
- `CONDITIONING`
- `BRIGHT`
- `PACKAGING`
- ❌ **NOT**: `COMPLETED` (use `status` field instead)

**LotStatus**:
- `PLANNED`
- `ACTIVE`
- `COMPLETED`

**BatchStatus**:
- `PLANNED`
- `BREWING`
- `FERMENTING`
- `CONDITIONING`
- `READY`
- `PACKAGING`
- `COMPLETED`

---

## 6. API არქიტექტურა

### 6.1 API Middleware

**Location**: `apps/brewery/src/lib/api-middleware.ts`

**Functions**:
- `withTenant()` - Ensures tenant context
- `withPermission()` - RBAC permission check
- `RouteContext` - Request context (tenantId, userId, userRole)

**Usage**:
```typescript
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  // ctx.tenantId - automatically set
  // ctx.userId - from session
  // ctx.userRole - user role
})
```

### 6.2 API Patterns

#### Standard GET Pattern:
```typescript
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  const items = await prisma.model.findMany({
    where: { tenantId: ctx.tenantId },
    include: { relations: true }
  })
  return NextResponse.json({ items })
})
```

#### Standard POST Pattern:
```typescript
export const POST = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  const body = await req.json()
  const item = await prisma.model.create({
    data: {
      tenantId: ctx.tenantId,
      createdBy: ctx.userId,
      ...body
    }
  })
  return NextResponse.json(item, { status: 201 })
})
```

### 6.3 Error Handling

**Standard Error Response**:
```typescript
return NextResponse.json(
  { error: 'Error message', details: error.message },
  { status: 500 }
)
```

**Domain Errors**: Custom `DomainError` class in middleware

### 6.4 Transaction Patterns

**Prisma Transactions**:
```typescript
await prisma.$transaction(async (tx) => {
  // Multiple operations
  await tx.model1.create(...)
  await tx.model2.update(...)
  return result
})
```

---

## 7. Frontend არქიტექტურა

### 7.1 Page Structure

**Next.js App Router**:
- `app/[module]/page.tsx` - Page component
- `app/[module]/layout.tsx` - Layout wrapper
- `app/api/[route]/route.ts` - API route

### 7.2 Component Patterns

#### Standard Page Component:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout'
import { Card, CardBody } from '@/components/ui'

export default function Page() {
  const [data, setData] = useState([])
  
  useEffect(() => {
    fetch('/api/endpoint')
      .then(res => res.json())
      .then(data => setData(data.items))
  }, [])
  
  return (
    <DashboardLayout title="Page Title">
      <Card>
        <CardBody>
          {/* Content */}
        </CardBody>
      </Card>
    </DashboardLayout>
  )
}
```

### 7.3 State Management Patterns

**Local State**: `useState` for component state
**Global State**: Zustand for shared state
**Server State**: Fetch in `useEffect` or Server Components

### 7.4 Form Patterns

**React Hook Form + Zod**:
```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
  volume: z.number().positive()
})

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema)
})
```

### 7.5 Styling Patterns

**Tailwind CSS Classes**:
- Dark theme by default
- Custom color palette (copper, amber, etc.)
- Responsive design with Tailwind breakpoints

**Component Classes**:
- `bg-bg-card` - Card background
- `text-text-muted` - Muted text
- `border-border` - Border color
- `text-copper-light` - Accent color

---

## 8. Authentication & Authorization

### 8.1 Authentication

**Provider**: NextAuth.js 4.24.5
**Configuration**: `packages/auth/src/auth.config.ts`
**Strategy**: JWT-based sessions
**Adapter**: Prisma adapter (lazy-loaded)

### 8.2 User Roles

**UserRole Enum**:
- `OWNER` - Full access
- `ADMIN` - Administrative access
- `MANAGER` - Management access
- `BREWER` - Production access
- `VIEWER` - Read-only access

### 8.3 Permission System

**Location**: `packages/auth/src/rbac.ts`

**Permission Format**: `module:action`
- `batch:read` - Read batches
- `batch:create` - Create batches
- `batch:update` - Update batches
- `batch:delete` - Delete batches
- `batch:cancel` - Cancel batches
- `inventory:read` - Read inventory
- `inventory:write` - Write inventory

### 8.4 Middleware

**Location**: `apps/brewery/src/middleware.ts`

**Functionality**:
- Protects all routes except `/login` and `/api/auth`
- Redirects unauthenticated users to login
- Validates JWT tokens

---

## 9. Multi-Tenancy

### 9.1 Tenant Model

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      PlanType @default(STARTER)
  isActive  Boolean  @default(true)
  // Relations to all tenant-scoped models
}
```

### 9.2 Data Isolation

**Every Query Must Include**:
```typescript
where: {
  tenantId: ctx.tenantId,
  // ... other filters
}
```

### 9.3 Tenant Context

**Automatically Set By**:
- `withTenant()` middleware
- `RouteContext.tenantId`
- Session token contains tenantId

### 9.4 Module Access

**Subscription-Based**:
- Tenants subscribe to specific modules
- `ModuleAccess` model tracks access
- UI shows only subscribed modules

---

## 10. Development Workflow

### 10.1 Setup Commands

```bash
# Install dependencies
pnpm install

# Start local database
docker-compose up -d

# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start all apps
pnpm dev

# Build all apps
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

### 10.2 Development Ports

- Landing: http://localhost:3000
- Super Admin: http://localhost:3001
- Hotel: http://localhost:3010
- Restaurant: http://localhost:3011
- **Brewery**: http://localhost:3020 ⭐

### 10.3 Environment Variables

**Required**:
- `DATABASE_URL` - PostgreSQL connection
- `NEXTAUTH_SECRET` - Auth secret
- `NEXTAUTH_URL` - Base URL
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token

**Optional**:
- AWS S3 credentials (file storage)
- SendGrid API key (emails)
- Stripe keys (payments)

### 10.4 Code Organization

**File Naming**:
- Components: `PascalCase.tsx`
- Utilities: `camelCase.ts`
- API routes: `route.ts`
- Types: `types.ts` or `*.types.ts`

**Directory Structure**:
- `app/` - Next.js pages and API routes
- `components/` - React components
- `lib/` - Utilities and helpers
- `store/` - Zustand stores
- `prisma/` - Database schema

---

## 11. ბოლო ცვლილებები და Fixes

### 11.1 Recent Fixes (January 2025)

#### Fix 1: Missing Package Imports
**Files Fixed**:
- ❌ Deleted: `apps/brewery/src/app/api/auth/[...nextauth]/route.ts` (used non-existent `@saas-platform/auth`)
- ❌ Deleted: `apps/brewery/src/app/api/batches/[id]/cancel/route.ts` (used non-existent `@brewery/domain`)
- ❌ Deleted: `apps/brewery/src/app/api/batches/[id]/ready/route.ts` (duplicate of `mark-ready`)

#### Fix 2: cuid Import Errors
**Files Fixed**:
- `apps/brewery/src/app/api/batches/[id]/package/route.ts` - Replaced `cuid()` with `crypto.randomUUID()`
- `apps/brewery/src/app/api/batches/[id]/start-brewing/route.ts` - Removed `cuid` import, removed manual ID assignment

**Note**: 20+ other files still use `cuid` - may need fixing in future

#### Fix 3: Prisma Relation Names
**Files Fixed**:
- `apps/brewery/src/app/api/batches/[id]/route.ts` - Changed `QCTest` → `qcTests`
- `apps/brewery/src/app/api/cip-logs/route.ts` - Changed `equipment` → `Equipment` (capital E)
- `apps/brewery/src/app/api/maintenance/route.ts` - Changed `equipment` → `Equipment` (capital E)
- `apps/brewery/src/app/api/batches/route.ts` - Changed `Tank` → `Equipment` in TankAssignment include

#### Fix 4: Lot Packaging Display
**Files Fixed**:
- `apps/brewery/src/app/production/[id]/page.tsx`:
  - Added `lotNumber` to packaging record mapping
  - Fixed filter to use `lotNumber === lotCode` (exact match)
  - Removed proportional fallback that caused confusion
  - Added comprehensive debug logging

#### Fix 5: Packaging Modal Props
**Files Fixed**:
- `apps/brewery/src/components/production/PackagingModal.tsx`:
  - Added `lotId` and `lotCode` props
  - Pass `lotId` and `lotNumber: lotCode` in API calls
- `apps/brewery/src/app/production/[id]/page.tsx`:
  - Pass `lotId` and `lotCode` to PackagingModal

#### Fix 6: Auto-Complete Lot on Full Packaging
**Files Fixed**:
- `apps/brewery/src/app/api/packaging/route.ts`:
  - Added auto-completion logic when lot is fully packaged
  - Updates Lot status to COMPLETED
  - Updates TankAssignment status
  - Frees up tanks
  - Creates timeline entry
  - **Fixed**: Removed invalid `phase: 'COMPLETED'` (not valid enum)

#### Fix 7: Completed Split Lots Filtering
**Files Fixed**:
- `apps/brewery/src/app/api/batches/route.ts`:
  - Added filtering to exclude batches where ALL lots are COMPLETED
  - Prevents completed batches from reappearing in production list

#### Fix 8: Packaging Progress Bar Refresh
**Files Fixed**:
- `apps/brewery/src/app/production/[id]/page.tsx`:
  - Made `onComplete` handler `async`
  - Ensures packaging records refresh after each packaging operation
  - Updates `apiPackagingRecords` state with all records from API

#### Fix 9: Selected Keg State Cleanup
**Files Fixed**:
- `apps/brewery/src/components/production/PackagingModal.tsx`:
  - Clear `selectedKegIds` after successful keg packaging
  - Clear `quantity` and selections after bottle/can packaging
  - Added `useEffect` to reset all selections when modal closes

#### Fix 10: Conditioning Split Batch Logic
**Files Fixed**:
- `apps/brewery/src/app/api/conditioning/start/route.ts`:
  - Fixed child lot detection: Changed `lotCode: { contains: '-' }` → `parentLotId: { not: null }`
  - Added logic to handle split from single lot (create all child lots)
  - Removed duplicate parent COMPLETED marking
  - Fixed lot packaging display to use correct `lotNumber` matching

### 11.2 Current Known Issues

1. **20+ files still use `cuid` package** - Should be replaced with `crypto.randomUUID()`
2. **TypeScript build errors ignored** - Some Next.js configs have `ignoreBuildErrors: true`
3. **Redis config mismatch** - Code uses Upstash, docker-compose provides local Redis
4. **No background workers** - Long-running tasks run in API routes (timeout risk)
5. **No environment separation** - All environments use same config

---

## 12. ცნობილი პრობლემები

### 12.1 Technical Debt

1. **Multiple Prisma Schemas**: Some modules have separate schemas, causing potential conflicts
2. **Missing Type Safety**: Some API routes use `any` types
3. **No Error Boundaries**: React error boundaries not implemented
4. **No Loading States**: Some pages lack proper loading indicators
5. **No Pagination**: Large lists load all items at once

### 12.2 Performance Issues

1. **N+1 Queries**: Some API routes may have N+1 query problems
2. **No Caching**: API responses not cached
3. **Large Bundle Size**: No code splitting for large components
4. **No Image Optimization**: Images not optimized

### 12.3 Security Concerns

1. **Input Validation**: Some API routes may lack proper validation
2. **SQL Injection**: Using Prisma mitigates this, but need to verify
3. **XSS Protection**: Need to verify React's automatic escaping
4. **Rate Limiting**: No rate limiting on API routes

---

## 13. მნიშვნელოვანი ფაილები

### 13.1 Configuration Files

- `package.json` - Root dependencies and scripts
- `pnpm-workspace.yaml` - Workspace configuration
- `turbo.json` - Turborepo pipeline
- `tsconfig.json` - TypeScript configuration
- `docker-compose.yml` - Local development services
- `.env.example` - Environment variable template

### 13.2 Database Files

- `packages/database/prisma/schema.prisma` - Main multi-tenant schema
- `apps/brewery/prisma/schema.prisma` - Brewery-specific schema
- `packages/database/src/client.ts` - Prisma client with retry logic

### 13.3 Auth Files

- `packages/auth/src/auth.config.ts` - NextAuth configuration
- `packages/auth/src/rbac.ts` - Permission system
- `apps/brewery/src/middleware.ts` - Route protection

### 13.4 Brewery Key Files

**API Routes**:
- `apps/brewery/src/app/api/batches/route.ts` - Batch list/create
- `apps/brewery/src/app/api/batches/[id]/route.ts` - Batch details
- `apps/brewery/src/app/api/lots/route.ts` - Lot list (lot-centric)
- `apps/brewery/src/app/api/packaging/route.ts` - Packaging operations
- `apps/brewery/src/app/api/conditioning/start/route.ts` - Conditioning start
- `apps/brewery/src/app/api/fermentation/start/route.ts` - Fermentation start

**Pages**:
- `apps/brewery/src/app/production/page.tsx` - Production dashboard
- `apps/brewery/src/app/production/[id]/page.tsx` - Batch detail page
- `apps/brewery/src/app/calendar/page.tsx` - Calendar view
- `apps/brewery/src/app/inventory/page.tsx` - Inventory management

**Components**:
- `apps/brewery/src/components/production/PackagingModal.tsx` - Packaging interface
- `apps/brewery/src/components/production/StartFermentationModalV2.tsx` - Fermentation start
- `apps/brewery/src/components/fermentation/TankCard.tsx` - Tank display
- `apps/brewery/src/components/calendar/TankTimeline.tsx` - Timeline view

**Utilities**:
- `apps/brewery/src/lib/api-middleware.ts` - API middleware
- `apps/brewery/src/lib/lot-helpers.ts` - Lot helper functions
- `apps/brewery/src/lib/validations.ts` - Zod schemas
- `apps/brewery/src/constants/index.ts` - Constants and configs

**Store**:
- `apps/brewery/src/store/breweryStore.ts` - Zustand store

### 13.5 Shared Packages

- `packages/database/src/client.ts` - Prisma client
- `packages/auth/src/auth.config.ts` - Auth config
- `packages/ui/src/` - Shared UI components
- `packages/config/src/index.ts` - Environment config

---

## 14. Development Best Practices

### 14.1 Code Style

- **TypeScript**: Always use types, avoid `any`
- **Components**: Use functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions
- **Comments**: Georgian or English, be descriptive

### 14.2 API Development

- Always use `withTenant()` or `withPermission()` middleware
- Always filter by `tenantId`
- Always validate input with Zod
- Always handle errors gracefully
- Always return proper HTTP status codes

### 14.3 Database Development

- Always use Prisma Client, never raw SQL
- Always include `tenantId` in queries
- Use transactions for multi-step operations
- Use proper indexes for performance

### 14.4 Frontend Development

- Use Server Components when possible
- Use Client Components only when needed (`'use client'`)
- Always handle loading and error states
- Use React Hook Form for forms
- Validate with Zod schemas

---

## 15. Testing

### 15.1 Current Status

**Testing**: Not yet implemented
- No unit tests
- No integration tests
- No E2E tests

### 15.2 Recommended Testing Strategy

1. **Unit Tests**: Jest + React Testing Library
2. **Integration Tests**: API route testing
3. **E2E Tests**: Playwright or Cypress
4. **Type Tests**: TypeScript compiler

---

## 16. Deployment

### 16.1 Current Status

**Status**: ❌ Not production-ready

**Issues**:
- Dockerfile runs `pnpm dev` (should be `pnpm start`)
- No environment separation
- No CI/CD pipeline
- No deployment configuration

### 16.2 Recommended Deployment

**Phase 1**: Railway.app
- Simple deployment
- Automatic PostgreSQL
- Easy scaling

**Phase 2**: Fly.io
- Better scaling
- Multi-region support
- More control

See `INFRASTRUCTURE_AUDIT_REPORT.md` for details.

---

## 17. Important Notes for AI Assistants

### 17.1 Language

- **Interface**: Georgian (ქართული)
- **Code Comments**: May be in Georgian or English
- **User Messages**: Often in Georgian
- **Error Messages**: Should be in Georgian for users

### 17.2 Multi-Tenancy

- **Always** consider `tenantId` when working with data
- **Never** query without tenant filter
- **Always** use `ctx.tenantId` from middleware

### 17.3 Module Isolation

- Each module is a separate Next.js app
- Shared code is in `packages/`
- Module-specific code is in `apps/[module]/`

### 17.4 Database

- **Always** use Prisma Client, never raw SQL
- **Always** include `tenantId` in where clauses
- Use transactions for multi-step operations
- Check enum values before using them

### 17.5 API Development

- Use `withTenant()` for tenant context
- Use `withPermission()` for RBAC
- Always validate input
- Always handle errors
- Return proper status codes

### 17.6 Frontend Development

- Use Server Components when possible
- Mark Client Components with `'use client'`
- Use React Hook Form for forms
- Validate with Zod
- Handle loading/error states

### 17.7 Common Patterns

**Fetching Data**:
```typescript
useEffect(() => {
  fetch('/api/endpoint')
    .then(res => res.json())
    .then(data => setData(data.items))
    .catch(err => console.error(err))
}, [])
```

**Creating Data**:
```typescript
const handleSubmit = async (data) => {
  const res = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (res.ok) {
    // Success
  }
}
```

**Updating State**:
```typescript
setState(prev => ({
  ...prev,
  newField: newValue
}))
```

---

## 18. Quick Reference

### 18.1 Common Imports

```typescript
// Next.js
import { NextRequest, NextResponse } from 'next/server'
import { useRouter, useParams } from 'next/navigation'

// Prisma
import { prisma } from '@saas-platform/database'

// Middleware
import { withTenant, withPermission, RouteContext } from '@/lib/api-middleware'

// UI Components
import { Card, CardBody, Button, ProgressBar } from '@/components/ui'

// Utils
import { formatDate } from '@/lib/utils'
```

### 18.2 Common Patterns

**API Route**:
```typescript
export const GET = withTenant(async (req, ctx) => {
  const items = await prisma.model.findMany({
    where: { tenantId: ctx.tenantId }
  })
  return NextResponse.json({ items })
})
```

**Page Component**:
```typescript
'use client'
export default function Page() {
  const [data, setData] = useState([])
  useEffect(() => { /* fetch */ }, [])
  return <DashboardLayout>...</DashboardLayout>
}
```

**Form Component**:
```typescript
const { register, handleSubmit } = useForm({
  resolver: zodResolver(schema)
})
```

---

## 19. Support & Documentation

### 19.1 Documentation Files

- `README.md` - Basic setup
- `SAAS_PLATFORM_DOCUMENTATION.md` - Detailed docs (Georgian)
- `CLAUDE_CHAT_PROJECT_CONTEXT.md` - Previous context
- `PROJECT_ANALYSIS_COMPLETE.md` - This file
- `INFRASTRUCTURE_AUDIT_REPORT.md` - Infrastructure analysis

### 19.2 Module-Specific Docs

- `apps/brewery/` - Brewery module docs
- `BREWERY_PROJECT_STRUCTURE.md` - Brewery structure
- `BREWERY_SETUP_COMPLETE.md` - Brewery setup

---

**Last Updated**: January 2025  
**Maintained By**: Development Team  
**Status**: Active Development  
**Primary Module**: Brewery (apps/brewery/)  
**Language**: Georgian (ქართული)

---

## 📞 Quick Help

**Need to find something?**
- API routes: `apps/brewery/src/app/api/`
- Pages: `apps/brewery/src/app/`
- Components: `apps/brewery/src/components/`
- Database: `apps/brewery/prisma/schema.prisma`
- Types: `packages/types/src/`
- Utils: `apps/brewery/src/lib/`

**Common Issues?**
- Check recent fixes in section 11
- Check known issues in section 12
- Review API middleware patterns
- Verify tenantId is included in queries

**Need to add a feature?**
- Follow existing patterns
- Use shared packages when possible
- Add proper TypeScript types
- Include tenantId in all queries
- Add proper error handling
