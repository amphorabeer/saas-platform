import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/inventory/recipes — all with menuItem, ingredients, food cost */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);

    const recipes = await prisma.recipe.findMany({
      where: { restaurantId: session.restaurantId },
      include: {
        menuItem: {
          select: {
            id: true,
            name: true,
            price: true,
            category: { select: { id: true, name: true } },
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
                costPerUnit: true,
              },
            },
          },
        },
      },
      orderBy: { menuItem: { name: 'asc' } },
    });

    const list = recipes.map((r) => {
      const yieldVal = Number(r.yield) || 1;
      let totalCost = 0;
      for (const ri of r.ingredients) {
        const cost = (ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : 0) * Number(ri.quantity);
        totalCost += cost;
      }
      const costPerPortion = totalCost / yieldVal;
      const price = r.menuItem?.price != null ? Number(r.menuItem.price) : 0;
      const foodCostPercent = price > 0 ? (costPerPortion / price) * 100 : 0;

      return {
        id: r.id,
        menuItemId: r.menuItemId,
        restaurantId: r.restaurantId,
        yield: Number(r.yield),
        notes: r.notes,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        menuItem: r.menuItem
          ? {
              id: r.menuItem.id,
              name: r.menuItem.name,
              price: Number(r.menuItem.price),
              category: r.menuItem.category,
            }
          : null,
        ingredientsCount: r.ingredients.length,
        foodCost: Math.round(costPerPortion * 100) / 100,
        foodCostPercent: Math.round(foodCostPercent * 10) / 10,
        totalCost: Math.round(totalCost * 100) / 100,
        ingredients: r.ingredients.map((ri) => ({
          id: ri.id,
          ingredientId: ri.ingredient.id,
          ingredientName: ri.ingredient.name,
          unit: ri.ingredient.unit,
          quantity: Number(ri.quantity),
          costPerUnit: ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : null,
          cost: (ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : 0) * Number(ri.quantity),
        })),
      };
    });

    return NextResponse.json(list);
  } catch (e: unknown) {
    console.error('[inventory recipes GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/inventory/recipes — create recipe */
export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const { menuItemId, yield: recipeYield, notes, ingredients } = body;

    if (!menuItemId) {
      return NextResponse.json({ error: 'menuItemId აუცილებელია' }, { status: 400 });
    }

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: menuItemId, restaurantId: session.restaurantId },
    });
    if (!menuItem) {
      return NextResponse.json({ error: 'კერძი ვერ მოიძებნა' }, { status: 404 });
    }

    const existingRecipe = await prisma.recipe.findUnique({
      where: { menuItemId },
    });
    if (existingRecipe) {
      return NextResponse.json(
        { error: 'ამ კერძს უკვე აქვს რეცეპტი' },
        { status: 400 }
      );
    }

    // Ensure numeric types for Prisma (bind parameter / Decimal)
    const yieldNum = Math.max(0.001, Number(recipeYield) || 1);
    const notesStr = typeof notes === 'string' ? notes.trim() || null : null;

    const ingredientsNormalized = Array.isArray(ingredients)
      ? ingredients
          .filter(
            (x: { ingredientId?: string; inventoryItemId?: string; quantity?: unknown }) =>
              (x.ingredientId ?? x.inventoryItemId) && Number(x.quantity) > 0
          )
          .map(
            (ing: {
              ingredientId?: string;
              inventoryItemId?: string;
              quantity?: unknown;
              unit?: string;
              costPerUnit?: unknown;
            }) => ({
              ingredientId: String(ing.ingredientId ?? ing.inventoryItemId ?? ''),
              quantity: Number(ing.quantity) || 0,
            })
          )
          .filter((ing) => ing.ingredientId)
      : [];

    const recipe = await prisma.recipe.create({
      data: {
        restaurantId: session.restaurantId,
        menuItemId,
        yield: String(yieldNum),
        notes: notesStr ?? undefined,
        ingredients: {
          create: ingredientsNormalized.map((ing) => ({
            ingredientId: ing.ingredientId,
            quantity: String(ing.quantity),
          })),
        },
      },
      include: {
        menuItem: { select: { id: true, name: true, price: true, category: { select: { name: true } } } },
        ingredients: { include: { ingredient: { select: { name: true, unit: true, costPerUnit: true } } } },
      },
    });

    let totalCost = 0;
    for (const ri of recipe.ingredients) {
      totalCost += (ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : 0) * Number(ri.quantity);
    }
    const costPerPortion = totalCost / yieldNum;
    const price = Number(recipe.menuItem.price);
    const foodCostPercent = price > 0 ? (costPerPortion / price) * 100 : 0;

    return NextResponse.json({
      ...recipe,
      yield: Number(recipe.yield),
      foodCost: Math.round(costPerPortion * 100) / 100,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      ingredients: recipe.ingredients.map((ri) => ({
        id: ri.id,
        ingredientId: ri.ingredientId,
        ingredientName: ri.ingredient.name,
        unit: ri.ingredient.unit,
        quantity: Number(ri.quantity),
        costPerUnit: ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : null,
      })),
    });
  } catch (e: unknown) {
    console.error('[inventory recipes POST]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
