# Infrastructure & Server Usage Audit Report
**SaaS Platform - Multi-Tenant (Hotel + Brewery PMS)**
**Date:** January 2025

---

## Executive Summary

This audit reveals a **development-focused setup** with no production deployment infrastructure. The platform is configured for local development only, with critical gaps in production readiness, environment separation, and infrastructure management.

**Key Findings:**
- ✅ Good: Clean monorepo structure, Docker setup for local dev
- ⚠️ **Critical:** Dockerfile runs dev mode in production
- ⚠️ **Critical:** No environment separation (dev/staging/prod)
- ⚠️ **Critical:** No deployment configuration or CI/CD
- ⚠️ **Risk:** Redis configuration mismatch (local vs Upstash)
- ⚠️ **Risk:** Database credentials hardcoded in docker-compose
- ⚠️ **Missing:** Background workers, queue system, job processing

---

## A) Current Infrastructure Map

### API Server(s)
**Status:** ❌ Not deployed / Development only

- **Framework:** Next.js 14 (App Router) with API Routes
- **Architecture:** Monorepo with multiple Next.js apps:
  - `apps/web/landing` (port 3000) - Marketing site
  - `apps/web/super-admin` (port 3001) - Platform admin
  - `apps/hotel` (port 3010) - Hotel PMS
  - `apps/brewery` (port 3020) - Brewery PMS
  - `apps/restaurant` (port 3011) - Restaurant module
  - Additional modules on ports 3030-3170
- **Deployment:** None configured
- **Runtime:** Node.js 18+ (via Dockerfile)
- **File:** `Dockerfile` (line 52: **CRITICAL BUG** - runs `pnpm dev` in production)

### Database Server(s)
**Status:** ⚠️ Local development only

- **Type:** PostgreSQL 15
- **Location:** Local Docker container (`docker-compose.yml`)
- **Connection:** Prisma ORM via `DATABASE_URL` environment variable
- **Schema:** Multi-tenant schema with `Tenant` model
- **Files:**
  - `packages/database/prisma/schema.prisma`
  - `docker-compose.yml` (postgres service)
- **Credentials:** Hardcoded (`postgres/postgres`) - **SECURITY RISK**
- **SSL:** Not configured (local only)
- **Backup:** None configured
- **Migrations:** Managed via Prisma (`pnpm db:migrate`)

### Cache / Redis
**Status:** ⚠️ Configuration mismatch

- **Implementation:** Two different Redis setups detected:
  1. **Local Redis** (docker-compose.yml, port 6379) - Not actually used
  2. **Upstash Redis** (cloud service) - Actually used in code
- **Package:** `@upstash/redis` (packages/redis/package.json)
- **Env Vars:**
  - `REDIS_URL` (defined in config, defaults to localhost:6379)
  - `UPSTASH_REDIS_REST_URL` (actually used in code)
  - `UPSTASH_REDIS_REST_TOKEN` (actually used in code)
- **Usage:** Rate limiting, idempotency, locks
- **File:** `packages/redis/src/client.ts`
- **Issue:** Config mismatch - code uses Upstash, docker-compose provides local Redis

### Frontend Hosting
**Status:** ❌ Not deployed

- **Framework:** Next.js 14 (Server-Side Rendering + API Routes)
- **Build Config:**
  - Landing app: `output: 'standalone'` (apps/web/landing/next.config.js)
  - Other apps: Standard Next.js output
- **Static Assets:** Not configured (no CDN)
- **Domain/CDN:** None configured
- **Deployment Target:** Unknown (no Vercel/Railway/Fly configs found)

### File Storage
**Status:** ⚠️ Configured but not implemented

- **Service:** AWS S3 (configured in `packages/config/src/index.ts`)
- **Env Vars:**
  - `AWS_S3_BUCKET`
  - `AWS_ACCESS_KEY_ID`
  - `AWS_SECRET_ACCESS_KEY`
- **Status:** Config exists, actual usage not verified
- **Alternative:** No local file storage fallback found

### Background Workers
**Status:** ❌ Not implemented

- **Queue System:** None found
- **Job Processing:** None found
- **Cron Jobs:** None found
- **Scheduled Tasks:** None found
- **Recommendation:** Required for:
  - Email sending
  - Report generation
  - Data synchronization
  - Scheduled notifications
  - Batch processing

---

## B) Environment Separation

### Current State: ❌ **NO SEPARATION**

**All environments use the same configuration:**
- No `NODE_ENV`-based conditionals (except logging)
- No separate database instances
- No separate Redis instances
- No environment-specific config files
- No deployment pipelines for different environments

### Environment Variables

**Detected Environment Variables:**
```env
# Database
DATABASE_URL                    # PostgreSQL connection string

# Authentication
NEXTAUTH_SECRET                 # NextAuth secret key
NEXTAUTH_URL                    # Base URL for auth callbacks

# Application
NEXT_PUBLIC_APP_URL            # Public-facing URL
NODE_ENV                        # Only used for logging levels

# Email (SendGrid)
EMAIL_FROM                     # Sender email
SENDGRID_API_KEY               # SendGrid API key

# Payments (Stripe)
STRIPE_SECRET_KEY              # Stripe secret
STRIPE_WEBHOOK_SECRET          # Stripe webhook secret

# Storage (AWS S3)
AWS_S3_BUCKET                  # S3 bucket name
AWS_ACCESS_KEY_ID              # AWS access key
AWS_SECRET_ACCESS_KEY          # AWS secret key

# Redis (Upstash)
UPSTASH_REDIS_REST_URL         # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN       # Upstash Redis token

# Ports (Development only)
LANDING_PORT, SUPER_ADMIN_PORT, HOTEL_DASHBOARD_PORT, etc.
```

**Missing Environment Separation:**
- ❌ No `.env.development`, `.env.staging`, `.env.production`
- ❌ No environment-specific database URLs
- ❌ No environment-specific API keys
- ❌ No feature flags per environment
- ❌ No separate authentication providers

**Files Analyzed:**
- `packages/config/src/index.ts` - Central config (no env separation)
- `docker-compose.yml` - Hardcoded dev values
- No `.env.example` file found (referenced in docs but missing)

---

## C) Risks & Problems

### 🔴 Critical Issues

#### 1. **Dockerfile Production Bug**
**File:** `Dockerfile` (line 52)
```dockerfile
CMD ["pnpm", "dev"]  # ❌ WRONG - runs dev mode in production
```
**Impact:** Production builds would run in development mode (no optimization, hot reload, debugging enabled)
**Fix Required:** Change to `CMD ["pnpm", "start"]` or use Next.js standalone server

#### 2. **No Environment Separation**
**Impact:**
- Cannot test staging changes safely
- Production credentials could be used in development
- No way to deploy to staging before production
- Risk of data corruption across environments

#### 3. **Hardcoded Database Credentials**
**File:** `docker-compose.yml` (lines 6-7)
```yaml
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres  # ❌ Weak password, hardcoded
```
**Impact:** Security risk if docker-compose.yml is committed or shared

#### 4. **Redis Configuration Mismatch**
**Issue:** Code uses Upstash (cloud), docker-compose provides local Redis
**Files:**
- `docker-compose.yml` - Local Redis on port 6379
- `packages/redis/src/client.ts` - Uses Upstash REST API
**Impact:** Confusion, wasted resources, potential connection errors

#### 5. **No Deployment Configuration**
**Impact:**
- Cannot deploy to any environment
- No CI/CD pipeline
- Manual deployment only (error-prone)
- No automated testing in deployment pipeline

### ⚠️ High-Risk Issues

#### 6. **Database SSL Not Enforced**
**Current:** Documentation shows `sslmode=disable` for local dev
**Missing:** No production SSL configuration
**Impact:** Data in transit not encrypted (if deployed to production)

#### 7. **No Database Backups**
**Impact:** Data loss risk, no disaster recovery

#### 8. **Multiple Database Schemas**
**Files Found:**
- `packages/database/prisma/schema.prisma` (main)
- `apps/brewery/prisma/schema.prisma`
- `apps/hotel/prisma/schema.prisma`
- `apps/web/landing/prisma/schema.prisma`
- `apps/web/super-admin/prisma/schema.prisma`
**Risk:** Schema drift, migration conflicts, confusion

#### 9. **No Background Job System**
**Impact:**
- Long-running API requests (timeouts)
- No async email sending
- No scheduled tasks
- Poor user experience for heavy operations

#### 10. **Port Conflicts in Production**
**Current:** Each app uses different ports (3000, 3001, 3010, 3020, etc.)
**Issue:** Production deployments typically use port 80/443 or single port with routing
**Impact:** Complex deployment, need for reverse proxy

### 🟡 Medium-Risk Issues

#### 11. **No Monitoring/Logging**
- No APM (Application Performance Monitoring)
- No centralized logging
- No error tracking (Sentry, etc.)
- No health checks (except Docker healthchecks)

#### 12. **No Load Balancing**
- Single instance deployment only
- No horizontal scaling capability

#### 13. **File Storage Not Verified**
- AWS S3 configured but usage not confirmed
- No fallback storage mechanism

#### 14. **No CDN Configuration**
- Static assets served from app server
- No edge caching

#### 15. **TypeScript/ESLint Errors Ignored**
**Files:**
- `apps/brewery/next.config.js` - `ignoreBuildErrors: true`
- `apps/hotel/next.config.js` - `ignoreBuildErrors: true`
**Impact:** Runtime errors in production, technical debt

---

## D) Recommendations

### Immediate Fixes (Week 1)

#### 1. **Fix Dockerfile Production Command**
```dockerfile
# Change line 52 in Dockerfile
# FROM:
CMD ["pnpm", "dev"]

# TO:
CMD ["node", "apps/web/landing/.next/standalone/server.js"]
# OR for monorepo:
CMD ["pnpm", "start"]
```
**File:** `Dockerfile`

#### 2. **Create Environment Separation**
Create environment-specific config files:
```
.env.development.local
.env.staging.local
.env.production.local
```

Use `NODE_ENV` to load correct config:
```typescript
// packages/config/src/index.ts
const env = process.env.NODE_ENV || 'development'
const configFile = `.env.${env}.local`
```

#### 3. **Fix Redis Configuration**
**Option A:** Use Upstash everywhere (recommended for production)
- Remove local Redis from docker-compose.yml (or mark as dev-only)
- Document Upstash setup

**Option B:** Use local Redis everywhere
- Update `packages/redis/src/client.ts` to use `REDIS_URL`
- Remove Upstash dependency

**Recommendation:** Option A (Upstash) for production, Option B for local dev

#### 4. **Secure Database Credentials**
Update `docker-compose.yml`:
```yaml
postgres:
  environment:
    POSTGRES_USER: ${POSTGRES_USER:-postgres}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-postgres}
```
Use environment variables, never commit passwords.

#### 5. **Create `.env.example` File**
Document all required environment variables with example values (no secrets).

---

### Recommended Target Architecture

#### Phase 1: Early Production (Small Team, <1000 users)

**Infrastructure:**
```
┌─────────────────────────────────────────┐
│         Cloud Provider (Railway)        │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐    ┌──────────────┐  │
│  │  Next.js App │    │  PostgreSQL  │  │
│  │  (Railway)   │◄───┤  (Railway)   │  │
│  └──────────────┘    └──────────────┘  │
│         │                               │
│         ▼                               │
│  ┌──────────────┐                       │
│  │   Upstash    │                       │
│  │    Redis     │                       │
│  └──────────────┘                       │
│                                         │
│  ┌──────────────┐                       │
│  │  AWS S3      │  (File Storage)       │
│  └──────────────┘                       │
└─────────────────────────────────────────┘
```

**Recommended Provider: Railway.app**
- **Why:** Simple, supports monorepos, PostgreSQL included, easy env management
- **Cost:** ~$20-50/month for small scale
- **Setup:**
  1. Connect GitHub repo
  2. Railway detects Dockerfile
  3. Add PostgreSQL service
  4. Set environment variables
  5. Deploy

**Alternative Providers:**
- **Fly.io** - Good for global distribution, $5-30/month
- **Render** - Simple, $7-25/month per service
- **Vercel** - Best for Next.js, but complex for monorepo + database

**Configuration:**
```yaml
# railway.json (create this)
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node apps/web/landing/.next/standalone/server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**Environment Variables (Railway):**
- `DATABASE_URL` - Railway PostgreSQL connection string (auto-provided)
- `NEXTAUTH_SECRET` - Generate: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Your production domain
- `UPSTASH_REDIS_REST_URL` - From Upstash dashboard
- `UPSTASH_REDIS_REST_TOKEN` - From Upstash dashboard
- AWS S3 credentials (if using file storage)

**Steps:**
1. Fix Dockerfile (change CMD to production)
2. Create `railway.json`
3. Set up Railway account
4. Create project, add PostgreSQL service
5. Connect GitHub, deploy
6. Set environment variables
7. Run migrations: `railway run pnpm db:migrate`

---

#### Phase 2: Scaled SaaS (Multi-Tenant, >1000 users)

**Infrastructure:**
```
┌─────────────────────────────────────────────────────┐
│              Cloud Provider (AWS/Fly.io)            │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────┐         ┌──────────────┐         │
│  │   CDN        │         │  Load        │         │
│  │  (CloudFlare)│────────►│  Balancer    │         │
│  └──────────────┘         └──────┬───────┘         │
│                                   │                 │
│              ┌────────────────────┼─────────────────┤
│              ▼                    ▼                 │
│     ┌──────────────┐    ┌──────────────┐           │
│     │  Next.js App │    │  Next.js App │           │
│     │  (Instance 1)│    │  (Instance 2)│           │
│     └──────┬───────┘    └──────┬───────┘           │
│            │                   │                    │
│            └─────────┬─────────┘                    │
│                      ▼                              │
│            ┌──────────────┐                         │
│            │  PostgreSQL  │                         │
│            │  (Managed)   │                         │
│            └──────────────┘                         │
│                      │                              │
│            ┌─────────┴─────────┐                    │
│            ▼                   ▼                    │
│     ┌──────────────┐    ┌──────────────┐           │
│     │   Upstash    │    │  Background  │           │
│     │    Redis     │    │   Workers    │           │
│     └──────────────┘    │  (BullMQ)    │           │
│                         └──────────────┘           │
│                                                     │
│  ┌──────────────┐    ┌──────────────┐              │
│  │  AWS S3      │    │  Monitoring  │              │
│  │  (Storage)   │    │  (Sentry)    │              │
│  └──────────────┘    └──────────────┘              │
└─────────────────────────────────────────────────────┘
```

**Recommended Provider: Fly.io or AWS**

**Fly.io Option:**
- **Why:** Global distribution, Docker-native, built-in load balancing
- **Cost:** ~$50-200/month
- **Features:**
  - Multiple regions
  - Auto-scaling
  - Built-in load balancer
  - PostgreSQL (via Fly Postgres)

**AWS Option:**
- **Why:** Maximum control, enterprise-grade
- **Cost:** ~$100-500/month
- **Services:**
  - ECS/Fargate (containers)
  - RDS PostgreSQL
  - ElastiCache Redis
  - S3 (storage)
  - CloudFront (CDN)
  - ALB (load balancer)

**Required Additions:**
1. **Background Job System**
   - BullMQ or Inngest
   - Separate worker containers
   - Queue management UI

2. **Monitoring**
   - Sentry (error tracking)
   - Datadog/New Relic (APM)
   - Log aggregation (Loki/ELK)

3. **CI/CD Pipeline**
   - GitHub Actions
   - Automated testing
   - Staging environment
   - Blue-green deployments

4. **Database Optimization**
   - Read replicas
   - Connection pooling (PgBouncer)
   - Automated backups

---

### Provider Comparison

| Provider | Best For | Cost/Month | Pros | Cons |
|----------|----------|------------|------|------|
| **Railway** | Simple deployment, small teams | $20-50 | Easy setup, PostgreSQL included, env management | Limited scaling, vendor lock-in |
| **Fly.io** | Global distribution, Docker apps | $50-200 | Multi-region, auto-scaling, PostgreSQL addon | Steeper learning curve |
| **Render** | Traditional deployments | $25-100 | Simple, good docs | Less flexible than Fly.io |
| **Vercel** | Next.js apps (frontend only) | $20-100 | Optimized for Next.js, CDN included | Complex for monorepo + DB |
| **AWS** | Enterprise, full control | $100-500+ | Maximum flexibility, enterprise features | Complex setup, higher cost |

**Recommendation for This Project:**
- **Phase 1:** Railway (fastest path to production)
- **Phase 2:** Fly.io (better scaling, global distribution)

---

### Next Steps (Priority Order)

#### Week 1: Critical Fixes
1. ✅ Fix Dockerfile production command
2. ✅ Create `.env.example` file
3. ✅ Fix Redis configuration (choose one: Upstash or local)
4. ✅ Secure database credentials (use env vars)
5. ✅ Create environment separation structure

#### Week 2: Deployment Setup
1. ✅ Choose provider (Railway recommended)
2. ✅ Create deployment config (railway.json or fly.toml)
3. ✅ Set up staging environment
4. ✅ Configure environment variables
5. ✅ Test deployment pipeline

#### Week 3: Production Hardening
1. ✅ Set up database backups
2. ✅ Configure SSL/TLS (via provider)
3. ✅ Set up monitoring (Sentry)
4. ✅ Configure CDN (if needed)
5. ✅ Set up domain and DNS

#### Month 2: Scaling Preparation
1. ✅ Implement background job system
2. ✅ Set up CI/CD pipeline
3. ✅ Add health checks
4. ✅ Optimize database (indexes, queries)
5. ✅ Load testing

---

### File Reference Summary

**Critical Files to Update:**
- `Dockerfile` - Fix production command
- `docker-compose.yml` - Use env vars for credentials
- `packages/config/src/index.ts` - Add environment separation
- `packages/redis/src/client.ts` - Fix Redis config mismatch

**Files to Create:**
- `.env.example` - Environment variable template
- `railway.json` or `fly.toml` - Deployment configuration
- `.github/workflows/deploy.yml` - CI/CD pipeline
- `docs/DEPLOYMENT.md` - Deployment documentation

---

## Conclusion

The platform is **well-structured for development** but **not production-ready**. The main gaps are:
1. No deployment infrastructure
2. No environment separation
3. Critical Dockerfile bug
4. Configuration inconsistencies

**Recommended Path:**
1. Fix critical issues (Week 1)
2. Deploy to Railway staging (Week 2)
3. Test and deploy to production (Week 3)
4. Add monitoring and scaling (Month 2)

With these fixes, the platform can be production-ready within 2-3 weeks.

---

**Report Generated:** January 2025
**Audit Scope:** Full repository scan
**Files Analyzed:** 50+ configuration files