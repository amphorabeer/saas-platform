import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date');

    const where: any = { salonId: session.user.salonId };

    if (dateStr) {
      const date = new Date(dateStr);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      where.date = { gte: date, lt: nextDate };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true } },
        staff: { select: { id: true, name: true } },
        services: { include: { service: { select: { id: true, name: true } } } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json(
      appointments.map((a) => ({
        id: a.id,
        date: a.date.toISOString(),
        startTime: a.startTime,
        endTime: a.endTime,
        status: a.status,
        notes: a.notes,
        source: a.source,
        clientId: a.clientId,
        clientName: a.client?.name || 'ანონიმური',
        staffId: a.staffId,
        staffName: a.staff.name,
        services: a.services.map((s) => ({
          serviceId: s.serviceId,
          name: s.service.name,
          price: s.price,
          duration: s.duration,
        })),
        totalPrice: a.services.reduce((sum, s) => sum + s.price, 0),
        totalDuration: a.services.reduce((sum, s) => sum + s.duration, 0),
      }))
    );
  } catch (error) {
    console.error('GET /api/appointments error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { clientId, staffId, date, startTime, endTime, notes, source, services } = body;

    if (!staffId || !date || !startTime || !services?.length) {
      return NextResponse.json({ message: 'სპეციალისტი, თარიღი, დრო და სერვისი სავალდებულოა' }, { status: 400 });
    }

    // Check for time conflicts
    const conflict = await prisma.appointment.findFirst({
      where: {
        salonId: session.user.salonId,
        staffId,
        date: new Date(date),
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lt: endTime || '23:59' }, endTime: { gt: startTime } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json({ message: 'ამ დროს სპეციალისტი დაკავებულია' }, { status: 400 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        salonId: session.user.salonId,
        clientId: clientId || null,
        staffId,
        date: new Date(date),
        startTime,
        endTime: endTime || startTime,
        notes: notes || null,
        source: source || 'WALK_IN',
        services: {
          create: services.map((s: any) => ({
            serviceId: s.serviceId,
            price: s.price,
            duration: s.duration,
          })),
        },
      },
      include: {
        services: { include: { service: true } },
        client: true,
        staff: true,
      },
    });

    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    console.error('POST /api/appointments error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
