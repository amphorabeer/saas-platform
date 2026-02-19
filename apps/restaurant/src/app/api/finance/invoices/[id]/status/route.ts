import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** PATCH — update invoice status (SENT or CANCELLED) */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status?: string };

    if (!status || !['SENT', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'status must be SENT or CANCELLED' },
        { status: 400 }
      );
    }

    const inv = await prisma.restaurantInvoice.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!inv) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    if (inv.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot change status of paid invoice' },
        { status: 400 }
      );
    }

    await prisma.restaurantInvoice.update({
      where: { id },
      data: { status },
    });

    const updated = await prisma.restaurantInvoice.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    return NextResponse.json(updated);
  } catch (e: unknown) {
    console.error('[finance invoices status PATCH]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
