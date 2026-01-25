import { PrismaClient } from '@prisma/client';
import { ChannelConnector, ConnectorConfig, ChannelBooking, SyncResult, DateRange } from './types';
import { ICalConnector } from './ical-connector';

const prisma = new PrismaClient();

/**
 * Channel Manager Service
 * 
 * მართავს ყველა არხთან კავშირს და სინქრონიზაციას.
 * Connector Framework-ის გამოყენებით, მომავალში ახალი არხების დამატება მარტივია.
 */
export class ChannelManager {
  private connectors: Map<string, ChannelConnector> = new Map();

  /**
   * Get connector instance for a channel type
   */
  getConnector(type: string): ChannelConnector | null {
    // Lazy initialization of connectors
    if (!this.connectors.has(type)) {
      const connector = this.createConnector(type);
      if (connector) {
        this.connectors.set(type, connector);
      }
    }
    return this.connectors.get(type) || null;
  }

  /**
   * Create a connector instance based on type
   * მომავალში აქ დაემატება სხვა კონექტორები
   */
  private createConnector(type: string): ChannelConnector | null {
    switch (type.toLowerCase()) {
      case 'ical':
        return new ICalConnector();
      
      // Future connectors:
      // case 'booking_com':
      //   return new BookingComConnector();
      // case 'airbnb':
      //   return new AirbnbConnector();
      // case 'siteminder':
      //   return new SiteMinderConnector();
      
      default:
        console.warn(`[ChannelManager] Unknown connector type: ${type}`);
        return null;
    }
  }

  /**
   * Initialize a connection and test it
   */
  async initializeConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: {
        channel: true,
        roomMappings: true
      }
    });

    if (!connection) {
      return { success: false, message: 'Connection not found' };
    }

    const connector = this.getConnector(connection.channel.connectorType);
    if (!connector) {
      return { success: false, message: `Connector not found for type: ${connection.channel.connectorType}` };
    }

    const config: ConnectorConfig = {
      connectionId: connection.id,
      organizationId: connection.organizationId,
      importUrl: connection.importUrl || undefined,
      exportUrl: connection.exportUrl || undefined,
      apiKey: connection.apiKey || undefined,
      apiSecret: connection.apiSecret || undefined,
      propertyId: connection.propertyId || undefined,
      roomMappings: connection.roomMappings.map(m => ({
        roomId: m.roomId,
        channelListingId: m.channelListingId || undefined,
        icalImportUrl: m.icalImportUrl || undefined,
        icalExportUrl: m.icalExportUrl || undefined
      }))
    };

    await connector.initialize(config);
    return connector.testConnection();
  }

  /**
   * Sync bookings from a channel
   */
  async syncBookings(
    connectionId: string, 
    dateRange?: DateRange
  ): Promise<SyncResult> {
    const connection = await prisma.channelConnection.findUnique({
      where: { id: connectionId },
      include: {
        channel: true,
        roomMappings: true
      }
    });

    if (!connection) {
      return {
        success: false,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        errors: ['Connection not found']
      };
    }

    const connector = this.getConnector(connection.channel.connectorType);
    if (!connector) {
      return {
        success: false,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        errors: [`Connector not found: ${connection.channel.connectorType}`]
      };
    }

    // Initialize connector
    await connector.initialize({
      connectionId: connection.id,
      organizationId: connection.organizationId,
      importUrl: connection.importUrl || undefined,
      roomMappings: connection.roomMappings.map(m => ({
        roomId: m.roomId,
        icalImportUrl: m.icalImportUrl || undefined
      }))
    });

    // Create sync log
    const syncLog = await prisma.channelSyncLog.create({
      data: {
        connectionId,
        syncType: 'bookings',
        direction: 'IMPORT',
        status: 'in_progress'
      }
    });

    try {
      // Fetch bookings from channel
      const bookings = await connector.fetchBookings(dateRange);
      
      let succeeded = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each booking
      for (const booking of bookings) {
        try {
          await this.processChannelBooking(connectionId, booking);
          succeeded++;
        } catch (error: any) {
          failed++;
          errors.push(`Booking ${booking.channelBookingId}: ${error.message}`);
        }
      }

      // Update sync log
      await prisma.channelSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: failed === 0 ? 'success' : 'partial',
          itemsProcessed: bookings.length,
          itemsSucceeded: succeeded,
          itemsFailed: failed,
          completedAt: new Date(),
          errorMessage: errors.length > 0 ? errors.join('; ') : null
        }
      });

      // Update connection last sync
      await prisma.channelConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: failed === 0 ? 'success' : 'partial',
          lastSyncError: errors.length > 0 ? errors[0] : null
        }
      });

      return {
        success: failed === 0,
        itemsProcessed: bookings.length,
        itemsSucceeded: succeeded,
        itemsFailed: failed,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error: any) {
      // Update sync log with error
      await prisma.channelSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: error.message
        }
      });

      await prisma.channelConnection.update({
        where: { id: connectionId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'failed',
          lastSyncError: error.message
        }
      });

      return {
        success: false,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        errors: [error.message]
      };
    }
  }

  /**
   * Process a single booking from channel
   */
  private async processChannelBooking(
    connectionId: string, 
    booking: ChannelBooking
  ): Promise<void> {
    // Check if booking already exists
    const existing = await prisma.channelBooking.findUnique({
      where: {
        connectionId_channelBookingId: {
          connectionId,
          channelBookingId: booking.channelBookingId
        }
      }
    });

    if (existing) {
      // Update existing booking
      await prisma.channelBooking.update({
        where: { id: existing.id },
        data: {
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          adults: booking.adults,
          children: booking.children,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          status: booking.status.toUpperCase() as any,
          rawData: booking.rawData,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new booking
      await prisma.channelBooking.create({
        data: {
          connectionId,
          channelBookingId: booking.channelBookingId,
          roomId: booking.roomId,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          guestName: booking.guestName,
          guestEmail: booking.guestEmail,
          guestPhone: booking.guestPhone,
          adults: booking.adults,
          children: booking.children,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          status: booking.status.toUpperCase() as any,
          rawData: booking.rawData
        }
      });
    }
  }

  /**
   * Get all available channel types
   */
  async getAvailableChannels() {
    return prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get connections for an organization
   */
  async getConnections(organizationId: string) {
    return prisma.channelConnection.findMany({
      where: { organizationId },
      include: {
        channel: true,
        roomMappings: true,
        _count: {
          select: { bookings: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get channel bookings for an organization
   */
  async getChannelBookings(
    organizationId: string, 
    options?: {
      status?: string;
      isProcessed?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ) {
    return prisma.channelBooking.findMany({
      where: {
        connection: { organizationId },
        ...(options?.status && { status: options.status as any }),
        ...(options?.isProcessed !== undefined && { isProcessed: options.isProcessed }),
        ...(options?.dateFrom && { checkIn: { gte: options.dateFrom } }),
        ...(options?.dateTo && { checkOut: { lte: options.dateTo } })
      },
      include: {
        connection: {
          include: { channel: true }
        }
      },
      orderBy: { checkIn: 'asc' }
    });
  }
}

// Singleton instance
export const channelManager = new ChannelManager();
