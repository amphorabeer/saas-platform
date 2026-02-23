const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  "postgresql://neondb_owner:npg_wgSAC1UQBzY9@ep-withered-block-agcojulz-pooler.c-2.eu-central-1.aws.neon.tech/neondb?sslmode=require";

async function migrate() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('✅ Connected to database');

  // Drop all beauty-related tables first (reverse dependency order)
  const dropTables = [
    'campaigns', 'loyalty_transactions', 'reviews', 'gift_cards',
    'expenses', 'sale_items', 'sales', 'appointment_services',
    'appointments', 'clients', 'staff_services', 'services',
    'service_categories', 'products', 'staff_exceptions',
    'staff_schedules', 'staff', 'salons'
  ];
  for (const t of dropTables) {
    await client.query(`DROP TABLE IF EXISTS "${t}" CASCADE`);
  }
  console.log('✅ Old tables dropped');

  // Drop and recreate all enums
  const enumDefs = [
    { name: 'Plan', values: ['TRIAL','STARTER','PROFESSIONAL','ENTERPRISE'] },
    { name: 'StaffRole', values: ['OWNER','ADMIN','SPECIALIST','RECEPTIONIST'] },
    { name: 'CommissionType', values: ['PERCENTAGE','FIXED','NONE'] },
    { name: 'ExceptionType', values: ['VACATION','SICK','PERSONAL','CUSTOM'] },
    { name: 'Gender', values: ['MALE','FEMALE','OTHER'] },
    { name: 'LoyaltyTier', values: ['STANDARD','SILVER','GOLD','VIP'] },
    { name: 'AppointmentStatus', values: ['SCHEDULED','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW'] },
    { name: 'BookingSource', values: ['WALK_IN','PHONE','ONLINE','SOCIAL_MEDIA'] },
    { name: 'PaymentMethod', values: ['CASH','CARD','TRANSFER','GIFT_CARD','SPLIT'] },
    { name: 'PaymentStatus', values: ['PENDING','COMPLETED','REFUNDED','PARTIAL'] },
    { name: 'DiscountType', values: ['PERCENTAGE','FIXED','PROMO_CODE'] },
    { name: 'SaleItemType', values: ['SERVICE','PRODUCT'] },
    { name: 'ExpenseCategory', values: ['RENT','UTILITIES','SALARY','SUPPLIES','EQUIPMENT','MARKETING','OTHER'] },
    { name: 'LoyaltyType', values: ['EARN','REDEEM','BONUS','EXPIRED'] },
    { name: 'CampaignType', values: ['SMS','EMAIL'] },
  ];
  for (const e of enumDefs) {
    await client.query(`DROP TYPE IF EXISTS "${e.name}" CASCADE`);
    await client.query(`CREATE TYPE "${e.name}" AS ENUM (${e.values.map(v => `'${v}'`).join(', ')})`);
  }
  console.log('✅ Enums created');

  // Create all tables
  await client.query(`
    CREATE TABLE "salons" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "address" TEXT, "phone" TEXT,
      "email" TEXT, "logo" TEXT, "description" TEXT,
      "workingHours" JSONB DEFAULT '{}', "settings" JSONB DEFAULT '{}',
      "plan" "Plan" NOT NULL DEFAULT 'TRIAL',
      "trialEndsAt" TIMESTAMP(3), "subscriptionEndsAt" TIMESTAMP(3),
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE UNIQUE INDEX "salons_slug_key" ON "salons"("slug")`);

  await client.query(`
    CREATE TABLE "staff" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL, "email" TEXT, "phone" TEXT, "avatar" TEXT,
      "role" "StaffRole" NOT NULL DEFAULT 'SPECIALIST',
      "specialties" TEXT[] DEFAULT ARRAY[]::TEXT[], "bio" TEXT,
      "pin" TEXT, "passwordHash" TEXT,
      "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENTAGE',
      "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "staff_salonId_idx" ON "staff"("salonId")`);
  await client.query(`CREATE UNIQUE INDEX "staff_salonId_email_key" ON "staff"("salonId","email")`);

  await client.query(`
    CREATE TABLE "staff_schedules" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "staffId" TEXT NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "dayOfWeek" INTEGER NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL,
      "isOff" BOOLEAN NOT NULL DEFAULT false, PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE UNIQUE INDEX "staff_schedules_staffId_day_key" ON "staff_schedules"("staffId","dayOfWeek")`);

  await client.query(`
    CREATE TABLE "staff_exceptions" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "staffId" TEXT NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "date" DATE NOT NULL, "type" "ExceptionType" NOT NULL, "note" TEXT,
      PRIMARY KEY ("id")
    )`);

  await client.query(`
    CREATE TABLE "service_categories" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL, "icon" TEXT, "color" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0, "isActive" BOOLEAN NOT NULL DEFAULT true,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "service_categories_salonId_idx" ON "service_categories"("salonId")`);

  await client.query(`
    CREATE TABLE "services" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "categoryId" TEXT REFERENCES "service_categories"("id") ON DELETE SET NULL,
      "name" TEXT NOT NULL, "description" TEXT, "duration" INTEGER NOT NULL,
      "price" DOUBLE PRECISION NOT NULL, "priceVariants" JSONB, "image" TEXT,
      "isActive" BOOLEAN NOT NULL DEFAULT true, "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "services_salonId_idx" ON "services"("salonId")`);
  await client.query(`CREATE INDEX "services_categoryId_idx" ON "services"("categoryId")`);

  await client.query(`
    CREATE TABLE "staff_services" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "staffId" TEXT NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "serviceId" TEXT NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
      "customPrice" DOUBLE PRECISION, "customDuration" INTEGER,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE UNIQUE INDEX "staff_services_key" ON "staff_services"("staffId","serviceId")`);

  await client.query(`
    CREATE TABLE "clients" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL, "phone" TEXT, "email" TEXT, "birthDate" DATE,
      "gender" "Gender", "notes" TEXT, "allergies" TEXT, "hairType" TEXT,
      "colorFormula" TEXT, "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
      "loyaltyTier" "LoyaltyTier" NOT NULL DEFAULT 'STANDARD',
      "preferredStaffId" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "clients_salonId_idx" ON "clients"("salonId")`);
  await client.query(`CREATE INDEX "clients_phone_idx" ON "clients"("phone")`);

  await client.query(`
    CREATE TABLE "appointments" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
      "staffId" TEXT NOT NULL REFERENCES "staff"("id") ON DELETE CASCADE,
      "date" DATE NOT NULL, "startTime" TEXT NOT NULL, "endTime" TEXT NOT NULL,
      "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
      "notes" TEXT, "source" "BookingSource" NOT NULL DEFAULT 'WALK_IN',
      "cancelReason" TEXT, "cancelledAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "appt_salon_date_idx" ON "appointments"("salonId","date")`);
  await client.query(`CREATE INDEX "appt_staff_date_idx" ON "appointments"("staffId","date")`);
  await client.query(`CREATE INDEX "appt_client_idx" ON "appointments"("clientId")`);

  await client.query(`
    CREATE TABLE "appointment_services" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "appointmentId" TEXT NOT NULL REFERENCES "appointments"("id") ON DELETE CASCADE,
      "serviceId" TEXT NOT NULL REFERENCES "services"("id") ON DELETE CASCADE,
      "price" DOUBLE PRECISION NOT NULL, "duration" INTEGER NOT NULL,
      PRIMARY KEY ("id")
    )`);

  await client.query(`
    CREATE TABLE "products" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "name" TEXT NOT NULL, "category" TEXT, "brand" TEXT, "sku" TEXT, "barcode" TEXT,
      "price" DOUBLE PRECISION NOT NULL, "costPrice" DOUBLE PRECISION,
      "stock" INTEGER NOT NULL DEFAULT 0, "minStock" INTEGER NOT NULL DEFAULT 5,
      "image" TEXT, "description" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "products_salonId_idx" ON "products"("salonId")`);

  await client.query(`
    CREATE TABLE "sales" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "appointmentId" TEXT REFERENCES "appointments"("id") ON DELETE SET NULL,
      "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
      "staffId" TEXT REFERENCES "staff"("id") ON DELETE SET NULL,
      "subtotal" DOUBLE PRECISION NOT NULL, "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "discountType" "DiscountType", "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "total" DOUBLE PRECISION NOT NULL,
      "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
      "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'COMPLETED',
      "giftCardId" TEXT, "giftCardAmount" DOUBLE PRECISION,
      "notes" TEXT, "receiptNumber" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE UNIQUE INDEX "sales_appointmentId_key" ON "sales"("appointmentId")`);
  await client.query(`CREATE INDEX "sales_salonId_created_idx" ON "sales"("salonId","createdAt")`);

  await client.query(`
    CREATE TABLE "sale_items" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "saleId" TEXT NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
      "type" "SaleItemType" NOT NULL,
      "serviceId" TEXT REFERENCES "services"("id") ON DELETE SET NULL,
      "productId" TEXT REFERENCES "products"("id") ON DELETE SET NULL,
      "name" TEXT NOT NULL, "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPrice" DOUBLE PRECISION NOT NULL, "total" DOUBLE PRECISION NOT NULL,
      PRIMARY KEY ("id")
    )`);

  await client.query(`
    CREATE TABLE "expenses" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "category" "ExpenseCategory" NOT NULL,
      "amount" DOUBLE PRECISION NOT NULL, "date" DATE NOT NULL, "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE INDEX "expenses_salon_date_idx" ON "expenses"("salonId","date")`);

  await client.query(`
    CREATE TABLE "gift_cards" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "code" TEXT NOT NULL, "initialBalance" DOUBLE PRECISION NOT NULL,
      "balance" DOUBLE PRECISION NOT NULL,
      "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
      "expiresAt" TIMESTAMP(3), "isActive" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE UNIQUE INDEX "gift_cards_code_key" ON "gift_cards"("code")`);

  await client.query(`
    CREATE TABLE "reviews" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "clientId" TEXT REFERENCES "clients"("id") ON DELETE SET NULL,
      "staffId" TEXT REFERENCES "staff"("id") ON DELETE SET NULL,
      "rating" INTEGER NOT NULL, "comment" TEXT,
      "isPublic" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);

  await client.query(`
    CREATE TABLE "loyalty_transactions" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "clientId" TEXT NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
      "points" INTEGER NOT NULL, "type" "LoyaltyType" NOT NULL,
      "saleId" TEXT REFERENCES "sales"("id") ON DELETE SET NULL,
      "description" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);
  await client.query(`CREATE UNIQUE INDEX "loyalty_tx_saleId_key" ON "loyalty_transactions"("saleId")`);

  await client.query(`
    CREATE TABLE "campaigns" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "salonId" TEXT NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
      "type" "CampaignType" NOT NULL, "name" TEXT NOT NULL, "subject" TEXT,
      "content" TEXT NOT NULL, "sentAt" TIMESTAMP(3),
      "recipients" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("id")
    )`);

  console.log('✅ All 18 tables created successfully!');
  await client.end();
}

migrate().catch(e => { console.error(e); process.exit(1); });
