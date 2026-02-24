import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PUT /api/finance/[id]
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!expense) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    const body = await req.json();

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: {
        category: body.category || expense.category,
        amount: body.amount ? Number(body.amount) : expense.amount,
        date: body.date ? new Date(body.date) : expense.date,
        description: body.description !== undefined ? body.description : expense.description,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// DELETE /api/finance/[id]
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

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!expense) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    await prisma.expense.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
