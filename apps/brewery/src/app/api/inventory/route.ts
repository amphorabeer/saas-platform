import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { z } from 'zod'
import { withPermission, RouteContext } from '@/lib/api-middleware'

// Validation schema
const createItemSchema = z.object({
  sku: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD', 'CONSUMABLE']),
  unit: z.string().min(1),
  reorderPoint: z.number().optional(),
  supplier: z.string().optional(),
  costPerUnit: z.number().optional(),
  quantity: z.number().optional(), // Initial stock quantity
  inventoryAmount: z.number().optional(), // Alternative field name for quantity
  metadata: z.record(z.any()).optional(), // Metadata/specs for additional data
})

// Map frontend category values to database InventoryCategory enum
const mapCategoryToInventoryCategory = (category: string | null): string | null => {
  if (!category) return null
  
  const upperCategory = category.toUpperCase()
  
  // Direct mapping for valid InventoryCategory values
  const validCategories = ['RAW_MATERIAL', 'PACKAGING', 'FINISHED_GOOD', 'CONSUMABLE']
  if (validCategories.includes(upperCategory)) {
    return upperCategory
  }
  
  // Map frontend category names to database categories
  const categoryMap: Record<string, string> = {
    'HOP': 'RAW_MATERIAL',
    'HOPS': 'RAW_MATERIAL',
    'hop': 'RAW_MATERIAL',
    'hops': 'RAW_MATERIAL',
    'GRAIN': 'RAW_MATERIAL',
    'grain': 'RAW_MATERIAL',
    'MALT': 'RAW_MATERIAL',
    'malt': 'RAW_MATERIAL',
    'YEAST': 'RAW_MATERIAL',
    'yeast': 'RAW_MATERIAL',
    'ADJUNCT': 'RAW_MATERIAL',
    'adjunct': 'RAW_MATERIAL',
    'WATER_CHEMISTRY': 'RAW_MATERIAL',
    'water_chemistry': 'RAW_MATERIAL',
    // BOTTLE and CAN are stored as PACKAGING with metadata.type
    'BOTTLE': 'PACKAGING',
    'bottle': 'PACKAGING',
    'CAN': 'PACKAGING',
    'can': 'PACKAGING',
  }
  
  return categoryMap[upperCategory] || categoryMap[category] || null
}

// GET /api/inventory - List all inventory items (requires inventory:read)
export const GET = withPermission('inventory:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const categoryParam = searchParams.get('category')
    const lowStock = searchParams.get('lowStock') === 'true'
    const search = searchParams.get('search')
    
    // Map category to valid InventoryCategory enum value
    const mappedCategory = mapCategoryToInventoryCategory(categoryParam)
    
    // Check if category is an ingredient type (MALT, HOPS, YEAST, ADJUNCT)
    const ingredientTypes = ['MALT', 'HOPS', 'YEAST', 'ADJUNCT', 'WATER_CHEMISTRY']
    const categoryUpper = categoryParam?.toUpperCase()
    const isIngredientType = categoryParam && categoryUpper && ingredientTypes.includes(categoryUpper)
    
    // Build where clause for ingredient type filtering (with fallback to name patterns)
    let ingredientFilter: any = null
    if (isIngredientType) {
      // All ingredients have category: RAW_MATERIAL
      ingredientFilter = {
        category: 'RAW_MATERIAL',
        OR: [
          // Primary: Filter by ingredientType if set
          { ingredientType: categoryUpper },
          // Fallback: Filter by name patterns for items without ingredientType
          ...(categoryUpper === 'HOPS' ? [
            { name: { contains: 'hop', mode: 'insensitive' } },
            { name: { contains: 'Citra', mode: 'insensitive' } },
            { name: { contains: 'Cascade', mode: 'insensitive' } },
            { name: { contains: 'Simcoe', mode: 'insensitive' } },
            { name: { contains: 'Mosaic', mode: 'insensitive' } },
            { name: { contains: 'Amarillo', mode: 'insensitive' } },
            { name: { contains: 'Centennial', mode: 'insensitive' } },
            { name: { contains: 'Chinook', mode: 'insensitive' } },
            { name: { contains: 'Columbus', mode: 'insensitive' } },
            { name: { contains: 'Saaz', mode: 'insensitive' } },
            { name: { contains: 'Hallertau', mode: 'insensitive' } },
            { name: { contains: 'Magnum', mode: 'insensitive' } },
            { name: { contains: 'Perle', mode: 'insensitive' } },
            { name: { contains: 'Tettnang', mode: 'insensitive' } },
            { name: { contains: 'Fuggle', mode: 'insensitive' } },
            { name: { contains: 'Golding', mode: 'insensitive' } },
            { name: { contains: 'Northern Brewer', mode: 'insensitive' } },
            { name: { contains: 'Warrior', mode: 'insensitive' } },
            { name: { contains: 'Galaxy', mode: 'insensitive' } },
            { name: { contains: 'Nelson', mode: 'insensitive' } },
            { name: { contains: 'Hersbrucker', mode: 'insensitive' } },
            { name: { contains: 'Premiant', mode: 'insensitive' } },
            { sku: { contains: 'HOP', mode: 'insensitive' } },
          ] : []),
          ...(categoryUpper === 'MALT' ? [
            { name: { contains: 'malt', mode: 'insensitive' } },
            { name: { contains: 'Pilsner', mode: 'insensitive' } },
            { name: { contains: 'Munich', mode: 'insensitive' } },
            { name: { contains: 'Vienna', mode: 'insensitive' } },
            { name: { contains: 'Crystal', mode: 'insensitive' } },
            { name: { contains: 'Caramel', mode: 'insensitive' } },
            { name: { contains: 'Wheat', mode: 'insensitive' } },
            { name: { contains: 'Rye', mode: 'insensitive' } },
            { name: { contains: 'Oat', mode: 'insensitive' } },
            { name: { contains: 'Pale Ale', mode: 'insensitive' } },
            { name: { contains: 'Chocolate', mode: 'insensitive' } },
            { name: { contains: 'Black', mode: 'insensitive' } },
            { name: { contains: 'Roasted', mode: 'insensitive' } },
            { sku: { contains: 'MALT', mode: 'insensitive' } },
            { sku: { contains: 'GRAIN', mode: 'insensitive' } },
          ] : []),
          ...(categoryUpper === 'YEAST' ? [
            { name: { contains: 'yeast', mode: 'insensitive' } },
            { name: { contains: 'Safale', mode: 'insensitive' } },
            { name: { contains: 'Saflager', mode: 'insensitive' } },
            { name: { contains: 'Safbrew', mode: 'insensitive' } },
            { name: { contains: 'Fermentis', mode: 'insensitive' } },
            { name: { contains: 'Wyeast', mode: 'insensitive' } },
            { name: { contains: 'White Labs', mode: 'insensitive' } },
            { name: { contains: 'WLP', mode: 'insensitive' } },
            { name: { contains: 'Lallemand', mode: 'insensitive' } },
            { name: { contains: 'Lalbrew', mode: 'insensitive' } },
            { name: { contains: 'Nottingham', mode: 'insensitive' } },
            { name: { contains: 'Windsor', mode: 'insensitive' } },
            { name: { contains: 'W-34', mode: 'insensitive' } },
            { name: { contains: 'US-05', mode: 'insensitive' } },
            { name: { contains: 'US-04', mode: 'insensitive' } },
            { name: { contains: 'S-04', mode: 'insensitive' } },
            { name: { contains: 'S-23', mode: 'insensitive' } },
            { name: { contains: 'S-33', mode: 'insensitive' } },
            { name: { contains: 'K-97', mode: 'insensitive' } },
            { name: { contains: 'T-58', mode: 'insensitive' } },
            { name: { contains: 'BE-256', mode: 'insensitive' } },
            { name: { contains: 'BE-134', mode: 'insensitive' } },
            { name: { contains: 'WB-06', mode: 'insensitive' } },
            { name: { contains: 'M-44', mode: 'insensitive' } },
            { name: { contains: 'Omega', mode: 'insensitive' } },
            { name: { contains: 'Imperial', mode: 'insensitive' } },
            { name: { contains: 'Belle Saison', mode: 'insensitive' } },
            { name: { contains: 'Mangrove', mode: 'insensitive' } },
            { sku: { contains: 'YEAST', mode: 'insensitive' } },
          ] : []),
          ...(categoryUpper === 'ADJUNCT' ? [
            // Sugars
            { name: { contains: 'sugar', mode: 'insensitive' } },
            { name: { contains: 'honey', mode: 'insensitive' } },
            { name: { contains: 'molasses', mode: 'insensitive' } },
            { name: { contains: 'syrup', mode: 'insensitive' } },
            { name: { contains: 'lactose', mode: 'insensitive' } },
            { name: { contains: 'dextrose', mode: 'insensitive' } },
            { name: { contains: 'candi', mode: 'insensitive' } },
            { name: { contains: 'invert', mode: 'insensitive' } },
            // Spices & Flavors
            { name: { contains: 'spice', mode: 'insensitive' } },
            { name: { contains: 'coriander', mode: 'insensitive' } },
            { name: { contains: 'orange peel', mode: 'insensitive' } },
            { name: { contains: 'ginger', mode: 'insensitive' } },
            { name: { contains: 'cinnamon', mode: 'insensitive' } },
            { name: { contains: 'vanilla', mode: 'insensitive' } },
            { name: { contains: 'nutmeg', mode: 'insensitive' } },
            { name: { contains: 'cocoa', mode: 'insensitive' } },
            { name: { contains: 'coffee', mode: 'insensitive' } },
            { name: { contains: 'chocolate', mode: 'insensitive' } },
            // Fruits
            { name: { contains: 'fruit', mode: 'insensitive' } },
            { name: { contains: 'cherry', mode: 'insensitive' } },
            { name: { contains: 'raspberry', mode: 'insensitive' } },
            { name: { contains: 'peach', mode: 'insensitive' } },
            { name: { contains: 'apricot', mode: 'insensitive' } },
            { name: { contains: 'plum', mode: 'insensitive' } },
            { name: { contains: 'berry', mode: 'insensitive' } },
            // Finings
            { name: { contains: 'fining', mode: 'insensitive' } },
            { name: { contains: 'irish moss', mode: 'insensitive' } },
            { name: { contains: 'whirlfloc', mode: 'insensitive' } },
            { name: { contains: 'gelatin', mode: 'insensitive' } },
            { name: { contains: 'isinglass', mode: 'insensitive' } },
            { name: { contains: 'biofine', mode: 'insensitive' } },
            // Oak
            { name: { contains: 'oak', mode: 'insensitive' } },
            { name: { contains: 'chip', mode: 'insensitive' } },
            { name: { contains: 'cube', mode: 'insensitive' } },
            { name: { contains: 'stave', mode: 'insensitive' } },
            // SKU patterns
            { sku: { contains: 'ADJUNCT', mode: 'insensitive' } },
            { sku: { contains: 'ADJ', mode: 'insensitive' } },
            { sku: { contains: 'ADD', mode: 'insensitive' } },
          ] : []),
          ...(categoryUpper === 'WATER_CHEMISTRY' ? [
            { name: { contains: 'gypsum', mode: 'insensitive' } },
            { name: { contains: 'CaSO4', mode: 'insensitive' } },
            { name: { contains: 'caso4', mode: 'insensitive' } },
            { name: { contains: 'CaCl', mode: 'insensitive' } },
            { name: { contains: 'cacl', mode: 'insensitive' } },
            { name: { contains: 'calcium', mode: 'insensitive' } },
            { name: { contains: 'chloride', mode: 'insensitive' } },
            { name: { contains: 'sulfate', mode: 'insensitive' } },
            { name: { contains: 'acid', mode: 'insensitive' } },
            { name: { contains: 'lactic', mode: 'insensitive' } },
            { name: { contains: 'phosphoric', mode: 'insensitive' } },
            { name: { contains: 'salt', mode: 'insensitive' } },
            { name: { contains: 'campden', mode: 'insensitive' } },
            { name: { contains: 'sodium', mode: 'insensitive' } },
            { name: { contains: 'magnesium', mode: 'insensitive' } },
            { name: { contains: 'bicarbonate', mode: 'insensitive' } },
            { name: { contains: 'chalk', mode: 'insensitive' } },
            { name: { contains: 'epson', mode: 'insensitive' } },
            { name: { contains: 'epsom', mode: 'insensitive' } },
            { name: { contains: 'calcium sulfate', mode: 'insensitive' } },
            { name: { contains: 'calcium chloride', mode: 'insensitive' } },
            { name: { contains: 'sodium chloride', mode: 'insensitive' } },
            { sku: { contains: 'CHEM', mode: 'insensitive' } },
            { sku: { contains: 'WATER', mode: 'insensitive' } },
          ] : []),
        ],
      }
    }
    
    // Build where clause
    const whereClause: any = {
      tenantId: ctx.tenantId,
      isActive: true,
    }
    
    // Add category/ingredient filter
    if (ingredientFilter) {
      // Ingredient type filtering (MALT, HOPS, YEAST, etc.) - complex OR logic
      whereClause.category = ingredientFilter.category
      whereClause.OR = ingredientFilter.OR
    } else if (categoryParam && mappedCategory) {
      // Simple category filter (PACKAGING, RAW_MATERIAL, etc.)
      whereClause.category = mappedCategory
    }
    
    // Add search filter (combine with ingredient filter if present)
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ]
      
      if (whereClause.OR) {
        // If we have ingredient OR conditions, combine them with search
        whereClause.AND = [
          {
            OR: whereClause.OR, // Ingredient type OR name patterns
          },
          {
            OR: searchConditions, // Search conditions
          },
        ]
        delete whereClause.OR // Remove OR, now in AND
      } else {
        // Just search conditions
        whereClause.OR = searchConditions
      }
    }
    
    const items = await prisma.inventoryItem.findMany({
      where: whereClause,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    
    // Filter low stock if requested
    let filteredItems = items
    if (lowStock) {
      filteredItems = items.filter(item => 
        item.reorderPoint && Number(item.cachedBalance) <= Number(item.reorderPoint)
      )
    }
    
    return NextResponse.json({
      items: filteredItems.map(item => {
        const balance = Number(item.cachedBalance || 0)
        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          ingredientType: item.ingredientType,
          unit: item.unit,
          balance, // Keep for backward compatibility
          quantity: balance, // Alias for balance
          cachedBalance: balance, // Add explicit cachedBalance field
          reorderPoint: item.reorderPoint ? Number(item.reorderPoint) : null,
          minStock: item.reorderPoint ? Number(item.reorderPoint) : null, // Alias for reorderPoint
          supplier: item.supplier,
          costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
          totalValue: item.costPerUnit ? balance * Number(item.costPerUnit) : null,
          isLowStock: item.reorderPoint ? balance <= Number(item.reorderPoint) : false,
          isCritical: item.reorderPoint ? balance <= Number(item.reorderPoint) * 0.5 : false,
          isOutOfStock: balance <= 0,
          updatedAt: item.balanceUpdatedAt,
          metadata: item.specs || {}, // Include specs as metadata
        }
      })
    })
  } catch (error) {
    console.error('Inventory GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
})

// POST /api/inventory - Create new item (requires inventory:create)
export const POST = withPermission('inventory:create', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const body = await req.json()
    const input = createItemSchema.parse(body)
    
    // Get initial quantity from either quantity or inventoryAmount field
    const initialQuantity = Number(input.quantity || input.inventoryAmount || 0)
    
    console.log('[POST /api/inventory] Creating item with initial quantity:', initialQuantity)
    
    // Detect ingredient type from SKU or name
    let ingredientType: string | null = null
    const nameLower = input.name.toLowerCase()
    const skuUpper = input.sku.toUpperCase()
    
    const hopNames = [
      'citra', 'cascade', 'centennial', 'simcoe', 'mosaic', 'amarillo',
      'hallertau', 'hallertauer', 'saaz', 'fuggle', 'golding', 'tettnang',
      'chinook', 'columbus', 'warrior', 'magnum', 'perle', 'hop'
    ]
    const yeastNames = ['yeast', 'safale', 'fermentis', 'wyeast', 'white labs', 'lallemand', 'mangrove']
    
    if (skuUpper.includes('HOP') || hopNames.some(h => nameLower.includes(h))) {
      ingredientType = 'HOPS'
    } else if (skuUpper.includes('YEAST') || yeastNames.some(y => nameLower.includes(y))) {
      ingredientType = 'YEAST'
    } else if (skuUpper.includes('MALT') || skuUpper.includes('GRAIN') || nameLower.includes('malt') || nameLower.includes('pilsner') || nameLower.includes('munich')) {
      ingredientType = 'MALT'
    } else if (skuUpper.includes('ADJUNCT') || nameLower.includes('adjunct')) {
      ingredientType = 'ADJUNCT'
    }
    
    // Use transaction to ensure both item and ledger entry are created atomically
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the inventory item starting with 0 balance
      const item = await tx.inventoryItem.create({
        data: {
          tenantId: ctx.tenantId,
          sku: input.sku,
          name: input.name,
          category: input.category,
          ingredientType,
          unit: input.unit,
          reorderPoint: input.reorderPoint,
          supplier: input.supplier,
          costPerUnit: input.costPerUnit,
          specs: input.metadata || undefined, // Store metadata in specs field
          cachedBalance: 0, // Start at 0, will be updated from ledger
          balanceUpdatedAt: new Date(),
        },
      })
      
      // 2. If there's initial quantity, create a ledger entry and update balance
      if (initialQuantity > 0) {
        await tx.inventoryLedger.create({
          data: {
            tenantId: ctx.tenantId,
            itemId: item.id,
            quantity: initialQuantity,
            type: 'PURCHASE',
            notes: 'საწყისი მარაგი', // "Initial stock" in Georgian
            createdBy: ctx.userId || 'system',
          },
        })
        
        // 3. Update cachedBalance from ledger entry (not double counting)
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            cachedBalance: initialQuantity,
            balanceUpdatedAt: new Date(),
          },
        })
        
        console.log('[POST /api/inventory] Created initial ledger entry for quantity:', initialQuantity)
      }
      
      // Return the updated item
      return tx.inventoryItem.findUnique({
        where: { id: item.id },
      })
    })
    
    console.log('[POST /api/inventory] Item created successfully:', result?.id)
    return NextResponse.json({ item: result }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/inventory] Error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create item', details: String(error) }, { status: 500 })
  }
})


