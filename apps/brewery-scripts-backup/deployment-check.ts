#!/usr/bin/env tsx

/**
 * Pre-deployment verification script
 * Run before deploying to production
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Check {
  name: string
  run: () => Promise<{ pass: boolean; message: string }>
}

const checks: Check[] = [
  {
    name: 'Database connection',
    run: async () => {
      try {
        await prisma.$queryRaw`SELECT 1`
        return { pass: true, message: 'Connected successfully' }
      } catch (error) {
        return { pass: false, message: `Failed: ${error}` }
      }
    },
  },
  
  {
    name: 'Database migrations',
    run: async () => {
      try {
        // Check if all migrations have been applied
        const result = await prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*) as count FROM "_prisma_migrations" WHERE finished_at IS NULL
        `
        const pending = Number(result[0]?.count || 0)
        if (pending > 0) {
          return { pass: false, message: `${pending} pending migrations` }
        }
        return { pass: true, message: 'All migrations applied' }
      } catch (error) {
        return { pass: false, message: `Migration check failed: ${error}` }
      }
    },
  },
  
  {
    name: 'Balance trigger exists',
    run: async () => {
      try {
        const result = await prisma.$queryRaw<{ exists: boolean }[]>`
          SELECT EXISTS (
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'trg_inventory_ledger_balance'
          ) as exists
        `
        if (!result[0]?.exists) {
          return { pass: false, message: 'Trigger not found - run triggers.sql' }
        }
        return { pass: true, message: 'Trigger exists' }
      } catch (error) {
        return { pass: false, message: `Trigger check failed: ${error}` }
      }
    },
  },
  
  {
    name: 'Balance cache integrity',
    run: async () => {
      try {
        const discrepancies = await prisma.$queryRaw<{ item_id: string }[]>`
          SELECT item_id FROM reconcile_inventory_balances() LIMIT 5
        `
        if (discrepancies.length > 0) {
          return { 
            pass: false, 
            message: `${discrepancies.length} items with balance discrepancy` 
          }
        }
        return { pass: true, message: 'All balances correct' }
      } catch (error) {
        return { pass: false, message: `Balance check failed: ${error}` }
      }
    },
  },
  
  {
    name: 'Environment variables',
    run: async () => {
      const required = [
        'DATABASE_URL',
        'NEXTAUTH_SECRET',
        'NEXTAUTH_URL',
        'UPSTASH_REDIS_REST_URL',
        'UPSTASH_REDIS_REST_TOKEN',
      ]
      
      const missing = required.filter(key => !process.env[key])
      
      if (missing.length > 0) {
        return { pass: false, message: `Missing: ${missing.join(', ')}` }
      }
      return { pass: true, message: 'All required env vars set' }
    },
  },
  
  {
    name: 'At least one tenant exists',
    run: async () => {
      const count = await prisma.tenant.count()
      if (count === 0) {
        return { pass: false, message: 'No tenants found - run seed' }
      }
      return { pass: true, message: `${count} tenant(s) found` }
    },
  },
]

async function runChecks() {
  console.log('\n🔍 Running deployment checks...\n')
  
  let allPassed = true
  
  for (const check of checks) {
    process.stdout.write(`  ${check.name}... `)
    const result = await check.run()
    
    if (result.pass) {
      console.log(`✅ ${result.message}`)
    } else {
      console.log(`❌ ${result.message}`)
      allPassed = false
    }
  }
  
  console.log('')
  
  if (allPassed) {
    console.log('✅ All checks passed! Ready for deployment.\n')
    process.exit(0)
  } else {
    console.log('❌ Some checks failed. Fix issues before deploying.\n')
    process.exit(1)
  }
}

runChecks()
  .catch(console.error)
  .finally(() => prisma.$disconnect())









