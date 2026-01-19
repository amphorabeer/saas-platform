# Add Process Field to Recipe Table

## Problem
The `process` field is in the Prisma schema but may not exist in the database yet.

## Solution

### Option 1: Run SQL Script (Recommended)

1. Connect to your database
2. Run the SQL script:
   ```bash
   # Using psql
   psql $DATABASE_URL -f prisma/scripts/add-process-field.sql
   
   # Or copy the SQL from prisma/scripts/add-process-field.sql and run in your DB client
   ```

### Option 2: Use Prisma Studio

1. Open Prisma Studio:
   ```bash
   cd packages/database
   npx prisma studio
   ```

2. The schema should show the `process` field
3. If you see errors, the column may need to be added manually

### Option 3: Manual SQL

Run this SQL directly on your database:

```sql
-- Add process column if it doesn't exist
ALTER TABLE "Recipe" 
ADD COLUMN IF NOT EXISTS "process" JSONB;
```

### Option 4: Force Reset (⚠️ DESTRUCTIVE - Only for Development)

If you're in development and can lose data:

```bash
cd packages/database
npx prisma db push --force-reset
```

**⚠️ WARNING:** This will delete all data in the database!

## Verify

After adding the column, verify it exists:

```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'Recipe' 
AND column_name = 'process';
```

Should return:
```
column_name | data_type
------------|----------
process     | jsonb
```

## Next Steps

1. After adding the column, restart your dev server:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

2. Test creating a recipe - the process field should now work

## Current Schema Status

The schema file (`prisma/schema.prisma`) already has:
```prisma
model Recipe {
  // ... other fields
  process     Json?     // Brewing process (mash steps, hop schedule, fermentation, conditioning)
  // ... other fields
}
```

The Prisma Client has been generated, so TypeScript code should work once the database column exists.















