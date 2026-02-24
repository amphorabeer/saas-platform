import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const clients = await prisma.client.findMany({
      where: { salonId: session.user.salonId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(clients);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ message: 'სახელი სავალდებულოა' }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        salonId: session.user.salonId,
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        gender: body.gender || null,
        notes: body.notes || null,
        allergies: body.allergies || null,
        hairType: body.hairType || null,
        colorFormula: body.colorFormula || null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
