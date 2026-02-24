import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/reviews
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const salonId = session.user.salonId;
    const body = await req.json();

    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ message: 'შეფასება 1-5 სავალდებულოა' }, { status: 400 });
    }

    // Find or match client by name
    let clientId = body.clientId || null;
    if (!clientId && body.clientName) {
      const existingClient = await prisma.client.findFirst({
        where: { salonId, name: { contains: body.clientName, mode: 'insensitive' } },
      });
      clientId = existingClient?.id || null;
    }

    const review = await prisma.review.create({
      data: {
        salonId,
        clientId,
        staffId: body.staffId || null,
        rating: body.rating,
        comment: body.comment || null,
        isPublic: body.isPublic !== undefined ? body.isPublic : true,
      },
      include: { client: true, staff: true },
    });

    return NextResponse.json({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      response: review.response,
      isPublic: review.isPublic,
      clientName: review.client?.name || body.clientName || 'ანონიმური',
      clientId: review.clientId,
      staffName: review.staff?.name || null,
      staffId: review.staffId,
      createdAt: review.createdAt.toISOString(),
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/reviews error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
