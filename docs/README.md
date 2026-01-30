# SaaS Multi-Module Platform

A production-ready SaaS platform with multi-tenancy support for managing Hotels, Restaurants, Beauty Salons, Shops, Breweries, Wineries, and Distilleries.

## 🚀 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Monorepo**: Turborepo
- **Package Manager**: pnpm

## 📁 Project Structure

```
saas-platform/
├── apps/
│   ├── web/
│   │   ├── landing/              # Public marketing website
│   │   └── super-admin/          # Platform administration
│   └── [modules]/
│       ├── dashboard/            # Module front desk operations
│       └── admin/                # Module management panel
├── packages/
│   ├── ui/                       # Shared UI components
│   ├── database/                 # Prisma schemas & migrations
│   ├── auth/                     # Authentication logic
│   ├── types/                    # Shared TypeScript types
│   ├── utils/                    # Utility functions
│   └── config/                  # Shared configurations
```

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 15+
- Docker (optional, for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd saas-platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start PostgreSQL and Redis (using Docker)**
   ```bash
   docker-compose up -d
   ```

5. **Setup database**
   ```bash
   pnpm db:push
   # or
   pnpm db:migrate
   ```

6. **Generate Prisma Client**
   ```bash
   pnpm db:generate
   ```

7. **Start development servers**
   ```bash
   pnpm dev
   ```

This will start:
- Landing: http://localhost:3000
- Super Admin: http://localhost:3001
- Module dashboards and admins on their respective ports

## 📝 Available Scripts

- `pnpm dev` - Start all apps in development mode
- `pnpm build` - Build all apps
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages
- `pnpm db:generate` - Generate Prisma Client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:migrate` - Run database migrations
- `pnpm db:studio` - Open Prisma Studio

## 🏗️ Development

### Adding a New Module

1. Create module structure:
   ```bash
   mkdir -p apps/[module-name]/{dashboard,admin}
   ```

2. Initialize Next.js apps in each directory
3. Add module-specific Prisma models to `packages/database/prisma/schema.prisma`
4. Update Turbo pipeline if needed

### Working with Shared Packages

All shared packages are in the `packages/` directory:
- `@saas-platform/ui` - UI components
- `@saas-platform/database` - Database client
- `@saas-platform/auth` - Authentication
- `@saas-platform/types` - TypeScript types
- `@saas-platform/utils` - Utility functions
- `@saas-platform/config` - Configuration

## 🧪 Testing

```bash
pnpm test              # Run all tests
pnpm test:unit         # Unit tests
pnpm test:integration  # Integration tests
pnpm test:e2e          # E2E tests
pnpm test:coverage     # Coverage report
```

## 🚢 Deployment

See deployment documentation in `docs/deployment.md`

## 📄 License

MIT

