import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Updating equipment...')
  
  try {
    // 1. Delete FV-01
    const deleteResult = await prisma.$executeRawUnsafe(`
      DELETE FROM "Equipment" WHERE name = 'FV-01'
    `)
    console.log(`✅ Deleted ${deleteResult} equipment with name 'FV-01'`)
    
    // 2. Update FV-02 capacity
    const updateResult = await prisma.$executeRawUnsafe(`
      UPDATE "Equipment" SET capacity = 1000 WHERE name = 'FV-02'
    `)
    console.log(`✅ Updated ${updateResult} equipment with name 'FV-02'`)
    
    // 3. Insert ფა2 if it doesn't exist
    const insertResult = await prisma.$executeRawUnsafe(`
      INSERT INTO "Equipment" (id, "tenantId", name, type, status, capacity, "cipIntervalDays", "inspectionIntervalDays", "annualMaintenanceDays", "createdAt", "updatedAt")
      SELECT 
        'eq-fa2-' || gen_random_uuid()::text,
        (SELECT id FROM "Tenant" LIMIT 1),
        'ფა2',
        'FERMENTER',
        'OPERATIONAL',
        500,
        7, 30, 365,
        NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "Equipment" WHERE name = 'ფა2')
    `)
    console.log(`✅ Inserted ${insertResult} new equipment 'ფა2'`)
    
    console.log('✅ All equipment updates completed!')
  } catch (error) {
    console.error('❌ Error updating equipment:', error)
    throw error
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())





