# Fix Prisma Migration Conflicts

## Problem
Migration fails because:
- Enum values (ADJUSTMENT_ADD, ADJUSTMENT_REMOVE, REVERSAL) are in use but might be removed
- Columns (cachedBalance, costPerUnit) have data but might be dropped

## Solution

### Step 1: Verify Schema Has All Required Fields

The schema should have:
- ✅ `cachedBalance` - Already in schema
- ✅ `costPerUnit` - Already in schema  
- ✅ `balanceUpdatedAt` - Already in schema
- ✅ All enum values (ADJUSTMENT_ADD, ADJUSTMENT_REMOVE, REVERSAL) - Now added

### Step 2: Check Current Database State

Run this SQL to see what enum values are in use:
```sql
SELECT DISTINCT type, COUNT(*) as count 
FROM "InventoryLedger" 
GROUP BY type 
ORDER BY count DESC;
```

### Step 3: Run Migration

**Option A: Using the fix script (Recommended)**
```bash
cd packages/database
./prisma/scripts/fix-migration.sh
```

**Option B: Manual steps**
```bash
cd packages/database

# 1. Generate Prisma Client
npx prisma generate

# 2. Push schema (accepts data loss for enum changes)
npx prisma db push --accept-data-loss

# 3. Or use migrate (safer)
npx prisma migrate dev --name fix_ledger_enums
```

### Step 4: Verify Migration

1. Open Prisma Studio:
   ```bash
   npx prisma studio
   ```

2. Check:
   - ✅ InventoryItem table has `cachedBalance`, `costPerUnit`, `balanceUpdatedAt`
   - ✅ InventoryLedger table has all enum values working
   - ✅ No data loss in existing records

### Optional: Migrate Old Enum Values

If you want to consolidate old enum values to `ADJUSTMENT`:

```sql
-- Update old enum values to new ADJUSTMENT
UPDATE "InventoryLedger" 
SET type = 'ADJUSTMENT' 
WHERE type IN ('ADJUSTMENT_ADD', 'ADJUSTMENT_REMOVE', 'REVERSAL');
```

**Note:** Only do this if you're sure you want to consolidate. The schema now supports both old and new values for backwards compatibility.

## Current Schema Status

✅ **InventoryItem** model has:
- `cachedBalance Decimal @default(0) @db.Decimal(12, 3)`
- `costPerUnit Decimal? @db.Decimal(10, 4)`
- `balanceUpdatedAt DateTime @default(now())`

✅ **LedgerEntryType** enum has:
- `PURCHASE`
- `CONSUMPTION`
- `PRODUCTION`
- `ADJUSTMENT` (new, generic)
- `ADJUSTMENT_ADD` (kept for backwards compatibility)
- `ADJUSTMENT_REMOVE` (kept for backwards compatibility)
- `WASTE`
- `SALE`
- `RETURN`
- `REVERSAL` (kept for backwards compatibility)
- `TRANSFER` (new, for location transfers)

## Troubleshooting

### Error: "Cannot drop enum value because it's in use"
- The schema now keeps all enum values, so this shouldn't happen
- If it does, check that the schema file was saved correctly

### Error: "Column does not exist"
- Make sure `cachedBalance`, `costPerUnit`, and `balanceUpdatedAt` are in the schema
- Run `npx prisma db push` to sync

### Data Loss Warning
- `--accept-data-loss` flag is needed for enum changes
- All existing data should be preserved
- Backup database first if you're concerned

## Next Steps

After successful migration:
1. Test creating new ledger entries
2. Verify cachedBalance updates correctly
3. Check that all existing recipes/ingredients still work















