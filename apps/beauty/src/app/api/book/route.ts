import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/book?slug=xxx — get salon info, services, staff for public booking
// GET /api/book?slug=xxx&staffId=xxx&date=2026-02-23 — get available slots
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');
    const staffId = searchParams.get('staffId');
    const date = searchParams.get('date');

    if (!slug) return NextResponse.json({ message: 'slug სავალდებულოა' }, { status: 400 });

    const salon = await prisma.salon.findUnique({
      where: { slug },
      include: {
        services: {
          where: { isActive: true },
          include: { category: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        },
        serviceCategories: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        staff: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!salon) return NextResponse.json({ message: 'სალონი ვერ მოიძებნა' }, { status: 404 });

    const result: any = {
      salon: {
        id: salon.id,
        name: salon.name,
        slug: salon.slug,
        address: salon.address,
        phone: salon.phone,
        workingHours: salon.workingHours,
      },
      categories: salon.serviceCategories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
      })),
      services: salon.services.map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        duration: s.duration,
        categoryId: s.categoryId,
        categoryName: s.category?.name || null,
      })),
      staff: salon.staff.map((s) => ({
        id: s.id,
        name: s.name,
        role: s.role,
      })),
    };

    // If staffId and date provided, return available time slots
    if (staffId && date) {
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon...

      // Get staff schedule for this day
      const schedule = await prisma.staffSchedule.findFirst({
        where: { staffId, dayOfWeek },
      });

      if (!schedule || schedule.isOff) {
        result.slots = [];
        return NextResponse.json(result);
      }

      // Get existing appointments for this staff on this date
      const existingAppointments = await prisma.appointment.findMany({
        where: {
          staffId,
          date: dateObj,
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        select: { startTime: true, endTime: true },
      });

      // Generate available slots (30 min intervals)
      const slots: string[] = [];
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      for (let m = startMinutes; m < endMinutes; m += 30) {
        const timeStr = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

        // Check if this slot conflicts with existing appointments
        const isBooked = existingAppointments.some((apt) => {
          const [aStartH, aStartM] = apt.startTime.split(':').map(Number);
          const [aEndH, aEndM] = apt.endTime.split(':').map(Number);
          const aptStart = aStartH * 60 + aStartM;
          const aptEnd = aEndH * 60 + aEndM;
          const slotTime = m;
          return slotTime >= aptStart && slotTime < aptEnd;
        });

        if (!isBooked) {
          slots.push(timeStr);
        }
      }

      result.slots = slots;
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('GET /api/book error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}

// POST /api/book — create appointment from public page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug, staffId, serviceIds, date, startTime, clientName, clientPhone, notes } = body;

    if (!slug || !staffId || !serviceIds?.length || !date || !startTime || !clientName || !clientPhone) {
      return NextResponse.json({ message: 'ყველა ველი სავალდებულოა' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({ where: { slug } });
    if (!salon) return NextResponse.json({ message: 'სალონი ვერ მოიძებნა' }, { status: 404 });

    // Get services to calculate end time
    const services = await prisma.service.findMany({
      where: { id: { in: serviceIds }, salonId: salon.id },
    });
    const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);

    // Calculate end time
    const [h, m] = startTime.split(':').map(Number);
    const endMinutes = h * 60 + m + totalDuration;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;

    // Check for conflicts
    const dateObj = new Date(date);
    const conflict = await prisma.appointment.findFirst({
      where: {
        staffId,
        date: dateObj,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json({ message: 'ეს დრო უკვე დაკავებულია' }, { status: 409 });
    }

    // Find or create client
    let client = await prisma.client.findFirst({
      where: { salonId: salon.id, phone: clientPhone },
    });
    if (!client) {
      client = await prisma.client.create({
        data: {
          salonId: salon.id,
          name: clientName,
          phone: clientPhone,
        },
      });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        salonId: salon.id,
        clientId: client.id,
        staffId,
        date: dateObj,
        startTime,
        endTime,
        status: 'SCHEDULED',
        source: 'ONLINE',
        notes: notes || null,
        services: {
          create: services.map((s) => ({
            serviceId: s.id,
            price: s.price,
            duration: s.duration,
          })),
        },
      },
      include: { staff: true, services: { include: { service: true } } },
    });

    return NextResponse.json({
      success: true,
      appointment: {
        id: appointment.id,
        date: date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        staffName: appointment.staff.name,
        services: appointment.services.map((s) => s.service.name),
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/book error:', error?.message || error);
    return NextResponse.json({ message: 'Server error', detail: error?.message }, { status: 500 });
  }
}
