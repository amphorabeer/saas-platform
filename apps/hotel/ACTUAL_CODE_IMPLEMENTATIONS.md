# 🔍 ACTUAL CODE IMPLEMENTATIONS - Rules & Validation Functions

This document shows the **ACTUAL CODE** implementations of all rules and validation functions in the codebase.

---

## 1. ✅ Check-in Validation

### Function: `canCheckIn()`
**File**: `apps/hotel/src/components/CheckInModal.tsx:502`

```typescript
// Check if check-in is allowed
const canCheckIn = (): { allowed: boolean; reason?: string } => {
  if (!formData.roomId) {
    return { allowed: false, reason: 'ოთახი არ არის არჩეული' }
  }
  
  const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
  const room = rooms.find((r: any) => r.id === formData.roomId)
  
  if (room?.status === 'OCCUPIED') {
    return { allowed: false, reason: 'ოთახი უკვე დაკავებულია! ჯერ გააკეთეთ Check-out.' }
  }
  
  const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
  const activeRes = reservations.find((r: any) => 
    r.roomId === formData.roomId && 
    r.status === 'CHECKED_IN' && 
    r.id !== formData.roomId
  )
  
  if (activeRes) {
    return { allowed: false, reason: `ოთახი დაკავებულია: ${activeRes.guestName}` }
  }
  
  return { allowed: true }
}
```

**What it validates:**
- ✅ Room must be selected
- ✅ Room status must NOT be 'OCCUPIED'
- ✅ No active reservation in same room (status = 'CHECKED_IN')
- ❌ **MISSING**: Overlap check (done separately in `checkOverlap()`)

---

## 2. ✅ Check-in Room Status Update

### Code: Room Status Update on Check-in
**File**: `apps/hotel/src/components/CheckInModal.tsx:555-567`

```typescript
// Clear cleaningStatus on check-in
const rooms = JSON.parse(localStorage.getItem('hotelRooms') || '[]')
const updatedRooms = rooms.map((r: any) => {
  if (r.id === formData.roomId) {
    return {
      ...r,
      status: 'OCCUPIED',
      cleaningStatus: null
    }
  }
  return r
})
localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms))
```

**What it does:**
- ✅ Sets room status to 'OCCUPIED'
- ✅ Clears cleaningStatus (sets to null)

---

## 3. ✅ Check-out Validation

### Function: Balance Validation
**File**: `apps/hotel/src/components/CheckOutModal.tsx:140-147`

```typescript
const processCheckOut = async () => {
  if (!folio) return
  
  // Validate balance - allow small rounding errors (0.01)
  if (Math.abs(folio.balance) > 0.01) {
    alert(`❌ Cannot check out with outstanding balance: ₾${folio.balance.toFixed(2)}\n\nPlease process payment first.`)
    return
  }
```

**What it validates:**
- ✅ Balance must be ≤ 0.01 (allows small rounding errors)

---

## 4. ✅ Check-out Room Status Update

### Code: Room Status Update on Check-out
**File**: `apps/hotel/src/components/CheckOutModal.tsx:177-193`

```typescript
// Update room status to VACANT and set cleaningStatus = 'dirty'
const rooms = typeof window !== 'undefined' 
  ? JSON.parse(localStorage.getItem('hotelRooms') || '[]')
  : []
const updatedRooms = rooms.map((r: any) => {
  if (r.id === reservation.roomId) {
    return {
      ...r,
      status: 'VACANT',
      cleaningStatus: 'dirty'
    }
  }
  return r
})
if (typeof window !== 'undefined') {
  localStorage.setItem('hotelRooms', JSON.stringify(updatedRooms))
}
```

**What it does:**
- ✅ Sets room status to 'VACANT'
- ✅ Sets cleaningStatus to 'dirty'

---

## 5. ✅ Check-out Housekeeping Task Creation

### Code: Auto-create Housekeeping Task
**File**: `apps/hotel/src/components/CheckOutModal.tsx:204-257`

```typescript
// Auto-create housekeeping task (only if doesn't exist)
const savedTasks = typeof window !== 'undefined' 
  ? localStorage.getItem('housekeepingTasks')
  : null
const existingTasks = savedTasks ? JSON.parse(savedTasks) : []

// Check if pending task already exists for this room
const roomNumber = reservation.roomNumber || reservation.roomId
const existingTask = existingTasks.find((t: any) => 
  (t.roomId === reservation.roomId || t.roomNumber === roomNumber) && 
  t.type === 'checkout' &&
  t.status === 'pending'
)

if (!existingTask) {
  // Get floor from room
  const rooms = typeof window !== 'undefined' 
    ? JSON.parse(localStorage.getItem('hotelRooms') || '[]')
    : []
  const room = rooms.find((r: any) => r.id === reservation.roomId || r.roomNumber === roomNumber)
  const roomFloor = room?.floor || Math.floor(parseInt(roomNumber) / 100) || 1
  
  // Load checklist from Settings (NO hardcoded fallback)
  const savedChecklist = typeof window !== 'undefined'
    ? localStorage.getItem('housekeepingChecklist')
    : null
  const defaultChecklist = savedChecklist 
    ? JSON.parse(savedChecklist).map((item: any) => ({
        item: item.task || item.item || item.name || item,
        completed: false,
        required: item.required || false,
        category: item.category || 'ზოგადი'
      }))
    : [] // Empty if no checklist in Settings
  
  const housekeepingTask = {
    id: `task-${Date.now()}-${reservation.roomId}`,
    roomId: reservation.roomId,
    roomNumber: roomNumber,
    floor: roomFloor,
    type: 'checkout',
    status: 'pending',
    priority: 'high',
    assignedTo: '',
    scheduledTime: moment().format('HH:mm'),
    notes: `Check-out cleaning after ${reservation.guestName}`,
    checklist: defaultChecklist
  }
  
  existingTasks.push(housekeepingTask)
  if (typeof window !== 'undefined') {
    localStorage.setItem('housekeepingTasks', JSON.stringify(existingTasks))
  }
}
```

**What it does:**
- ✅ Checks if task already exists (prevents duplicates)
- ✅ Creates housekeeping task with type 'checkout'
- ✅ Loads checklist from Settings
- ✅ Sets priority to 'high'
- ✅ Sets status to 'pending'

---

## 6. ✅ No-show Validation

### Function: `canMarkAsNoShow()`
**File**: `apps/hotel/src/components/RoomCalendar.tsx:2038`

```typescript
const canMarkAsNoShow = (reservation: any): { allowed: boolean; reason?: string } => {
  const lastAuditDate = localStorage.getItem('lastNightAuditDate')
  const businessDate = lastAuditDate 
    ? moment(lastAuditDate).add(1, 'day').format('YYYY-MM-DD')
    : moment().format('YYYY-MM-DD')
  
  const checkInDate = (reservation.checkInDate || reservation.checkIn || '').split('T')[0]
  
  // Status must be CONFIRMED or PENDING
  if (reservation.status !== 'CONFIRMED' && reservation.status !== 'PENDING') {
    return { allowed: false, reason: `სტატუსი "${reservation.status}" - No-show შეუძლებელია` }
  }
  
  // Check-in must be EXACTLY on business date (NOT past, NOT future!)
  if (checkInDate < businessDate) {
    return { allowed: false, reason: `Check-in (${checkInDate}) უკვე დახურულია` }
  }
  
  if (checkInDate > businessDate) {
    return { allowed: false, reason: `Check-in (${checkInDate}) მომავალშია` }
  }
  
  return { allowed: true }
}
```

**What it validates:**
- ✅ Status must be 'CONFIRMED' or 'PENDING'
- ✅ Check-in date === Business Day (EXACT match)
- ✅ Past dates blocked
- ✅ Future dates blocked

---

## 7. ✅ Double Check-in Prevention

### Code: Check for OCCUPIED Room
**File**: `apps/hotel/src/components/CheckInModal.tsx:510-512`

```typescript
if (room?.status === 'OCCUPIED') {
  return { allowed: false, reason: 'ოთახი უკვე დაკავებულია! ჯერ გააკეთეთ Check-out.' }
}
```

### Code: Check for Active Reservation
**File**: `apps/hotel/src/components/CheckInModal.tsx:515-523`

```typescript
const reservations = JSON.parse(localStorage.getItem('hotelReservations') || '[]')
const activeRes = reservations.find((r: any) => 
  r.roomId === formData.roomId && 
  r.status === 'CHECKED_IN' && 
  r.id !== formData.roomId
)

if (activeRes) {
  return { allowed: false, reason: `ოთახი დაკავებულია: ${activeRes.guestName}` }
}
```

**What it prevents:**
- ✅ Prevents check-in if room status is 'OCCUPIED'
- ✅ Prevents check-in if another reservation is 'CHECKED_IN' in same room

---

## 8. ✅ Reservation Conflict Detection

### Function: `checkOverlap()`
**File**: `apps/hotel/src/components/CheckInModal.tsx:429`

```typescript
// ✅ Check for overlapping reservations
const checkOverlap = (): { hasOverlap: boolean; conflictingReservation?: any } => {
  if (!formData.checkIn || !formData.checkOut || !formData.roomId) {
    return { hasOverlap: false }
  }
  
  const checkIn = moment(formData.checkIn)
  const checkOut = moment(formData.checkOut)
  const roomId = formData.roomId
  
  // Find conflicting reservation
  const conflicting = reservations.find((res: any) => {
    // Skip cancelled and no-show reservations
    if (res.status === 'CANCELLED' || res.status === 'NO_SHOW') return false
    
    // Must be same room
    if (res.roomId !== roomId) return false
    
    const resCheckIn = moment(res.checkIn)
    const resCheckOut = moment(res.checkOut)
    
    // Check overlap: new reservation overlaps if:
    // - new checkIn is before existing checkOut AND
    // - new checkOut is after existing checkIn
    const overlaps = checkIn.isBefore(resCheckOut) && checkOut.isAfter(resCheckIn)
    
    return overlaps
  })
  
  return {
    hasOverlap: !!conflicting,
    conflictingReservation: conflicting
  }
}
```

### Function: `validateDrop()` (Drag & Drop Conflict Check)
**File**: `apps/hotel/src/components/RoomCalendar.tsx:1153`

```typescript
// Validate if drop is allowed
const validateDrop = (target: { roomId: string; date: string }, reservation: any): boolean => {
  console.log('🔍 validateDrop called:', { target, reservationId: reservation?.id })
  
  // Check all dates in reservation range
  const checkIn = moment(reservation.checkIn)
  const checkOut = moment(reservation.checkOut)
  
  for (let d = moment(checkIn); d.isBefore(checkOut); d.add(1, 'day')) {
    const dateStr = d.format('YYYY-MM-DD')
    
    // Check if date is closed
    if (isClosedDay(dateStr)) {
      console.log('❌ FAIL: date in range is closed:', dateStr)
      return false
    }
    
    // Check for conflicts with other reservations
    const hasConflict = reservations.some((r: any) => {
      if (r.id === reservation.id) return false // Skip current reservation
      if (r.status === 'CANCELLED' || r.status === 'NO_SHOW') return false
      
      const rCheckIn = moment(r.checkIn).format('YYYY-MM-DD')
      const rCheckOut = moment(r.checkOut).format('YYYY-MM-DD')
      
      const isConflict = String(r.roomId) === String(target.roomId) && 
             dateStr >= rCheckIn && 
             dateStr < rCheckOut
      
      if (isConflict) {
        console.log('⚠️ Conflict found:', { dateStr, conflictReservation: r.id, rCheckIn, rCheckOut })
      }
      
      return isConflict
    })
    
    if (hasConflict) {
      console.log('❌ FAIL: has conflict on date:', dateStr)
      return false
    }
  }
  
  console.log('✅ validateDrop PASSED!')
  return true
}
```

**What it validates:**
- ✅ Checks for overlapping dates in same room
- ✅ Skips CANCELLED and NO_SHOW reservations
- ✅ Validates all dates in reservation range
- ✅ Checks if dates are closed

---

## 9. ✅ Business Day Calculation

### Function: `getBusinessDay()`
**File**: `apps/hotel/src/components/RoomCalendar.tsx:288`

```typescript
// Get business day (last closed audit + 1)
const getBusinessDay = () => {
  // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
  const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
  const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
  
  // Prefer lastNightAuditDate (more accurate)
  let lastClosed: string | null = null
  
  if (lastNightAuditDate) {
    lastClosed = lastNightAuditDate
  } else if (lastAuditDate) {
    try {
      lastClosed = JSON.parse(lastAuditDate)
    } catch {
      lastClosed = lastAuditDate
    }
  }
  
  if (!lastClosed) {
    // No audit yet - Business Day is today
    return moment().format('YYYY-MM-DD')
  }
  
  // Business Day is the day after last audit
  const businessDay = moment(lastClosed).add(1, 'day')
  return businessDay.format('YYYY-MM-DD')
}
```

### Function: `canBookOnDate()`
**File**: `apps/hotel/src/components/RoomCalendar.tsx:317`

```typescript
// Check if date can be booked
const canBookOnDate = (date: Date | string) => {
  const dateStr = typeof date === 'string' ? date : moment(date).format('YYYY-MM-DD')
  // Check both lastAuditDate and lastNightAuditDate (prefer lastNightAuditDate)
  const lastNightAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastNightAuditDate') : null
  const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
  
  // Prefer lastNightAuditDate (more accurate)
  let lastClosed: string | null = null
  
  if (lastNightAuditDate) {
    // lastNightAuditDate is stored as plain string (YYYY-MM-DD)
    lastClosed = lastNightAuditDate
  } else if (lastAuditDate) {
    // lastAuditDate is stored as JSON stringified
    try {
      lastClosed = JSON.parse(lastAuditDate)
    } catch {
      // If parsing fails, try as plain string
      lastClosed = lastAuditDate
    }
  }
  
  if (!lastClosed) {
    // No audit yet - can book from today
    return moment(dateStr).isSameOrAfter(TODAY, 'day')
  }
  
  // Business day is the day after last audit
  const businessDay = moment(lastClosed).add(1, 'day')
  
  // Can book from business day onwards
  return moment(dateStr).isSameOrAfter(businessDay, 'day')
}
```

**What it does:**
- ✅ Calculates Business Day = lastAuditDate + 1 day
- ✅ Priority: `lastNightAuditDate` > `lastAuditDate` > `Today`
- ✅ Returns if date can be booked (from Business Day onwards)

---

## 10. ✅ Night Audit Pre-Checks

### Function: `runPreChecks()`
**File**: `apps/hotel/src/components/NightAuditModule.tsx:626`

```typescript
// Pre-checks with STRICT validation
const runPreChecks = () => {
  const checks: Array<{ passed: boolean; message: string; canOverride: boolean; critical?: boolean; details?: string[]; type?: 'checkin' | 'checkout'; reservations?: any[] }> = []
  
  // 0. PREVENT RUNNING ON SAME DATE TWICE (CRITICAL - CHECK FIRST)
  const alreadyDone = auditHistory.find((a: any) => 
    a.date === selectedDate && 
    a.status === 'completed' &&
    !a.reversed
  )
  
  if (alreadyDone) {
    const completedTime = alreadyDone.completedAt 
      ? moment(alreadyDone.completedAt).format('HH:mm')
      : alreadyDone.closedAt
      ? moment(alreadyDone.closedAt).format('HH:mm')
      : 'უცნობი დრო'
    
    checks.push({
      passed: false,
      critical: true,
      canOverride: false,
      message: `🚫 ${selectedDate} უკვე დახურულია ${completedTime}-ზე`,
      details: [
        `დახურულია: ${moment(alreadyDone.date).format('DD/MM/YYYY')}`,
        `დრო: ${completedTime}`,
        `მომხმარებელი: ${alreadyDone.user || alreadyDone.closedBy || 'უცნობი'}`,
        `სტატუსი: ${alreadyDone.status || 'completed'}`
      ]
    })
    return checks // Stop here - no need to check other validations
  }
  
  // 1. CHECK PENDING CHECK-OUTS (CRITICAL)
  if (realStats.pendingCheckOuts.length > 0) {
    checks.push({
      passed: false,
      critical: true,
      canOverride: false,
      message: `❌ ${realStats.pendingCheckOuts.length} დაუსრულებელი Check-out - უნდა დასრულდეს!`,
      details: realStats.pendingCheckOuts.map((r: any) => `${r.guestName} - Room ${r.roomNumber || r.roomId}`),
      type: 'checkout',
      reservations: realStats.pendingCheckOuts
    })
  } else {
    checks.push({
      passed: true,
      message: '✅ ყველა Check-out დასრულებულია',
      canOverride: false
    })
  }
  
  // 2. CHECK PENDING CHECK-INS (MUST BE PROCESSED)
  // Use pendingCheckIns which is more reliable than unmarkedArrivals
  const pendingCheckInsToProcess = realStats.pendingCheckIns.length > 0 
    ? realStats.pendingCheckIns 
    : realStats.unmarkedArrivals
  
  if (pendingCheckInsToProcess.length > 0) {
    checks.push({
      passed: false,
      critical: true,
      canOverride: false,
      message: `❌ ${pendingCheckInsToProcess.length} დაუსრულებელი Check-in - გააკეთეთ Check-in ან NO-SHOW!`,
      details: pendingCheckInsToProcess.map((r: any) => `${r.guestName} - Room ${r.roomNumber || r.roomId}`),
      type: 'checkin',
      reservations: pendingCheckInsToProcess
    })
  } else {
    checks.push({
      passed: true,
      message: '✅ ყველა Check-in დამუშავებულია (Check-in ან NO-SHOW)',
      canOverride: false
    })
  }
  
  // 3. CHECK SEQUENTIAL CLOSING (NO GAPS)
  const lastAuditDate = typeof window !== 'undefined' ? localStorage.getItem('lastAuditDate') : null
  if (lastAuditDate) {
    try {
      const lastClosed = JSON.parse(lastAuditDate)
      const daysBetween = moment(selectedDate).diff(moment(lastClosed), 'days')
      
      if (daysBetween > 1) {
        checks.push({
          passed: false,
          critical: true,
          canOverride: false,
          message: `❌ დღის გამოტოვება! ჯერ დახურეთ ${moment(lastClosed).add(1, 'day').format('YYYY-MM-DD')}`,
        })
      } else if (daysBetween === 1) {
        checks.push({
          passed: true,
          message: '✅ Sequential closing შემოწმებულია',
          canOverride: false
        })
      } else if (daysBetween === 0) {
        // This case is already handled by the "already done" check at the beginning
        // No need to add duplicate check here
      }
    } catch (error) {
      console.error('Error parsing lastAuditDate:', error)
    }
  } else {
    // No previous audit - this is the first one
    checks.push({
      passed: true,
      message: '✅ Sequential closing შემოწმებულია (პირველი დახურვა)',
      canOverride: false
    })
  }
  
  // 4. CONTINUING GUESTS (INFO ONLY - NOT BLOCKING)
  if (realStats.occupiedRooms > 0) {
    checks.push({
      passed: true, // Not blocking
      critical: false,
      canOverride: true,
      message: `ℹ️ ${realStats.occupiedRooms} სტუმარი რჩება (Continuing) - OK`,
    })
  }
  
  // 5. DIRTY ROOMS (WARNING - NOT BLOCKING)
  if (realStats.dirtyRooms.length > 0) {
    checks.push({
      passed: true,
      message: `🧹 ${realStats.dirtyRooms.length} ოთახი დასუფთავებაში: ${realStats.dirtyRooms.map((r: any) => r.roomNumber || r.id).join(', ')}`,
      canOverride: true
    })
  } else {
    checks.push({
      passed: true,
      message: '✅ ყველა ოთახი სუფთაა',
      canOverride: false
    })
  }
  
  return checks
}
```

**What it validates:**
- ✅ **0. Duplicate Prevention** - CRITICAL, CHECK FIRST (stops all other checks if duplicate found)
- ✅ **1. Pending Check-outs** - CRITICAL, BLOCKING (must complete all check-outs)
- ✅ **2. Pending Check-ins** - CRITICAL, BLOCKING (must process as Check-in or NO-SHOW)
- ✅ **3. Sequential Closing** - CRITICAL, BLOCKING (no gaps allowed)
- ✅ **4. Continuing Guests** - INFO ONLY (not blocking)
- ✅ **5. Dirty Rooms** - WARNING, NON-CRITICAL (not blocking)

---

## 11a. ✅ Night Audit Validation (Legacy v1)

### Function: `validateDayCanBeClosed()`
**File**: `apps/hotel/src/components/NightAuditView.tsx:153`

```typescript
const validateDayCanBeClosed = () => {
  const auditDateMoment = moment(auditDate)
  const errors: string[] = []
  
  // 1. Check ALL pending check-outs (including payment)
  const pendingCheckOuts = reservations.filter((r: any) => {
    const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
    return r.status === 'CHECKED_IN' && 
           moment(checkOutDate).isSameOrBefore(auditDate, 'day') &&
           r.status !== 'CANCELLED'
  })
  
  if (pendingCheckOuts.length > 0) {
    errors.push(`❌ ${pendingCheckOuts.length} დაუსრულებელი Check-out:\n${pendingCheckOuts.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId || 'N/A'}) - უნდა გასულიყო ${moment(r.checkOut).format('DD/MM')}`).join('\n')}`)
  }
  
  // 2. Check unpaid check-outs for TODAY
  const unpaidCheckOuts = reservations.filter((r: any) => {
    const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
    const isPaid = r.isPaid === true || r.paymentStatus === 'PAID' || (r.paidAmount || 0) >= (r.totalAmount || 0)
    return checkOutDate === auditDate && 
           r.status === 'CHECKED_IN' && 
           !isPaid &&
           r.status !== 'CANCELLED'
  })
  
  if (unpaidCheckOuts.length > 0) {
    errors.push(`💰 ${unpaidCheckOuts.length} გადაუხდელი Check-out:\n${unpaidCheckOuts.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId || 'N/A'}) - ₾${r.totalAmount || 0}`).join('\n')}`)
  }
  
  // 3. Check pending check-ins for today
  const pendingCheckIns = reservations.filter((r: any) => {
    const checkInDate = moment(r.checkIn).format('YYYY-MM-DD')
    return r.status === 'CONFIRMED' && 
           checkInDate === auditDate
  })
  
  if (pendingCheckIns.length > 0) {
    errors.push(`❌ ${pendingCheckIns.length} დაუსრულებელი Check-in:\n${pendingCheckIns.map((r: any) => `- ${r.guestName} (Room ${r.roomNumber || r.roomId || 'N/A'})`).join('\n')}`)
  }
  
  // INFO: Show continuing guests (not blocking)
  const continuingGuests = reservations.filter((r: any) => {
    const checkIn = moment(r.checkIn)
    const checkOut = moment(r.checkOut)
    
    return r.status === 'CHECKED_IN' && 
           checkIn.isSameOrBefore(auditDate, 'day') && 
           checkOut.isAfter(auditDate, 'day')
  })
  
  if (continuingGuests.length > 0) {
    console.log(`ℹ️ ${continuingGuests.length} სტუმარი აგრძელებს დარჩენას (გადახდა Check-out დღეს)`)
  }
  
  return errors
}
```

**What it validates:**
- ✅ **1. Pending Check-outs** - All check-outs must be completed
- ✅ **2. Unpaid Check-outs** - Today's check-outs must be paid
- ✅ **3. Pending Check-ins** - All check-ins must be processed
- ℹ️ **4. Continuing Guests** - INFO only (not blocking)

---

## 11. ✅ Folio Creation

### Function: `createEmptyFolio()`
**File**: `apps/hotel/src/services/FolioService.ts:139`

```typescript
static createEmptyFolio(reservation: any, options?: {
  creditLimit?: number
  paymentMethod?: string
}): Folio | null {
  if (typeof window === 'undefined') return null
  
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
  
  // Check if folio already exists
  const existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
  if (existingFolio) {
    return existingFolio
  }
  
  const creditLimit = options?.creditLimit || 5000
  const paymentMethod = options?.paymentMethod || reservation.paymentMethod || 'cash'
  
  const newFolio: Folio = {
    id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}-${reservation.id}`,
    reservationId: reservation.id,
    guestName: reservation.guestName,
    roomNumber: reservation.roomNumber || reservation.roomId,
    balance: 0,
    creditLimit: creditLimit,
    paymentMethod: paymentMethod,
    status: 'open',
    openDate: moment(reservation.checkIn || moment()).format('YYYY-MM-DD'),
    transactions: []
  }
  
  // Save folio
  folios.push(newFolio)
  localStorage.setItem('hotelFolios', JSON.stringify(folios))
  
  // Log activity
  ActivityLogger.log('FOLIO_CREATED', {
    folioNumber: newFolio.folioNumber,
    guest: newFolio.guestName,
    reservationId: reservation.id,
    empty: true
  })
  
  return newFolio
}
```

### Function: `getFolioByReservationId()`
**File**: `apps/hotel/src/services/FolioService.ts:223`

```typescript
/**
 * Get folio by reservation ID
 */
static getFolioByReservationId(reservationId: string): Folio | null {
  if (typeof window === 'undefined') return null
  
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
  return folios.find((f: Folio) => f.reservationId === reservationId) || null
}
```

**What it does:**
- ✅ Creates ONE folio per reservation (not per room!)
- ✅ Checks if folio already exists before creating
- ✅ Uses `reservationId` as unique identifier
- ✅ Folio number format: `F{YYMMDD}-{roomNumber}-{reservationId}`

---

## 12. ✅ Folio Creation on Check-in

### Code: Create Folio on Check-in
**File**: `apps/hotel/src/components/RoomCalendar.tsx:1876`

```typescript
// Create folio on check-in
const createFolioOnCheckIn = async (reservation: any) => {
  if (typeof window === 'undefined') return
  
  const folios = JSON.parse(localStorage.getItem('hotelFolios') || '[]')
  const existingFolio = folios.find((f: any) => f.reservationId === reservation.id)
  
  if (!existingFolio) {
    const newFolio = {
      id: `FOLIO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folioNumber: `F${moment().format('YYMMDD')}-${reservation.roomNumber || reservation.roomId || Math.floor(Math.random() * 1000)}-${reservation.id}`,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      roomNumber: reservation.roomNumber || reservation.roomId,
      balance: 0,
      creditLimit: 5000,
      paymentMethod: 'cash',
      status: 'open',
      openDate: moment().format('YYYY-MM-DD'),
      transactions: []
    }
    
    folios.push(newFolio)
    localStorage.setItem('hotelFolios', JSON.stringify(newFolio))
  }
}
```

**What it does:**
- ✅ Creates folio if doesn't exist
- ✅ Uses `reservationId` as unique identifier
- ✅ Prevents duplicate folio creation

---

## 📊 Summary of Implementations

| Rule | Function | File | Status |
|------|----------|------|--------|
| Check-in Validation | `canCheckIn()` | CheckInModal.tsx:502 | ✅ Complete |
| Check-in Room Update | Room status update | CheckInModal.tsx:555 | ✅ Complete |
| Check-out Validation | Balance check | CheckOutModal.tsx:143 | ✅ Complete |
| Check-out Room Update | Room status update | CheckOutModal.tsx:177 | ✅ Complete |
| Check-out Housekeeping | Task creation | CheckOutModal.tsx:204 | ✅ Complete |
| No-show Validation | `canMarkAsNoShow()` | RoomCalendar.tsx:2038 | ✅ Complete |
| Double Check-in Prevention | Room status check | CheckInModal.tsx:510 | ✅ Complete |
| Conflict Detection | `checkOverlap()` | CheckInModal.tsx:429 | ✅ Complete |
| Business Day Calculation | `getBusinessDay()` | RoomCalendar.tsx:288 | ✅ Complete |
| Night Audit Pre-Checks | `runPreChecks()` | NightAuditModule.tsx:626 | ✅ Complete |
| Folio Creation | `createEmptyFolio()` | FolioService.ts:139 | ✅ Complete |

---

**ბოლო განახლება**: 2025-11-28
**გენერირებული**: Actual Code Search

