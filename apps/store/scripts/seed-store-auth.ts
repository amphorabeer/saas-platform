/**
 * Seed script for Store Auth (landing DB)
 * Creates: Organization, User, Store, StoreEmployee
 * Run: cd apps/store && npx tsx scripts/seed-store-auth.ts
 * Set env: DATABASE_URL, SEED_STORE_EMAIL, SEED_STORE_PASSWORD, SEED_STORE_CODE
 */
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

async function main() {
  const email = process.env.SEED_STORE_EMAIL ?? "admin@store.local";
  const password = process.env.SEED_STORE_PASSWORD ?? "Admin123!";
  const name = process.env.SEED_STORE_NAME ?? "Store Admin";
  const storeCode = process.env.SEED_STORE_CODE ?? "1234";

  let org = await prisma.organization.findFirst({
    where: { storeCode },
  });
  if (!org) {
    const tenantId = randomUUID();
    const slug = `store-demo-${Date.now()}`;
    org = await prisma.organization.create({
      data: {
        name: "საცალო მაღაზია",
        slug,
        email,
        tenantId,
        hotelCode: `SHOP-${storeCode}`,
        storeCode,
      },
    });
    console.log("Created organization:", org.id, "storeCode:", storeCode);
  }

  let user = await prisma.user.findFirst({
    where: { organizationId: org.id, email },
  });
  if (!user) {
    const hash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        organizationId: org.id,
        email,
        name,
        password: hash,
        role: "ORGANIZATION_OWNER",
      },
    });
    console.log("Created user:", user.id, email);
  }

  let store = await prisma.store.findFirst({
    where: { tenantId: org.tenantId, isActive: true },
  });
  if (!store) {
    store = await prisma.store.create({
      data: {
        tenantId: org.tenantId,
        name: "ძირითადი მაღაზია",
        slug: `store-${org.id.slice(0, 8)}-${Date.now()}`,
        currency: "GEL",
        timezone: "Asia/Tbilisi",
      },
    });
    console.log("Created store:", store.id);
  }

  const existingEmp = await prisma.storeEmployee.findFirst({
    where: { storeId: store.id, userId: user.id },
  });
  if (!existingEmp) {
    const pinHash = await bcrypt.hash("1234", 10);
    await prisma.storeEmployee.create({
      data: {
        storeId: store.id,
        userId: user.id,
        firstName: name.split(" ")[0] ?? "Admin",
        lastName: name.split(" ").slice(1).join(" ") || "User",
        role: "STORE_OWNER",
        pin: pinHash,
      },
    });
    console.log("Created StoreEmployee. PIN: 1234");
  }

  console.log("\n✅ Seed complete.");
  console.log("Login with: storeCode", storeCode, "| email:", email, "| PIN for POS: 1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
