-- Fix LedgerEntryType enum values before migration
-- Run this script BEFORE running prisma db push or migrate

-- Update old enum values to new ADJUSTMENT value (optional - only if you want to consolidate)
-- Uncomment these if you want to migrate to ADJUSTMENT:
-- UPDATE "InventoryLedger" SET type = 'ADJUSTMENT' WHERE type = 'ADJUSTMENT_ADD';
-- UPDATE "InventoryLedger" SET type = 'ADJUSTMENT' WHERE type = 'ADJUSTMENT_REMOVE';
-- UPDATE "InventoryLedger" SET type = 'ADJUSTMENT' WHERE type = 'REVERSAL';

-- Check current values in use
SELECT DISTINCT type, COUNT(*) as count 
FROM "InventoryLedger" 
GROUP BY type 
ORDER BY count DESC;

-- Verify cachedBalance and costPerUnit columns exist and have data
SELECT 
  COUNT(*) as total_items,
  COUNT(cachedBalance) as items_with_balance,
  COUNT(costPerUnit) as items_with_cost
FROM "InventoryItem";















