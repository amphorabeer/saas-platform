import moment from 'moment'

/**
 * Get the current Business Day (last closed audit + 1)
 * Business Day is the earliest date that can be booked/checked-in
 */
export const getBusinessDay = (): string => {
  if (typeof window === 'undefined') {
    return moment().format('YYYY-MM-DD')
  }
  
  // Priority 1: lastNightAuditDate (plain string YYYY-MM-DD)
  const lastNightAudit = localStorage.getItem('lastNightAuditDate')
  if (lastNightAudit) {
    return moment(lastNightAudit).add(1, 'day').format('YYYY-MM-DD')
  }
  
  // Priority 2: lastAuditDate (legacy, may be JSON stringified)
  const legacyAudit = localStorage.getItem('lastAuditDate')
  if (legacyAudit) {
    try {
      const parsed = JSON.parse(legacyAudit)
      return moment(parsed).add(1, 'day').format('YYYY-MM-DD')
    } catch {
      return moment(legacyAudit).add(1, 'day').format('YYYY-MM-DD')
    }
  }
  
  // No audit yet - Business Day is today
  return moment().format('YYYY-MM-DD')
}

/**
 * Check if a date is closed (already audited)
 * Closed days are days up to and including the last closed audit date
 */
export const isClosedDay = (date: string | Date): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  
  const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD')
  
  // Priority 1: lastNightAuditDate (plain string YYYY-MM-DD)
  const lastNightAudit = localStorage.getItem('lastNightAuditDate')
  const legacyAudit = localStorage.getItem('lastAuditDate')
  
  let lastClosed: string | null = null
  
  if (lastNightAudit) {
    lastClosed = lastNightAudit
  } else if (legacyAudit) {
    try {
      lastClosed = JSON.parse(legacyAudit)
    } catch {
      lastClosed = legacyAudit
    }
  }
  
  if (!lastClosed) {
    // No audit yet - past days are closed
    return moment(dateStr).isBefore(moment(), 'day')
  }
  
  // Days up to and including lastClosed are closed
  return moment(dateStr).isSameOrBefore(lastClosed, 'day')
}

/**
 * Validate reservation dates (check-in and check-out)
 * Returns validation result with reason if invalid
 */
export const validateReservationDates = (
  checkIn: string | Date,
  checkOut: string | Date
): { valid: boolean; reason?: string } => {
  const checkInStr = typeof checkIn === 'string' ? checkIn : moment(checkIn).format('YYYY-MM-DD')
  const checkOutStr = typeof checkOut === 'string' ? checkOut : moment(checkOut).format('YYYY-MM-DD')
  const businessDay = getBusinessDay()
  
  // Check 1: Check-in must not be on closed day
  if (isClosedDay(checkInStr)) {
    return {
      valid: false,
      reason: `თარიღი ${checkInStr} დახურულია. Night Audit უკვე გაკეთებულია.`
    }
  }
  
  // Check 2: Check-in must be on or after business day
  if (moment(checkInStr).isBefore(businessDay, 'day')) {
    return {
      valid: false,
      reason: `Check-in თარიღი (${checkInStr}) Business Day-მდეა (${businessDay}).`
    }
  }
  
  // Check 3: Check-out must be after check-in
  if (moment(checkOutStr).isSameOrBefore(checkInStr, 'day')) {
    return {
      valid: false,
      reason: 'Check-out უნდა იყოს Check-in-ის შემდეგ'
    }
  }
  
  return { valid: true }
}

/**
 * Validate check-in date only (for check-in operations)
 * Returns validation result with reason if invalid
 */
export const validateCheckInDate = (
  checkIn: string | Date
): { valid: boolean; reason?: string } => {
  const checkInStr = typeof checkIn === 'string' ? checkIn : moment(checkIn).format('YYYY-MM-DD')
  const businessDay = getBusinessDay()
  
  // Check 1: Check-in must not be on closed day
  if (isClosedDay(checkInStr)) {
    return {
      valid: false,
      reason: `თარიღი ${checkInStr} დახურულია. Night Audit უკვე გაკეთებულია.`
    }
  }
  
  // Check 2: Check-in must be on or after business day
  if (moment(checkInStr).isBefore(businessDay, 'day')) {
    return {
      valid: false,
      reason: `Check-in თარიღი (${checkInStr}) Business Day-მდეა (${businessDay}).`
    }
  }
  
  return { valid: true }
}




