import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// PATCH - Update or create room mapping with import URL
export async function PATCH(
  request: Request,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const { id: connectionId, roomId } = params;
    const body = await request.json();

    // Get connection and verify ownership
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: { organization: true }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify user has access
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { tenantId: user.tenantId },
          { hotelCode: user.hotelCode }
        ].filter(Boolean) as any[]
      }
    });

    if (!organization || connection.organizationId !== organization.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Verify room exists
    const room = await prisma.hotelRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Upsert room mapping
    const mapping = await prisma.channelRoomMapping.upsert({
      where: {
        connectionId_roomId: {
          connectionId,
          roomId
        }
      },
      update: {
        icalImportUrl: body.importUrl,
        updatedAt: new Date()
      },
      create: {
        connectionId,
        roomId,
        channelListingId: `booking-${roomId}`,
        icalImportUrl: body.importUrl,
        icalExportUrl: `${process.env.NEXTAUTH_URL || ''}/api/channels/ical/export/${connectionId}/${roomId}`
      }
    });

    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error('[Room Mapping PATCH API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get room mapping
export async function GET(
  request: Request,
  { params }: { params: { id: string; roomId: string } }
) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: connectionId, roomId } = params;

    const mapping = await prisma.channelRoomMapping.findUnique({
      where: {
        connectionId_roomId: {
          connectionId,
          roomId
        }
      }
    });

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    return NextResponse.json(mapping);
  } catch (error: any) {
    console.error('[Room Mapping GET API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}