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
    const { name, nameEn, description, price, isActive, validFrom, validTo, items } = body;

    const existing = await prisma.comboSet.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'კომბო ვერ მოიძებნა' }, { status: 404 });
    }

    const updateData: Parameters<typeof prisma.comboSet.update>[0]['data'] = {};
    if (name !== undefined) updateData.name = name?.trim() || existing.name;
    if (nameEn !== undefined) updateData.nameEn = nameEn?.trim() || null;
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (price !== undefined) updateData.price = new Decimal(typeof price === 'number' ? price : parseFloat(price));
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (validFrom !== undefined) updateData.validFrom = validFrom ? new Date(validFrom) : null;
    if (validTo !== undefined) updateData.validTo = validTo ? new Date(validTo) : null;

    await prisma.comboSet.update({ where: { id }, data: updateData });

    if (items !== undefined && Array.isArray(items)) {
      await prisma.comboSetItem.deleteMany({ where: { comboSetId: id } });
      for (const it of items) {
        const menuItemId = it.menuItemId || it.menuItem?.id;
        const qty = typeof it.quantity === 'number' ? it.quantity : 1;
        if (menuItemId) {
          await prisma.comboSetItem.create({
            data: { comboSetId: id, menuItemId, quantity: qty },
          });
        }
      }
    }

    const updated = await prisma.comboSet.findUnique({
      where: { id },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, nameEn: true } } } },
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

    const existing = await prisma.comboSet.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'კომბო ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.comboSet.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
