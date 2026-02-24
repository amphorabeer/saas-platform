import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const client = await prisma.client.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
      include: {
        appointments: {
          include: { staff: true, services: { include: { service: true } } },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!client) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.client.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!existing) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    const body = await req.json();
    const client = await prisma.client.update({
      where: { id: params.id },
      data: {
        name: body.name?.trim() ?? existing.name,
        phone: body.phone !== undefined ? body.phone || null : existing.phone,
        email: body.email !== undefined ? body.email || null : existing.email,
        birthDate: body.birthDate !== undefined ? (body.birthDate ? new Date(body.birthDate) : null) : existing.birthDate,
        gender: body.gender !== undefined ? body.gender || null : existing.gender,
        notes: body.notes !== undefined ? body.notes || null : existing.notes,
        allergies: body.allergies !== undefined ? body.allergies || null : existing.allergies,
        hairType: body.hairType !== undefined ? body.hairType || null : existing.hairType,
        colorFormula: body.colorFormula !== undefined ? body.colorFormula || null : existing.colorFormula,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await prisma.client.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
