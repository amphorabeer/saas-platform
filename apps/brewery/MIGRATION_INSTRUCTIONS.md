# Multi-Tenant Migration Instructions

## Step 1: Run Database Migration

```bash
cd packages/database
npx prisma migrate dev --name add_tenant_code
```

Or if using brewery's local schema:
```bash
cd apps/brewery
npx prisma migrate dev --schema=../../packages/database/prisma/schema.prisma --name add_tenant_code
```

This will:
- Add `code` field to Tenant table
- Create unique index on `code`
- Generate codes for existing tenants (if any)

## Step 2: Generate Prisma Client

```bash
cd packages/database
npx prisma generate
```

## Step 3: Verify Environment Variables

Ensure `.env` has:
```
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3020
DATABASE_URL=your-database-url
```

## Step 4: Test Registration Flow

1. Navigate to `http://localhost:3020/register`
2. Fill the form:
   - Company Name: "Test Brewery"
   - Your Name: "John Doe"
   - Email: "test@example.com"
   - Password: "password123"
3. Submit → Should see success page with tenant code (e.g., BREW-4738)
4. **Save the tenant code!**

## Step 5: Test Login Flow

1. Navigate to `http://localhost:3020/login`
2. Enter:
   - Tenant Code: BREW-4738 (from registration)
   - Email: test@example.com
   - Password: password123
3. Submit → Should redirect to dashboard
4. Verify you see only your tenant's data

## Step 6: Test Data Isolation

1. Register a second tenant:
   - Company: "Another Brewery"
   - Email: "test2@example.com"
   - Get tenant code (e.g., BREW-5678)
2. Login as first tenant → See only first tenant's data
3. Logout
4. Login as second tenant → See only second tenant's data
5. Verify complete data isolation

## Step 7: Verify API Routes

All API routes should:
- Use `withTenant` or `withPermission` middleware
- Filter by `ctx.tenantId` in Prisma queries
- Return only tenant's data

Test a few endpoints:
```bash
# Should return only your tenant's batches
curl http://localhost:3020/api/batches \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Should return only your tenant's lots
curl http://localhost:3020/api/lots \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## Troubleshooting

### Issue: "Invalid tenant code" on login
- Check that tenant code format is BREW-XXXX
- Verify tenant exists in database: `SELECT * FROM "Tenant" WHERE code = 'BREW-XXXX';`
- Check tenant is active: `SELECT isActive FROM "Tenant" WHERE code = 'BREW-XXXX';`

### Issue: "Email already registered"
- Email uniqueness is per-tenant (same email can exist in different tenants)
- If error occurs, check if email exists in the same tenant

### Issue: API returns data from other tenants
- Verify route uses `withTenant` or `withPermission`
- Check Prisma query includes `where: { tenantId: ctx.tenantId }`
- Check middleware is adding tenantId to context

### Issue: Migration fails
- Ensure database is accessible
- Check DATABASE_URL in .env
- Try: `npx prisma migrate reset` (WARNING: deletes all data)

## Rollback (if needed)

If you need to rollback:
```sql
ALTER TABLE "Tenant" DROP COLUMN IF EXISTS "code";
DROP INDEX IF EXISTS "Tenant_code_key";
DROP INDEX IF EXISTS "Tenant_code_idx";
```
