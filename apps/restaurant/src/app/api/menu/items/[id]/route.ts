import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
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

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'კერძი ვერ მოიძებნა' }, { status: 404 });
    }

    const updateData: Parameters<typeof prisma.menuItem.update>[0]['data'] = {};
    if (name !== undefined) updateData.name = name?.trim() || existing.name;
    if (nameEn !== undefined) updateData.nameEn = nameEn?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (descriptionEn !== undefined) updateData.descriptionEn = descriptionEn?.trim() || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (price !== undefined) updateData.price = new Decimal(typeof price === 'string' ? parseFloat(price) : price);
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim() || null;
    if (preparationTime !== undefined) updateData.preparationTime = preparationTime != null ? Number(preparationTime) : null;
    if (calories !== undefined) updateData.calories = calories != null ? Number(calories) : null;
    if (Array.isArray(allergens)) updateData.allergens = allergens;
    if (kdsStation !== undefined) updateData.kdsStation = kdsStation;
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isFavorite === 'boolean') updateData.isFavorite = isFavorite;

    await prisma.menuItem.update({ where: { id }, data: updateData });

    if (modifierGroupIds !== undefined) {
      await prisma.menuItemModifierGroup.deleteMany({ where: { menuItemId: id } });
      if (Array.isArray(modifierGroupIds) && modifierGroupIds.length > 0) {
        await prisma.menuItemModifierGroup.createMany({
          data: modifierGroupIds.map((gid: string, i: number) => ({
            menuItemId: id,
            modifierGroupId: gid,
            sortOrder: i,
          })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, icon: true } },
        modifierGroups: { include: { modifierGroup: { select: { id: true, name: true } } } },
      },
    });
    return NextResponse.json({
      ...updated,
      price: Number(updated!.price),
    });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const existing = await prisma.menuItem.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'კერძი ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.menuItem.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
