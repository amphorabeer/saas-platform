# 🏢 SaaS Platform - სრული აღწერილობა

## 📋 Table of Contents

1. [პროექტის მიმოხილვა](#პროექტის-მიმოხილვა)
2. [ტექნოლოგიები](#ტექნოლოგიები)
3. [პროექტის სტრუქტურა](#პროექტის-სტრუქტურა)
4. [Apps (აპლიკაციები)](#apps-აპლიკაციები)
5. [Packages (პაკეტები)](#packages-პაკეტები)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
9. [API Routes](#api-routes)
10. [Development Setup](#development-setup)
11. [Deployment](#deployment)
12. [Key Features](#key-features)

---

## 🎯 პროექტის მიმოხილვა

**SaaS Platform** არის მრავალმოდულური პლატფორმა, რომელიც გთავაზობთ სხვადასხვა ბიზნეს მოდულებს:

- 🏨 **Hotel PMS** - სასტუმროს მართვის სისტემა
- 🍽️ **Restaurant** - რესტორნის მართვის სისტემა
- 💅 **Beauty** - სილამაზის სალონის მართვის სისტემა
- 🛍️ **Shop** - მაღაზიის მართვის სისტემა
- 🍺 **Brewery** - ლუდსახარშის მართვის სისტემა
- 🍷 **Winery** - ღვინის მართვის სისტემა
- 🥃 **Distillery** - სპირტის მართვის სისტემა

### მთავარი მახასიათებლები:

- ✅ **Multi-Tenancy** - სრული tenant isolation
- ✅ **Self-Service Registration** - ავტომატური რეგისტრაცია
- ✅ **Role-Based Access Control (RBAC)** - როლებზე დაფუძნებული წვდომა
- ✅ **Subscription Management** - გამოწერების მართვა
- ✅ **Module-Based Architecture** - მოდულური არქიტექტურა
- ✅ **Monorepo Structure** - Turborepo + pnpm workspace

---

## 🛠️ ტექნოლოგიები

### Core Stack:
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components + shadcn/ui
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js (JWT)
- **Package Manager**: pnpm
- **Build System**: Turborepo
- **Date Handling**: moment.js

### Additional Libraries:
- **Drag & Drop**: @dnd-kit
- **PDF Generation**: jsPDF (for reports)
- **Form Handling**: React hooks
- **State Management**: React useState/useEffect
- **HTTP Client**: Fetch API

---

## 📁 პროექტის სტრუქტურა

```
saas-platform/
├── apps/                          # Applications
│   ├── hotel/                     # Hotel PMS Module (port: 3010)
│   ├── restaurant/                # Restaurant Module
│   ├── web/
│   │   ├── landing/               # Landing Page (port: 3000)
│   │   └── super-admin/           # Super Admin Panel (port: 3001)
│   └── winery/                    # Winery Module (incomplete)
│
├── packages/                      # Shared Packages
│   ├── auth/                      # NextAuth configuration
│   ├── database/                  # Prisma schema & client
│   ├── ui/                        # Shared UI components
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                     # Shared utilities
│   └── config/                    # Shared configuration
│
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # pnpm workspace config
├── turbo.json                     # Turborepo config
└── tsconfig.json                  # Root TypeScript config
```

---

## 📱 Apps (აპლიკაციები)

### 1. Landing Page (`apps/web/landing`)

**Port**: `3000`  
**Purpose**: მთავარი მარკეტინგული საიტი

**Features**:
- ✅ Module selection (Hotel, Restaurant, Beauty, Shop, Brewery, Winery, Distillery)
- ✅ Dynamic module loading from database
- ✅ Pricing pages (`/modules/{module}/pricing`)
- ✅ Self-service registration (`/auth/signup`)
- ✅ Login page (`/auth/login`)

**Key Routes**:
- `/` - Main landing page
- `/modules/[module]/pricing` - Pricing page for each module
- `/auth/signup` - Registration page
- `/auth/login` - Login page
- `/api/auth/register` - Registration API
- `/api/auth/[...nextauth]` - NextAuth handler

**Registration Flow**:
1. User selects module and plan
2. Fills registration form (personal + hotel info)
3. System creates:
   - Organization with unique `tenantId` and `hotelCode`
   - User account
   - Module access
   - Subscription (trial by default)
4. User receives `hotelCode` and can login

---

### 2. Super Admin (`apps/web/super-admin`)

**Port**: `3001`  
**Purpose**: პლატფორმის ადმინისტრაცია

**Features**:
- ✅ Organization management (CRUD)
- ✅ User management
- ✅ Module access management
- ✅ Subscription management (plan, status)
- ✅ Statistics dashboard
- ✅ Landing page content editor

**Key Routes**:
- `/organizations` - Organizations list
- `/api/organizations` - Organizations API (GET, POST)
- `/api/organizations/[id]` - Single organization API (GET, PUT, DELETE)
- `/api/stats` - Platform statistics

**API Endpoints**:

**GET `/api/organizations`**
- Returns list of all organizations with subscription and module info

**POST `/api/organizations`**
- Creates new organization
- Generates unique `hotelCode`
- Creates subscription and module access

**GET `/api/organizations/[id]`**
- Returns single organization details

**PUT `/api/organizations/[id]`**
- Updates organization details
- Updates subscription (plan, status)
- Updates module access

**DELETE `/api/organizations/[id]`**
- Deletes organization and all related data

**UI Features**:
- Status toggle switch (Active/Trial)
- Module selection dropdown
- Plan selection dropdown
- High z-index modals and dropdowns (z-[9999])

---

### 3. Hotel Module (`apps/hotel`)

**Port**: `3010`  
**Purpose**: Hotel Property Management System (PMS)

**Features**:
- ✅ Room management
- ✅ Reservation management
- ✅ Check-in/Check-out
- ✅ Folio management
- ✅ Night Audit
- ✅ Reports & Analytics
- ✅ Housekeeping
- ✅ Cashier management
- ✅ Financial dashboard
- ✅ Settings hub

**Key Routes**:
- `/` - Main dashboard
- `/login` - Hotel app login
- `/api/hotel/rooms` - Rooms API
- `/api/hotel/reservations` - Reservations API
- `/api/hotel/check-in` - Check-in API
- `/api/hotel/organization` - Organization info API
- `/api/auth/subscription` - Subscription status API

**Main Components**:

**Dashboard (`page.tsx`)**:
- Room calendar view
- Quick actions (Night Audit, Housekeeping, Reports)
- Tab-based navigation
- Subscription-based features (Clear Test Data for trial only)

**RoomCalendar**:
- Visual calendar with drag & drop
- Room status management
- Reservation creation/editing
- Check-in/Check-out modals

**NightAuditModule**:
- Pre-audit checks
- Night audit process
- Reports generation (Manager's Report, Z-Report, Payment Reconciliation, Tax Breakdown)
- PDF export

**FolioSystem**:
- Folio list and management
- Transaction tracking
- Payment processing
- Room number display (with proper lookup)

**Reports**:
- Booking source analysis
- Revenue reports
- Guest statistics
- Interactive source drill-down

**SettingsNew**:
- Hotel information management
- Room management
- Room types
- Floors
- Staff
- Charges settings

**Key Services**:

**FolioService**:
- Creates folios for reservations
- Manages folio transactions
- Handles room charges

**PostingService**:
- Posts room charges during night audit
- Calculates room rates
- Handles taxes

**PaymentService**:
- Processes payments
- Updates folio balances

**ExtraChargesService**:
- Manages extra charges (minibar, laundry, etc.)

**PackagePostingService**:
- Handles package bookings

**Tenant Isolation**:
- All API routes use `getTenantId()` helper
- Database queries filtered by `tenantId`
- Session includes `tenantId` from NextAuth

---

## 📦 Packages (პაკეტები)

### 1. `@saas-platform/auth`

**Purpose**: NextAuth configuration

**Exports**:
- `authOptions` - NextAuth configuration
- JWT strategy with `tenantId` in token
- Credentials provider
- Session callback with `tenantId`

**Key Features**:
- Includes `tenantId` in JWT token
- Includes `tenantId` in session
- Role-based authentication
- Organization-based access

**Usage**:
```typescript
import { authOptions } from "@saas-platform/auth"
import { getServerSession } from "next-auth"

const session = await getServerSession(authOptions)
const tenantId = session?.user?.tenantId
```

---

### 2. `@saas-platform/database`

**Purpose**: Prisma schema and client

**Exports**:
- `prisma` - Prisma client instance
- Database helpers

**Schema Models**:
- `Organization` - Organizations with tenant isolation
- `User` - Users with roles
- `ModuleAccess` - Module access per organization
- `Subscription` - Subscription management
- `SupportTicket` - Support tickets
- `HotelRoom` - Hotel rooms (tenant-scoped)
- `HotelReservation` - Hotel reservations (tenant-scoped)
- `Folio` - Guest folios (tenant-scoped)
- `Transaction` - Financial transactions (tenant-scoped)

**Key Features**:
- Multi-tenancy with `tenantId`
- Unique `hotelCode` per organization
- Hotel-specific fields in Organization
- Reservation source tracking

---

### 3. `@saas-platform/ui`

**Purpose**: Shared UI components

**Components**:
- Button
- Input
- Select
- Dialog
- Card
- Badge
- Avatar
- Tabs
- Toast
- Dropdown Menu
- Sheet

**Usage**:
```typescript
import { Button, Input, Select } from "@saas-platform/ui"
```

---

### 4. `@saas-platform/types`

**Purpose**: Shared TypeScript types

**Exports**:
- Common types used across apps

---

### 5. `@saas-platform/utils`

**Purpose**: Shared utilities

**Exports**:
- Utility functions used across apps

---

### 6. `@saas-platform/config`

**Purpose**: Shared configuration

**Exports**:
- Configuration constants

---

## 🗄️ Database Schema

### Core Models

**Organization**:
```prisma
model Organization {
  id                String             @id @default(cuid())
  name              String
  slug              String             @unique
  email             String
  phone             String?
  address           String?
  logo              String?
  
  // Hotel Info
  company           String?
  taxId             String?
  city              String?
  country           String?            @default("Georgia")
  website           String?
  bankName          String?
  bankAccount       String?

  // Multi-tenancy
  tenantId          String             @unique @default(cuid())
  hotelCode         String             @unique
  
  // Relations
  subscription      Subscription?
  users             User[]
  modules           ModuleAccess[]
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
}
```

**User**:
```prisma
model User {
  id                String             @id @default(cuid())
  email             String             @unique
  name              String?
  password          String
  role              Role
  organizationId    String
  organization      Organization       @relation(fields: [organizationId], references: [id])
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
}
```

**ModuleAccess**:
```prisma
model ModuleAccess {
  id                String             @id @default(cuid())
  organizationId   String
  organization      Organization       @relation(fields: [organizationId], references: [id])
  moduleType        ModuleType
  isActive          Boolean            @default(true)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
}
```

**Subscription**:
```prisma
model Subscription {
  id                String             @id @default(cuid())
  organizationId    String             @unique
  organization      Organization       @relation(fields: [organizationId], references: [id])
  plan              PlanType
  status            SubscriptionStatus
  price             Decimal
  startDate         DateTime
  endDate           DateTime?
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
}
```

**HotelRoom**:
```prisma
model HotelRoom {
  id                String             @id @default(cuid())
  tenantId          String
  roomNumber        String
  floor             Int?
  roomType          String?
  basePrice         Decimal            @default(0)
  status            String             @default("VACANT")
  maxOccupancy      Int                @default(2)
  reservations     HotelReservation[]
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  @@index([tenantId])
  @@index([roomNumber])
}
```

**HotelReservation**:
```prisma
model HotelReservation {
  id                String             @id @default(cuid())
  tenantId          String
  roomId            String
  room              HotelRoom         @relation(fields: [roomId], references: [id])
  guestName         String
  guestEmail        String?
  guestPhone        String?
  guestCountry      String?
  checkIn           DateTime
  checkOut          DateTime
  adults            Int                @default(1)
  children          Int                @default(0)
  totalAmount       Decimal            @default(0)
  paidAmount        Decimal            @default(0)
  status            String             @default("CONFIRMED")
  source            String?            @default("direct")
  notes             String?
  
  // Company fields
  companyName       String?
  companyTaxId      String?
  companyAddress    String?
  companyBank       String?
  companyBankAccount String?
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  @@index([tenantId])
  @@index([roomId])
  @@index([checkIn])
  @@index([checkOut])
}
```

### Enums

**Role**:
- `SUPER_ADMIN`
- `ORGANIZATION_OWNER`
- `MODULE_ADMIN`
- `MANAGER`
- `USER`

**ModuleType**:
- `HOTEL`
- `RESTAURANT`
- `BEAUTY`
- `SHOP`
- `BREWERY`
- `WINERY`
- `DISTILLERY`

**PlanType**:
- `STARTER`
- `PROFESSIONAL`
- `ENTERPRISE`

**SubscriptionStatus**:
- `TRIAL`
- `ACTIVE`
- `PAST_DUE`
- `CANCELLED`
- `EXPIRED`

---

## 🔐 Authentication & Authorization

### NextAuth Configuration

**Location**: `packages/auth/src/auth.config.ts`

**Strategy**: JWT

**Provider**: Credentials

**Session Callback**:
```typescript
async session({ session, token }) {
  if (session?.user) {
    (session.user as any).id = token.id
    (session.user as any).role = token.role
    (session.user as any).organizationId = token.organizationId
    (session.user as any).tenantId = token.tenantId  // ✅ Included
  }
  return session
}
```

**JWT Callback**:
```typescript
async jwt({ token, user }) {
  if (user) {
    token.id = user.id
    token.role = user.role
    token.organizationId = user.organizationId
    token.tenantId = (user as any).tenantId  // ✅ Included
  }
  return token
}
```

### Role-Based Access Control

**Roles**:
- `SUPER_ADMIN` - Full platform access
- `ORGANIZATION_OWNER` - Full organization access
- `MODULE_ADMIN` - Module-level admin
- `MANAGER` - Management access
- `USER` - Standard user access

**Permission Checks**:
```typescript
const canCloseDay = currentUser?.role === 'admin' || 
                    currentUser?.role === 'MODULE_ADMIN' || 
                    currentUser?.role === 'ORGANIZATION_OWNER'

const canViewReports = currentUser?.role === 'admin' || 
                       currentUser?.role === 'MODULE_ADMIN' || 
                       currentUser?.role === 'MANAGER'
```

---

## 🏢 Multi-Tenancy Architecture

### Tenant Isolation

**Tenant ID Generation**:
- Generated during registration: `const tenantId = randomUUID()`
- Stored in Organization model
- Included in session via NextAuth

**Tenant Helper** (`apps/hotel/src/lib/tenant.ts`):
```typescript
export async function getTenantId() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    return null
  }
  return session.user.tenantId
}

export function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Unauthorized: No tenant ID" },
    { status: 401 }
  )
}
```

**API Route Pattern**:
```typescript
export async function GET(request: NextRequest) {
  const tenantId = await getTenantId()
  if (!tenantId) {
    return unauthorizedResponse()
  }
  
  const rooms = await prisma.hotelRoom.findMany({
    where: { tenantId },  // ✅ Tenant isolation
    orderBy: { roomNumber: 'asc' },
  })
  
  return NextResponse.json({ rooms })
}
```

**Database Queries**:
- All tenant-scoped queries include `where: { tenantId }`
- Prevents cross-tenant data access
- Enforced at database level with indexes

---

## 🔌 API Routes

### Landing App (`apps/web/landing`)

**POST `/api/auth/register`**
- Creates new organization
- Generates `tenantId` and `hotelCode`
- Creates user account
- Creates module access
- Creates subscription (trial)
- Returns `hotelCode`

**Request Body**:
```typescript
{
  name: string
  email: string
  password: string
  organizationName: string
  module: ModuleType
  plan: PlanType
  // Hotel info fields
  company?: string
  taxId?: string
  address?: string
  city?: string
  country?: string
  phone?: string
  website?: string
  bankName?: string
  bankAccount?: string
}
```

---

### Super Admin App (`apps/web/super-admin`)

**GET `/api/organizations`**
- Returns all organizations with subscription and module info

**POST `/api/organizations`**
- Creates new organization
- Generates unique `hotelCode`
- Creates subscription and module access

**GET `/api/organizations/[id]`**
- Returns single organization details

**PUT `/api/organizations/[id]`**
- Updates organization
- Updates subscription (plan, status)
- Updates module access

**DELETE `/api/organizations/[id]`**
- Deletes organization and related data

---

### Hotel App (`apps/hotel`)

**GET `/api/hotel/rooms`**
- Returns all rooms for current tenant
- Tenant-isolated

**POST `/api/hotel/rooms`**
- Creates new room
- Includes `tenantId` automatically

**PUT `/api/hotel/rooms/[id]`**
- Updates room
- Tenant-verified

**DELETE `/api/hotel/rooms/[id]`**
- Deletes room
- Tenant-verified

**GET `/api/hotel/reservations`**
- Returns all reservations for current tenant
- Tenant-isolated

**POST `/api/hotel/reservations`**
- Creates new reservation
- Includes `tenantId` automatically
- Validates room availability

**PUT `/api/hotel/reservations`**
- Updates reservation
- Tenant-verified
- Validates room availability

**POST `/api/hotel/check-in`**
- Checks in reservation
- Creates folio
- Updates room status

**GET `/api/hotel/organization`**
- Returns organization info for current tenant
- Tenant-isolated

**PUT `/api/hotel/organization`**
- Updates organization info
- Tenant-verified

**GET `/api/auth/subscription`**
- Returns subscription status for current tenant
- Used for feature gating (e.g., Clear Test Data for trial only)

---

## 🚀 Development Setup

### Prerequisites

- Node.js >= 18
- pnpm >= 8.15.0
- PostgreSQL database

### Installation

```bash
# Clone repository
git clone <repository-url>
cd saas-platform

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your database URL and NextAuth secret

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Seed database (optional)
pnpm db:seed
```

### Environment Variables

**Root `.env.local`**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/saas_platform?sslmode=disable"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Landing App** (`.env.local`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/saas_platform?sslmode=disable"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Super Admin App** (`.env.local`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/saas_platform?sslmode=disable"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3001"
```

**Hotel App** (`.env.local`):
```env
DATABASE_URL="postgresql://user:password@localhost:5432/saas_platform?sslmode=disable"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3010"
```

### Running Development Servers

```bash
# Run all apps
pnpm dev

# Run specific app
cd apps/hotel && pnpm dev

# Run with specific port
PORT=3010 pnpm dev
```

### Available Ports

- `3000` - Landing Page
- `3001` - Super Admin
- `3010` - Hotel Module

### Database Commands

```bash
# Generate Prisma client
pnpm db:generate

# Push schema changes (dev)
pnpm db:push

# Create migration
pnpm db:migrate

# Open Prisma Studio
pnpm db:studio

# Seed database
pnpm db:seed
```

---

## 📦 Deployment

### Build

```bash
# Build all apps
pnpm build

# Build specific app
cd apps/hotel && pnpm build
```

### Vercel Deployment

Each app can be deployed separately to Vercel:

1. Connect repository to Vercel
2. Configure build settings:
   - **Root Directory**: `apps/hotel` (for hotel app)
   - **Build Command**: `pnpm build`
   - **Output Directory**: `.next`
3. Set environment variables
4. Deploy

### Docker Deployment

```bash
# Build Docker image
docker build -t saas-platform .

# Run container
docker run -p 3000:3000 saas-platform
```

---

## ✨ Key Features

### 1. Self-Service Registration

- Complete registration flow
- Automatic organization creation
- Unique `hotelCode` generation
- Trial subscription by default
- Email/password authentication

### 2. Tenant Isolation

- Complete data separation
- `tenantId` in all tenant-scoped models
- API routes enforce tenant isolation
- Session includes `tenantId`

### 3. Room Number Display

- `getRoomNumber()` helper function
- Priority: propRooms → state → localStorage → sessionStorage
- Converts room IDs to human-readable numbers
- Used across all components

### 4. Folio Management

- Automatic folio creation on check-in
- Transaction tracking
- Payment processing
- Balance calculations
- PDF export

### 5. Night Audit

- Pre-audit checks
- Sequential closing validation
- Room charge posting
- Report generation
- PDF export

### 6. Reports & Analytics

- Booking source analysis
- Revenue reports
- Guest statistics
- Interactive drill-down
- Date range filtering

### 7. Subscription-Based Features

- Trial vs Active feature gating
- Clear Test Data (trial only)
- Subscription status API
- Plan-based access control

### 8. Settings Hub

- Hotel information management
- Room management
- Room types
- Floors
- Staff
- Charges settings
- API-based data loading

---

## 🔧 Common Patterns

### Tenant Isolation Pattern

```typescript
// In API routes
const tenantId = await getTenantId()
if (!tenantId) {
  return unauthorizedResponse()
}

const data = await prisma.model.findMany({
  where: { tenantId }
})
```

### Room Number Lookup Pattern

```typescript
const getRoomNumber = (roomIdOrNumber: string | undefined): string => {
  if (!roomIdOrNumber) return 'N/A'
  
  // If already a number, return it
  if (roomIdOrNumber.length <= 4 && /^\d+$/.test(roomIdOrNumber)) {
    return roomIdOrNumber
  }
  
  // Try to find in rooms array
  const room = rooms.find(r => r.id === roomIdOrNumber)
  if (room) {
    return room.roomNumber || room.number || roomIdOrNumber
  }
  
  // Fallback
  return roomIdOrNumber.slice(0, 6) + '...'
}
```

### Permission Check Pattern

```typescript
const canPerformAction = 
  currentUser?.role === 'admin' || 
  currentUser?.role === 'MODULE_ADMIN' || 
  currentUser?.role === 'ORGANIZATION_OWNER'
```

---

## 📝 Notes

### Important Files

- `packages/database/prisma/schema.prisma` - Database schema
- `packages/auth/src/auth.config.ts` - NextAuth configuration
- `apps/hotel/src/lib/tenant.ts` - Tenant isolation helpers
- `apps/hotel/src/services/FolioService.ts` - Folio management
- `apps/hotel/src/services/PostingService.ts` - Night audit posting

### Common Issues

1. **Prisma Query Engine not found**: Ensure `output` is set in `schema.prisma`
2. **Tenant ID missing**: Check NextAuth session includes `tenantId`
3. **Room numbers not displaying**: Ensure `rooms` prop is passed to components
4. **CORS errors**: Check `NEXTAUTH_URL` matches actual URL

---

## 🎯 Future Enhancements

- [ ] Restaurant module completion
- [ ] Beauty module implementation
- [ ] Shop module implementation
- [ ] Brewery module implementation
- [ ] Winery module completion
- [ ] Distillery module implementation
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Payment gateway integration
- [ ] Multi-language support
- [ ] Mobile app
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit tests
- [ ] E2E tests
- [ ] CI/CD pipeline

---

## 📞 Support

For issues or questions, please refer to:
- Architecture documentation: `PLATFORM_ARCHITECTURE_ANALYSIS.md`
- Project structure: `PROJECT_STRUCTURE_ANALYSIS.md`
- Hotel module docs: `apps/hotel/PROJECT_ANALYSIS.md`

---

**Last Updated**: December 2024  
**Version**: 1.0.0



