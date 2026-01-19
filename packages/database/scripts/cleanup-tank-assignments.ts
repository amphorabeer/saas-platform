import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning up TankAssignment records...')

  // Option 1: Delete all TankAssignments
  const deleteAll = await prisma.tankAssignment.deleteMany({})
  console.log(`✅ Deleted ${deleteAll.count} TankAssignment records`)

  // Option 2: Only delete PLANNED/ACTIVE (commented out)
  // const deleteActive = await prisma.tankAssignment.deleteMany({
  //   where: {
  //     status: { in: ['PLANNED', 'ACTIVE'] },
  //   },
  // })
  // console.log(`✅ Deleted ${deleteActive.count} active TankAssignment records`)

  console.log('✨ Cleanup complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })








