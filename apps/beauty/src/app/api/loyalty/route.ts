import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/loyalty — add/redeem points
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, points, type, description } = body;

    if (!clientId || !points || points <= 0) {
      return NextResponse.json({ message: 'clientId და points სავალდებულოა' }, { status: 400 });
    }

    const client = await prisma.client.findFirst({
      where: { id: clientId, salonId: session.user.salonId },
    });
    if (!client) return NextResponse.json({ message: 'კლიენტი ვერ მოიძებნა' }, { status: 404 });

    if (type === 'REDEEM' && points > client.loyaltyPoints) {
      return NextResponse.json({ message: `არასაკმარისი ქულა (${client.loyaltyPoints})` }, { status: 400 });
    }

    const isDeduction = type === 'REDEEM' || type === 'EXPIRED';
    const pointChange = isDeduction ? -points : points;

    // Update points and determine new tier
    const newPoints = Math.max(0, client.loyaltyPoints + pointChange);
    let newTier = 'STANDARD';
    if (newPoints >= 1000) newTier = 'VIP';
    else if (newPoints >= 500) newTier = 'GOLD';
    else if (newPoints >= 100) newTier = 'SILVER';

    const [updatedClient, transaction] = await prisma.$transaction([
      prisma.client.update({
        where: { id: clientId },
        data: { loyaltyPoints: newPoints, loyaltyTier: newTier },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          clientId,
          points,
          type: type || 'BONUS',
          description: description || null,
        },
      }),
    ]);

    return NextResponse.json({ client: updatedClient, transaction }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/loyalty error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
