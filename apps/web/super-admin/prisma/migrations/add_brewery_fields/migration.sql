-- Migration: Add brewery support fields to Organization
-- File: apps/web/super-admin/prisma/migrations/add_brewery_fields/migration.sql

-- Add brewery-specific fields to Organization table
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "tenantCode" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "taxId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;

-- Create index for tenantCode lookups
CREATE INDEX IF NOT EXISTS "Organization_tenantCode_idx" ON "Organization"("tenantCode");
CREATE INDEX IF NOT EXISTS "Organization_tenantId_idx" ON "Organization"("tenantId");

-- Comment: These fields allow Super Admin to track both:
-- 1. Hotels (using hotelCode)
-- 2. Breweries (using tenantCode, tenantId links to Neon database)
