import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const salon = await prisma.salon.findUnique({
      where: { id: session.user.salonId },
    });

    return NextResponse.json(salon);
  } catch (error: any) {
    console.error('GET /api/salon error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();

    const salon = await prisma.salon.update({
      where: { id: session.user.salonId },
      data: {
        name: body.name,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        description: body.description || null,
        workingHours: body.workingHours || undefined,
        settings: body.settings || undefined,
      },
    });

    return NextResponse.json(salon);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
