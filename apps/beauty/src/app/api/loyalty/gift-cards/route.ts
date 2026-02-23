import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/loyalty/gift-cards
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();

    if (!body.balance || body.balance <= 0) {
      return NextResponse.json({ message: 'თანხა სავალდებულოა' }, { status: 400 });
    }

    const giftCard = await prisma.giftCard.create({
      data: {
        salonId: session.user.salonId,
        code: body.code || `GC-${Date.now()}`,
        initialBalance: Number(body.balance),
        balance: Number(body.balance),
        clientId: body.clientId || null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: true,
      },
    });

    return NextResponse.json(giftCard, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/loyalty/gift-cards error:', error?.message || error);
    if (error?.code === 'P2002') {
      return NextResponse.json({ message: 'ეს კოდი უკვე არსებობს' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
