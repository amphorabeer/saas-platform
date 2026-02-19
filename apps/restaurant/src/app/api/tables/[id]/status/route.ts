import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

const VALID_STATUS = ['FREE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BILLING'] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { status } = body;

    if (!status || !VALID_STATUS.includes(status)) {
      return NextResponse.json({ error: 'არასწორი სტატუსი' }, { status: 400 });
    }

    const existing = await prisma.restaurantTable.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
    }

    const table = await prisma.restaurantTable.update({
      where: { id },
      data: { status },
      include: {
        zone: { select: { id: true, name: true, color: true } },
      },
    });
    return NextResponse.json(table);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
