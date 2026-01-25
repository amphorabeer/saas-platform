import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// DELETE - Clear all channel bookings for organization
export async function DELETE(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };

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

    // Get all connections for this organization
    const connections = await prisma.channelConnection.findMany({
      where: { organizationId: organization.id },
      select: { id: true }
    });

    const connectionIds = connections.map(c => c.id);

    // Delete all channel bookings for these connections
    const result = await prisma.channelBooking.deleteMany({
      where: {
        connectionId: { in: connectionIds }
      }
    });

    return NextResponse.json({ 
      success: true, 
      deleted: result.count,
      message: `წაიშალა ${result.count} channel booking`
    });
  } catch (error: any) {
    console.error('[Channel Bookings Clear API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}