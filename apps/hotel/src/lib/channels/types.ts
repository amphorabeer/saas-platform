// Channel Manager Types
// Connector Framework - აბსტრაქტული ფენა, მომავალში სხვა კონექტორების დასამატებლად

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AvailabilityData {
  roomId: string;
  date: Date;
  isAvailable: boolean;
  quantity?: number;
}

export interface RateData {
  roomId: string;
  date: Date;
  price: number;
  currency: string;
  rateType?: string; // "standard", "non_refundable", etc.
}

export interface ChannelBooking {
  channelBookingId: string;
  roomId?: string;
  checkIn: Date;
  checkOut: Date;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  adults: number;
  children: number;
  totalAmount?: number;
  currency?: string;
  status: 'confirmed' | 'cancelled' | 'modified' | 'pending';
  rawData?: any;
}

export interface SyncResult {
  success: boolean;
  itemsProcessed: number;
  itemsSucceeded: number;
  itemsFailed: number;
  errors?: string[];
  details?: any;
}

export interface ConnectorConfig {
  connectionId: string;
  organizationId: string;
  
  // iCal specific
  importUrl?: string;
  exportUrl?: string;
  
  // API specific (for future connectors)
  apiKey?: string;
  apiSecret?: string;
  propertyId?: string;
  
  // Room mappings
  roomMappings?: {
    roomId: string;
    channelListingId?: string;
    icalImportUrl?: string;
    icalExportUrl?: string;
  }[];
}

/**
 * Channel Connector Interface
 * 
 * ყველა კონექტორმა (iCal, Booking.com, Airbnb, etc.) უნდა იმპლემენტაცია გაუკეთოს
 * ამ ინტერფეისს. ეს საშუალებას იძლევა მომავალში ახალი არხების დამატება
 * არსებული კოდის შეცვლის გარეშე.
 */
export interface ChannelConnector {
  /** Connector type identifier */
  readonly type: string;
  
  /** Human readable name */
  readonly name: string;
  
  /** Whether this connector supports rate management */
  readonly supportsRates: boolean;
  
  /** Whether this connector supports availability sync */
  readonly supportsAvailability: boolean;
  
  /** Whether this connector supports booking import */
  readonly supportsBookings: boolean;
  
  /**
   * Initialize the connector with configuration
   */
  initialize(config: ConnectorConfig): Promise<void>;
  
  /**
   * Test connection to the channel
   */
  testConnection(): Promise<{ success: boolean; message: string }>;
  
  /**
   * Push availability to the channel
   * @returns SyncResult with details of the sync operation
   */
  pushAvailability(data: AvailabilityData[]): Promise<SyncResult>;
  
  /**
   * Push rates to the channel
   * @returns SyncResult with details of the sync operation
   */
  pushRates(data: RateData[]): Promise<SyncResult>;
  
  /**
   * Fetch bookings from the channel
   * @returns Array of bookings from the channel
   */
  fetchBookings(dateRange?: DateRange): Promise<ChannelBooking[]>;
  
  /**
   * Generate export URL for the channel to import
   * (Used by iCal connectors)
   */
  generateExportUrl?(roomId: string): string;
  
  /**
   * Parse incoming webhook/notification from channel
   * (Used by API connectors)
   */
  parseWebhook?(payload: any): ChannelBooking | null;
}

/**
 * Abstract base class for connectors
 * Provides common functionality and default implementations
 */
export abstract class BaseConnector implements ChannelConnector {
  abstract readonly type: string;
  abstract readonly name: string;
  abstract readonly supportsRates: boolean;
  abstract readonly supportsAvailability: boolean;
  abstract readonly supportsBookings: boolean;
  
  protected config: ConnectorConfig | null = null;
  
  async initialize(config: ConnectorConfig): Promise<void> {
    this.config = config;
  }
  
  abstract testConnection(): Promise<{ success: boolean; message: string }>;
  
  async pushAvailability(data: AvailabilityData[]): Promise<SyncResult> {
    if (!this.supportsAvailability) {
      return {
        success: false,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        errors: ['This connector does not support availability sync']
      };
    }
    throw new Error('Not implemented');
  }
  
  async pushRates(data: RateData[]): Promise<SyncResult> {
    if (!this.supportsRates) {
      return {
        success: false,
        itemsProcessed: 0,
        itemsSucceeded: 0,
        itemsFailed: 0,
        errors: ['This connector does not support rate sync']
      };
    }
    throw new Error('Not implemented');
  }
  
  async fetchBookings(dateRange?: DateRange): Promise<ChannelBooking[]> {
    if (!this.supportsBookings) {
      return [];
    }
    throw new Error('Not implemented');
  }
}
