import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PUT /api/waiters/[id]/pin — set PIN (body: { pin: string }) */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const pin = String(body.pin ?? '').replace(/\D/g, '').slice(0, 6);

    if (pin.length !== 6) {
      return NextResponse.json(
        { error: 'PIN უნდა იყოს 6 ციფრი' },
        { status: 400 }
      );
    }

    const employee = await prisma.restaurantEmployee.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!employee) {
      return NextResponse.json({ error: 'თანამშრომელი ვერ მოიძებნა' }, { status: 404 });
    }

    const existing = await prisma.restaurantEmployee.findFirst({
      where: { restaurantId: session.restaurantId, pin: pin, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'ამ PIN-ით უკვე რეგისტრირებულია სხვა თანამშრომელი' },
        { status: 400 }
      );
    }

    await prisma.restaurantEmployee.update({
      where: { id },
      data: { pin },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}

/** POST /api/waiters/[id]/pin — generate random 6-digit PIN, ensure unique in restaurant */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const employee = await prisma.restaurantEmployee.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!employee) {
      return NextResponse.json({ error: 'თანამშრომელი ვერ მოიძებნა' }, { status: 404 });
    }

    const usedPins = await prisma.restaurantEmployee.findMany({
      where: { restaurantId: session.restaurantId, pin: { not: null } },
      select: { pin: true },
    });
    const usedSet = new Set(usedPins.map((e) => e.pin).filter(Boolean));

    let pin: string;
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
    } while (usedSet.has(pin));

    await prisma.restaurantEmployee.update({
      where: { id },
      data: { pin },
    });
    return NextResponse.json({ pin });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
