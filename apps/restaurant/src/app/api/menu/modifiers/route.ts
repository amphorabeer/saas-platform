import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const groups = await prisma.menuModifierGroup.findMany({
      where: { restaurantId: session.restaurantId },
      include: {
        modifiers: { orderBy: { sortOrder: 'asc' } },
      },
      orderBy: { sortOrder: 'asc' },
    });
    const serialized = groups.map((g) => ({
      ...g,
      modifiers: g.modifiers.map((m) => ({
        ...m,
        priceAdjustment: Number(m.priceAdjustment),
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
    const { name, nameEn, isRequired, minSelect, maxSelect, sortOrder, modifiers } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'ჯგუფის სახელი აუცილებელია' }, { status: 400 });
    }

    const group = await prisma.menuModifierGroup.create({
      data: {
        restaurantId: session.restaurantId,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        isRequired: isRequired === true,
        minSelect: typeof minSelect === 'number' ? minSelect : 0,
        maxSelect: typeof maxSelect === 'number' ? maxSelect : 1,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
      },
    });

    const modifierList = Array.isArray(modifiers) ? modifiers : [];
    for (let i = 0; i < modifierList.length; i++) {
      const m = modifierList[i];
      const adj = typeof m.priceAdjustment === 'number' ? m.priceAdjustment : parseFloat(m.priceAdjustment) || 0;
      await prisma.menuModifier.create({
        data: {
          groupId: group.id,
          name: m.name?.trim() || `Modifier ${i + 1}`,
          nameEn: m.nameEn?.trim() || null,
          priceAdjustment: adj,
          isDefault: m.isDefault === true,
          isActive: m.isActive !== false,
          sortOrder: i,
        },
      });
    }

    const created = await prisma.menuModifierGroup.findUnique({
      where: { id: group.id },
      include: { modifiers: { orderBy: { sortOrder: 'asc' } } },
    });
    return NextResponse.json({
      ...created,
      modifiers: created!.modifiers.map((m) => ({
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
