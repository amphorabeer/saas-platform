-- ============================================
-- INVENTORY BALANCE CACHE TRIGGER
-- Updates cachedBalance on InventoryItem when ledger changes
-- ============================================

-- Function to update cached balance
CREATE OR REPLACE FUNCTION update_inventory_cached_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "InventoryItem"
    SET 
      "cachedBalance" = "cachedBalance" + NEW.quantity,
      "balanceUpdatedAt" = NOW()
    WHERE id = NEW."itemId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Should never happen in ledger system, but handle it
    UPDATE "InventoryItem"
    SET 
      "cachedBalance" = "cachedBalance" - OLD.quantity,
      "balanceUpdatedAt" = NOW()
    WHERE id = OLD."itemId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_inventory_ledger_balance ON "InventoryLedger";
CREATE TRIGGER trg_inventory_ledger_balance
AFTER INSERT OR DELETE ON "InventoryLedger"
FOR EACH ROW
EXECUTE FUNCTION update_inventory_cached_balance();

-- ============================================
-- BALANCE RECONCILIATION FUNCTION
-- Run periodically to verify cache accuracy
-- ============================================

CREATE OR REPLACE FUNCTION reconcile_inventory_balances(p_tenant_id TEXT DEFAULT NULL)
RETURNS TABLE (
  item_id TEXT,
  cached_balance DECIMAL,
  calculated_balance DECIMAL,
  difference DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id as item_id,
    i."cachedBalance" as cached_balance,
    COALESCE(SUM(l.quantity), 0) as calculated_balance,
    i."cachedBalance" - COALESCE(SUM(l.quantity), 0) as difference
  FROM "InventoryItem" i
  LEFT JOIN "InventoryLedger" l ON l."itemId" = i.id
  WHERE (p_tenant_id IS NULL OR i."tenantId" = p_tenant_id)
  GROUP BY i.id, i."cachedBalance"
  HAVING i."cachedBalance" != COALESCE(SUM(l.quantity), 0);
END;
$$ LANGUAGE plpgsql;

-- Fix discrepancies (run if reconciliation finds issues)
CREATE OR REPLACE FUNCTION fix_inventory_balances(p_tenant_id TEXT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  fixed_count INTEGER;
BEGIN
  WITH calculated AS (
    SELECT 
      i.id,
      COALESCE(SUM(l.quantity), 0) as correct_balance
    FROM "InventoryItem" i
    LEFT JOIN "InventoryLedger" l ON l."itemId" = i.id
    WHERE (p_tenant_id IS NULL OR i."tenantId" = p_tenant_id)
    GROUP BY i.id
  )
  UPDATE "InventoryItem" i
  SET 
    "cachedBalance" = c.correct_balance,
    "balanceUpdatedAt" = NOW()
  FROM calculated c
  WHERE i.id = c.id AND i."cachedBalance" != c.correct_balance;
  
  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RETURN fixed_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- BATCH NUMBER SEQUENCE
-- ============================================

CREATE OR REPLACE FUNCTION generate_batch_number(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_year TEXT;
  v_sequence INTEGER;
  v_batch_number TEXT;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get next sequence for this tenant/year
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART("batchNumber", '-', 3) AS INTEGER)
  ), 0) + 1
  INTO v_sequence
  FROM "Batch"
  WHERE "tenantId" = p_tenant_id
    AND "batchNumber" LIKE 'BRW-' || v_year || '-%';
  
  v_batch_number := 'BRW-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  RETURN v_batch_number;
END;
$$ LANGUAGE plpgsql;
