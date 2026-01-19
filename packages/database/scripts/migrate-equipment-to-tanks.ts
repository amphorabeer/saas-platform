import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Tank types to migrate from Equipment
const TANK_TYPES = ['FERMENTER', 'UNITANK', 'BRITE', 'KETTLE', 'MASH_TUN', 'HLT']

async function main() {
  console.log('🔧 Migrating Equipment tanks to Tank table...\n')

  // 1. Get all equipment that are tanks
  const tankEquipment = await prisma.equipment.findMany({
    where: {
      type: { in: TANK_TYPES },
    },
  })

  console.log(`Found ${tankEquipment.length} tank equipment to migrate\n`)

  if (tankEquipment.length === 0) {
    console.log('No tanks to migrate!')
    return
  }

  // 2. Check existing tanks
  const existingTanks = await prisma.tank.findMany({
    select: { id: true, name: true, tenantId: true },
  })
  const existingTankKeys = new Set(
    existingTanks.map(t => `${t.tenantId}-${t.name}`)
  )

  console.log(`Existing tanks in Tank table: ${existingTanks.length}\n`)

  // 3. Migrate each equipment to Tank
  let created = 0
  let skipped = 0
  const idMapping: Record<string, string> = {} // equipmentId -> tankId

  for (const eq of tankEquipment) {
    const key = `${eq.tenantId}-${eq.name}`

    // Check if already exists
    if (existingTankKeys.has(key)) {
      console.log(`⏭️  Skipped (exists): ${eq.name}`)
      
      // Find existing tank to get its ID
      const existing = existingTanks.find(t => t.tenantId === eq.tenantId && t.name === eq.name)
      if (existing) {
        idMapping[eq.id] = existing.id
      }
      skipped++
      continue
    }

    try {
      const tank = await prisma.tank.create({
        data: {
          tenantId: eq.tenantId,
          name: eq.name,
          type: eq.type as any, // EquipmentType matches TankType for tanks (FERMENTER, UNITANK, BRITE, etc.)
          capacity: eq.capacity ? parseFloat(String(eq.capacity)) : null,
          status: mapStatus(eq.status),
          location: eq.location || null,
          // Copy capabilities if they exist (TankCapability enum)
          capabilities: eq.capabilities || [],
          // Set defaults for new fields
          minFillPercent: 20,
          maxFillPercent: 95,
          defaultTurnaroundHours: 4,
        },
      })

      idMapping[eq.id] = tank.id
      console.log(`✅ Created: ${eq.name} (${eq.type}) → Tank ID: ${tank.id}`)
      created++

    } catch (error: any) {
      console.error(`❌ Error creating ${eq.name}:`, error.message)
    }
  }

  console.log('\n📊 Migration Summary:')
  console.log(`   Created: ${created}`)
  console.log(`   Skipped: ${skipped}`)
  console.log(`   Total: ${tankEquipment.length}`)

  // 4. Print ID mapping for reference
  if (Object.keys(idMapping).length > 0) {
    console.log('\n📋 Equipment ID → Tank ID Mapping (first 10):')
    const entries = Object.entries(idMapping).slice(0, 10)
    for (const [eqId, tankId] of entries) {
      const eq = tankEquipment.find(e => e.id === eqId)
      console.log(`   ${eq?.name || eqId} (${eqId}) → ${tankId}`)
    }
    if (Object.keys(idMapping).length > 10) {
      console.log(`   ... and ${Object.keys(idMapping).length - 10} more`)
    }
  }

  console.log('\n🎉 Migration complete!')
  console.log('\n⚠️  IMPORTANT: Update your frontend to use Tank IDs instead of Equipment IDs for tanks!')
}

function mapStatus(status: string | null): string {
  if (!status) return 'AVAILABLE'
  
  const upperStatus = status.toUpperCase()
  
  switch (upperStatus) {
    case 'OPERATIONAL':
      return 'AVAILABLE'
    case 'NEEDS_CIP':
      return 'CLEANING'
    case 'UNDER_MAINTENANCE':
    case 'NEEDS_MAINTENANCE':
      return 'MAINTENANCE'
    case 'OUT_OF_SERVICE':
      return 'OUT_OF_SERVICE'
    default:
      return 'AVAILABLE'
  }
}

main()
  .catch((e) => {
    console.error('❌ Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

