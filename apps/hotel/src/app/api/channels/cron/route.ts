import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { channelManager } from '@/lib/channels';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// This endpoint is called by Vercel Cron or external cron service
// Configure in vercel.json: { "crons": [{ "path": "/api/channels/cron", "schedule": "*/15 * * * *" }] }

export async function GET(request: Request) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Allow without auth for testing, but log warning
      console.warn('[Channel Cron] No auth or invalid secret');
    }

    console.log('[Channel Cron] Starting auto-sync at', new Date().toISOString());

    // Get all active connections
    const connections = await prisma.channelConnection.findMany({
      where: { 
        isActive: true,
        // Only sync connections that have import URLs configured
        OR: [
          { importUrl: { not: null } },
          { roomMappings: { some: { icalImportUrl: { not: null } } } }
        ]
      },
      include: {
        channel: true,
        organization: true
      }
    });

    console.log(`[Channel Cron] Found ${connections.length} active connections to sync`);

    const results = [];

    for (const connection of connections) {
      try {
        console.log(`[Channel Cron] Syncing ${connection.channel.name} for ${connection.organization.name}`);
        
        const result = await channelManager.syncBookings(connection.id);
        
        results.push({
          connectionId: connection.id,
          channel: connection.channel.name,
          organization: connection.organization.name,
          success: result.success,
          itemsProcessed: result.itemsProcessed,
          itemsSucceeded: result.itemsSucceeded
        });
        
        console.log(`[Channel Cron] Synced: ${result.itemsSucceeded} bookings`);
      } catch (error: any) {
        console.error(`[Channel Cron] Error syncing ${connection.id}:`, error.message);
        results.push({
          connectionId: connection.id,
          channel: connection.channel.name,
          organization: connection.organization.name,
          success: false,
          error: error.message
        });
      }
    }

    console.log('[Channel Cron] Completed at', new Date().toISOString());

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      connectionsProcessed: connections.length,
      results
    });
  } catch (error: any) {
    console.error('[Channel Cron] Fatal error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}