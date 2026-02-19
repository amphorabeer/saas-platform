import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRestaurantSessionFromRequest } from '@/lib/session';

/** GET /api/pos/menu — categories + items + modifier groups (single optimized query, active only) */
export async function GET(req: NextRequest) {
  try {
    const session = await getRestaurantSessionFromRequest(req);
    if (!session?.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'MISSING_RESTAURANT_ID' },
        { status: 401 }
      );
    }

    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId: session.restaurantId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        items: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            modifierGroups: {
              orderBy: { sortOrder: 'asc' },
              include: {
                modifierGroup: {
                  include: {
                    modifiers: {
                      where: { isActive: true },
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const serialized = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      nameEn: cat.nameEn,
      icon: cat.icon,
      color: cat.color,
      sortOrder: cat.sortOrder,
      items: cat.items.map((item) => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        description: item.description,
        price: Number(item.price),
        imageUrl: item.imageUrl,
        preparationTime: item.preparationTime,
        kdsStation: item.kdsStation,
        isFavorite: item.isFavorite,
        sortOrder: item.sortOrder,
        modifierGroups: item.modifierGroups.map((mg) => ({
          id: mg.modifierGroup.id,
          name: mg.modifierGroup.name,
          nameEn: mg.modifierGroup.nameEn,
          isRequired: mg.modifierGroup.isRequired,
          minSelect: mg.modifierGroup.minSelect,
          maxSelect: mg.modifierGroup.maxSelect,
          sortOrder: mg.sortOrder,
          modifiers: mg.modifierGroup.modifiers.map((m) => ({
            id: m.id,
            name: m.name,
            nameEn: m.nameEn,
            priceAdjustment: Number(m.priceAdjustment),
            isDefault: m.isDefault,
            sortOrder: m.sortOrder,
          })),
        })),
      })),
    }));

    return NextResponse.json(serialized);
  } catch (e: unknown) {
    console.error('[POS menu]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
