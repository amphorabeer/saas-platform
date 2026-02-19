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
    const { name, color, sortOrder, isActive } = body;

    const existing = await prisma.restaurantZone.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ზონა ვერ მოიძებნა' }, { status: 404 });
    }

    const zone = await prisma.restaurantZone.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name?.trim() || existing.name }),
        ...(color !== undefined && { color: color?.trim() || null }),
        ...(typeof sortOrder === 'number' && { sortOrder }),
        ...(typeof isActive === 'boolean' && { isActive }),
      },
    });
    return NextResponse.json(zone);
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

    const existing = await prisma.restaurantZone.findFirst({
      where: { id, restaurantId: session.restaurantId },
      include: { _count: { select: { tables: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: 'ზონა ვერ მოიძებნა' }, { status: 404 });
    }
    if (existing._count.tables > 0) {
      return NextResponse.json(
        { error: 'ზონაში მაგიდებია. ჯერ წაშალეთ ან გადაიტანეთ მაგიდები.' },
        { status: 400 }
      );
    }

    await prisma.restaurantZone.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
