// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Admin user
  const hash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sparerib.ge' },
    update: {},
    create: {
      name: 'ადმინი',
      email: 'admin@sparerib.ge',
      password: hash,
      role: 'ADMIN',
    },
  })
  console.log('✅ User:', admin.email)

  // Sample raw material
  await prisma.rawMaterial.upsert({
    where: { lotNumber: 'SR-250326-001' },
    update: {},
    create: {
      lotNumber: 'SR-250326-001',
      supplier: 'გლდ. ბ.',
      weightKg: 8.5,
      tempArrival: 2.2,
      hasCoa: true,
      hasVetCert: true,
      isAccepted: true,
      receivedById: admin.id,
    },
  })
  console.log('✅ Raw material seeded')
  console.log('\n🎉 Seed done!\nLogin: admin@sparerib.ge / admin123')
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
