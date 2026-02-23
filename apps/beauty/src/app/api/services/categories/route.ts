import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const categories = await prisma.serviceCategory.findMany({
      where: { salonId: session.user.salonId },
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json(categories);
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

    const category = await prisma.serviceCategory.create({
      data: {
        salonId: session.user.salonId,
        name: body.name.trim(),
        icon: body.icon || null,
        color: body.color || null,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
