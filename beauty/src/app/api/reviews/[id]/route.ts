import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/reviews/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const review = await prisma.review.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!review) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    const body = await req.json();
    const updateData: any = {};

    if (body.response !== undefined) updateData.response = body.response;
    if (body.isPublic !== undefined) updateData.isPublic = body.isPublic;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.comment !== undefined) updateData.comment = body.comment;

    const updated = await prisma.review.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/reviews/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const review = await prisma.review.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!review) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    await prisma.review.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
