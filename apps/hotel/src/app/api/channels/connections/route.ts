import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';
import { channelManager } from '@/lib/channels';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - List connections for organization
export async function GET() {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    
    // Get organization by tenantId or hotelCode
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

    const connections = await prisma.channelConnection.findMany({
      where: { organizationId: organization.id },
      include: {
        channel: true,
        roomMappings: true,
        _count: {
          select: { 
            bookings: true,
            syncLogs: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(connections);
  } catch (error: any) {
    console.error('[Channel Connections API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new connection
export async function POST(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const body = await request.json();
    
    const { channelId, importUrl, roomMappings } = body;

    if (!channelId) {
      return NextResponse.json({ error: 'channelId is required' }, { status: 400 });
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

    // Check if channel exists
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    });

    if (!channel) {
      return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
    }

    // Check if connection already exists
    const existing = await prisma.channelConnection.findUnique({
      where: {
        organizationId_channelId: {
          organizationId: organization.id,
          channelId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Connection already exists for this channel' }, { status: 409 });
    }

    // Create connection
    const connection = await prisma.channelConnection.create({
      data: {
        organizationId: organization.id,
        channelId,
        importUrl,
        status: 'PENDING',
        syncDirection: 'BIDIRECTIONAL',
        syncIntervalMinutes: 30,
        isActive: true
      },
      include: {
        channel: true
      }
    });

    // Generate export URL
    const baseUrl = process.env.NEXTAUTH_URL || 'https://saas-hotel.vercel.app';
    const exportUrl = `${baseUrl}/api/channels/ical/export/${connection.id}`;

    // Update with export URL
    const updatedConnection = await prisma.channelConnection.update({
      where: { id: connection.id },
      data: { exportUrl },
      include: {
        channel: true,
        roomMappings: true
      }
    });

    // Test connection if import URL provided
    if (importUrl) {
      const testResult = await channelManager.initializeConnection(connection.id);
      
      await prisma.channelConnection.update({
        where: { id: connection.id },
        data: {
          status: testResult.success ? 'ACTIVE' : 'ERROR',
          lastSyncError: testResult.success ? null : testResult.message
        }
      });
    }

    // Create room mappings if provided
    if (roomMappings && Array.isArray(roomMappings)) {
      for (const mapping of roomMappings) {
        await prisma.channelRoomMapping.create({
          data: {
            connectionId: connection.id,
            roomId: mapping.roomId,
            channelListingId: mapping.channelListingId,
            icalImportUrl: mapping.icalImportUrl,
            icalExportUrl: `${exportUrl}/${mapping.roomId}`
          }
        });
      }
    }

    // Fetch updated connection with mappings
    const finalConnection = await prisma.channelConnection.findUnique({
      where: { id: connection.id },
      include: {
        channel: true,
        roomMappings: true
      }
    });

    return NextResponse.json(finalConnection, { status: 201 });
  } catch (error: any) {
    console.error('[Channel Connections API] Create error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
