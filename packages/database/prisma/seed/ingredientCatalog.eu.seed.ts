/**
 * Seed IngredientCatalog from EU ingredient library JSON
 * Idempotent upsert by catalogId with manufacturer normalization
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Import normalizeManufacturer - use relative path since it's in a different package
const normalizeManufacturerPath = path.join(
  __dirname,
  '../../../brewery-domain/src/malt-library/normalizeManufacturer.ts'
)

// Dynamic import for normalizeManufacturer
let normalizeManufacturer: (input?: string | null) => string | null

try {
  // Try to use the module if available
  const normalizeModule = require('../../../brewery-domain/src/malt-library/normalizeManufacturer')
  normalizeManufacturer = normalizeModule.normalizeManufacturer || ((input?: string | null) => {
    const raw = (input ?? "").trim()
    if (!raw) return null
    // Simple fallback normalization
    return raw.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
  })
} catch {
  // Fallback normalization function
  normalizeManufacturer = (input?: string | null) => {
    const raw = (input ?? "").trim()
    if (!raw) return null
    
    // Simple normalization map
    const aliases: Record<string, string> = {
      "bestmalz": "BestMalz",
      "best malz": "BestMalz",
      "weyermann": "Weyermann",
      "castle malting": "Castle Malting",
      "ireks": "IREKS",
      "dingemans": "Dingemans",
      "crisp": "Crisp",
      "simpsons": "Simpsons",
      "rahr": "Rahr",
      "avangard": "Avangard",
      "boortmalt": "Boortmalt",
      "viking malt": "Viking Malt",
      "swaen": "Swaen",
      "soufflet": "Soufflet",
      "franco-belges": "Franco-Belges Malterie",
      "van roessel": "Van Roessel",
    }
    
    const key = raw.toLowerCase()
    return aliases[key] || raw.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
  }
}

const prisma = new PrismaClient()

interface IngredientCatalogItem {
  id: string
  name: string
  category: 'malt' | 'hops' | 'yeast' | 'adjunct' | 'water_chemistry'
  supplier?: string
  unit: string
}

interface IngredientLibrary {
  version: string
  items: IngredientCatalogItem[]
}

// Map JSON category to Prisma IngredientCategory enum
function mapCategory(category: string): 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY' {
  const categoryMap: Record<string, 'MALT' | 'HOPS' | 'YEAST' | 'ADJUNCT' | 'WATER_CHEMISTRY'> = {
    'malt': 'MALT',
    'hops': 'HOPS',
    'yeast': 'YEAST',
    'adjunct': 'ADJUNCT',
    'water_chemistry': 'WATER_CHEMISTRY',
  }
  return categoryMap[category.toLowerCase()] || 'ADJUNCT'
}

export async function seedIngredientCatalogEU() {
  try {
    // Read JSON file
    // Resolve workspace root: from packages/database, go up 2 levels
    // process.cwd() when running pnpm --filter is usually the package directory
    const currentDir = process.cwd()
    let workspaceRoot: string
    
    // Check if we're in packages/database
    if (currentDir.endsWith('packages/database')) {
      workspaceRoot = path.resolve(currentDir, '..', '..')
    } else if (currentDir.endsWith('saas-platform')) {
      // Already at workspace root
      workspaceRoot = currentDir
    } else {
      // Fallback: try to find workspace root by looking for apps/brewery
      workspaceRoot = path.resolve(currentDir, '..', '..')
    }

    const jsonPath = path.join(workspaceRoot, 'apps/brewery/src/data/ingredient-library.eu.json')

    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found: ${jsonPath}`)
      console.error(`   Current directory: ${currentDir}`)
      console.error(`   Workspace root: ${workspaceRoot}`)
      return
    }

    console.log(`📂 Loading IngredientCatalog from: ${jsonPath}`)

    const fileContent = fs.readFileSync(jsonPath, 'utf-8')
    const library: IngredientLibrary = JSON.parse(fileContent)

    console.log(`📦 Loading IngredientCatalog from EU library (${library.items.length} items)...`)

    let created = 0
    let updated = 0
    let skipped = 0

    // Upsert each item by catalogId (idempotent)
    for (const item of library.items) {
      try {
        const category = mapCategory(item.category)
        
        // Normalize supplier to canonical form
        const canonicalSupplier = normalizeManufacturer(item.supplier) || 'Generic'
        
        // @ts-expect-error - ingredientCatalog will be available after Prisma generate
        const result = await prisma.ingredientCatalog.upsert({
          where: { catalogId: item.id },
          update: {
            name: item.name,
            category,
            supplier: canonicalSupplier,
            unit: item.unit,
            updatedAt: new Date(),
          },
          create: {
            catalogId: item.id,
            name: item.name,
            category,
            supplier: canonicalSupplier,
            unit: item.unit,
          },
        })

        if (result.createdAt.getTime() === result.updatedAt.getTime()) {
          created++
        } else {
          updated++
        }
      } catch (error) {
        console.error(`❌ Error upserting ${item.id}:`, error)
        skipped++
      }
    }

    console.log(`✅ IngredientCatalog seeded:`)
    console.log(`   Created: ${created}`)
    console.log(`   Updated: ${updated}`)
    console.log(`   Skipped: ${skipped}`)
    console.log(`   Total: ${library.items.length}`)

    // Normalize existing rows (cleanup migration)
    console.log(`\n🔧 Normalizing existing suppliers...`)
    // @ts-expect-error - ingredientCatalog will be available after Prisma generate
    const existingRows = await prisma.ingredientCatalog.findMany({
      select: { id: true, supplier: true },
    })

    let normalized = 0
    for (const row of existingRows) {
      if (row.supplier) {
        const canonical = normalizeManufacturer(row.supplier)
        if (canonical && canonical !== row.supplier) {
          // @ts-expect-error - ingredientCatalog will be available after Prisma generate
          await prisma.ingredientCatalog.update({
            where: { id: row.id },
            data: { supplier: canonical },
          })
          normalized++
        }
      }
    }
    console.log(`   Normalized ${normalized} existing rows`)

    // Print unique suppliers (canonical)
    // @ts-expect-error - ingredientCatalog will be available after Prisma generate
    const suppliers = await prisma.ingredientCatalog.findMany({
      select: { supplier: true },
      distinct: ['supplier'],
      where: { supplier: { not: null } },
      orderBy: { supplier: 'asc' },
    })

    type SupplierRow = { supplier: string | null }
    const supplierList = (suppliers as SupplierRow[])
      .map((s: SupplierRow) => s.supplier)
      .filter((s: string | null): s is string => Boolean(s))

    console.log(`\n📊 Unique canonical suppliers (${supplierList.length}):`)
    supplierList.forEach((supplier: string) => {
      console.log(`   - ${supplier}`)
    })

  } catch (error) {
    console.error('❌ Error seeding IngredientCatalog:', error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedIngredientCatalogEU()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}



















