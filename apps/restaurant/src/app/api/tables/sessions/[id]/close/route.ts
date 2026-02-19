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

    const existing = await prisma.tableSession.findFirst({
      where: { id },
      include: { table: true },
    });
    if (!existing || existing.table.restaurantId !== session.restaurantId) {
      return NextResponse.json({ error: 'სესია ვერ მოიძებნა' }, { status: 404 });
    }
    if (!existing.isActive) {
      return NextResponse.json({ error: 'სესია უკვე დახურულია' }, { status: 400 });
    }

    const now = new Date();
    await prisma.tableSession.update({
      where: { id },
      data: { endedAt: now, isActive: false },
    });

    await prisma.restaurantTable.update({
      where: { id: existing.tableId },
      data: { status: 'CLEANING' },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
