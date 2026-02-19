import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get('categoryId') || undefined;
    const search = searchParams.get('search')?.trim() || undefined;
    const isActive = searchParams.get('isActive');
    const isFavorite = searchParams.get('isFavorite');

    const where: { restaurantId: string; categoryId?: string; name?: { contains: string; mode: 'insensitive' }; isActive?: boolean; isFavorite?: boolean } = {
      restaurantId: session.restaurantId,
      isActive: true, // default: only active items (soft-deleted are hidden)
    };
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (isActive === 'true') where.isActive = true;
    if (isActive === 'false') where.isActive = false;
    if (isFavorite === 'true') where.isFavorite = true;

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true } },
        modifierGroups: { include: { modifierGroup: { select: { id: true, name: true } } } },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const serialized = items.map((item) => ({
      ...item,
      price: Number(item.price),
      modifierGroups: item.modifierGroups.map((mg) => ({
        id: mg.id,
        modifierGroupId: mg.modifierGroupId,
        sortOrder: mg.sortOrder,
        modifierGroup: mg.modifierGroup,
      })),
    }));
    return NextResponse.json(serialized);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      name,
      nameEn,
      description,
      descriptionEn,
      categoryId,
      price,
      imageUrl,
      preparationTime,
      calories,
      allergens,
      kdsStation,
      isActive,
      isFavorite,
      modifierGroupIds,
    } = body;

    if (!name?.trim() || !categoryId) {
      return NextResponse.json(
        { error: 'სახელი და კატეგორია აუცილებელია' },
        { status: 400 }
      );
    }
    if (typeof price !== 'number' && typeof price !== 'string') {
      return NextResponse.json({ error: 'ფასი აუცილებელია' }, { status: 400 });
    }

    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    const allergenList = Array.isArray(allergens) ? allergens : [];

    const item = await prisma.menuItem.create({
      data: {
        restaurantId: session.restaurantId,
        categoryId,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        description: description?.trim() || null,
        descriptionEn: descriptionEn?.trim() || null,
        price: new Decimal(priceNum),
        imageUrl: imageUrl?.trim() || null,
        preparationTime: preparationTime != null ? Number(preparationTime) : null,
        calories: calories != null ? Number(calories) : null,
        allergens: allergenList,
        kdsStation: kdsStation || 'HOT',
        isActive: isActive !== false,
        isFavorite: isFavorite === true,
        sortOrder: 0,
      },
    });

    if (Array.isArray(modifierGroupIds) && modifierGroupIds.length > 0) {
      await prisma.menuItemModifierGroup.createMany({
        data: modifierGroupIds.map((gid: string, i: number) => ({
          menuItemId: item.id,
          modifierGroupId: gid,
          sortOrder: i,
        })),
        skipDuplicates: true,
      });
    }

    const created = await prisma.menuItem.findUnique({
      where: { id: item.id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        modifierGroups: { include: { modifierGroup: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json({
      ...created,
      price: Number(created!.price),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
