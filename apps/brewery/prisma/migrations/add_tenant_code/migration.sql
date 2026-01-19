-- Add code field to Tenant model
-- This migration adds the `code` field (BREW-XXXX format) to Tenant table

ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Create unique index on code
CREATE UNIQUE INDEX IF NOT EXISTS "Tenant_code_key" ON "Tenant"("code");

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS "Tenant_code_idx" ON "Tenant"("code");

-- Generate codes for existing tenants (if any)
-- Format: BREW-XXXX where XXXX is a 4-digit number
UPDATE "Tenant" 
SET "code" = 'BREW-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::TEXT, 4, '0')
WHERE "code" IS NULL;

-- Make code NOT NULL after populating
ALTER TABLE "Tenant" ALTER COLUMN "code" SET NOT NULL;
