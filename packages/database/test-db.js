const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function test() {
  try {
    console.log('🔍 Testing database connection...\n')
    
    const modules = await prisma.moduleConfig.findMany()
    console.log(`✅ Found ${modules.length} modules in database`)
    
    const users = await prisma.user.count()
    console.log(`✅ Found ${users} users in database`)
    
    const orgs = await prisma.organization.count()
    console.log(`✅ Found ${orgs} organizations in database`)
    
    const subs = await prisma.subscription.count()
    console.log(`✅ Found ${subs} subscriptions in database`)
    
    console.log('\n🎉 Database connection successful!')
  } catch (error) {
    console.error('❌ Database test failed:', error.message)
    process.exit(1)
  }
}

test()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

