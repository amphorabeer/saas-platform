/**
 * Prisma Seed for Malt Library
 * Reads malts.seed.json and upserts into database
 */

import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Import MaltLibrary type
interface MaltLibrary {
  library: { name: string; version: string; generatedAt: string }
  items: Array<{
    id: string
    name: string
    type: string
    producer?: string
    supplier?: string
    [key: string]: any
  }>
}

// Fallback normalization function (same as in ingredientCatalog.eu.seed.ts)
function normalizeManufacturer(input?: string | null): string | null {
  const raw = (input ?? "").trim()
  if (!raw) return null
  
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
    "generic": "Generic",
  }
  
  const key = raw.toLowerCase()
  return aliases[key] || raw.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
}

const prisma = new PrismaClient()

/**
 * Seed malts from JSON library
 */
export async function seedMalts(tenantId: string, userId: string) {
  console.log('🌾 Seeding malts from library...')
  
  // Load malt library
  const libraryPath = path.join(
    __dirname,
    '../../brewery-domain/src/malt-library/malts.seed.json'
  )
  
  const content = fs.readFileSync(libraryPath, 'utf-8')
  const library: MaltLibrary = JSON.parse(content)
  
  let created = 0
  let updated = 0
  
  for (const malt of library.items) {
    // Generate SKU from name and producer
    const producerSlug = malt.producer?.toLowerCase().replace(/\s+/g, '_') || 'generic'
    const nameSlug = malt.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const sku = `MALT-${nameSlug}-${producerSlug}`.toUpperCase()
    
    // Map to InventoryItem category
    const category = 'RAW_MATERIAL' as const
    
    // Normalize supplier to canonical form
    const canonicalSupplier = normalizeManufacturer(malt.supplier ?? malt.producer) || 'Generic'
    
    // Create or update inventory item
    const item = await prisma.inventoryItem.upsert({
      where: {
        tenantId_sku: {
          tenantId,
          sku,
        },
      },
      update: {
        name: malt.name,
        category,
        supplier: canonicalSupplier,
        unit: 'kg',
        costPerUnit: null, // Will be set when purchased
        reorderPoint: null,
      },
      create: {
        tenantId,
        sku,
        name: malt.name,
        category,
        unit: 'kg',
        supplier: canonicalSupplier,
        costPerUnit: null,
        reorderPoint: null,
        cachedBalance: 0, // No initial stock
      },
    })
    
    // Store malt-specific data in notes or create separate table if needed
    // For now, we'll store key specs in a JSON format in notes
    const maltData = {
      type: malt.type,
      producer: malt.producer,
      country: malt.country,
      colorEbc: malt.color.ebc.typical,
      extractPercent: malt.extract?.fgdbPercent,
      diastaticPower: malt.diastaticPower,
      maxUsagePercent: malt.maxUsagePercent,
      flavorNotes: malt.flavorNotes,
      styles: malt.styles,
      tags: malt.tags,
      keywords: malt.keywords,
      allergens: malt.allergens,
    }
    
    // Update with metadata (if you have a notes field or JSON field)
    // This is a placeholder - adjust based on your schema
    if (item) {
      created++
    } else {
      updated++
    }
  }
  
  console.log(`✅ Malts seeded: ${created} created, ${updated} updated`)
  return { created, updated }
}

/**
 * Standalone seed function (if running directly)
 */
async function main() {
  // This would need tenant and user IDs
  // For now, just export the function
  console.log('Use seedMalts(tenantId, userId) from your main seed file')
}

if (require.main === module) {
  main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}



















