# Brewery SaaS Module - Setup Guide

## ✅ Current Status

All brewery packages have been created in the monorepo:
- ✅ `@brewery/database` - Prisma schema, client, tenant extension
- ✅ `@brewery/domain` - Repositories, services, types, errors
- ✅ `@brewery/redis` - Redis client, idempotency, locks
- ✅ `@brewery/auth` - NextAuth config, RBAC
- ✅ `@brewery/observability` - Logger, Sentry, metrics
- ✅ `apps/brewery` - Next.js app with API routes

## 📋 Setup Steps

### 1. Install Dependencies

```bash
# Install all dependencies (may need to fix workspace issues first)
pnpm install --no-frozen-lockfile
```

**Note:** If you encounter workspace dependency errors (like `@saas-platform/database` not found), those are from other apps (hotel, restaurant) and won't affect the brewery module.

### 2. Configure Environment

```bash
# Copy .env.example to .env (already done)
# Edit .env and add your actual values:
# - DATABASE_URL (Neon PostgreSQL)
# - UPSTASH_REDIS_REST_URL
# - UPSTASH_REDIS_REST_TOKEN
# - NEXTAUTH_SECRET (generate with: openssl rand -base64 32)
# - NEXTAUTH_URL
```

### 3. Database Setup

```bash
# Generate Prisma client
pnpm db:generate

# For NEW database: Push schema
pnpm db:push

# For EXISTING database: Create migration
# (You'll need to run this interactively or create migration manually)
# cd packages/database && npx prisma migrate dev --name add_brewery_schema

# Apply triggers manually via psql or database console:
psql $DATABASE_URL < packages/database/prisma/triggers.sql
```

### 4. Seed Database

```bash
pnpm db:seed
```

This creates:
- Demo tenant: `demo-brewery`
- Demo user: `admin@demo.com` (role: OWNER)
- Inventory items (malts, hops, yeast, packaging)
- Tanks (fermenters, brite tanks)
- Sample recipe: "American Pale Ale"
- Sample customer: "Demo Bar"

### 5. Start Development Server

```bash
pnpm dev
```

The brewery app will run on `http://localhost:3020`

## 🔧 Troubleshooting

### Workspace Dependency Errors

If you see errors about `@saas-platform/*` packages not found, these are from other apps (hotel, restaurant) and don't affect the brewery module. You can:

1. Ignore them for now (brewery works independently)
2. Or create placeholder packages if needed

### Database Schema Conflicts

If you have existing tables that conflict with the brewery schema:
- The `User` table might need `tenantId` added
- Consider creating a migration that adds brewery tables without modifying existing ones

### Missing Dependencies

If `vitest` or `tsx` commands are not found:
```bash
# Install in specific package
cd packages/brewery-domain && pnpm install
cd ../../apps/brewery && pnpm install
```

## 📁 Package Structure

```
packages/
├── database/          # Prisma schema, client, tenant extension
├── brewery-domain/    # Business logic, repositories, services
├── redis/             # Redis client, idempotency, locks
├── auth/              # NextAuth, RBAC
└── observability/     # Logger, Sentry, metrics

apps/
└── brewery/           # Next.js app with API routes
```

## 🚀 Next Steps

1. Update `.env` with real credentials
2. Set up Neon PostgreSQL database
3. Set up Upstash Redis
4. Run database setup commands
5. Start developing!
