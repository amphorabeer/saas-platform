import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // 1. Create Tenant first
  const tenant = await prisma.tenant.upsert({
    where: { id: 'tenant1' },
    update: {},
    create: {
      id: 'tenant1',
      name: 'Test Brewery',
      slug: 'test-brewery',
    },
  })
  console.log('✅ Tenant created:', tenant.name)

  // 2. Create Admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)

  const admin = await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@brewery.ge',
      }
    },
    update: {},
    create: {
      email: 'admin@brewery.ge',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  })
  console.log('✅ Admin created:', admin.email)

  // 3. Create equipment (tanks)
  // Valid EquipmentStatus: OPERATIONAL, NEEDS_MAINTENANCE, UNDER_MAINTENANCE, OUT_OF_SERVICE, NEEDS_CIP
  const tanks = [
    { id: 'eq-fv-01', name: 'FV-01', type: 'FERMENTER', capacity: 1000, status: 'OPERATIONAL' },
    { id: 'eq-fv-02', name: 'FV-02', type: 'FERMENTER', capacity: 1000, status: 'OPERATIONAL' },
    { id: 'eq-fv-03', name: 'FV-03', type: 'FERMENTER', capacity: 500, status: 'OPERATIONAL' },
    { id: 'eq-bt-01', name: 'BT-01', type: 'BRITE', capacity: 1000, status: 'OPERATIONAL' },
    { id: 'eq-bt-02', name: 'BT-02', type: 'BRITE', capacity: 500, status: 'OPERATIONAL' },
    { id: 'eq-ut-01', name: 'UT-01', type: 'UNITANK', capacity: 800, status: 'OPERATIONAL' },
  ]

  // Delete existing and recreate
  await prisma.equipment.deleteMany({
    where: { tenantId: tenant.id }
  })

  for (const tank of tanks) {
    await prisma.equipment.create({
      data: {
        id: tank.id,
        tenantId: tenant.id,
        name: tank.name,
        type: tank.type,
        capacity: tank.capacity,
        status: tank.status,
        updatedAt: new Date(),
      },
    })
  }
  console.log('✅ Equipment created:', tanks.length, 'tanks')

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
