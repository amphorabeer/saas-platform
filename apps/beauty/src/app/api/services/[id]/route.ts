import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.service.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!existing) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    const body = await req.json();
    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim(),
        description: body.description ?? existing.description,
        duration: body.duration ?? existing.duration,
        price: body.price !== undefined ? parseFloat(body.price) : existing.price,
        categoryId: body.categoryId !== undefined ? body.categoryId || null : existing.categoryId,
        isActive: body.isActive ?? existing.isActive,
      },
    });

    return NextResponse.json(service);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.service.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!existing) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    await prisma.service.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
