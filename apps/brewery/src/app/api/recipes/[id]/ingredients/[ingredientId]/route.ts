import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { z } from 'zod'

// Validation schema
const updateIngredientSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
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

// PUT - Update ingredient
export const PUT = withPermission('recipe:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const urlParts = req.url.split('/recipes/')[1]?.split('/') || []
    const recipeId = urlParts[0]
    const ingredientId = urlParts[2]
    
    if (!recipeId || !ingredientId) {
      return NextResponse.json(
        { error: { message: 'Recipe ID and Ingredient ID required' } },
        { status: 400 }
      )
    }

    const body = await updateIngredientSchema.parse(await req.json())

    // Verify recipe belongs to tenant
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, tenantId: ctx.tenantId },
    })

    if (!recipe) {
      return NextResponse.json({ error: { message: 'Recipe not found' } }, { status: 404 })
    }

    // Verify ingredient belongs to recipe
    const existingIngredient = await prisma.recipeIngredient.findFirst({
      where: { id: ingredientId, recipeId },
    })

    if (!existingIngredient) {
      return NextResponse.json({ error: { message: 'Ingredient not found' } }, { status: 404 })
    }

    // Validate inventory item if provided
    let inventoryItemId = body.inventoryItemId !== undefined ? body.inventoryItemId : existingIngredient.inventoryItemId
    if (inventoryItemId) {
      const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { id: inventoryItemId, tenantId: ctx.tenantId },
      })
      if (!inventoryItem) {
        console.warn('[PUT] Inventory item not found, proceeding without link:', inventoryItemId)
        inventoryItemId = null
      }
    }

    // Determine category from type if provided
    const category = body.type ? mapTypeToCategory(body.type) : existingIngredient.category

    // Build update data
    const updateData: any = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.amount !== undefined) updateData.amount = body.amount
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.additionTime !== undefined) updateData.additionTime = body.additionTime
    if (inventoryItemId !== undefined) updateData.inventoryItemId = inventoryItemId
    if (body.type !== undefined) updateData.category = category as any
    // Store specs as JSON if provided (will be added to schema)
    // if (body.specs !== undefined) updateData.specs = body.specs

    // Update ingredient
    const ingredient = await prisma.recipeIngredient.update({
      where: { id: ingredientId },
      data: updateData,
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

    return NextResponse.json(ingredient)
  } catch (error) {
    console.error('[PUT] Update ingredient error:', error)
    throw error
  }
})

// DELETE - Remove specific ingredient
export const DELETE = withPermission('recipe:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const urlParts = req.url.split('/recipes/')[1]?.split('/') || []
    const recipeId = urlParts[0]
    const ingredientId = urlParts[2]
    
    if (!recipeId || !ingredientId) {
      return NextResponse.json(
        { error: { message: 'Recipe ID and Ingredient ID required' } },
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

    await prisma.recipeIngredient.delete({
      where: { id: ingredientId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE] Delete ingredient error:', error)
    throw error
  }
})

