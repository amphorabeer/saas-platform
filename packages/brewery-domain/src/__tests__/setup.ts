import { beforeAll, afterAll, afterEach } from 'vitest'
import { PrismaClient } from '@prisma/client'

export const testPrisma = new PrismaClient()

// Test tenant and user IDs
export const TEST_TENANT_ID = 'test-tenant-001'
export const TEST_USER_ID = 'test-user-001'

beforeAll(async () => {
  // Ensure test tenant exists
  await testPrisma.tenant.upsert({
    where: { slug: 'test-tenant' },
    update: {},
    create: {
      id: TEST_TENANT_ID,
      name: 'Test Tenant',
      slug: 'test-tenant',
      plan: 'PROFESSIONAL',
    },
  })
  
  // Ensure test user exists
  await testPrisma.user.upsert({
    where: { tenantId_email: { tenantId: TEST_TENANT_ID, email: 'test@test.com' } },
    update: {},
    create: {
      id: TEST_USER_ID,
      tenantId: TEST_TENANT_ID,
      email: 'test@test.com',
      name: 'Test User',
      role: 'OWNER',
    },
  })
})

afterAll(async () => {
  await testPrisma.$disconnect()
})

afterEach(async () => {
  // Clean up test data after each test
  // Only delete data created during tests, not seed data
})



















