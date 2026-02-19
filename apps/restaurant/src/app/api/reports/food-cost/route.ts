import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/reports/food-cost — food cost analysis. Query: dateFrom, dateTo */
export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    const where: { restaurantId: string; status: string; createdAt?: { gte?: Date; lte?: Date } } = {
      restaurantId: session.restaurantId,
      status: 'PAID',
    };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }

    const orders = await prisma.restaurantOrder.findMany({
      where,
      include: {
        items: { include: { menuItem: { include: { recipe: { include: { ingredients: { include: { ingredient: true } } } }, category: { select: { name: true } } } } } },
      },
    });

    const itemStats = new Map<
      string,
      { name: string; categoryName: string; quantity: number; revenue: number; foodCostTotal: number }
    >();

    let totalRevenue = 0;
    let totalFoodCost = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const qty = Number(item.quantity);
        const revenue = Number(item.totalPrice);
        totalRevenue += revenue;

        const menuItem = item.menuItem;
        const recipe = menuItem?.recipe;
        let costPerUnit = 0;
        if (recipe && recipe.ingredients.length > 0) {
          const yieldVal = Number(recipe.yield) || 1;
          let recipeCost = 0;
          for (const ri of recipe.ingredients) {
            const ing = ri.ingredient;
            const unitCost = ing.costPerUnit != null ? Number(ing.costPerUnit) : 0;
            recipeCost += unitCost * Number(ri.quantity);
          }
          costPerUnit = recipeCost / yieldVal;
        }

        const foodCostTotal = costPerUnit * qty;
        totalFoodCost += foodCostTotal;

        const key = item.menuItemId;
        if (!itemStats.has(key)) {
          itemStats.set(key, {
            name: item.menuItemName,
            categoryName: menuItem?.category?.name ?? '—',
            quantity: 0,
            revenue: 0,
            foodCostTotal: 0,
          });
        }
        const row = itemStats.get(key)!;
        row.quantity += qty;
        row.revenue += revenue;
        row.foodCostTotal += foodCostTotal;
      }
    }

    const items = [...itemStats.values()].map((row) => {
      const costPerUnit = row.quantity > 0 ? row.foodCostTotal / row.quantity : 0;
      const price = row.quantity > 0 ? row.revenue / row.quantity : 0;
      const foodCostPercent = price > 0 ? (costPerUnit / price) * 100 : 0;
      const profit = row.revenue - row.foodCostTotal;
      return {
        name: row.name,
        categoryName: row.categoryName,
        quantitySold: row.quantity,
        revenue: Math.round(row.revenue * 100) / 100,
        foodCostPerUnit: Math.round(costPerUnit * 100) / 100,
        foodCostTotal: Math.round(row.foodCostTotal * 100) / 100,
        foodCostPercent: Math.round(foodCostPercent * 10) / 10,
        profit: Math.round(profit * 100) / 100,
      };
    });

    const overallFoodCostPercent = totalRevenue > 0 ? (totalFoodCost / totalRevenue) * 100 : 0;

    return NextResponse.json({
      items,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalFoodCost: Math.round(totalFoodCost * 100) / 100,
      overallFoodCostPercent: Math.round(overallFoodCostPercent * 10) / 10,
    });
  } catch (e: unknown) {
    console.error('[food-cost GET]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
