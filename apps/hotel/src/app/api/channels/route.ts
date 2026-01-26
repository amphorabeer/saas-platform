import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { PrismaClient } from '@prisma/client';
import { getAuthOptions } from '@/lib/auth';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

// GET - List available channels
export async function GET() {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let channels = await prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });

    // Auto-seed if no channels exist
    if (channels.length === 0) {
      console.log('[Channels API] No channels found, seeding defaults...');
      
      const defaultChannels = [
        {
          name: 'Booking.com',
          type: 'BOOKING_COM' as const,
          logo: '/images/channels/booking.png',
          description: 'Booking.com - Global OTA',
          connectorType: 'ical',
          supportsRates: false,
          supportsAvailability: true,
          supportsBookings: true,
          isActive: true
        },
        {
          name: 'Airbnb',
          type: 'AIRBNB' as const,
          logo: '/images/channels/airbnb.png',
          description: 'Airbnb - Vacation Rentals',
          connectorType: 'ical',
          supportsRates: false,
          supportsAvailability: true,
          supportsBookings: true,
          isActive: true
        },
        {
          name: 'Expedia',
          type: 'EXPEDIA' as const,
          logo: '/images/channels/expedia.png',
          description: 'Expedia - Travel Platform',
          connectorType: 'ical',
          supportsRates: false,
          supportsAvailability: true,
          supportsBookings: true,
          isActive: true
        },
        {
          name: 'Agoda',
          type: 'AGODA' as const,
          logo: '/images/channels/agoda.png',
          description: 'Agoda - Asia-focused OTA',
          connectorType: 'ical',
          supportsRates: false,
          supportsAvailability: true,
          supportsBookings: true,
          isActive: true
        },
        {
          name: 'iCal (Custom)',
          type: 'ICAL' as const,
          logo: '/images/channels/ical.png',
          description: 'Custom iCal Calendar',
          connectorType: 'ical',
          supportsRates: false,
          supportsAvailability: true,
          supportsBookings: true,
          isActive: true
        }
      ];

      for (const channel of defaultChannels) {
        try {
          await prisma.channel.upsert({
            where: { type: channel.type },
            update: channel,
            create: channel
          });
        } catch (e) {
          console.error('[Channels API] Error seeding channel:', channel.type, e);
        }
      }

      // Fetch again after seeding
      channels = await prisma.channel.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' }
      });
      
      console.log('[Channels API] Seeded', channels.length, 'channels');
    }

    return NextResponse.json(channels);
  } catch (error: any) {
    console.error('[Channels API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Seed default channels (admin only, one-time setup)
export async function POST(request: Request) {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Default channels to seed
    const defaultChannels = [
      {
        name: 'Booking.com',
        type: 'BOOKING_COM' as const,
        logo: '/images/channels/booking.png',
        description: 'Booking.com - Global OTA',
        connectorType: 'ical', // Start with iCal, upgrade to API later
        supportsRates: false,
        supportsAvailability: true,
        supportsBookings: true
      },
      {
        name: 'Airbnb',
        type: 'AIRBNB' as const,
        logo: '/images/channels/airbnb.png',
        description: 'Airbnb - Vacation Rentals',
        connectorType: 'ical',
        supportsRates: false,
        supportsAvailability: true,
        supportsBookings: true
      },
      {
        name: 'Expedia',
        type: 'EXPEDIA' as const,
        logo: '/images/channels/expedia.png',
        description: 'Expedia - Travel Platform',
        connectorType: 'ical',
        supportsRates: false,
        supportsAvailability: true,
        supportsBookings: true
      },
      {
        name: 'Agoda',
        type: 'AGODA' as const,
        logo: '/images/channels/agoda.png',
        description: 'Agoda - Asia-focused OTA',
        connectorType: 'ical',
        supportsRates: false,
        supportsAvailability: true,
        supportsBookings: true
      },
      {
        name: 'iCal (Custom)',
        type: 'ICAL' as const,
        logo: '/images/channels/ical.png',
        description: 'Custom iCal Calendar',
        connectorType: 'ical',
        supportsRates: false,
        supportsAvailability: true,
        supportsBookings: true
      }
    ];

    // Upsert each channel
    const results = [];
    for (const channel of defaultChannels) {
      const result = await prisma.channel.upsert({
        where: { type: channel.type },
        update: channel,
        create: channel
      });
      results.push(result);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Channels seeded successfully',
      channels: results 
    });
  } catch (error: any) {
    console.error('[Channels API] Seed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}