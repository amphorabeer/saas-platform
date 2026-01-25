import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// PATCH - Update connection (e.g., import URL)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const { id } = params;
    const body = await request.json();

    // Get connection and verify ownership
    const connection = await prisma.channelConnection.findUnique({
      where: { id },
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

    // Update allowed fields
    const updateData: any = {};
    
    if (body.importUrl !== undefined) {
      updateData.importUrl = body.importUrl;
    }
    
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
    }
    
    if (body.syncIntervalMinutes !== undefined) {
      updateData.syncIntervalMinutes = body.syncIntervalMinutes;
    }

    const updated = await prisma.channelConnection.update({
      where: { id },
      data: updateData,
      include: {
        channel: true,
        roomMappings: true
      }
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[Connection PATCH API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove connection
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user as { tenantId?: string; hotelCode?: string };
    const { id } = params;

    // Get connection and verify ownership
    const connection = await prisma.channelConnection.findUnique({
      where: { id },
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

    // Delete connection (cascades to room mappings, bookings, sync logs)
    await prisma.channelConnection.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Connection DELETE API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}