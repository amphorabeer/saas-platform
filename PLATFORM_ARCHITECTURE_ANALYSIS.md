# SaaS Platform Architecture Analysis

## 📋 Table of Contents
1. [Project Structure](#project-structure)
2. [Apps Overview](#apps-overview)
3. [Packages Overview](#packages-overview)
4. [Database Schema](#database-schema)
5. [Current Registration Flow](#current-registration-flow)
6. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
7. [Missing Pieces](#missing-pieces)
8. [Recommended Implementation](#recommended-implementation)
9. [Architecture Diagram](#architecture-diagram)

---

## 🏗️ Project Structure

### Monorepo Setup
- **Package Manager**: pnpm (workspace-based)
- **Build System**: Turbo (Turborepo)
- **Type**: Monorepo with shared packages

```
saas-platform/
├── apps/
│   ├── hotel/              # Hotel PMS Module (port: 3010)
│   ├── restaurant/         # Restaurant Module (port: ???)
│   ├── web/
│   │   ├── landing/        # Landing Page (port: 3000)
│   │   └── super-admin/   # Super Admin Panel (port: 3001)
│   └── winery/            # Winery Module (incomplete)
└── packages/
    ├── auth/              # NextAuth configuration
    ├── database/          # Prisma schema & client
    ├── ui/                # Shared UI components
    ├── types/             # Shared TypeScript types
    ├── utils/             # Shared utilities
    └── config/            # Shared configuration
```

---

## 📱 Apps Overview

### 1. Landing Page (`apps/web/landing`)
**Port**: `3000`  
**Purpose**: Main marketing website where users discover services

**Features**:
- ✅ Module selection (Hotel, Restaurant, Beauty, Shop, Brewery, Winery, Distillery)
- ✅ Dynamic module loading from database/API
- ✅ Links to pricing pages (`/modules/{module}/pricing`)
- ✅ Signup button → `/auth/signup` (⚠️ **DOES NOT EXIST YET**)
- ✅ Login page exists at `/auth/login`

**Current Flow**:
1. User visits landing page
2. Sees available modules
3. Clicks "გაიგე მეტი" → Goes to `/modules/{module}/pricing`
4. On pricing page, clicks "დაწყება" → Links to `/auth/signup` (⚠️ **404 - Missing**)

**Files**:
- `src/app/page.tsx` - Main landing page
- `src/app/modules/[module]/pricing/page.tsx` - Pricing page
- `src/app/auth/login/page.tsx` - Login page

---

### 2. Super Admin (`apps/web/super-admin`)
**Port**: `3001`  
**Purpose**: Platform administration panel

**Features**:
- ✅ Organization management (CRUD)
- ✅ User management
- ✅ Module access management
- ✅ Subscription management
- ✅ Statistics dashboard
- ✅ Landing page content editor

**Database Connection**:
- Uses `@saas-platform/database` package
- Direct Prisma client access
- No tenant isolation (sees all organizations)

**API Routes**:
- `/api/organizations` - Organization CRUD
- `/api/stats` - Platform statistics
- `/api/config` - Configuration management

**Files**:
- `src/app/organizations/page.tsx` - Organizations list
- `src/app/api/organizations/route.ts` - Organizations API

---

### 3. Hotel Module (`apps/hotel`)
**Port**: `3010`  
**Purpose**: Hotel Property Management System (PMS)

**Features**:
- ✅ Room management
- ✅ Reservation management
- ✅ Check-in/Check-out
- ✅ Night Audit
- ✅ Financial reports
- ✅ Folio management
- ✅ Payment processing

**Multi-Tenancy**:
- ⚠️ **CURRENTLY BROKEN**: Uses `prisma.organization.findFirst()` (gets first org)
- Should use `tenantId` from session/auth
- All hotel data filtered by `tenantId` field

**Database Schema**:
- `HotelRoom` - Has `tenantId` field
- `HotelReservation` - Has `tenantId` field
- Both models use `tenantId` for multi-tenant isolation

**Current Issue**:
```typescript
// ❌ WRONG - Gets first organization
const org = await prisma.organization.findFirst()
const reservations = await prisma.hotelReservation.findMany({
  where: { tenantId: org.tenantId }
})

// ✅ SHOULD BE - Get from session
const session = await getServerSession(authOptions)
const tenantId = session.user.tenantId
const reservations = await prisma.hotelReservation.findMany({
  where: { tenantId }
})
```

**Files**:
- `src/app/page.tsx` - Main dashboard
- `src/app/api/hotel/rooms/route.ts` - Rooms API
- `src/app/api/hotel/reservations/route.ts` - Reservations API
- `src/app/api/hotel/check-in/route.ts` - Check-in API

---

## 📦 Packages Overview

### 1. `@saas-platform/database`
**Purpose**: Prisma schema and database client

**Schema Location**: `packages/database/prisma/schema.prisma`

**Key Models**:
- `Organization` - Multi-tenant organizations
- `User` - Platform users
- `Subscription` - Organization subscriptions
- `ModuleAccess` - Module permissions per organization
- `HotelRoom`, `HotelReservation` - Hotel-specific data

**Exports**:
```typescript
export { prisma } from './src/index'
```

---

### 2. `@saas-platform/auth`
**Purpose**: NextAuth configuration

**Location**: `packages/auth/src/auth.config.ts`

**Features**:
- Credentials provider (email/password)
- JWT session strategy
- Includes `organizationId` and `tenantId` in session
- Prisma adapter for sessions

**Session Structure**:
```typescript
{
  user: {
    id: string
    email: string
    name: string
    role: Role
    organizationId: string
    tenantId: string  // From organization.tenantId
  }
}
```

---

### 3. `@saas-platform/ui`
**Purpose**: Shared UI components

**Components**:
- Button, Card, Input, Select
- Avatar, Badge
- Dialog, Sheet, Tabs
- Toast notifications

---

## 🗄️ Database Schema

### Core Models

#### Organization
```prisma
model Organization {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  email       String
  tenantId    String   @unique @default(cuid())  // Multi-tenant identifier
  subscription Subscription?
  users       User[]
  modules     ModuleAccess[]
}
```

#### User
```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  password      String   // Hashed with bcrypt
  role          Role     @default(USER)
  organizationId String?
  organization  Organization? @relation(...)
}
```

#### Subscription
```prisma
model Subscription {
  id            String   @id @default(cuid())
  organizationId String  @unique
  plan          PlanType @default(STARTER)
  status        SubscriptionStatus @default(TRIAL)
  price         Decimal
  currentPeriodStart DateTime
  currentPeriodEnd   DateTime
}
```

#### ModuleAccess
```prisma
model ModuleAccess {
  id            String   @id @default(cuid())
  organizationId String
  moduleType    ModuleType  // HOTEL, RESTAURANT, etc.
  isActive      Boolean  @default(true)
  maxUsers      Int?
  maxRecords    Int?
}
```

#### HotelRoom & HotelReservation
```prisma
model HotelRoom {
  id        String   @id @default(cuid())
  tenantId  String   // Multi-tenant isolation
  roomNumber String
  // ... other fields
}

model HotelReservation {
  id        String   @id @default(cuid())
  tenantId  String   // Multi-tenant isolation
  roomId    String
  // ... other fields
}
```

### Enums

```prisma
enum Role {
  SUPER_ADMIN
  ORGANIZATION_OWNER
  MODULE_ADMIN
  MANAGER
  USER
}

enum ModuleType {
  HOTEL
  RESTAURANT
  BEAUTY
  SHOP
  BREWERY
  WINERY
  DISTILLERY
}

enum PlanType {
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

enum SubscriptionStatus {
  TRIAL
  ACTIVE
  PAST_DUE
  CANCELLED
  EXPIRED
}
```

---

## 🔄 Current Registration Flow

### What Exists:
1. ✅ Landing page with module selection
2. ✅ Pricing pages (`/modules/{module}/pricing`)
3. ✅ Login page (`/auth/login`)
4. ✅ Super Admin can create organizations manually
5. ✅ Auth system (NextAuth) configured

### What's Missing:
1. ❌ **Signup page** (`/auth/signup`) - Returns 404
2. ❌ **Registration API** - No endpoint to create user + organization
3. ❌ **Plan selection in signup** - No way to select plan during registration
4. ❌ **Module selection in signup** - No way to select module during registration
5. ❌ **Automatic organization creation** - Must be done manually in Super Admin
6. ❌ **Post-signup redirect** - No flow after successful registration

### Current Workaround:
- Super Admin manually creates organizations
- Users are manually assigned to organizations
- No self-service registration

---

## 🏢 Multi-Tenancy Architecture

### Current Implementation:
- **Type**: Shared Database, Tenant Isolation via `tenantId`
- **Strategy**: Row-level security using `tenantId` field

### How It Works:
1. Each `Organization` has a unique `tenantId`
2. All tenant-specific data (HotelRoom, HotelReservation) includes `tenantId`
3. Queries filter by `tenantId` from user session

### Current Problem:
Hotel module APIs use:
```typescript
const org = await prisma.organization.findFirst()  // ❌ Gets first org
```
Instead of:
```typescript
const session = await getServerSession(authOptions)
const tenantId = session.user.tenantId  // ✅ Gets from session
```

### Recommended Fix:
1. Create middleware to extract `tenantId` from session
2. Update all hotel APIs to use session `tenantId`
3. Add tenant validation to prevent cross-tenant access

---

## ❌ Missing Pieces

### 1. Registration System
**Priority**: 🔴 **CRITICAL**

**Missing**:
- `/auth/signup` page
- `/api/auth/register` endpoint
- Organization creation during signup
- User creation with `ORGANIZATION_OWNER` role
- ModuleAccess creation
- Subscription creation (TRIAL status)

**Required Flow**:
```
User fills form → API creates:
  1. Organization (with tenantId)
  2. User (with organizationId, role=ORGANIZATION_OWNER)
  3. ModuleAccess (for selected module)
  4. Subscription (status=TRIAL, plan=selected)
  5. Redirect to module dashboard
```

---

### 2. Tenant Isolation in Hotel Module
**Priority**: 🔴 **CRITICAL**

**Current Issue**: Hotel APIs use `findFirst()` instead of session `tenantId`

**Files to Fix**:
- `apps/hotel/src/app/api/hotel/rooms/route.ts`
- `apps/hotel/src/app/api/hotel/reservations/route.ts`
- `apps/hotel/src/app/api/hotel/check-in/route.ts`
- All other hotel API routes

**Solution**:
```typescript
// Create helper function
async function getTenantId(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.tenantId) {
    throw new Error('Unauthorized: No tenant ID')
  }
  return session.user.tenantId
}

// Use in APIs
const tenantId = await getTenantId(request)
const rooms = await prisma.hotelRoom.findMany({
  where: { tenantId }
})
```

---

### 3. Post-Registration Flow
**Priority**: 🟡 **HIGH**

**Missing**:
- Redirect after signup
- Welcome email
- Onboarding flow
- Module dashboard access

**Required**:
- After signup → Redirect to selected module dashboard
- Example: Hotel signup → `http://localhost:3010` (with auth)

---

### 4. Plan Selection in Signup
**Priority**: 🟡 **HIGH**

**Current**: Pricing page shows plans but signup doesn't capture selection

**Required**:
- Pass `plan` parameter to signup page
- Store in form state
- Include in registration API call

---

### 5. Module Selection in Signup
**Priority**: 🟡 **HIGH**

**Current**: User selects module on landing page, but signup doesn't capture it

**Required**:
- Pass `module` parameter to signup page
- Store in form state
- Create `ModuleAccess` during registration

---

## ✅ Recommended Implementation

### Step 1: Create Signup Page
**File**: `apps/web/landing/src/app/auth/signup/page.tsx`

**Features**:
- Form: name, email, password, organization name
- Accept `module` and `plan` from URL params
- Submit to `/api/auth/register`

**URL Structure**:
```
/auth/signup?module=hotel&plan=STARTER
```

---

### Step 2: Create Registration API
**File**: `apps/web/landing/src/app/api/auth/register/route.ts`

**Logic**:
```typescript
export async function POST(request: NextRequest) {
  const { name, email, password, organizationName, module, plan } = await request.json()
  
  // 1. Hash password
  const hashedPassword = await bcrypt.hash(password, 10)
  
  // 2. Generate slug from organization name
  const slug = generateSlug(organizationName)
  
  // 3. Create organization with tenantId
  const organization = await prisma.organization.create({
    data: {
      name: organizationName,
      slug,
      email,
      tenantId: cuid(), // Generate unique tenantId
    }
  })
  
  // 4. Create user as ORGANIZATION_OWNER
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
      role: 'ORGANIZATION_OWNER',
      organizationId: organization.id,
    }
  })
  
  // 5. Create ModuleAccess
  await prisma.moduleAccess.create({
    data: {
      organizationId: organization.id,
      moduleType: module.toUpperCase(), // HOTEL, RESTAURANT, etc.
      isActive: true,
    }
  })
  
  // 6. Create Subscription (TRIAL)
  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      plan: plan || 'STARTER',
      status: 'TRIAL',
      price: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      trialStart: new Date(),
      trialEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
    }
  })
  
  // 7. Return success
  return NextResponse.json({ success: true, userId: user.id })
}
```

---

### Step 3: Update Pricing Page Links
**File**: `apps/web/landing/src/app/modules/[module]/pricing/page.tsx`

**Change**:
```tsx
// BEFORE
<Link href="/auth/signup">დაწყება</Link>

// AFTER
<Link href={`/auth/signup?module=${params.module}&plan=STARTER`}>დაწყება</Link>
<Link href={`/auth/signup?module=${params.module}&plan=PROFESSIONAL`}>არჩევა</Link>
```

---

### Step 4: Fix Hotel Module Tenant Isolation
**File**: `apps/hotel/src/app/api/hotel/rooms/route.ts`

**Change**:
```typescript
// BEFORE
const org = await prisma.organization.findFirst()
const rooms = await prisma.hotelRoom.findMany({
  where: { tenantId: org.tenantId }
})

// AFTER
import { getServerSession } from 'next-auth'
import { authOptions } from '@saas-platform/auth'

const session = await getServerSession(authOptions)
if (!session?.user?.tenantId) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

const rooms = await prisma.hotelRoom.findMany({
  where: { tenantId: session.user.tenantId }
})
```

**Apply to all hotel API routes**.

---

### Step 5: Post-Registration Redirect
**File**: `apps/web/landing/src/app/auth/signup/page.tsx`

**After successful registration**:
```typescript
const response = await fetch('/api/auth/register', { ... })
if (response.ok) {
  // Sign in user
  await signIn('credentials', {
    email,
    password,
    redirect: false,
  })
  
  // Redirect to module dashboard
  const moduleUrl = {
    hotel: 'http://localhost:3010',
    restaurant: 'http://localhost:3002',
    // ... other modules
  }
  
  window.location.href = moduleUrl[module] || '/'
}
```

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER JOURNEY                              │
└─────────────────────────────────────────────────────────────┘

1. Landing Page (localhost:3000)
   │
   ├─> Select Module (Hotel, Restaurant, etc.)
   │
   └─> Pricing Page (/modules/{module}/pricing)
       │
       ├─> Select Plan (Starter, Professional, Enterprise)
       │
       └─> Signup Page (/auth/signup?module=hotel&plan=STARTER)
           │
           ├─> Fill Form (name, email, password, org name)
           │
           └─> POST /api/auth/register
               │
               ├─> Create Organization (with tenantId)
               ├─> Create User (role=ORGANIZATION_OWNER)
               ├─> Create ModuleAccess
               ├─> Create Subscription (status=TRIAL)
               │
               └─> Auto-login → Redirect to Module Dashboard
                   │
                   └─> Hotel Dashboard (localhost:3010)
                       │
                       └─> All queries filtered by tenantId


┌─────────────────────────────────────────────────────────────┐
│                    DATABASE STRUCTURE                         │
└─────────────────────────────────────────────────────────────┘

Organization (tenantId: "abc123")
  ├─> User (organizationId, role=ORGANIZATION_OWNER)
  ├─> Subscription (plan=STARTER, status=TRIAL)
  └─> ModuleAccess (moduleType=HOTEL, isActive=true)

HotelRoom (tenantId: "abc123")  ← Filtered by tenantId
HotelReservation (tenantId: "abc123")  ← Filtered by tenantId


┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. User logs in → NextAuth
2. Session includes:
   {
     user: {
       id: "user123",
       email: "user@example.com",
       organizationId: "org123",
       tenantId: "abc123"  ← Used for data filtering
     }
   }
3. All API requests use session.tenantId for filtering
```

---

## 🎯 Implementation Checklist

### Phase 1: Registration System (Critical)
- [ ] Create `/auth/signup` page
- [ ] Create `/api/auth/register` endpoint
- [ ] Update pricing page links to include `module` and `plan` params
- [ ] Test organization creation
- [ ] Test user creation with `ORGANIZATION_OWNER` role
- [ ] Test ModuleAccess creation
- [ ] Test Subscription creation (TRIAL)

### Phase 2: Tenant Isolation (Critical)
- [ ] Fix hotel rooms API to use session `tenantId`
- [ ] Fix hotel reservations API to use session `tenantId`
- [ ] Fix hotel check-in API to use session `tenantId`
- [ ] Fix all other hotel APIs
- [ ] Add tenant validation middleware
- [ ] Test multi-tenant isolation

### Phase 3: Post-Registration Flow (High)
- [ ] Auto-login after registration
- [ ] Redirect to module dashboard
- [ ] Add welcome email (optional)
- [ ] Add onboarding flow (optional)

### Phase 4: Testing
- [ ] Test full registration flow
- [ ] Test multi-tenant isolation
- [ ] Test plan selection
- [ ] Test module selection
- [ ] Test redirect after signup

---

## 📝 Summary

### Current State:
- ✅ Landing page exists
- ✅ Pricing pages exist
- ✅ Login exists
- ✅ Super Admin can manage organizations
- ✅ Database schema supports multi-tenancy
- ❌ **No self-service registration**
- ❌ **Hotel module doesn't use session tenantId**

### Required Changes:
1. **Create signup page and API** (highest priority)
2. **Fix hotel module tenant isolation** (critical for security)
3. **Add post-registration redirect** (user experience)
4. **Pass module/plan params through signup flow** (data capture)

### Expected Outcome:
Complete self-service registration flow where users can:
1. Visit landing page
2. Select a module
3. View pricing
4. Sign up with email/password
5. Get automatic organization creation
6. Access their module dashboard
7. All data properly isolated by tenantId

---

**Last Updated**: 2024-12-19
**Status**: Analysis Complete - Ready for Implementation






