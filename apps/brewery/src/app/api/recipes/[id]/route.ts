import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { z } from 'zod'

// Validation schema
const updateRecipeSchema = z.object({
  name: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
  description: z.string().optional(),
  batchSize: z.number().positive().optional(),
  boilTime: z.number().int().positive().optional(),
  efficiency: z.number().min(0).max(100).optional(),
  targetOG: z.number().optional(),
  targetFG: z.number().optional(),
  targetABV: z.number().optional(),
  ibu: z.number().int().min(0).optional(),
  srm: z.number().int().min(0).optional(),
  notes: z.string().optional(),
  process: z.any().optional(), // Brewing process JSON
  ingredients: z.array(z.any()).optional(),
  steps: z.array(z.any()).optional(),
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

// PUT - Update recipe
export const PUT = withPermission('recipe:update', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract recipe ID from URL path
    // URL format: /api/recipes/[id]
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const recipeId = pathParts[pathParts.length - 1] // Get last segment
    
    if (!recipeId || recipeId === 'recipes') {
      return NextResponse.json(
        { message: 'Recipe ID is required' },
        { status: 400 }
      )
    }
    const body = await updateRecipeSchema.parse(await req.json())

    console.log('[PUT /api/recipes/:id] Updating recipe:', recipeId)

    // Verify recipe belongs to tenant
    const existingRecipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        tenantId: ctx.tenantId,
      },
    })

    if (!existingRecipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Update recipe with ingredients in transaction
    const recipe = await prisma.$transaction(async (tx) => {
      // 1. Update recipe
      const updatedRecipe = await tx.recipe.update({
        where: { id: recipeId },
        data: {
          name: body.name,
          style: body.style,
          batchSize: body.batchSize,
          boilTime: body.boilTime,
          og: body.targetOG,
          fg: body.targetFG,
          abv: body.targetABV,
          ibu: body.ibu,
          color: body.srm,
          notes: body.notes,
          process: body.process, // Update brewing process
        },
      })

      // 2. Update ingredients if provided
      if (body.ingredients) {
        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId },
        })

        // Create new ingredients
        if (body.ingredients.length > 0) {
          await tx.recipeIngredient.createMany({
            data: body.ingredients.map((ing: any) => ({
              recipeId,
              name: ing.name,
              category: mapTypeToCategory(ing.type || 'adjunct') as any,
              amount: ing.amount,
              unit: ing.unit || 'kg',
              additionTime: ing.addTime ? parseInt(String(ing.addTime).replace(/[^0-9]/g, '')) : null,
              inventoryItemId: ing.inventoryItemId || null,
            })),
          })
        }
      }

      // 3. Return updated recipe with ingredients
      return tx.recipe.findUnique({
        where: { id: recipeId },
        include: {
          ingredients: {
            include: {
              inventoryItem: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          _count: {
            select: {
              batches: true,
            },
          },
        },
      })
    })

    console.log('[PUT /api/recipes/:id] Updated:', recipe?.id)

    // Transform to frontend format
    const transformedRecipe = recipe ? {
      id: recipe.id,
      name: recipe.name,
      style: recipe.style,
      description: recipe.notes || '',
      targetOG: Number(recipe.og || 0),
      targetFG: Number(recipe.fg || 0),
      targetABV: Number(recipe.abv || 0),
      ibu: recipe.ibu || 0,
      srm: recipe.color || 0,
      batchSize: Number(recipe.batchSize),
      boilTime: recipe.boilTime,
      efficiency: 75,
      ingredients: recipe.ingredients.map(ing => ({
        id: ing.id,
        name: ing.name,
        type: ing.category === 'MALT' ? 'grain' :
              ing.category === 'HOPS' ? 'hop' :
              ing.category === 'YEAST' ? 'yeast' :
              ing.category === 'ADJUNCT' ? 'adjunct' : 'water',
        amount: Number(ing.amount),
        unit: ing.unit,
        addTime: ing.additionTime ? `${ing.additionTime} წთ` : undefined,
        inventoryItemId: ing.inventoryItemId,
        specs: {},
      })),
      steps: [],
      process: recipe.process || null, // Include brewing process
      notes: recipe.notes || '',
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      batchCount: recipe._count.batches,
      rating: 0,
      isFavorite: false,
    } : null

    return NextResponse.json(transformedRecipe)
  } catch (error) {
    console.error('[PUT /api/recipes/:id] Error:', error)
    console.error('[PUT /api/recipes/:id] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        message: 'Failed to update recipe', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
})

// DELETE - Delete recipe
export const DELETE = withPermission('recipe:delete', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract recipe ID from URL path
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const recipeId = pathParts[pathParts.length - 1] // Get last segment
    
    if (!recipeId || recipeId === 'recipes') {
      return NextResponse.json(
        { message: 'Recipe ID is required' },
        { status: 400 }
      )
    }

    // Verify recipe belongs to tenant
    const recipe = await prisma.recipe.findFirst({
      where: {
        id: recipeId,
        tenantId: ctx.tenantId,
      },
    })

    if (!recipe) {
      return NextResponse.json(
        { message: 'Recipe not found' },
        { status: 404 }
      )
    }

    // Soft delete (set isActive to false)
    await prisma.recipe.update({
      where: { id: recipeId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/recipes/:id] Error:', error)
    console.error('[DELETE /api/recipes/:id] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        message: 'Failed to delete recipe', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
})

