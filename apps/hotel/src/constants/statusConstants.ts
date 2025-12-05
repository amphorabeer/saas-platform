/**
 * Status Constants
 * Centralized status values to ensure consistency across the application
 */

// Reservation Status
export const RESERVATION_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
  PENDING: 'PENDING'
} as const

export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS]

// Room Status
export const ROOM_STATUS = {
  VACANT: 'VACANT',
  OCCUPIED: 'OCCUPIED',
  CLEANING: 'CLEANING',
  OUT_OF_ORDER: 'OUT_OF_ORDER',
  MAINTENANCE: 'MAINTENANCE'
} as const

export type RoomStatus = typeof ROOM_STATUS[keyof typeof ROOM_STATUS]

// Folio Status
export const FOLIO_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed'
} as const

export type FolioStatus = typeof FOLIO_STATUS[keyof typeof FOLIO_STATUS]

// Transaction Type
export const TRANSACTION_TYPE = {
  CHARGE: 'charge',
  PAYMENT: 'payment',
  ADJUSTMENT: 'adjustment',
  REFUND: 'refund'
} as const

export type TransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE]

// Payment Method
export const PAYMENT_METHOD = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  CHECK: 'check',
  OTHER: 'other'
} as const

export type PaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD]

/**
 * Helper functions to check status
 */
export const StatusHelpers = {
  isCheckedIn: (status: string): boolean => {
    return status === RESERVATION_STATUS.CHECKED_IN || status === 'checked_in'
  },
  
  isCheckedOut: (status: string): boolean => {
    return status === RESERVATION_STATUS.CHECKED_OUT || status === 'checked_out'
  },
  
  isOccupied: (status: string): boolean => {
    return status === ROOM_STATUS.OCCUPIED || status === 'occupied'
  },
  
  isConfirmed: (status: string): boolean => {
    return status === RESERVATION_STATUS.CONFIRMED || status === 'confirmed'
  },
  
  isCancelled: (status: string): boolean => {
    return status === RESERVATION_STATUS.CANCELLED || status === 'cancelled'
  },
  
  isNoShow: (status: string): boolean => {
    return status === RESERVATION_STATUS.NO_SHOW || status === 'no_show'
  },
  
  normalizeReservationStatus: (status: string): ReservationStatus => {
    const upper = status.toUpperCase()
    if (upper === 'CHECKED_IN' || upper === 'CHECKED IN') return RESERVATION_STATUS.CHECKED_IN
    if (upper === 'CHECKED_OUT' || upper === 'CHECKED OUT') return RESERVATION_STATUS.CHECKED_OUT
    if (upper === 'NO_SHOW' || upper === 'NO SHOW') return RESERVATION_STATUS.NO_SHOW
    if (Object.values(RESERVATION_STATUS).includes(upper as ReservationStatus)) {
      return upper as ReservationStatus
    }
    return RESERVATION_STATUS.CONFIRMED // Default
  },
  
  normalizeRoomStatus: (status: string): RoomStatus => {
    const upper = status.toUpperCase()
    if (Object.values(ROOM_STATUS).includes(upper as RoomStatus)) {
      return upper as RoomStatus
    }
    return ROOM_STATUS.VACANT // Default
  }
}






