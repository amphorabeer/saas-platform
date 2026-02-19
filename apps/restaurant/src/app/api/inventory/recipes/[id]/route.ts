import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

/** GET /api/inventory/recipes/[id] */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const recipe = await prisma.recipe.findFirst({
      where: { id, restaurantId: session.restaurantId },
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
    });

    if (!recipe) {
      return NextResponse.json({ error: 'რეცეპტი ვერ მოიძებნა' }, { status: 404 });
    }

    const yieldVal = Number(recipe.yield) || 1;
    let totalCost = 0;
    for (const ri of recipe.ingredients) {
      totalCost += (ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : 0) * Number(ri.quantity);
    }
    const costPerPortion = totalCost / yieldVal;
    const price = recipe.menuItem?.price != null ? Number(recipe.menuItem.price) : 0;
    const foodCostPercent = price > 0 ? (costPerPortion / price) * 100 : 0;

    return NextResponse.json({
      ...recipe,
      yield: Number(recipe.yield),
      foodCost: Math.round(costPerPortion * 100) / 100,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      menuItem: recipe.menuItem
        ? { ...recipe.menuItem, price: Number(recipe.menuItem.price) }
        : null,
      ingredients: recipe.ingredients.map((ri) => ({
        id: ri.id,
        ingredientId: ri.ingredientId,
        ingredientName: ri.ingredient.name,
        unit: ri.ingredient.unit,
        quantity: Number(ri.quantity),
        costPerUnit: ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : null,
        cost: (ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : 0) * Number(ri.quantity),
      })),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** PUT /api/inventory/recipes/[id] — update recipe + sync ingredients */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { yield: yieldVal, notes, ingredients: ingredientsPayload } = body;

    const existing = await prisma.recipe.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { ingredients: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'რეცეპტი ვერ მოიძებნა' }, { status: 404 });
    }

    const yieldNum = yieldVal != null ? Math.max(0.001, Number(yieldVal)) : Number(existing.yield);
    const ingredients = Array.isArray(ingredientsPayload)
      ? ingredientsPayload.filter(
          (x: { ingredientId?: string; quantity?: number }) =>
            x.ingredientId && Number(x.quantity) > 0
        )
      : [];

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        yield: new Decimal(yieldNum),
        notes: notes !== undefined ? (notes?.trim() || null) : existing.notes,
        ingredients: {
          create: ingredients.map((x: { ingredientId: string; quantity: number }) => ({
            ingredientId: x.ingredientId,
            quantity: new Decimal(Number(x.quantity)),
          })),
        },
      },
      include: {
        menuItem: { select: { id: true, name: true, price: true, category: { select: { name: true } } } },
        ingredients: { include: { ingredient: { select: { name: true, unit: true, costPerUnit: true } } } },
      },
    });

    let totalCost = 0;
    for (const ri of updated.ingredients) {
      totalCost += (ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : 0) * Number(ri.quantity);
    }
    const costPerPortion = totalCost / yieldNum;
    const price = Number(updated.menuItem.price);
    const foodCostPercent = price > 0 ? (costPerPortion / price) * 100 : 0;

    return NextResponse.json({
      ...updated,
      yield: Number(updated.yield),
      foodCost: Math.round(costPerPortion * 100) / 100,
      foodCostPercent: Math.round(foodCostPercent * 10) / 10,
      ingredients: updated.ingredients.map((ri) => ({
        id: ri.id,
        ingredientId: ri.ingredientId,
        ingredientName: ri.ingredient.name,
        unit: ri.ingredient.unit,
        quantity: Number(ri.quantity),
        costPerUnit: ri.ingredient.costPerUnit != null ? Number(ri.ingredient.costPerUnit) : null,
      })),
    });
  } catch (e: unknown) {
    console.error('[inventory recipes PUT]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

/** DELETE /api/inventory/recipes/[id] */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.recipe.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'რეცეპტი ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.recipe.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
