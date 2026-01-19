import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Fixing invalid Batch.tankId references...\n')

  // 1. Find all batches with tankId
  const batchesWithTank = await prisma.batch.findMany({
    where: {
      tankId: { not: null }
    },
    select: {
      id: true,
      batchNumber: true,
      tankId: true,
    }
  })

  console.log(`Found ${batchesWithTank.length} batches with tankId`)

  // 2. Get all valid tank IDs
  const validTanks = await prisma.tank.findMany({
    select: { id: true, name: true }
  })
  const validTankIds = new Set(validTanks.map(t => t.id))

  console.log(`Found ${validTanks.length} valid tanks\n`)

  // 3. Find invalid references
  const invalidBatches = batchesWithTank.filter(b => b.tankId && !validTankIds.has(b.tankId))

  if (invalidBatches.length === 0) {
    console.log('✅ No invalid tank references found!')
  } else {
    console.log(`⚠️ Found ${invalidBatches.length} batches with invalid tankId:\n`)
    
    for (const batch of invalidBatches) {
      console.log(`  - ${batch.batchNumber} (tankId: ${batch.tankId})`)
    }

    // 4. Fix invalid references - set to NULL
    console.log('\n🔄 Setting invalid tankId references to NULL...\n')

    for (const batch of invalidBatches) {
      await prisma.batch.update({
        where: { id: batch.id },
        data: { tankId: null }
      })
      console.log(`  ✓ Fixed: ${batch.batchNumber}`)
    }

    console.log('\n✅ All invalid batch references fixed!')
  }

  // 5. Get valid batch IDs for later use
  const validBatchIds = new Set(
    (await prisma.batch.findMany({ select: { id: true } })).map(b => b.id)
  )

  // 6. Also fix Equipment.currentBatchId if needed
  console.log('\n🔧 Checking Equipment.currentBatchId references...\n')

  const equipmentWithBatch = await prisma.equipment.findMany({
    where: {
      currentBatchId: { not: null }
    },
    select: {
      id: true,
      name: true,
      currentBatchId: true,
    }
  })

  const invalidEquipment = equipmentWithBatch.filter(
    e => e.currentBatchId && !validBatchIds.has(e.currentBatchId)
  )

  if (invalidEquipment.length > 0) {
    console.log(`⚠️ Found ${invalidEquipment.length} equipment with invalid currentBatchId:\n`)
    
    for (const eq of invalidEquipment) {
      await prisma.equipment.update({
        where: { id: eq.id },
        data: { currentBatchId: null }
      })
      console.log(`  ✓ Fixed: ${eq.name}`)
    }
  } else {
    console.log('✅ No invalid equipment references found!')
  }

  // 7. Fix TankOccupation references
  console.log('\n🔧 Checking TankOccupation.tankId references...\n')

  const allOccupations = await prisma.tankOccupation.findMany({
    select: {
      id: true,
      tankId: true,
      batchId: true,
    }
  })

  const invalidOccupations = allOccupations.filter(
    o => !validTankIds.has(o.tankId)
  )

  if (invalidOccupations.length > 0) {
    console.log(`⚠️ Found ${invalidOccupations.length} TankOccupation records with invalid tankId:\n`)
    
    for (const occ of invalidOccupations) {
      await prisma.tankOccupation.delete({
        where: { id: occ.id }
      })
      console.log(`  ✓ Deleted: TankOccupation ${occ.id} (tankId: ${occ.tankId})`)
    }
  } else {
    console.log('✅ No invalid TankOccupation tankId references found!')
  }

  // 8. Also check TankOccupation.batchId references
  console.log('\n🔧 Checking TankOccupation.batchId references...\n')

  const remainingOccupations = await prisma.tankOccupation.findMany({
    select: {
      id: true,
      batchId: true,
    }
  })

  const invalidBatchOccupations = remainingOccupations.filter(
    o => !validBatchIds.has(o.batchId)
  )

  if (invalidBatchOccupations.length > 0) {
    console.log(`⚠️ Found ${invalidBatchOccupations.length} TankOccupation records with invalid batchId:\n`)
    
    for (const occ of invalidBatchOccupations) {
      await prisma.tankOccupation.delete({
        where: { id: occ.id }
      })
      console.log(`  ✓ Deleted: TankOccupation ${occ.id} (batchId: ${occ.batchId})`)
    }
  } else {
    console.log('✅ No invalid TankOccupation batchId references found!')
  }

  console.log('\n🎉 Migration complete!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

