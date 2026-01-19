import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get tenant ID from environment variable or use the first tenant
  let tenantId = process.env.TENANT_ID
  
  if (!tenantId) {
    // Query first tenant
    const firstTenant = await prisma.tenant.findFirst({
      orderBy: { createdAt: 'asc' }
    })
    
    if (!firstTenant) {
      console.error('❌ No tenant found. Please create a tenant first or set TENANT_ID environment variable.')
      process.exit(1)
    }
    
    tenantId = firstTenant.id
    console.log(`📋 Using tenant: ${firstTenant.name} (${tenantId})`)
  }
  
  const cleaningSupplies = [
    {
      sku: 'CLEAN-001',
      name: 'კაუსტიკ სოდა (NaOH)',
      category: 'CONSUMABLE' as const,
      unit: 'კგ',
      cachedBalance: 25, // Initial stock balance
      reorderPoint: 10,
      costPerUnit: 8.5,
      supplier: null as string | null,
      location: 'ქიმიკატების საწყობი',
    },
    {
      sku: 'CLEAN-002',
      name: 'ფოსფორმჟავა',
      category: 'CONSUMABLE' as const,
      unit: 'ლ',
      cachedBalance: 15,
      reorderPoint: 5,
      costPerUnit: 12,
      supplier: null as string | null,
      location: 'ქიმიკატების საწყობი',
    },
    {
      sku: 'CLEAN-003',
      name: 'PAA სანიტაიზერი',
      category: 'CONSUMABLE' as const,
      unit: 'ლ',
      cachedBalance: 20,
      reorderPoint: 8,
      costPerUnit: 18,
      supplier: null as string | null,
      location: 'ქიმიკატების საწყობი',
    },
    {
      sku: 'CLEAN-004',
      name: 'Star San',
      category: 'CONSUMABLE' as const,
      unit: 'ლ',
      cachedBalance: 5,
      reorderPoint: 3,
      costPerUnit: 25,
      supplier: null as string | null,
      location: 'ლაბორატორია',
    },
    {
      sku: 'CLEAN-005',
      name: 'PBW (Powdered Brewery Wash)',
      category: 'CONSUMABLE' as const,
      unit: 'კგ',
      cachedBalance: 10,
      reorderPoint: 5,
      costPerUnit: 15,
      supplier: null as string | null,
      location: 'ქიმიკატების საწყობი',
    },
  ]

  console.log(`\n🔄 Adding ${cleaningSupplies.length} cleaning supplies...\n`)

  for (const supply of cleaningSupplies) {
    try {
      // Use transaction to ensure item and ledger entry are created together
      await prisma.$transaction(async (tx) => {
        // Check if item already exists
        const existingItem = await tx.inventoryItem.findUnique({
          where: { 
            tenantId_sku: { tenantId, sku: supply.sku }
          }
        })

        let item
        if (existingItem) {
          // Update existing item
          item = await tx.inventoryItem.update({
            where: { id: existingItem.id },
            data: {
              name: supply.name,
              cachedBalance: supply.cachedBalance,
              reorderPoint: supply.reorderPoint,
              costPerUnit: supply.costPerUnit,
              location: supply.location,
              unit: supply.unit,
              supplier: supply.supplier,
              balanceUpdatedAt: new Date(),
            },
          })
        } else {
          // Create new item
          item = await tx.inventoryItem.create({
            data: { 
              ...supply, 
              tenantId,
              balanceUpdatedAt: new Date(),
            },
          })

          // Create initial ledger entry for the stock
          await tx.inventoryLedger.create({
            data: {
              tenantId,
              itemId: item.id,
              quantity: supply.cachedBalance,
              type: 'ADJUSTMENT',
              notes: 'Initial stock for cleaning supply',
              createdBy: 'system', // Script execution
            },
          })
        }

        console.log(`✅ Added/Updated: ${supply.name} (${supply.sku}) - Balance: ${supply.cachedBalance} ${supply.unit}`)
      })
    } catch (error) {
      console.error(`❌ Failed to add ${supply.name}:`, error)
    }
  }
  
  console.log(`\n🎉 Completed! Added ${cleaningSupplies.length} cleaning supplies.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())

