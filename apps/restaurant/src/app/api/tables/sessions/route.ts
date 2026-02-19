import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

export async function GET(req: NextRequest) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get('tableId') || undefined;

    const where: { table: { restaurantId: string }; isActive: boolean; tableId?: string } = {
      table: { restaurantId: session.restaurantId },
      isActive: true,
    };
    if (tableId) where.tableId = tableId;

    const sessions = await prisma.tableSession.findMany({
      where,
      include: {
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { startedAt: 'desc' },
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const { tableId, guestCount, waiterId } = body;

    if (!tableId) {
      return NextResponse.json({ error: 'მაგიდა აუცილებელია' }, { status: 400 });
    }

    const table = await prisma.restaurantTable.findFirst({
      where: { id: tableId, restaurantId: session.restaurantId },
    });
    if (!table) {
      return NextResponse.json({ error: 'მაგიდა ვერ მოიძებნა' }, { status: 404 });
    }
    if (table.status !== 'FREE') {
      return NextResponse.json(
        { error: 'მაგიდა არ არის თავისუფალი' },
        { status: 400 }
      );
    }

    const activeSession = await prisma.tableSession.findFirst({
      where: { tableId, isActive: true },
    });
    if (activeSession) {
      return NextResponse.json(
        { error: 'ამ მაგიდაზე უკვე აქტიური სესიაა' },
        { status: 400 }
      );
    }

    const newSession = await prisma.tableSession.create({
      data: {
        tableId,
        waiterId: waiterId || null,
        guestCount: Math.max(0, Number(guestCount) || 0),
        isActive: true,
      },
    });

    await prisma.restaurantTable.update({
      where: { id: tableId },
      data: { status: 'OCCUPIED' },
    });

    const sessionWithDetails = await prisma.tableSession.findUnique({
      where: { id: newSession.id },
      include: {
        table: { select: { id: true, number: true, zone: { select: { name: true } } } },
        waiter: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    return NextResponse.json(sessionWithDetails);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
