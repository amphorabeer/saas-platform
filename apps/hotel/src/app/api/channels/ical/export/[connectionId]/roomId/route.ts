import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateICalContent } from '@/lib/channels/ical-connector';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - Export iCal for a specific room
export async function GET(
  request: Request,
  { params }: { params: { connectionId: string; roomId: string } }
) {
  try {
    const { connectionId, roomId } = params;

    if (!connectionId || !roomId) {
      return new NextResponse('Connection ID and Room ID required', { status: 400 });
    }

    // Get connection
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: {
        organization: true,
        channel: true
      }
    });

    if (!connection || !connection.isActive) {
      return new NextResponse('Connection not found or inactive', { status: 404 });
    }

    const tenantId = connection.organization.tenantId;

    // Get room info
    const room = await prisma.hotelRoom.findUnique({
      where: { id: roomId },
      select: { roomNumber: true, roomType: true }
    });

    if (!room) {
      return new NextResponse('Room not found', { status: 404 });
    }

    // Get reservations for this specific room
    const reservations = await prisma.hotelReservation.findMany({
      where: {
        tenantId,
        roomId,
        status: {
          in: ['confirmed', 'checked-in', 'checked_in', 'CONFIRMED', 'CHECKED_IN', 'CHECKED-IN']
        },
        checkOut: {
          gte: new Date()
        }
      },
      include: {
        room: {
          select: { roomNumber: true }
        }
      },
      orderBy: { checkIn: 'asc' }
    });

    // Generate iCal content
    const calendarName = `${connection.organization.name} - ოთახი ${room.roomNumber}`;

    const icalContent = generateICalContent(
      reservations.map(r => ({
        id: r.id,
        checkIn: r.checkIn,
        checkOut: r.checkOut,
        guestName: r.guestName,
        roomNumber: r.room?.roomNumber,
        status: r.status
      })),
      calendarName
    );

    // Return as iCal file
    return new NextResponse(icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="room-${room.roomNumber}.ics"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('[iCal Export API] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}