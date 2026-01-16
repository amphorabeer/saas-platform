import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import { z } from 'zod'

// Validation schema
const createRecipeSchema = z.object({
  name: z.string().min(1),
  style: z.string().min(1),
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

// GET - List all recipes
export const GET = withPermission('recipe:read', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    console.log('[GET /api/recipes] Fetching recipes for tenant:', ctx.tenantId)
    
    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId: ctx.tenantId,
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            inventoryItem: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
                cachedBalance: true,
              },
            },
          },
          orderBy: {
            category: 'asc',
          },
        },
        _count: {
          select: {
            batches: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    console.log('[GET /api/recipes] Found', recipes.length, 'recipes')

    // Transform to frontend format
    const transformedRecipes = recipes.map(recipe => ({
      id: recipe.id,
      name: recipe.name,
      style: recipe.style,
      description: recipe.notes || '', // Schema uses 'notes', not 'description'
      targetOG: Number(recipe.og || 0),
      targetFG: Number(recipe.fg || 0),
      targetABV: Number(recipe.abv || 0),
      ibu: recipe.ibu || 0,
      srm: recipe.color || 0,
      batchSize: Number(recipe.batchSize),
      boilTime: recipe.boilTime,
      efficiency: 75, // Default, not stored in DB
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
        specs: {}, // TODO: Load from DB if stored
      })),
      steps: [], // TODO: Load steps if stored
      process: recipe.process || null, // Include brewing process
      notes: recipe.notes || '',
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      batchCount: recipe._count?.batches || 0,
      rating: 0, // TODO: Calculate from batches
      isFavorite: false, // TODO: Store in DB
    }))

    return NextResponse.json({ recipes: transformedRecipes })
  } catch (error) {
    console.error('[GET /api/recipes] Error:', error)
    console.error('[GET /api/recipes] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        message: 'Failed to fetch recipes', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
})

// POST - Create new recipe
export const POST = withPermission('recipe:create', async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    const body = await createRecipeSchema.parse(await req.json())

    console.log('[POST /api/recipes] Creating recipe:', body.name)

    // Create recipe with ingredients in transaction
    const recipe = await prisma.$transaction(async (tx) => {
      // 1. Create recipe
      const newRecipe = await tx.recipe.create({
        data: {
          tenantId: ctx.tenantId,
          name: body.name,
          style: body.style,
          batchSize: body.batchSize || 20,
          boilTime: body.boilTime || 60,
          og: body.targetOG || null,
          fg: body.targetFG || null,
          abv: body.targetABV || null,
          ibu: body.ibu || null,
          color: body.srm || null,
          notes: body.notes || null,
          process: body.process || null, // Save brewing process
          isActive: true,
        },
      })

      // 2. Create ingredients if provided
      if (body.ingredients && body.ingredients.length > 0) {
        await tx.recipeIngredient.createMany({
          data: body.ingredients.map((ing: any) => ({
            recipeId: newRecipe.id,
            name: ing.name,
            category: mapTypeToCategory(ing.type || 'adjunct') as any,
            amount: ing.amount,
            unit: ing.unit || 'kg',
            additionTime: ing.addTime ? parseInt(String(ing.addTime).replace(/[^0-9]/g, '')) : null,
            inventoryItemId: ing.inventoryItemId || null,
            // specs: ing.specs || null, // TODO: Add specs field to schema
          })),
        })
      }

      // 3. Return recipe with ingredients
      return tx.recipe.findUnique({
        where: { id: newRecipe.id },
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

    console.log('[POST /api/recipes] Created:', recipe?.id)

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

    return NextResponse.json(transformedRecipe, { status: 201 })
  } catch (error) {
    console.error('[POST /api/recipes] Error:', error)
    console.error('[POST /api/recipes] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { 
        message: 'Failed to create recipe', 
        error: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    )
  }
})

