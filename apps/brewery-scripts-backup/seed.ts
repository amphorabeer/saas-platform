import { prisma } from '@saas-platform/database'
import bcrypt from 'bcryptjs'


async function main() {
  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'BrewMaster',
      slug: 'brewmaster',
    }
  })
  
  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'admin@brewmaster.ge',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
    }
  })
  
  console.log('✅ Seed completed!')
  console.log('Email: admin@brewmaster.ge')
  console.log('Password: admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

