import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const appointment = await prisma.appointment.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
      include: {
        client: true, staff: true,
        services: { include: { service: true } },
      },
    });
    if (!appointment) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    return NextResponse.json(appointment);
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const existing = await prisma.appointment.findFirst({
      where: { id: params.id, salonId: session.user.salonId },
    });
    if (!existing) return NextResponse.json({ message: 'ვერ მოიძებნა' }, { status: 404 });

    const body = await req.json();
    const updateData: any = {};

    if (body.status !== undefined) {
      updateData.status = body.status;
      if (body.status === 'CANCELLED') {
        updateData.cancelledAt = new Date();
        updateData.cancelReason = body.cancelReason || null;
      }
    }
    if (body.clientId !== undefined) updateData.clientId = body.clientId || null;
    if (body.staffId) updateData.staffId = body.staffId;
    if (body.date) updateData.date = new Date(body.date);
    if (body.startTime) updateData.startTime = body.startTime;
    if (body.endTime) updateData.endTime = body.endTime;
    if (body.notes !== undefined) updateData.notes = body.notes || null;
    if (body.source) updateData.source = body.source;

    const appointment = await prisma.appointment.update({
      where: { id: params.id },
      data: updateData,
    });

    // Update services if provided
    if (body.services && Array.isArray(body.services)) {
      await prisma.appointmentService.deleteMany({ where: { appointmentId: params.id } });
      await prisma.appointmentService.createMany({
        data: body.services.map((s: any) => ({
          appointmentId: params.id,
          serviceId: s.serviceId,
          price: s.price,
          duration: s.duration,
        })),
      });
    }

    return NextResponse.json(appointment);
  } catch (error) {
    console.error('PUT /api/appointments/[id] error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    await prisma.appointment.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
