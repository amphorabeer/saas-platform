import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/staff — list all staff
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const staff = await prisma.staff.findMany({
      where: { salonId: session.user.salonId },
      include: {
        schedules: true,
        staffServices: { include: { service: true } },
        _count: { select: { appointments: true, reviews: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(staff);
  } catch (error) {
    console.error('GET /api/staff error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

// POST /api/staff — create new staff
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Only OWNER and ADMIN can create staff
    if (!['OWNER', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ message: 'არ გაქვთ უფლება' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      email,
      phone,
      role,
      specialties,
      bio,
      pin,
      password,
      commissionType,
      commissionRate,
      isActive,
      schedules,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json({ message: 'სახელი სავალდებულოა' }, { status: 400 });
    }

    // Check email uniqueness within salon
    if (email) {
      const existing = await prisma.staff.findFirst({
        where: { salonId: session.user.salonId, email },
      });
      if (existing) {
        return NextResponse.json(
          { message: 'ეს ელფოსტა უკვე დარეგისტრირებულია' },
          { status: 400 }
        );
      }
    }

    // Hash password if provided
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const staff = await prisma.staff.create({
      data: {
        salonId: session.user.salonId,
        name: name.trim(),
        email: email || null,
        phone: phone || null,
        role: role || 'SPECIALIST',
        specialties: specialties || [],
        bio: bio || null,
        pin: pin || null,
        passwordHash,
        commissionType: commissionType || 'NONE',
        commissionRate: commissionRate || 0,
        isActive: isActive ?? true,
      },
    });

    // Create schedules
    if (schedules && Array.isArray(schedules)) {
      await prisma.staffSchedule.createMany({
        data: schedules.map((s: any) => ({
          staffId: staff.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime || '09:00',
          endTime: s.endTime || '18:00',
          isOff: s.isOff || false,
        })),
      });
    }

    return NextResponse.json(staff, { status: 201 });
  } catch (error) {
    console.error('POST /api/staff error:', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
