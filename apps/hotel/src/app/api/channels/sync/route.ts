import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';
import { channelManager } from '@/lib/channels';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// POST - Trigger sync for a connection
export async function POST(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const body = await request.json();
    
    const { connectionId, syncType = 'bookings' } = body;

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    // Verify connection belongs to user's organization
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: {
        organization: true,
        channel: true
      }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    // Verify ownership
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

    // Perform sync
    let result;
    switch (syncType) {
      case 'bookings':
        result = await channelManager.syncBookings(connectionId);
        break;
      // Future: case 'rates', case 'availability'
      default:
        return NextResponse.json({ error: 'Invalid sync type' }, { status: 400 });
    }

    return NextResponse.json({
      success: result.success,
      syncType,
      ...result
    });
  } catch (error: any) {
    console.error('[Channel Sync API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get sync logs for a connection
export async function GET(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connectionId');

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    // Verify ownership
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: { organization: true }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

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

    // Get sync logs
    const logs = await prisma.channelSyncLog.findMany({
      where: { connectionId },
      orderBy: { startedAt: 'desc' },
      take: 50
    });

    return NextResponse.json(logs);
  } catch (error: any) {
    console.error('[Channel Sync API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
