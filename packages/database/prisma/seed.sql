-- Seed script for SaaS Platform Database
-- Run with: docker exec -i saas-platform-postgres psql -U postgres -d saas_platform < packages/database/prisma/seed.sql

-- Check if already seeded
DO $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM "User";
  IF user_count > 0 THEN
    RAISE NOTICE 'Database already seeded. Skipping...';
    RETURN;
  END IF;
END $$;

-- Create Super Admin (password: admin123, hashed with bcrypt)
INSERT INTO "User" (id, email, name, password, role, "emailVerified", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid()::text,
  'admin@platform.ge',
  'Super Admin',
  '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq', -- bcrypt hash of 'admin123'
  'SUPER_ADMIN',
  NOW(),
  NOW(),
  NOW()
);

-- Create Module Configurations
INSERT INTO "ModuleConfig" (
  id, "moduleType", name, "nameEn", description, "descriptionEn", icon, color, "isEnabled", "displayOrder",
  "starterPrice", "starterDuration", "starterFeatures",
  "professionalPrice", "professionalDuration", "professionalFeatures",
  "enterprisePrice", "enterpriseDuration", "enterpriseFeatures",
  "activeOrganizations", "totalUsers", "createdAt", "updatedAt"
) VALUES
  (gen_random_uuid()::text, 'HOTEL', 'სასტუმროს მართვა', 'Hotel Management', 'სრულყოფილი PMS სისტემა სასტუმროებისთვის', 'Complete PMS system for hotels', '🏨', '#3b82f6', true, 1, 0, '15 დღე', ARRAY['1 ლოკაცია', '20 ნომერი', 'ძირითადი ფუნქციები'], 99, 'თვეში', ARRAY['1 ლოკაცია', '50 ნომერი', 'ყველა ფუნქცია', '24/7 მხარდაჭერა'], 299, 'თვეში', ARRAY['მრავალი ლოკაცია', 'ულიმიტო ნომერი', 'Custom features', 'Dedicated support'], 124, 3248, NOW(), NOW()),
  (gen_random_uuid()::text, 'RESTAURANT', 'რესტორნის მართვა', 'Restaurant Management', 'რესტორნის სრული მართვის სისტემა', 'Complete restaurant management system', '🍽️', '#10b981', true, 2, 0, '15 დღე', ARRAY['1 ლოკაცია', '10 მაგიდა', 'POS სისტემა'], 99, 'თვეში', ARRAY['1 ლოკაცია', '30 მაგიდა', 'Kitchen Display', 'Inventory'], 299, 'თვეში', ARRAY['მრავალი ლოკაცია', 'ულიმიტო მაგიდა', 'Analytics', 'API access'], 89, 2156, NOW(), NOW()),
  (gen_random_uuid()::text, 'BEAUTY', 'სილამაზის სალონი', 'Beauty Salon', 'სალონის მართვის სრული სისტემა', 'Complete salon management system', '💅', '#ec4899', true, 3, 0, '15 დღე', ARRAY['1 სალონი', '3 მასტერი', 'ჯავშნები'], 99, 'თვეში', ARRAY['1 სალონი', '10 მასტერი', 'SMS შეხსენებები', 'Loyalty'], 299, 'თვეში', ARRAY['მრავალი სალონი', 'ულიმიტო მასტერი', 'Marketing tools', 'Reports'], 67, 1823, NOW(), NOW()),
  (gen_random_uuid()::text, 'SHOP', 'მაღაზია', 'Shop', 'მაღაზიის მართვის სისტემა', 'Shop management system', '🛍️', '#8b5cf6', true, 4, 0, '15 დღე', ARRAY['1 მაღაზია', '500 პროდუქტი', 'POS'], 99, 'თვეში', ARRAY['1 მაღაზია', '5000 პროდუქტი', 'Inventory', 'Barcode'], 299, 'თვეში', ARRAY['ქსელი', 'ულიმიტო პროდუქტი', 'E-commerce', 'Warehouse'], 156, 4521, NOW(), NOW()),
  (gen_random_uuid()::text, 'BREWERY', 'ლუდსახარში', 'Brewery', 'ლუდის წარმოების მართვა', 'Brewery management', '🍺', '#f59e0b', true, 5, 0, '15 დღე', ARRAY['10 რეცეპტი', 'წარმოება', 'ინვენტარი'], 149, 'თვეში', ARRAY['50 რეცეპტი', 'ავტომატიზაცია', 'Quality control', 'Distribution'], 399, 'თვეში', ARRAY['ულიმიტო რეცეპტი', 'Multi-location', 'Compliance', 'Analytics'], 23, 412, NOW(), NOW()),
  (gen_random_uuid()::text, 'WINERY', 'ღვინის მარანი', 'Winery', 'ღვინის წარმოების მართვა', 'Winery management', '🍷', '#dc2626', true, 6, 0, '15 დღე', ARRAY['ვენახი', 'რთველი', 'დავარგება'], 149, 'თვეში', ARRAY['მრავალი ვენახი', 'ლაბორატორია', 'Bottling', 'Sales'], 399, 'თვეში', ARRAY['სრული ციკლი', 'Wine club', 'Export docs', 'Compliance'], 18, 287, NOW(), NOW()),
  (gen_random_uuid()::text, 'DISTILLERY', 'არყის საწარმო', 'Distillery', 'არყის წარმოების მართვა', 'Distillery management', '🥃', '#0891b2', true, 7, 0, '15 დღე', ARRAY['წარმოება', 'ინვენტარი', 'შეფუთვა'], 149, 'თვეში', ARRAY['დისტილაცია', 'Aging tracking', 'Quality', 'Distribution'], 399, 'თვეში', ARRAY['სრული ციკლი', 'Compliance', 'Export', 'Analytics'], 12, 198, NOW(), NOW());

-- Create Landing Page Content
INSERT INTO "LandingPageContent" (
  id, key, "heroTitle", "heroSubtitle", "heroDescription",
  "statsBusinesses", "statsTransactions", "statsUsers", "statsUptime", "updatedAt"
) VALUES (
  gen_random_uuid()::text,
  'main',
  'ბიზნესის მართვის ერთიანი პლატფორმა',
  'აირჩიეთ თქვენი ბიზნესისთვის შესაფერისი მოდული',
  'სრული სპექტრის მართვის სისტემები თქვენი ბიზნესისთვის',
  436, 2500000, 12847, 99.9, NOW()
);

-- Create Sample Organizations
DO $$
DECLARE
  org1_id TEXT;
  org2_id TEXT;
  org3_id TEXT;
  org1_tenant TEXT;
  org2_tenant TEXT;
  org3_tenant TEXT;
  hashed_pwd TEXT := '$2a$10$rOzJqJqJqJqJqJqJqJqJqOqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJqJq';
BEGIN
  -- Organization 1
  org1_id := gen_random_uuid()::text;
  org1_tenant := gen_random_uuid()::text;
  INSERT INTO "Organization" (id, name, slug, email, phone, "tenantId", "createdAt", "updatedAt")
  VALUES (org1_id, 'Hotel Tbilisi', 'hotel-tbilisi', 'info@hotel-tbilisi.ge', '+995555123456', org1_tenant, NOW(), NOW());

  INSERT INTO "Subscription" (id, "organizationId", plan, status, price, currency, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, org1_id, 'PROFESSIONAL', 'ACTIVE', 99, 'GEL', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW());

  INSERT INTO "ModuleAccess" (id, "organizationId", "moduleType", "isActive", "maxUsers", "maxRecords", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, org1_id, 'HOTEL', true, 50, 100, NOW(), NOW());

  INSERT INTO "User" (id, email, name, password, role, "organizationId", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'user1@hotel-tbilisi.ge', 'User 1', hashed_pwd, 'ORGANIZATION_OWNER', org1_id, NOW(), NOW()),
    (gen_random_uuid()::text, 'user2@hotel-tbilisi.ge', 'User 2', hashed_pwd, 'USER', org1_id, NOW(), NOW()),
    (gen_random_uuid()::text, 'user3@hotel-tbilisi.ge', 'User 3', hashed_pwd, 'USER', org1_id, NOW(), NOW());

  -- Organization 2
  org2_id := gen_random_uuid()::text;
  org2_tenant := gen_random_uuid()::text;
  INSERT INTO "Organization" (id, name, slug, email, phone, "tenantId", "createdAt", "updatedAt")
  VALUES (org2_id, 'Restaurant Plaza', 'restaurant-plaza', 'info@plaza.ge', '+995555234567', org2_tenant, NOW(), NOW());

  INSERT INTO "Subscription" (id, "organizationId", plan, status, price, currency, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, org2_id, 'PROFESSIONAL', 'ACTIVE', 99, 'GEL', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW());

  INSERT INTO "ModuleAccess" (id, "organizationId", "moduleType", "isActive", "maxUsers", "maxRecords", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, org2_id, 'HOTEL', true, 50, 100, NOW(), NOW());

  INSERT INTO "User" (id, email, name, password, role, "organizationId", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'user1@restaurant-plaza.ge', 'User 1', hashed_pwd, 'ORGANIZATION_OWNER', org2_id, NOW(), NOW()),
    (gen_random_uuid()::text, 'user2@restaurant-plaza.ge', 'User 2', hashed_pwd, 'USER', org2_id, NOW(), NOW()),
    (gen_random_uuid()::text, 'user3@restaurant-plaza.ge', 'User 3', hashed_pwd, 'USER', org2_id, NOW(), NOW());

  -- Organization 3
  org3_id := gen_random_uuid()::text;
  org3_tenant := gen_random_uuid()::text;
  INSERT INTO "Organization" (id, name, slug, email, phone, "tenantId", "createdAt", "updatedAt")
  VALUES (org3_id, 'Beauty House', 'beauty-house', 'info@beauty.ge', '+995555345678', org3_tenant, NOW(), NOW());

  INSERT INTO "Subscription" (id, "organizationId", plan, status, price, currency, "currentPeriodStart", "currentPeriodEnd", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, org3_id, 'PROFESSIONAL', 'ACTIVE', 99, 'GEL', NOW(), NOW() + INTERVAL '30 days', NOW(), NOW());

  INSERT INTO "ModuleAccess" (id, "organizationId", "moduleType", "isActive", "maxUsers", "maxRecords", "createdAt", "updatedAt")
  VALUES (gen_random_uuid()::text, org3_id, 'HOTEL', true, 50, 100, NOW(), NOW());

  INSERT INTO "User" (id, email, name, password, role, "organizationId", "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, 'user1@beauty-house.ge', 'User 1', hashed_pwd, 'ORGANIZATION_OWNER', org3_id, NOW(), NOW()),
    (gen_random_uuid()::text, 'user2@beauty-house.ge', 'User 2', hashed_pwd, 'USER', org3_id, NOW(), NOW()),
    (gen_random_uuid()::text, 'user3@beauty-house.ge', 'User 3', hashed_pwd, 'USER', org3_id, NOW(), NOW());

  -- Create Support Tickets for first organization
  INSERT INTO "SupportTicket" (id, "organizationId", subject, description, priority, status, "createdAt", "updatedAt")
  VALUES
    (gen_random_uuid()::text, org1_id, 'Payment issue', 'Cannot process payment with card', 'CRITICAL', 'OPEN', NOW(), NOW()),
    (gen_random_uuid()::text, org1_id, 'Feature request', 'Need export to Excel feature', 'LOW', 'IN_PROGRESS', NOW(), NOW());

  -- Create sample hotel rooms for first organization
  FOR floor_num IN 1..3 LOOP
    FOR room_num IN 1..5 LOOP
      INSERT INTO "HotelRoom" (
        id, "tenantId", "roomNumber", "roomType", floor, status, "basePrice", amenities, "maxOccupancy", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        org1_tenant,
        floor_num::text || '0' || room_num::text,
        CASE WHEN room_num <= 3 THEN 'STANDARD' ELSE 'DELUXE' END,
        floor_num,
        'VACANT',
        CASE WHEN room_num <= 3 THEN 150 ELSE 250 END,
        ARRAY['WiFi', 'TV', 'Mini Bar'],
        CASE WHEN room_num <= 3 THEN 2 ELSE 4 END,
        NOW(),
        NOW()
      );
    END LOOP;
  END LOOP;
END $$;

