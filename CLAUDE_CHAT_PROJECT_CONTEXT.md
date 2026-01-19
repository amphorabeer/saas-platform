# SaaS Platform - Project Context for Claude Chat

## 🎯 Project Overview

This is a **multi-tenant SaaS platform** built as a monorepo that provides business management solutions for multiple industries. The platform supports 7 different modules: Hotel PMS, Restaurant, Beauty Salon, Shop, Brewery, Winery, and Distillery.

**Key Characteristics:**
- Multi-tenant architecture with complete data isolation
- Self-service tenant registration
- Role-based access control (RBAC)
- Subscription management system
- Module-based architecture allowing tenants to subscribe to specific modules
- Georgian language interface (ქართული)

---

## 🏗️ Architecture

### Monorepo Structure
- **Build System**: Turborepo
- **Package Manager**: pnpm workspaces
- **Type System**: TypeScript (strict mode)
- **Code Organization**: Apps + Shared Packages pattern

### Tech Stack
- **Frontend Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS + Custom components
- **UI Library**: shadcn/ui + custom components
- **Database**: PostgreSQL 15+
- **ORM**: Prisma 5.22.0
- **Authentication**: NextAuth.js 4.24.5
- **State Management**: Zustand 5.0.9
- **Forms**: React Hook Form + Zod validation
- **Date Handling**: moment.js
- **PDF Generation**: jsPDF
- **Drag & Drop**: @dnd-kit
- **Cache**: Upstash Redis (cloud) + local Redis (dev)

---

## 📁 Project Structure

```
saas-platform/
├── apps/                          # Individual applications
│   ├── brewery/                   # Brewery Management System (port 3020)
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router pages
│   │   │   │   ├── api/           # API routes
│   │   │   │   ├── production/    # Production management
│   │   │   │   ├── calendar/      # Calendar view
│   │   │   │   ├── inventory/     # Inventory management
│   │   │   │   └── ...
│   │   │   ├── components/        # React components
│   │   │   └── lib/              # Utilities
│   │   └── prisma/               # Module-specific Prisma schema
│   │
│   ├── hotel/                     # Hotel PMS (port 3010)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/           # API routes
│   │   │   │   └── ...
│   │   │   └── components/        # Hotel-specific components
│   │   └── prisma/                # Hotel Prisma schema
│   │
│   ├── web/
│   │   ├── landing/               # Marketing site (port 3000)
│   │   └── super-admin/           # Platform admin (port 3001)
│   │
│   └── restaurant/                # Restaurant module (port 3011)
│
├── packages/                      # Shared packages
│   ├── auth/                      # NextAuth configuration
│   │   └── src/
│   │       └── auth.config.ts     # Auth setup
│   │
│   ├── database/                  # Prisma schema & client
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Main schema (multi-tenant)
│   │   │   └── migrations/        # Database migrations
│   │   └── src/
│   │       ├── client.ts          # Prisma client with retry logic
│   │       └── config.ts          # Database config helpers
│   │
│   ├── ui/                        # Shared UI components
│   │   └── src/                   # Reusable components
│   │
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                     # Utility functions
│   ├── config/                    # Shared configuration
│   │   └── src/index.ts           # Central config (env vars)
│   │
│   └── redis/                     # Redis client (Upstash)
│       └── src/client.ts          # Redis connection
│
├── docker-compose.yml             # Local dev: PostgreSQL + Redis
├── Dockerfile                      # Production Docker image
├── package.json                    # Root package.json
├── pnpm-workspace.yaml            # pnpm workspace config
├── turbo.json                     # Turborepo pipeline config
└── tsconfig.json                  # Root TypeScript config
```

---

## 🍺 Brewery Module (Most Developed)

**Location**: `apps/brewery/`  
**Port**: `3020`  
**Status**: Fully functional, production-ready

### Key Features:
1. **Production Management**
   - Batch tracking (PLANNED → BREWING → FERMENTING → CONDITIONING → READY → PACKAGING)
   - Recipe management
   - Tank scheduling and allocation
   - Equipment management

2. **Calendar System**
   - Resource timeline view (Brewhouse, Fermentation tanks, Conditioning tanks)
   - Drag-and-drop scheduling
   - Event visualization with status colors
   - Multi-resource view

3. **Inventory Management**
   - Ingredients (grain, hops, yeast, adjuncts, water chemistry, cleaning supplies)
   - Packaging materials (bottles, cans, caps, labels, kegs)
   - Real-time stock tracking
   - Inventory ledger with transactions

4. **Quality Control**
   - QC tests and sensory evaluations
   - Test result tracking
   - Batch quality history

5. **Sales & Products**
   - Product catalog
   - Sales orders
   - Packaging run tracking

6. **Financial Management**
   - Transactions
   - Invoices
   - Payments
   - Expenses
   - Budgets

### Database Schema:
- Uses both shared schema (`packages/database/prisma/schema.prisma`) and module-specific schema (`apps/brewery/prisma/schema.prisma`)
- Multi-tenant with `Tenant` model
- Key models: `Batch`, `Recipe`, `Tank`, `InventoryItem`, `PackagingRun`, `Product`, `SalesOrder`

### API Routes:
- `/api/lots` - Batch management
- `/api/fermentation/start` - Start fermentation
- `/api/conditioning/start` - Start conditioning
- `/api/packaging` - Packaging operations
- `/api/inventory` - Inventory management
- `/api/tanks` - Tank management
- `/api/products` - Product management

---

## 🏨 Hotel Module

**Location**: `apps/hotel/`  
**Port**: `3010`  
**Status**: Functional, feature-complete

### Key Features:
1. **Reservation Management**
   - Room calendar with drag-and-drop
   - Check-in/Check-out process
   - Reservation status tracking
   - Guest management

2. **Night Audit System**
   - Sequential day closing
   - Validation rules
   - Statistics calculation
   - No-show processing

3. **Folio Management**
   - Guest folio generation
   - Transaction tracking
   - Payment processing (8 payment methods)
   - Balance calculations

4. **Cashier Module**
   - Payment processing
   - Receipt generation
   - Transaction history

5. **Settings Hub**
   - Hotel information
   - Room management
   - Staff management
   - Pricing configuration
   - Housekeeping checklists

### Data Storage:
- Uses localStorage for demo (can be migrated to database)
- API routes available for database integration
- Multi-user support with role-based access

---

## 🔐 Authentication & Multi-Tenancy

### Authentication:
- **Provider**: NextAuth.js
- **Strategy**: JWT-based sessions
- **Configuration**: `packages/auth/src/auth.config.ts`
- **Database Adapter**: Prisma adapter (lazy-loaded)

### Multi-Tenancy:
- **Model**: `Tenant` in database schema
- **Isolation**: All data scoped by `tenantId`
- **Registration**: Self-service via landing page
- **Subscription**: Module-based subscriptions

### Database Schema (Multi-Tenant):
```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  plan      PlanType @default(STARTER)
  isActive  Boolean  @default(true)
  // ... relations to all tenant-scoped models
}

model User {
  id       String  @id @default(cuid())
  tenantId String
  email    String
  role     UserRole @default(OPERATOR)
  // ... tenant relation
  @@unique([tenantId, email])
}
```

---

## 🗄️ Database Architecture

### Main Schema (`packages/database/prisma/schema.prisma`):
- **Tenant** - Multi-tenant isolation
- **User** - User accounts (tenant-scoped)
- **ModuleConfig** - Available modules
- **Organization** - Tenant organizations
- **Subscription** - Tenant subscriptions
- **ModuleAccess** - Which modules each tenant has

### Module-Specific Schemas:
- `apps/brewery/prisma/schema.prisma` - Brewery-specific models
- `apps/hotel/prisma/schema.prisma` - Hotel-specific models
- Other modules have their own schemas

### Connection:
- **URL**: `DATABASE_URL` environment variable
- **Client**: Prisma Client with retry logic (`packages/database/src/client.ts`)
- **Migrations**: Managed via Prisma migrations
- **Local Dev**: PostgreSQL 15 via Docker Compose

---

## 🔧 Development Setup

### Prerequisites:
- Node.js 18+
- pnpm 8.15.0
- PostgreSQL 15+
- Docker (optional, for local DB)

### Commands:
```bash
# Install dependencies
pnpm install

# Start local database (Docker)
docker-compose up -d

# Generate Prisma Client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Start all apps in dev mode
pnpm dev

# Build all apps
pnpm build

# Type check
pnpm type-check

# Lint
pnpm lint
```

### Environment Variables:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Base URL for auth callbacks
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `NEXT_PUBLIC_APP_URL` - Public-facing URL
- AWS S3 credentials (if using file storage)
- SendGrid API key (for emails)
- Stripe keys (for payments)

---

## 📦 Key Packages & Dependencies

### Shared Packages:
- `@saas-platform/database` - Prisma client and helpers
- `@saas-platform/auth` - NextAuth configuration
- `@saas-platform/ui` - Shared UI components
- `@saas-platform/types` - Shared TypeScript types
- `@saas-platform/utils` - Utility functions
- `@saas-platform/config` - Centralized configuration

### Main Dependencies:
- `next`: ^14.0.4
- `react`: ^18.2.0
- `react-dom`: ^18.2.0
- `@prisma/client`: ^5.7.1
- `next-auth`: ^4.24.5
- `zustand`: ^5.0.9
- `zod`: ^3.22.4
- `react-hook-form`: ^7.49.0
- `moment`: ^2.30.1
- `@upstash/redis`: ^1.34.0

---

## 🎨 UI/UX Patterns

### Design System:
- **Theme**: Dark mode (primary)
- **Colors**: Custom color palette (copper, amber, etc.)
- **Components**: Custom components + shadcn/ui
- **Icons**: Lucide React icons
- **Language**: Georgian (ქართული) interface

### Common Patterns:
- **Layout**: `DashboardLayout` component for consistent page structure
- **Navigation**: Sidebar navigation with icons
- **Forms**: React Hook Form with Zod validation
- **Modals**: Custom modal components
- **Tables**: Custom table components with sorting/filtering
- **Cards**: Card-based UI for statistics and information

---

## 🔄 State Management

### Approach:
- **Local State**: React `useState` and `useEffect`
- **Global State**: Zustand stores (module-specific)
- **Server State**: API routes with fetch
- **Form State**: React Hook Form

### Zustand Stores:
- `apps/brewery/src/store/breweryStore.ts` - Brewery-specific state
- Other modules may have their own stores

---

## 🚀 Deployment Status

**Current Status**: Development-only, not production-ready

### Issues Found:
1. Dockerfile runs `pnpm dev` in production (should be `pnpm start`)
2. No environment separation (dev/staging/prod)
3. No CI/CD pipeline
4. No deployment configuration

### Recommended:
- **Phase 1**: Railway.app for simple deployment
- **Phase 2**: Fly.io for scaling
- See `INFRASTRUCTURE_AUDIT_REPORT.md` for details

---

## 📝 Code Conventions

### TypeScript:
- Strict mode enabled
- Type safety enforced
- Interfaces for component props
- Type exports from packages

### File Naming:
- Components: PascalCase (e.g., `PackagingModal.tsx`)
- Utilities: camelCase (e.g., `formatDate.ts`)
- API routes: `route.ts` in Next.js App Router

### Code Organization:
- Feature-based organization in components
- Shared utilities in packages
- API routes co-located with pages
- Types defined near usage or in shared packages

---

## 🐛 Known Issues & Technical Debt

1. **Multiple Prisma Schemas**: Some modules have separate schemas, causing potential conflicts
2. **TypeScript Errors Ignored**: Some Next.js configs have `ignoreBuildErrors: true`
3. **Redis Config Mismatch**: Code uses Upstash, docker-compose provides local Redis
4. **No Background Workers**: Long-running tasks run in API routes (timeout risk)
5. **No Environment Separation**: All environments use same config

---

## 🎯 Development Focus Areas

### Most Active Module:
- **Brewery** (`apps/brewery/`) - Most developed, actively maintained

### Key Files to Know:
- `apps/brewery/src/constants/index.ts` - Navigation items, status configs
- `packages/database/prisma/schema.prisma` - Main database schema
- `packages/config/src/index.ts` - Environment variable configuration
- `apps/brewery/src/app/production/page.tsx` - Main production dashboard
- `apps/brewery/src/app/calendar/page.tsx` - Calendar view

---

## 💡 Important Notes for AI Assistants

1. **Language**: Interface is in Georgian (ქართული). Code comments may be in Georgian.
2. **Multi-Tenant**: Always consider `tenantId` when working with data
3. **Module Isolation**: Each module (`brewery`, `hotel`, etc.) is a separate Next.js app
4. **Shared Code**: Common functionality is in `packages/` directory
5. **Database**: Uses Prisma ORM - always use Prisma Client, not raw SQL
6. **API Routes**: Next.js App Router API routes in `app/api/` directories
7. **State**: Prefer local state, use Zustand only for truly global state
8. **Forms**: Always use React Hook Form + Zod for validation
9. **Styling**: Tailwind CSS classes, custom components from `@saas-platform/ui`
10. **Ports**: Each app runs on different port (3000, 3001, 3010, 3020, etc.)

---

## 📚 Additional Documentation

- `README.md` - Basic setup instructions
- `SAAS_PLATFORM_DOCUMENTATION.md` - Detailed platform documentation (Georgian)
- `INFRASTRUCTURE_AUDIT_REPORT.md` - Infrastructure analysis and recommendations
- Module-specific docs in each `apps/[module]/` directory

---

**Last Updated**: January 2025  
**Project Status**: Active Development  
**Primary Language**: Georgian (ქართული)  
**Target Market**: Georgian businesses (hotels, restaurants, breweries, etc.)
