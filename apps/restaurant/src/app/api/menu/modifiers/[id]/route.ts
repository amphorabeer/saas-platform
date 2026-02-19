import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { name, nameEn, isRequired, minSelect, maxSelect, sortOrder, modifiers } = body;

    const existing = await prisma.menuModifierGroup.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { modifiers: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ჯგუფი ვერ მოიძებნა' }, { status: 404 });
    }

    const updateData: Parameters<typeof prisma.menuModifierGroup.update>[0]['data'] = {};
    if (name !== undefined) updateData.name = name?.trim() || existing.name;
    if (nameEn !== undefined) updateData.nameEn = nameEn?.trim() || null;
    if (typeof isRequired === 'boolean') updateData.isRequired = isRequired;
    if (typeof minSelect === 'number') updateData.minSelect = minSelect;
    if (typeof maxSelect === 'number') updateData.maxSelect = maxSelect;
    if (typeof sortOrder === 'number') updateData.sortOrder = sortOrder;

    await prisma.menuModifierGroup.update({ where: { id }, data: updateData });

    if (modifiers !== undefined && Array.isArray(modifiers)) {
      const existingIds = new Set(existing.modifiers.map((m) => m.id));
      const incomingIds = new Set(modifiers.filter((m: { id?: string }) => m.id).map((m: { id: string }) => m.id));

      for (const mid of existingIds) {
        if (!incomingIds.has(mid)) {
          await prisma.menuModifier.delete({ where: { id: mid } }).catch(() => {});
        }
      }

      for (let i = 0; i < modifiers.length; i++) {
        const m = modifiers[i];
        const adj = typeof m.priceAdjustment === 'number' ? m.priceAdjustment : parseFloat(m.priceAdjustment) || 0;
        if (m.id && existingIds.has(m.id)) {
          await prisma.menuModifier.update({
            where: { id: m.id },
            data: {
              name: m.name?.trim() || '',
              nameEn: m.nameEn?.trim() || null,
              priceAdjustment: adj,
              isDefault: m.isDefault === true,
              isActive: m.isActive !== false,
              sortOrder: i,
            },
          });
        } else {
          await prisma.menuModifier.create({
            data: {
              groupId: id,
              name: m.name?.trim() || `Modifier ${i + 1}`,
              nameEn: m.nameEn?.trim() || null,
              priceAdjustment: adj,
              isDefault: m.isDefault === true,
              isActive: m.isActive !== false,
              sortOrder: i,
            },
          });
        }
      }
    }

    const updated = await prisma.menuModifierGroup.findUnique({
      where: { id },
      include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
    });
    return NextResponse.json({
      ...updated,
      modifiers: updated!.modifiers.map((m) => ({
        ...m,
        priceAdjustment: Number(m.priceAdjustment),
      })),
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

    const existing = await prisma.menuModifierGroup.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ჯგუფი ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.menuModifierGroup.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
