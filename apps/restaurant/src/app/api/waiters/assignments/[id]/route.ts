import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRestaurantSessionFromRequest } from '@/lib/session';

/** DELETE /api/waiters/assignments/[id] — unassign */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRestaurantSessionFromRequest(req);
    const { id } = await params;

    const assignment = await prisma.waiterAssignment.findFirst({
      where: { id, restaurantId: session.restaurantId },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'მინიჭება ვერ მოიძებნა' }, { status: 404 });
    }

    await prisma.waiterAssignment.update({
      where: { id },
      data: { isActive: false, unassignedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unauthorized' },
      { status: 401 }
    );
  }
}
