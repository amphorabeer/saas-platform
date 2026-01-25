import {
  BaseConnector,
  ConnectorConfig,
  AvailabilityData,
  RateData,
  ChannelBooking,
  SyncResult,
  DateRange
} from './types';

/**
 * iCal Connector
 * 
 * Handles iCalendar (.ics) format for calendar synchronization.
 * This is a universal format supported by:
 * - Booking.com
 * - Airbnb
 * - VRBO
 * - Google Calendar
 * - And many more...
 * 
 * Limitations:
 * - Only syncs blocked dates (no guest details)
 * - No rate synchronization
 * - Polling-based (not real-time)
 */
export class ICalConnector extends BaseConnector {
  readonly type = 'ical';
  readonly name = 'iCal Calendar';
  readonly supportsRates = false;
  readonly supportsAvailability = true;
  readonly supportsBookings = true; // Limited - only dates, no details

  /**
   * Test if we can fetch the iCal URL
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      return { success: false, message: 'Connector not initialized' };
    }

    // Test import URL if provided
    if (this.config.importUrl) {
      try {
        const response = await fetch(this.config.importUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/calendar'
          }
        });

        if (!response.ok) {
          return { 
            success: false, 
            message: `Failed to fetch calendar: ${response.status} ${response.statusText}` 
          };
        }

        const content = await response.text();
        if (!content.includes('BEGIN:VCALENDAR')) {
          return { 
            success: false, 
            message: 'Invalid iCal format - missing VCALENDAR header' 
          };
        }

        return { 
          success: true, 
          message: 'Successfully connected to iCal feed' 
        };
      } catch (error: any) {
        return { 
          success: false, 
          message: `Connection error: ${error.message}` 
        };
      }
    }

    return { 
      success: true, 
      message: 'No import URL configured - export only mode' 
    };
  }

  /**
   * iCal doesn't support pushing availability to the channel.
   * Instead, channels pull from our export URL.
   */
  async pushAvailability(data: AvailabilityData[]): Promise<SyncResult> {
    // iCal is pull-based, not push-based
    // The channel fetches our export URL
    return {
      success: true,
      itemsProcessed: data.length,
      itemsSucceeded: data.length,
      itemsFailed: 0,
      details: {
        message: 'iCal uses pull-based sync. Export URL is ready for channels to fetch.'
      }
    };
  }

  /**
   * iCal doesn't support rate synchronization
   */
  async pushRates(data: RateData[]): Promise<SyncResult> {
    return {
      success: false,
      itemsProcessed: 0,
      itemsSucceeded: 0,
      itemsFailed: data.length,
      errors: ['iCal format does not support rate synchronization']
    };
  }

  /**
   * Fetch and parse iCal feed to extract bookings (blocked dates)
   */
  async fetchBookings(dateRange?: DateRange): Promise<ChannelBooking[]> {
    if (!this.config?.importUrl) {
      return [];
    }

    try {
      const response = await fetch(this.config.importUrl, {
        headers: {
          'Accept': 'text/calendar'
        }
      });

      if (!response.ok) {
        console.error(`[iCal] Failed to fetch: ${response.status}`);
        return [];
      }

      const icalData = await response.text();
      return this.parseICalData(icalData, dateRange);
    } catch (error) {
      console.error('[iCal] Fetch error:', error);
      return [];
    }
  }

  /**
   * Parse iCal data and extract events as bookings
   */
  private parseICalData(icalData: string, dateRange?: DateRange): ChannelBooking[] {
    const bookings: ChannelBooking[] = [];
    
    // Simple iCal parser - extract VEVENT blocks
    const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
    let match;

    while ((match = eventRegex.exec(icalData)) !== null) {
      const eventData = match[1];
      
      const booking = this.parseEvent(eventData);
      if (booking) {
        // Filter by date range if provided
        if (dateRange) {
          if (booking.checkOut < dateRange.start || booking.checkIn > dateRange.end) {
            continue;
          }
        }
        bookings.push(booking);
      }
    }

    return bookings;
  }

  /**
   * Parse a single VEVENT block
   */
  private parseEvent(eventData: string): ChannelBooking | null {
    const getValue = (key: string): string | null => {
      const regex = new RegExp(`${key}[^:]*:(.*)`, 'i');
      const match = eventData.match(regex);
      return match ? match[1].trim() : null;
    };

    const uid = getValue('UID');
    const dtstart = getValue('DTSTART');
    const dtend = getValue('DTEND');
    const summary = getValue('SUMMARY');
    const description = getValue('DESCRIPTION');

    if (!uid || !dtstart || !dtend) {
      return null;
    }

    // Parse dates (handle both DATE and DATE-TIME formats)
    const checkIn = this.parseICalDate(dtstart);
    const checkOut = this.parseICalDate(dtend);

    if (!checkIn || !checkOut) {
      return null;
    }

    // Extract guest name from summary if available
    // Common formats: "Booking - Guest Name", "Reserved", "Not available"
    let guestName = summary || 'OTA Booking';
    let status: ChannelBooking['status'] = 'confirmed';

    // Check if it's a blocked period vs actual booking
    if (summary) {
      const lowerSummary = summary.toLowerCase();
      if (lowerSummary.includes('blocked') || 
          lowerSummary.includes('not available') ||
          lowerSummary.includes('unavailable')) {
        guestName = 'Blocked';
      } else if (lowerSummary.includes('cancelled')) {
        status = 'cancelled';
      }
    }

    return {
      channelBookingId: uid,
      checkIn,
      checkOut,
      guestName,
      status,
      adults: 1,
      children: 0,
      rawData: {
        summary,
        description,
        uid
      }
    };
  }

  /**
   * Parse iCal date format
   * Supports: 20240115, 20240115T120000, 20240115T120000Z
   */
  private parseICalDate(dateStr: string): Date | null {
    try {
      // Remove any VALUE=DATE: prefix
      dateStr = dateStr.replace(/VALUE=DATE:/i, '');
      
      // Basic date format: YYYYMMDD
      if (dateStr.length === 8) {
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        return new Date(year, month, day);
      }

      // Date-time format: YYYYMMDDTHHMMSS or YYYYMMDDTHHMMSSZ
      if (dateStr.includes('T')) {
        const datePart = dateStr.substring(0, 8);
        const year = parseInt(datePart.substring(0, 4));
        const month = parseInt(datePart.substring(4, 6)) - 1;
        const day = parseInt(datePart.substring(6, 8));
        
        const timePart = dateStr.substring(9, 15);
        const hour = parseInt(timePart.substring(0, 2)) || 0;
        const minute = parseInt(timePart.substring(2, 4)) || 0;
        const second = parseInt(timePart.substring(4, 6)) || 0;

        if (dateStr.endsWith('Z')) {
          return new Date(Date.UTC(year, month, day, hour, minute, second));
        }
        return new Date(year, month, day, hour, minute, second);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generate export URL for a specific room
   */
  generateExportUrl(roomId: string): string {
    if (!this.config) {
      throw new Error('Connector not initialized');
    }
    
    // This URL will be served by our API
    const baseUrl = process.env.NEXTAUTH_URL || 'https://saas-hotel.vercel.app';
    return `${baseUrl}/api/channels/ical/export/${this.config.connectionId}/${roomId}`;
  }
}

/**
 * Generate iCal content from reservations
 */
export function generateICalContent(
  reservations: Array<{
    id: string;
    checkIn: Date;
    checkOut: Date;
    guestName?: string;
    roomNumber?: string;
    status?: string;
  }>,
  calendarName: string = 'Hotel Reservations'
): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SaaS Hotel//Channel Manager//EN',
    `X-WR-CALNAME:${calendarName}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  for (const reservation of reservations) {
    // Skip cancelled reservations
    if (reservation.status === 'cancelled') continue;

    const dtstart = formatICalDate(reservation.checkIn);
    const dtend = formatICalDate(reservation.checkOut);
    const uid = `${reservation.id}@saas-hotel`;
    const summary = reservation.guestName 
      ? `Reserved - ${reservation.guestName}`
      : 'Reserved';
    const dtstamp = formatICalDateTime(new Date());

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:${summary}`,
      reservation.roomNumber ? `DESCRIPTION:Room ${reservation.roomNumber}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  return lines.filter(line => line).join('\r\n');
}

/**
 * Format date for iCal (YYYYMMDD)
 */
function formatICalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format datetime for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatICalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}
