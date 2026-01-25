import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - List channel bookings
export async function GET(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const isProcessed = searchParams.get('isProcessed');
    const connectionId = searchParams.get('connectionId');

    // Get organization
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { tenantId: user.tenantId },
          { hotelCode: user.hotelCode }
        ].filter(Boolean) as any[]
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build query
    const whereClause: any = {
      connection: { organizationId: organization.id }
    };

    if (status) {
      whereClause.status = status.toUpperCase();
    }

    if (isProcessed !== null) {
      whereClause.isProcessed = isProcessed === 'true';
    }

    if (connectionId) {
      whereClause.connectionId = connectionId;
    }

    const bookings = await prisma.channelBooking.findMany({
      where: whereClause,
      include: {
        connection: {
          include: { channel: true }
        }
      },
      orderBy: { checkIn: 'asc' }
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('[Channel Bookings API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Convert channel booking to local reservation
export async function POST(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const body = await request.json();
    
    const { channelBookingId, roomId, notes } = body;

    if (!channelBookingId) {
      return NextResponse.json({ error: 'channelBookingId is required' }, { status: 400 });
    }

    // Get organization
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { tenantId: user.tenantId },
          { hotelCode: user.hotelCode }
        ].filter(Boolean) as any[]
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get channel booking
    const channelBooking = await prisma.channelBooking.findUnique({
      where: { id: channelBookingId },
      include: {
        connection: {
          include: { channel: true }
        }
      }
    });

    if (!channelBooking) {
      return NextResponse.json({ error: 'Channel booking not found' }, { status: 404 });
    }

    // Verify ownership
    if (channelBooking.connection.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if already processed
    if (channelBooking.isProcessed && channelBooking.localReservationId) {
      return NextResponse.json({ 
        error: 'Booking already converted to reservation',
        reservationId: channelBooking.localReservationId 
      }, { status: 409 });
    }

    // Get room if specified
    const finalRoomId = roomId || channelBooking.roomId;
    if (!finalRoomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    const room = await prisma.hotelRoom.findUnique({
      where: { id: finalRoomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Create local reservation
    const reservation = await prisma.hotelReservation.create({
      data: {
        tenantId: organization.tenantId,
        roomId: room.id,
        guestName: channelBooking.guestName || 'OTA Guest',
        guestEmail: channelBooking.guestEmail,
        guestPhone: channelBooking.guestPhone,
        checkIn: channelBooking.checkIn,
        checkOut: channelBooking.checkOut,
        adults: channelBooking.adults,
        children: channelBooking.children,
        totalAmount: channelBooking.totalAmount || room.basePrice,
        paidAmount: 0,
        status: 'confirmed',
        source: channelBooking.connection.channel.name,
        notes: notes || `Imported from ${channelBooking.connection.channel.name} (${channelBooking.channelBookingId})`
      }
    });

    // Update channel booking
    await prisma.channelBooking.update({
      where: { id: channelBookingId },
      data: {
        isProcessed: true,
        processedAt: new Date(),
        localReservationId: reservation.id
      }
    });

    return NextResponse.json({
      success: true,
      reservation,
      channelBooking: {
        ...channelBooking,
        isProcessed: true,
        localReservationId: reservation.id
      }
    });
  } catch (error: any) {
    console.error('[Channel Bookings API] Convert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
