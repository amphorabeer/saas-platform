import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const zones = await prisma.restaurantZone.findMany({
      where: { restaurantId: session.restaurantId },
      include: { _count: { select: { tables: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json(zones);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const { name, color, sortOrder, isActive } = body;
    if (!name?.trim()) {
      return NextResponse.json({ error: 'სახელი აუცილებელია' }, { status: 400 });
    }
    const zone = await prisma.restaurantZone.create({
      data: {
        restaurantId: session.restaurantId,
        name: name.trim(),
        color: color?.trim() || null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: isActive !== false,
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
