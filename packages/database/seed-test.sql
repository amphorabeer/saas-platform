-- Tenant
INSERT INTO "Tenant" (id, name, slug, "createdAt", "updatedAt") 
VALUES ('tenant1', 'BrewMaster', 'brewmaster', NOW(), NOW()) 
ON CONFLICT (id) DO NOTHING;

-- Tanks
INSERT INTO "Tank" (id, "tenantId", name, type, capacity, status, "createdAt", "updatedAt") VALUES
('tank-1', 'tenant1', 'ფერმენტაცია #1', 'FERMENTER', 500, 'AVAILABLE', NOW(), NOW()),
('tank-2', 'tenant1', 'ფერმენტაცია #2', 'FERMENTER', 500, 'AVAILABLE', NOW(), NOW()),
('tank-3', 'tenant1', 'BBT #1', 'BRITE', 500, 'AVAILABLE', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Recipes (minimal)
INSERT INTO "Recipe" (id, "tenantId", name, style, "createdAt", "updatedAt") VALUES
('recipe-ipa', 'tenant1', 'Georgian IPA', 'IPA', NOW(), NOW()),
('recipe-lager', 'tenant1', 'Georgian Lager', 'Lager', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Batches
INSERT INTO "Batch" (id, "tenantId", "recipeId", "batchNumber", status, "plannedDate", volume, "createdAt", "updatedAt") VALUES
('batch-001', 'tenant1', 'recipe-ipa', 'BRW-2025-001', 'CONDITIONING', '2025-01-01', 100, NOW(), NOW()),
('batch-002', 'tenant1', 'recipe-lager', 'BRW-2025-002', 'CONDITIONING', '2025-01-02', 100, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- Customers
INSERT INTO "Customer" (id, "tenantId", name, type, city, "isActive", "kegReturnDays", "createdAt", "updatedAt") VALUES
('cust-1', 'tenant1', 'ფუნიკულიორი', 'RESTAURANT', 'თბილისი', true, 14, NOW(), NOW()),
('cust-2', 'tenant1', 'ბარი 8000', 'BAR', 'თბილისი', true, 21, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
