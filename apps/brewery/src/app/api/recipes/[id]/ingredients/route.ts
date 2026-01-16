import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { z } from 'zod'

// Validation schema
const createIngredientSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1), // grain, hop, yeast, etc.
  amount: z.number().positive(),
  unit: z.string().min(1),
  additionTime: z.number().optional().nullable(),
  inventoryItemId: z.string().optional().nullable(),
  specs: z.record(z.any()).optional().nullable(),
})

// Map frontend type to database category
const mapTypeToCategory = (type: string): string => {
  const typeLower = type.toLowerCase()
  const categoryMap: Record<string, string> = {
    grain: 'MALT',
    malt: 'MALT',
    hop: 'HOPS',
    hops: 'HOPS',
    yeast: 'YEAST',
    adjunct: 'ADJUNCT',
    water: 'WATER_CHEMISTRY',
  }
  return categoryMap[typeLower] || 'ADJUNCT'
}

// GET - List ingredients for a recipe
export const GET = withPermission('recipe:read', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const recipeId = req.url.split('/recipes/')[1]?.split('/')[0]
    if (!recipeId) {
      return NextResponse.json({ error: { message: 'Recipe ID required' } }, { status: 400 })
    }

    // Verify recipe belongs to tenant
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId: ctx.tenantId },
    })

    if (!recipe) {
      return NextResponse.json({ error: { message: 'Recipe not found' } }, { status: 404 })
    }

    // Get ingredients with inventory info
    const ingredients = await prisma.recipeIngredient.findMany({
      where: { recipeId },
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            supplier: true,
          },
        },
      },
      orderBy: {
        category: 'asc',
      },
    })

    return NextResponse.json({ ingredients })
  } catch (error) {
    console.error('[GET] Get ingredients error:', error)
    throw error
  }
})

// POST - Add ingredient to recipe
export const POST = withPermission('recipe:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const recipeId = req.url.split('/recipes/')[1]?.split('/')[0]
    if (!recipeId) {
      return NextResponse.json({ error: { message: 'Recipe ID required' } }, { status: 400 })
    }
    const body = await createIngredientSchema.parse(await req.json())

    console.log('[POST] Adding ingredient to recipe:', { recipeId, body })

    // Verify recipe belongs to tenant
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId: ctx.tenantId },
    })

    if (!recipe) {
      return NextResponse.json({ error: { message: 'Recipe not found' } }, { status: 404 })
    }

    // Validate inventory item if provided
    let inventoryItemId = body.inventoryItemId || null
    if (inventoryItemId) {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { id: inventoryItemId, tenantId: ctx.tenantId },
      })
      if (!inventoryItem) {
        console.warn('[POST] Inventory item not found, proceeding without link:', inventoryItemId)
        inventoryItemId = null
      }
    }

    // Determine category from type
    const category = mapTypeToCategory(body.type)

    // Create ingredient
    const ingredient = await prisma.recipeIngredient.create({
      data: {
        recipeId,
        inventoryItemId,
        name: body.name,
        category: category as any,
        amount: body.amount,
        unit: body.unit,
        additionTime: body.additionTime || null,
        // Store specs as JSON if provided (will be added to schema)
        // specs: body.specs || null,
      },
      include: {
        inventoryItem: {
          select: {
            id: true,
            name: true,
            unit: true,
          },
        },
      },
    })

    console.log('[POST] Created ingredient:', ingredient)

    return NextResponse.json(ingredient, { status: 201 })
  } catch (error) {
    console.error('[POST] Create ingredient error:', error)
    throw error
  }
})

// DELETE - Remove ingredient from recipe
export const DELETE = withPermission('recipe:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const recipeId = req.url.split('/recipes/')[1]?.split('/')[0]
    if (!recipeId) {
      return NextResponse.json({ error: { message: 'Recipe ID required' } }, { status: 400 })
    }
    const { searchParams } = new URL(req.url)
    const ingredientId = searchParams.get('ingredientId')

    if (!ingredientId) {
      return NextResponse.json(
        { error: { message: 'Ingredient ID required' } },
        { status: 400 }
      )
    }

    // Verify recipe belongs to tenant
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId: ctx.tenantId },
    })

    if (!recipe) {
      return NextResponse.json({ error: { message: 'Recipe not found' } }, { status: 404 })
    }

    // Verify ingredient belongs to recipe
    const ingredient = await prisma.recipeIngredient.findFirst({
      where: { id: ingredientId, recipeId },
    })

    if (!ingredient) {
      return NextResponse.json({ error: { message: 'Ingredient not found' } }, { status: 404 })
    }

    // Delete ingredient
    await prisma.recipeIngredient.delete({
      where: { id: ingredientId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE] Delete ingredient error:', error)
    throw error
  }
})

