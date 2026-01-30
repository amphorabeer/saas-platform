# 🔗 Brewery Registration → Super Admin Integration

## ✅ Files Updated

1. ✅ `apps/web/super-admin/prisma/schema.prisma` - Added `tenantCode` field
2. ✅ `apps/brewery/src/app/api/register/route.ts` - Updated to call Super Admin API
3. ✅ `apps/web/super-admin/src/pages/api/organizations.ts` - Updated to handle brewery registrations
4. ✅ `apps/web/super-admin/prisma/migrations/add_brewery_fields/migration.sql` - Migration script created

---

## 🚀 Integration Steps

### Step 1: Update Super Admin Database Schema

```bash
cd apps/web/super-admin

# Option A: Push schema changes (for development)
npx prisma db push

# Option B: Create migration (for production)
npx prisma migrate dev --name add_brewery_fields
```

**Schema Changes:**
- `tenantId` - Now optional (String?) - Links to Neon Tenant table
- `tenantCode` - New field (String?) - BREW-XXXX format code
- `hotelCode` - Now optional (String?) - 4-digit code for hotels
- Added index on `tenantCode`

### Step 2: Generate Prisma Client

```bash
cd apps/web/super-admin
npx prisma generate
```

### Step 3: Run Migration (if using Option B)

```bash
cd apps/web/super-admin
npx prisma migrate deploy
```

Or manually run the SQL:
```bash
psql $DATABASE_URL -f prisma/migrations/add_brewery_fields/migration.sql
```

### Step 4: Set Environment Variables

**Brewery App** (`apps/brewery/.env.local`):
```bash
SUPER_ADMIN_API_URL=http://localhost:3001
INTERNAL_API_KEY=your-secure-key-here-change-in-production
```

**Super Admin App** (`apps/web/super-admin/.env.local`):
```bash
INTERNAL_API_KEY=your-secure-key-here-change-in-production  # Same key as brewery!
DATABASE_URL=postgresql://user:password@localhost:5432/super_admin_db
DIRECT_URL=postgresql://user:password@localhost:5432/super_admin_db
```

---

## 🔄 Registration Flow

### Brewery Registration Process:

1. **User fills form** → `apps/brewery/src/app/register/page.tsx`
2. **POST /api/register** → `apps/brewery/src/app/api/register/route.ts`
3. **Creates Tenant in Neon DB**:
   - Generates BREW-XXXX code
   - Creates Tenant with company details
   - Creates User (OWNER role)
4. **Calls Super Admin API**:
   - POST `http://localhost:3001/api/organizations`
   - Headers: `X-Internal-API-Key: {INTERNAL_API_KEY}`
   - Body: Organization data + tenantId + tenantCode
5. **Super Admin creates Organization**:
   - Stores tenantId, tenantCode (links to Neon)
   - Creates Subscription (TRIAL, 15 days)
   - Creates ModuleAccess (BREWERY)
6. **Returns success** with tenant code to user

---

## 📋 API Endpoints

### Brewery Register API
**POST** `/api/register` (Brewery app)

**Request:**
```json
{
  "name": "გიორგი მეღვინე",
  "email": "user@brewery.ge",
  "password": "password123",
  "breweryName": "Craft Brewery",
  "company": "შპს ლუდსახარში",
  "taxId": "123456789",
  "phone": "+995555123456",
  "address": "ქუჩა 1",
  "city": "თბილისი",
  "country": "Georgia",
  "website": "https://brewery.ge",
  "bankName": "საქართველოს ბანკი",
  "bankAccount": "GE00TB0000000000000000",
  "plan": "STARTER"
}
```

**Response:**
```json
{
  "success": true,
  "tenant": {
    "id": "clx...",
    "name": "Craft Brewery",
    "code": "BREW-4738",
    "slug": "craft-brewery"
  },
  "user": {
    "id": "clx...",
    "email": "user@brewery.ge",
    "name": "გიორგი მეღვინე",
    "role": "OWNER"
  },
  "superAdminRegistered": true
}
```

### Super Admin Organizations API
**POST** `/api/organizations` (Super Admin app)

**Headers:**
```
X-Internal-API-Key: {INTERNAL_API_KEY}
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Craft Brewery",
  "email": "user@brewery.ge",
  "slug": "craft-brewery",
  "plan": "STARTER",
  "status": "trial",
  "modules": ["BREWERY"],
  "tenantId": "clx...",
  "tenantCode": "BREW-4738",
  "company": "შპს ლუდსახარში",
  "taxId": "123456789",
  "phone": "+995555123456",
  "address": "ქუჩა 1, თბილისი, Georgia",
  "city": "თბილისი",
  "country": "Georgia",
  "website": "https://brewery.ge",
  "bankName": "საქართველოს ბანკი",
  "bankAccount": "GE00TB0000000000000000"
}
```

---

## 🔍 Verification

### Check Super Admin Database:

```sql
-- Check organizations
SELECT id, name, email, "hotelCode", "tenantCode", "tenantId", "createdAt" 
FROM "Organization" 
ORDER BY "createdAt" DESC 
LIMIT 10;

-- Check subscriptions
SELECT o.name, s.plan, s.status, s."trialEnd"
FROM "Organization" o
JOIN "Subscription" s ON s."organizationId" = o.id
ORDER BY o."createdAt" DESC;

-- Check module access
SELECT o.name, m."moduleType", m."isActive"
FROM "Organization" o
JOIN "ModuleAccess" m ON m."organizationId" = o.id
WHERE m."moduleType" = 'BREWERY';
```

### Test Registration:

1. Navigate to `http://localhost:3020/register`
2. Fill the form
3. Submit → Should create:
   - ✅ Tenant in Neon DB (packages/database)
   - ✅ Organization in Super Admin DB
   - ✅ Subscription (TRIAL)
   - ✅ ModuleAccess (BREWERY)
4. Check Super Admin dashboard: `http://localhost:3001/organizations`

---

## ⚠️ Important Notes

1. **Internal API Key**: Must match in both apps
2. **Super Admin URL**: Default `http://localhost:3001` (change in production)
3. **Error Handling**: If Super Admin registration fails, brewery registration still succeeds (user can use the system)
4. **Database Separation**: 
   - Brewery uses: `packages/database` (Neon DB) - Tenant model
   - Super Admin uses: `apps/web/super-admin/prisma` - Organization model
5. **Module Type**: Use `'BREWERY'` (uppercase) in modules array

---

## 🐛 Troubleshooting

### Issue: "Super Admin registration failed"
- Check `SUPER_ADMIN_API_URL` is correct
- Check `INTERNAL_API_KEY` matches in both apps
- Check Super Admin is running on port 3001
- Check Super Admin database connection

### Issue: "tenantCode field doesn't exist"
- Run migration: `npx prisma migrate dev --name add_brewery_fields`
- Or push schema: `npx prisma db push`
- Regenerate client: `npx prisma generate`

### Issue: "Organization created but no subscription"
- Check Super Admin API logs
- Verify subscription creation in organizations.ts

---

**Status**: ✅ Ready for testing
