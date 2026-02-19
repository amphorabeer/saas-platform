import { NextRequest, NextResponse } from 'next/server';
import type { TableStatus } from '#prisma';
import { prisma } from '@/lib/prisma';
import {
  getRestaurantSessionFromRequest,
  requireRestaurantSessionFromRequest,
} from '@/lib/session';

const TABLE_STATUS_VALUES: TableStatus[] = ['FREE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BILLING'];

export async function GET(req: NextRequest) {
  try {
    console.log('TABLES GET - cookies:', req.cookies.getAll().map((c) => c.name));
    const sessionDebug = await getRestaurantSessionFromRequest(req);
    console.log('TABLES GET - session:', sessionDebug ? JSON.stringify(sessionDebug) : 'null');
    const session = await requireRestaurantSessionFromRequest(req);
    const { searchParams } = new URL(req.url);
    const zoneId = searchParams.get('zoneId') || undefined;
    const statusParam = searchParams.get('status') || undefined;
    const status = statusParam && TABLE_STATUS_VALUES.includes(statusParam as TableStatus)
      ? (statusParam as TableStatus)
      : undefined;

    const where = {
      restaurantId: session.restaurantId,
      ...(zoneId && { zoneId }),
      ...(status && { status }),
    };

    // Today's date range for reservations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tables = await prisma.restaurantTable.findMany({
      where,
      include: {
        zone: { select: { id: true, name: true, color: true } },
        sessions: {
          where: { isActive: true },
          take: 1,
          orderBy: { startedAt: 'desc' },
          include: {
            waiter: { select: { id: true, firstName: true, lastName: true } },
            orders: {
              select: { totalAmount: true },
            },
          },
        },
        reservations: {
          where: {
            date: { gte: todayStart, lte: todayEnd },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
          select: {
            id: true,
            guestName: true,
            guestCount: true,
            time: true,
            duration: true,
            status: true,
          },
          orderBy: { time: 'asc' },
        },
      },
      orderBy: [{ zone: { sortOrder: 'asc' } }, { number: 'asc' }],
    });

    const serialized = tables.map((t) => ({
      ...t,
      activeSession: t.sessions[0]
        ? {
            ...t.sessions[0],
            waiterName:
              t.sessions[0].waiter &&
              `${t.sessions[0].waiter.firstName} ${t.sessions[0].waiter.lastName}`.trim(),
            totalAmount: t.sessions[0].orders?.reduce(
              (sum, o) => sum + Number(o.totalAmount),
              0
            ) ?? 0,
          }
        : null,
      reservations: t.reservations.map((r) => ({
        id: r.id,
        guestName: r.guestName,
        guestCount: r.guestCount,
        time: r.time,
        duration: r.duration,
        status: r.status,
      })),
      sessions: undefined,
    }));
    return NextResponse.json(serialized);
  } catch (err) {
    console.error('TABLES GET ERROR:', err);
    if (err instanceof Error && (err.message.includes('Unauthorized') || err.message.includes('session'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const body = await req.json();
    const {
      number,
      label,
      zoneId,
      seats,
      shape,
      width,
      height,
      rotation,
      status,
      isActive,
      posX,
      posY,
    } = body;

    if (!number?.trim() || !zoneId) {
      return NextResponse.json(
        { error: 'ნომერი და ზონა აუცილებელია' },
        { status: 400 }
      );
    }

    const table = await prisma.restaurantTable.create({
      data: {
        restaurantId: session.restaurantId,
        zoneId,
        number: number.trim(),
        label: label?.trim() || null,
        seats: Math.min(20, Math.max(1, Number(seats) || 4)),
        shape: shape || 'SQUARE',
        width: Math.max(50, Number(width) || 100),
        height: Math.max(50, Number(height) || 80),
        rotation: Number(rotation) || 0,
        posX: Number(posX) || 0,
        posY: Number(posY) || 0,
        status: status || 'FREE',
        isActive: isActive !== false,
      },
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