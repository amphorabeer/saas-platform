import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';
import { Decimal } from '@prisma/client/runtime/library';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const combos = await prisma.comboSet.findMany({
      where: { restaurantId: session.restaurantId },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, nameEn: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const serialized = combos.map((c) => ({
      ...c,
      price: Number(c.price),
      items: c.items.map((i) => ({
        ...i,
        menuItem: i.menuItem,
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
    const { name, nameEn, description, price, isActive, validFrom, validTo, items } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'სახელი აუცილებელია' }, { status: 400 });
    }
    const priceNum = typeof price === 'number' ? price : parseFloat(price);
    if (Number.isNaN(priceNum)) {
      return NextResponse.json({ error: 'ფასი აუცილებელია' }, { status: 400 });
    }

    const combo = await prisma.comboSet.create({
      data: {
        restaurantId: session.restaurantId,
        name: name.trim(),
        nameEn: nameEn?.trim() || null,
        description: description?.trim() || null,
        price: new Decimal(priceNum),
        isActive: isActive !== false,
        validFrom: validFrom ? new Date(validFrom) : null,
        validTo: validTo ? new Date(validTo) : null,
      },
    });

    const itemList = Array.isArray(items) ? items : [];
    for (const it of itemList) {
      const menuItemId = it.menuItemId || it.menuItem?.id;
      const qty = typeof it.quantity === 'number' ? it.quantity : 1;
      if (menuItemId) {
        await prisma.comboSetItem.create({
          data: { comboSetId: combo.id, menuItemId, quantity: qty },
        });
      }
    }

    const created = await prisma.comboSet.findUnique({
      where: { id: combo.id },
      include: {
        items: { include: { menuItem: { select: { id: true, name: true, nameEn: true } } } },
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
