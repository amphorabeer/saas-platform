# 🏢 SaaS Multi-Tenant Platform - სრული პროექტის აღწერილობა

## 📋 პროექტის მიმოხილვა

ეს არის production-ready multi-tenant SaaS პლატფორმა, რომელიც მხარს უჭერს სხვადასხვა ბიზნეს მოდულებს:
- 🏨 **Hotel Management** - სასტუმროების მართვა (FULLY FUNCTIONAL ✅)
- 🍺 **Brewery Management** - ლუდსახარშების მართვა (MULTI-TENANT ✅)
- 🍷 **Winery Management** - ღვინოების მართვა (IN DEVELOPMENT)
- 🍽️ **Restaurant Management** - რესტორნების მართვა (PLANNED)
- 💅 **Beauty Salon Management** - სილამაზის სალონების მართვა (PLANNED)
- 🛒 **Shop Management** - მაღაზიების მართვა (PLANNED)

**პროექტის ტიპი**: Monorepo Multi-Tenant SaaS Platform  
**ტექნოლოგია**: Next.js 14 (App Router), TypeScript, PostgreSQL, Prisma  
**სტატუსი**: Production Ready (Hotel & Brewery modules)

---

## 🏗️ არქიტექტურა

### Monorepo სტრუქტურა (Turborepo + pnpm)

```
saas-platform/
├── apps/
│   ├── web/
│   │   ├── landing/              # Public marketing website
│   │   │   └── src/app/auth/     # Registration & Login
│   │   └── super-admin/          # Platform administration dashboard
│   │       └── src/pages/api/    # Organization management APIs
│   ├── hotel/                    # Hotel Management Module ✅
│   │   ├── src/app/              # Next.js App Router
│   │   ├── src/components/       # React components
│   │   └── src/lib/              # Utilities & services
│   └── brewery/                  # Brewery Management Module ✅
│       ├── src/app/              # Next.js App Router
│       ├── src/components/       # React components
│       ├── src/lib/              # Utilities & middleware
│       ├── src/store/            # Zustand state management
│       └── prisma/               # Database migrations
│
├── packages/
│   ├── database/                 # Shared Prisma schema
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Unified database schema
│   │   │   └── migrations/      # Database migrations
│   │   └── src/                 # Prisma client exports
│   ├── auth/                     # Authentication utilities
│   ├── ui/                       # Shared UI components
│   ├── types/                    # Shared TypeScript types
│   ├── utils/                    # Utility functions
│   ├── config/                   # Shared configurations
│   ├── observability/            # Logging & metrics
│   └── redis/                    # Redis client
│
└── docker-compose.yml            # Local development setup
```

---

## 🔐 Multi-Tenant არქიტექტურა

### Tenant Model (Prisma Schema)

```prisma
model Tenant {
  id           String          @id @default(cuid())
  name         String          // Company/Brewery name
  code         String          @unique // BREW-XXXX or HOTEL-XXXX
  slug         String          @unique // URL-friendly identifier
  plan         PlanType        @default(STARTER)
  isActive     Boolean         @default(true)
  
  // Company details
  legalName    String?
  taxId        String?
  phone        String?
  email        String?
  address      String?
  website      String?
  bankName     String?
  bankAccount  String?
  bankSwift    String?
  
  // Relations
  users        User[]
  batches      Batch[]        // Brewery-specific
  customers    Customer[]
  // ... other relations
}
```

### Authentication Flow

1. **Registration** (`/register`):
   - User fills company details form
   - System generates unique tenant code (BREW-XXXX)
   - Creates Tenant + first User (OWNER role)
   - Returns tenant code to user

2. **Login** (`/login`):
   - User enters: Tenant Code + Email + Password
   - NextAuth validates credentials
   - Session includes `tenantId` and `tenant` object
   - All API requests filtered by `tenantId`

3. **API Middleware**:
   - `withTenant()` wrapper extracts `tenantId` from session
   - All Prisma queries automatically filter by `tenantId`
   - Complete data isolation between tenants

---

## 🍺 Brewery Module - დეტალური აღწერა

### ძირითადი Features

1. **Production Management**
   - Recipe creation & management
   - Batch tracking (brewing → fermentation → conditioning → packaging)
   - Lot management (blend, split lots)
   - Tank assignments & scheduling
   - Gravity readings & quality tests

2. **Inventory Management**
   - Raw materials (hops, malt, yeast, adjuncts)
   - Packaging materials (bottles, caps, labels, kegs)
   - Cleaning supplies
   - Real-time stock tracking
   - Purchase orders & movements

3. **Quality Control**
   - QC test creation (gravity, temperature, pH, etc.)
   - Test results with pass/warning/fail status
   - Batch & lot quality tracking
   - Quality reports

4. **Sales & Finance**
   - Customer management
   - Sales orders
   - Invoices & payments
   - Expenses & budgets
   - Financial reports & analytics

5. **Equipment Management**
   - Equipment tracking (tanks, fermenters, etc.)
   - Maintenance scheduling
   - CIP (Cleaning In Place) logs
   - Parts inventory

6. **Calendar & Scheduling**
   - Production calendar
   - Tank timeline view
   - Fermentation planning
   - Transfer scheduling

### Key Files & Patterns

**API Routes** (`apps/brewery/src/app/api/`):
- All routes use `withTenant()` or `withPermission()` middleware
- All Prisma queries filter by `ctx.tenantId`
- Example: `apps/brewery/src/app/api/batches/route.ts`

**State Management** (`apps/brewery/src/store/`):
- Zustand stores for batches, inventory, calendar, settings
- Server state hydration on client
- Persistent settings in localStorage

**Components** (`apps/brewery/src/components/`):
- Modular component structure
- Reusable UI components in `components/ui/`
- Feature-specific components (production, inventory, quality, etc.)

**Middleware** (`apps/brewery/src/lib/api-middleware.ts`):
- `withTenant()` - Tenant isolation
- `withPermission()` - Role-based access control
- Error handling & audit logging

---

## 🏨 Hotel Module - დეტალური აღწერა

### ძირითადი Features

1. **Reservation Management**
   - Room calendar with drag-drop
   - Check-in/Check-out workflow
   - Reservation status tracking
   - Guest information management

2. **Night Audit System**
   - Comprehensive validation rules
   - Sequential day closing
   - Statistics calculation
   - No-show processing
   - System locking mechanism

3. **Folio System**
   - Guest folio generation
   - Room charges & payments
   - Package posting
   - Payment processing

4. **Housekeeping**
   - Room status management
   - Cleaning schedules
   - Maintenance requests

5. **Reports & Analytics**
   - Occupancy reports
   - Revenue reports
   - Guest reports
   - PDF & Email export

### Key Files

- `apps/hotel/src/app/page.tsx` - Main dashboard
- `apps/hotel/src/components/NightAuditView.tsx` - Night audit system
- `apps/hotel/src/components/FolioSystem.tsx` - Folio management
- `apps/hotel/src/lib/reportService.ts` - PDF generation

---

## 🗄️ Database Schema

### Core Models

**Tenant** - Multi-tenant isolation
- `id`, `name`, `code`, `slug`
- Company details (legalName, taxId, phone, address, etc.)
- Bank information

**User** - Per-tenant users
- `id`, `tenantId`, `email`, `name`, `role`
- `@@unique([tenantId, email])` - Email unique per tenant

**Brewery-Specific Models**:
- `Batch` - Production batches
- `Recipe` - Beer recipes
- `Lot` - Fermentation lots (can be blend or split)
- `Tank` - Fermentation/conditioning tanks
- `InventoryItem` - Stock items
- `Customer` - Sales customers
- `SalesOrder` - Customer orders
- `Invoice` - Invoices (OUTGOING/INCOMING)
- `Payment` - Payment records
- `Transaction` - Financial transactions
- `Expense` - Business expenses
- `Budget` - Budget planning
- `Equipment` - Production equipment
- `Keg` - Keg tracking
- `QCTest` - Quality control tests

**Hotel-Specific Models** (in hotel app):
- `HotelRoom` - Room inventory
- `HotelReservation` - Guest reservations
- `HotelFolio` - Guest folios

### Enums

```prisma
enum PlanType { STARTER, PROFESSIONAL, ENTERPRISE }
enum UserRole { OWNER, ADMIN, MANAGER, BREWER, OPERATOR, VIEWER }
enum BatchStatus { PLANNED, BREWING, FERMENTING, CONDITIONING, READY, PACKAGING, COMPLETED, CANCELLED }
enum LotPhase { FERMENTATION, CONDITIONING, BRIGHT, PACKAGING }
enum InvoiceType { OUTGOING, INCOMING }
enum InvoiceStatus { DRAFT, SENT, PAID, OVERDUE, CANCELLED }
enum PaymentMethod { CASH, BANK_TRANSFER, CARD, CHECK }
```

---

## 🔧 Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + shadcn/ui patterns
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Emoji-based (🍺, 🏨, etc.)

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Session**: JWT-based

### Infrastructure
- **Monorepo**: Turborepo
- **Package Manager**: pnpm
- **Database**: PostgreSQL (via Docker or cloud)
- **Caching**: Redis (optional)
- **Deployment**: Vercel (frontend), Railway/Neon (database)

---

## 📁 Important File Patterns

### API Route Pattern

```typescript
// apps/brewery/src/app/api/batches/route.ts
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  const batches = await prisma.batch.findMany({
    where: { tenantId: ctx.tenantId }, // ✅ Tenant isolation
    include: { recipe: true, tank: true },
  })
  return NextResponse.json(batches)
})
```

### Component Pattern

```typescript
// apps/brewery/src/components/production/BatchCard.tsx
'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'

export function BatchCard({ batch }: { batch: Batch }) {
  const { data: session } = useSession()
  const tenantId = (session?.user as any)?.tenantId
  
  // Component logic...
}
```

### Store Pattern (Zustand)

```typescript
// apps/brewery/src/store/batch.store.ts
import { create } from 'zustand'

interface BatchStore {
  batches: Batch[]
  setBatches: (batches: Batch[]) => void
}

export const useBatchStore = create<BatchStore>((set) => ({
  batches: [],
  setBatches: (batches) => set({ batches }),
}))
```

---

## 🔑 Authentication & Authorization

### NextAuth Configuration

**Brewery** (`apps/brewery/src/lib/auth.ts`):
- Credentials provider with tenant code validation
- Session includes `tenantId` and `tenant` object
- JWT strategy with 30-day expiration

**Hotel** (`apps/hotel/src/pages/api/auth/[...nextauth].ts`):
- Similar pattern with `hotelCode` instead of `tenantCode`
- Uses Organization model (legacy structure)

### Middleware

**Brewery** (`apps/brewery/src/middleware.ts`):
- Public paths: `/login`, `/register`, `/api/auth`, `/api/register`
- Adds `x-tenant-id` header to all requests
- Redirects unauthenticated users to `/login`

### API Middleware

**Brewery** (`apps/brewery/src/lib/api-middleware.ts`):
- `withTenant()` - Extracts tenantId from session
- `withPermission()` - Role-based access control
- Error handling & audit logging
- Correlation ID tracking

---

## 🚀 Development Workflow

### Setup

```bash
# Install dependencies
pnpm install

# Setup database
cd packages/database
npx prisma migrate dev
npx prisma generate

# Start development servers
pnpm dev
```

### Available Ports

- Landing: `http://localhost:3000`
- Super Admin: `http://localhost:3001`
- Hotel: `http://localhost:3010`
- Brewery: `http://localhost:3020`

### Database Commands

```bash
# Generate Prisma Client
pnpm db:generate

# Push schema changes
pnpm db:push

# Run migrations
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio
```

---

## 📝 Key Conventions

### Naming Conventions

- **Files**: kebab-case (`new-batch-modal.tsx`)
- **Components**: PascalCase (`NewBatchModal`)
- **Functions**: camelCase (`handleSubmit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_BATCH_SIZE`)
- **Types/Interfaces**: PascalCase (`BatchStatus`)

### Code Style

- **Language**: Georgian (ქართული) for UI text
- **Comments**: English for code documentation
- **Error Messages**: Georgian for user-facing errors
- **Logs**: English with emoji prefixes (🗑️, ✅, ❌)

### API Response Format

```typescript
// Success
{ success: true, data: {...} }

// Error
{ error: 'Error message', details?: {...} }
```

---

## 🎯 Current Status

### ✅ Completed Features

**Brewery Module**:
- ✅ Multi-tenant architecture
- ✅ Registration & login with tenant codes
- ✅ Production management (recipes, batches, lots)
- ✅ Inventory management
- ✅ Quality control system
- ✅ Sales & finance (customers, orders, invoices)
- ✅ Equipment management
- ✅ Calendar & scheduling
- ✅ Reports & analytics

**Hotel Module**:
- ✅ Multi-tenant architecture
- ✅ Reservation management
- ✅ Night audit system
- ✅ Folio generation
- ✅ Housekeeping management
- ✅ Reports & analytics

**Platform**:
- ✅ Landing page with registration
- ✅ Super admin dashboard
- ✅ Multi-tenant database schema
- ✅ Shared packages (database, auth, ui)

### 🚧 In Development

- Winery module
- Restaurant module
- Beauty salon module
- Shop module

---

## 🔍 Important Notes

1. **Tenant Isolation**: ALL Prisma queries MUST include `tenantId` filter
2. **API Routes**: Use `withTenant()` or `withPermission()` middleware
3. **Session**: Always check `session?.user?.tenantId` in components
4. **Database**: Shared schema in `packages/database/prisma/schema.prisma`
5. **Migrations**: Run from `packages/database` directory
6. **Code Generation**: Run `pnpm db:generate` after schema changes

---

## 🆘 Common Issues & Solutions

### Issue: "Prisma model not found"
**Solution**: Run `pnpm db:generate` in `packages/database`

### Issue: "Tenant data leaking between tenants"
**Solution**: Verify all API routes use `withTenant()` and filter by `ctx.tenantId`

### Issue: "Session doesn't have tenantId"
**Solution**: Check NextAuth configuration includes tenantId in JWT token

### Issue: "Migration fails"
**Solution**: Check database connection, ensure schema is valid, try `pnpm db:push` instead

---

**Last Updated**: 2025-01-XX  
**Version**: 1.0.0  
**Status**: Production Ready
