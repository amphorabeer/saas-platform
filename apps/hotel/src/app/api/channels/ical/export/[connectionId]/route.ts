import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateICalContent } from '@/lib/channels/ical-connector';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - Export iCal for a connection (public endpoint for OTAs)
export async function GET(
  request: Request,
  { params }: { params: { connectionId: string; roomId?: string } }
) {
  try {
    const { connectionId } = params;
    
    // Parse roomId from URL path segments if present
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const roomIdIndex = pathParts.indexOf(connectionId) + 1;
    const roomId = pathParts[roomIdIndex] || null;

    if (!connectionId) {
      return new NextResponse('Connection ID required', { status: 400 });
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

    // Build query for reservations
    const whereClause: any = {
      tenantId,
      status: {
        in: ['confirmed', 'checked-in', 'checked_in', 'CONFIRMED', 'CHECKED_IN', 'CHECKED-IN']
      },
      checkOut: {
        gte: new Date() // Only future and current reservations
      }
    };

    // If specific room requested
    if (roomId) {
      whereClause.roomId = roomId;
    }

    // Get reservations
    const reservations = await prisma.hotelReservation.findMany({
      where: whereClause,
      include: {
        room: {
          select: { roomNumber: true }
        }
      },
      orderBy: { checkIn: 'asc' }
    });

    // Generate iCal content
    const calendarName = roomId 
      ? `${connection.organization.name} - Room ${reservations[0]?.room?.roomNumber || roomId}`
      : `${connection.organization.name} - All Rooms`;

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
        'Content-Disposition': `attachment; filename="${connectionId}.ics"`,
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
