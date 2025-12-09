# 📋 PMS System Rules & Logic - Current Implementation (As-Is)

**Documentation Date**: 2025-12-08  
**Purpose**: Complete READ-ONLY analysis of current system behavior, rules, formulas, and logic as implemented in code.  
**Status**: No code changes - documentation only.

---

## 📅 1. Calendar & Reservations

### 1.1 Business Day Logic

**Function**: `getBusinessDay()`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~290)

**Priority Order**:
1. `lastNightAuditDate` (localStorage, plain string `YYYY-MM-DD`) - **PREFERRED**
2. `lastAuditDate` (localStorage, JSON stringified) - **FALLBACK**
3. `moment().format('YYYY-MM-DD')` (today) - **DEFAULT**

**Logic**:
```typescript
if (!lastClosed) {
  businessDay = today
} else {
  businessDay = moment(lastClosed).add(1, 'day').format('YYYY-MM-DD')
}
```

**Examples**:
- No audit → Business Day = 2025-12-08 (today)
- Last audit = 2025-12-06 → Business Day = 2025-12-07
- Last audit = 2025-12-07 → Business Day = 2025-12-08

---

### 1.2 Closed Days Logic

**Function**: `isClosedDay(date: Date | string)`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~612)

**Rules**:

**If no Night Audit exists**:
- ✅ **Closed**: All dates before today (`date < today`)
- ✅ **Open**: Today and future dates (`date >= today`)

**If Night Audit exists**:
- ✅ **Closed**: Dates `<= lastAuditDate` (inclusive)
- ✅ **Open**: Dates `> lastAuditDate`

**Implementation**:
```typescript
if (!lastClosed) {
  return moment(dateStr).isBefore(TODAY, 'day')
} else {
  const businessDay = moment(lastClosed).add(1, 'day')
  return moment(dateStr).isSameOrBefore(lastClosed, 'day')
}
```

**Example**:
- Last audit = 2025-12-06
- Closed: 2025-12-06 and earlier
- Open: 2025-12-07 onwards

---

### 1.3 Booking Date Validation

**Function**: `canBookOnDate(date: Date | string)`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~319)

**Rules**:

**If no Night Audit**:
- ✅ **Allowed**: `date >= today`
- ❌ **Blocked**: `date < today`

**If Night Audit exists**:
- ✅ **Allowed**: `date >= businessDay` (where `businessDay = lastClosed + 1 day`)
- ❌ **Blocked**: `date < businessDay`

**Implementation**:
```typescript
if (!lastClosed) {
  return moment(dateStr).isSameOrAfter(TODAY, 'day')
} else {
  const businessDay = moment(lastClosed).add(1, 'day')
  return moment(dateStr).isSameOrAfter(businessDay, 'day')
}
```

---

### 1.4 Drag & Drop Validation

**Function**: `validateDrop(target, reservation)`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~1162)

**Validation Steps**:

1. **Target date check**:
   - ❌ If `isClosedDay(target.date)` → reject

2. **Room existence**:
   - ❌ If room not found → reject

3. **Maintenance check**:
   - ❌ If room in maintenance → reject

4. **Date range validation**:
   - Calculate `newCheckIn` and `newCheckOut` from drop position
   - For each day in range (`newCheckIn` to `newCheckOut`):
     - ❌ If `isClosedDay(date)` → reject
     - ❌ If conflict with other reservation (same room, overlapping dates, status not CANCELLED/NO_SHOW) → reject

5. **Overlap detection**:
   ```typescript
   const isConflict = String(r.roomId) === String(target.roomId) && 
          dateStr >= rCheckIn && 
          dateStr < rCheckOut
   ```

**Allowed Actions on Closed Dates**:
- ✅ Check-out (always allowed)
- ✅ Payment (always allowed)
- ✅ View details (always allowed)
- ❌ Check-in (blocked if check-in date is closed)
- ❌ Edit reservation (blocked if check-in date is closed)
- ❌ Cancel (blocked if check-in date is closed)
- ❌ No-show (blocked if check-in date is closed)
- ❌ New reservation (blocked if check-in date is closed)

---

### 1.5 Overlap Detection

**Function**: `checkOverlap()`  
**Location**: `apps/hotel/src/components/CheckInModal.tsx` (line ~432)

**Logic**:

1. **Skip conditions**:
   - Skip if `res.status === 'CANCELLED'` or `res.status === 'NO_SHOW'`
   - Skip if editing same reservation (`res.id === reservation.id`)

2. **Room match**:
   - Must be same room: `res.roomId === formData.roomId` or `res.room?.id === formData.roomId`

3. **Date overlap**:
   ```typescript
   const overlaps = checkInDate.isBefore(resCheckOutDate) && 
                    checkOutDate.isAfter(resCheckInDate)
   ```
   - **Same-day checkout/checkin allowed**: If `newCheckIn === existingCheckOut`, no overlap (checkout day is free)

**Returns**: `{ hasOverlap: boolean, conflictingReservation?: any }`

---

## ✅ 2. Check-in / Check-out / No-show

### 2.1 Check-in Validation

**Function**: `canCheckIn()`  
**Location**: `apps/hotel/src/components/CheckInModal.tsx` (line ~525)

**For NEW Reservations** (no existing reservation):
- ✅ Only checks overlap (via `checkOverlap()`)
- ✅ Does NOT check room OCCUPIED status (reservation is for future dates)
- ❌ Blocks if overlap exists

**For CHECK-IN** (existing reservation):
- ❌ Blocks if `room.status === 'OCCUPIED'`:
  ```
  "ოთახი {roomNumber} უკვე დაკავებულია!\nჯერ გააკეთეთ Check-out."
  ```
- ❌ Blocks if active reservation in same room:
  ```typescript
  r.roomId === formData.roomId &&
  r.status === 'CHECKED_IN' &&
  r.id !== reservation.id  // ⚠️ NOTE: Compares reservation.id, not room.id
  ```
  Error: `"ოთახზე შემოსულია: {activeRes.guestName}"`

**Missing Checks** (not in code but mentioned in rules):
- ❌ No direct check that `checkInDate >= businessDay`
- ❌ No direct `isClosedDay(checkInDate)` check

---

### 2.2 Check-in Process

**Location**: `apps/hotel/src/app/api/hotel/check-in/route.ts` (POST method)

**Steps**:

1. **Create reservation**:
   - Status: `'CHECKED_IN'`
   - Calculate `totalAmount`:
     ```typescript
     const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
     const totalAmount = data.totalAmount || (room.basePrice * nights)
     ```

2. **Update room status**:
   ```typescript
   status = 'OCCUPIED'
   cleaningStatus = null  // Cleared for occupied rooms
   ```

3. **Folio creation** (see Folios section below)

---

### 2.3 Check-out Validation

**Function**: `processCheckOut()`  
**Location**: `apps/hotel/src/components/CheckOutModal.tsx` (line ~140)

**Balance Validation**:
```typescript
if (Math.abs(folio.balance) > 0.01) {
  alert("Cannot check out with outstanding balance: ₾{balance}")
  return
}
```
- Tolerance: `0.01` (allows small rounding errors)
- Folio must be near zero before check-out

---

### 2.4 Check-out Process

**Location**: `apps/hotel/src/components/CheckOutModal.tsx` (line ~140)

**Steps**:

1. **Update reservation**:
   - Status: `'CHECKED_OUT'`
   - `actualCheckOut`: current timestamp
   - `checkedOutAt`: current timestamp

2. **Close folio**:
   ```typescript
   FolioService.closeFolio(folio.id, closedBy)
   ```
   - Sets `status = 'closed'`
   - Sets `closedBy`, `closedAt`, `closedDate`

3. **Update room status**:
   ```typescript
   status = 'VACANT'
   cleaningStatus = 'dirty'
   ```

4. **Auto-create housekeeping task** (see Housekeeping section)

---

### 2.5 No-show Validation

**Function**: `canMarkAsNoShow(reservation)`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~2205)

**Rules**:

1. **Status check**:
   - ✅ Must be `'CONFIRMED'` or `'PENDING'`
   - ❌ Other statuses → blocked with reason: `"სტატუსი '{status}' - No-show შეუძლებელია"`

2. **Date check**:
   - Calculate `businessDate`:
     ```typescript
     const lastAuditDate = localStorage.getItem('lastNightAuditDate')
     const businessDate = lastAuditDate 
       ? moment(lastAuditDate).add(1, 'day').format('YYYY-MM-DD')
       : moment().format('YYYY-MM-DD')
     ```
   - Extract `checkInDate` from reservation
   - ❌ If `checkInDate < businessDate` → blocked: `"Check-in ({checkInDate}) უკვე დახურულია"`
   - ❌ If `checkInDate > businessDate` → blocked: `"Check-in ({checkInDate}) მომავალშია"`
   - ✅ Only allowed if `checkInDate === businessDate` (exact match)

**Result**: No-show can only be marked on Business Day reservations, not past/future.

---

### 2.6 No-show Charge Calculation

**Function**: `calculateCharge(chargePolicy, reservation, customCharge?)`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~2185)

**Formula**:
```typescript
const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
const perNight = nights > 0 ? reservation.totalAmount / nights : reservation.totalAmount
```

**Charge Policies**:

- **`'first'`**: `return perNight` (first night rate)
- **`'full'`**: `return reservation.totalAmount` (full stay amount)
- **`'none'`**: `return 0` (no charge)
- **`'custom'`**: `return customCharge || 0` (user-specified amount)
- **Default**: `return perNight` (first night)

**No-show Fields** (when marking no-show):
- `status = 'NO_SHOW'`
- `noShowDate = moment().format()`
- `noShowCharge = calculateCharge(...)`
- `noShowReason`
- `markedAsNoShowAt`
- `noShowMarkedBy`
- `roomReleased` (boolean - if true, room becomes VACANT)

---

### 2.7 Night Audit Auto No-show

**Location**: `apps/hotel/src/components/NightAuditView.tsx` (line ~459)

**Process**:
- For reservations with `checkIn === auditDate` and `status === 'CONFIRMED'` or `'PENDING'`
- Prompts user to process as Check-in or No-show
- No auto-post without confirmation

**Calculation** (NightAuditView):
```typescript
const calculateNoShowCharge = (reservation: any) => {
  const nights = moment(reservation.checkOut).diff(moment(reservation.checkIn), 'days')
  if (nights > 0) {
    return reservation.totalAmount / nights  // First night only
  }
  return reservation.totalAmount
}
```

---

## 🧹 3. Housekeeping

### 3.1 Cleaning Status States

**Possible Values**:
- `'dirty'` → needs cleaning
- `'cleaning'` → in progress
- `'clean'` / `'inspected'` → ready

**Location**: `apps/hotel/src/components/HousekeepingView.tsx` and room status updates

---

### 3.2 Cleaning Status Transitions

**Check-out → Dirty**:
- **Location**: `apps/hotel/src/components/CheckOutModal.tsx` (line ~186)
- **Action**: `cleaningStatus = 'dirty'`
- **Trigger**: On successful check-out

**Task Start → Cleaning**:
- **Location**: `apps/hotel/src/components/HousekeepingView.tsx` (line ~296)
- **Action**: `cleaningStatus = 'cleaning'`
- **Trigger**: When housekeeping task status changes to `'in_progress'`

**Verify → Clean**:
- **Location**: `apps/hotel/src/components/HousekeepingView.tsx` (line ~333)
- **Action**: `cleaningStatus = 'clean'` AND `status = 'VACANT'`
- **Trigger**: When task status changes to `'verified'`

---

### 3.3 Housekeeping Task Creation

**Auto-creation on Check-out**:
- **Location**: `apps/hotel/src/components/CheckOutModal.tsx` (line ~204)
- **Condition**: Only if no pending task exists for this room
- **Check**:
  ```typescript
  const existingTask = existingTasks.find((t: any) => 
    (t.roomId === reservation.roomId || t.roomNumber === roomNumber) && 
    t.type === 'checkout' &&
    t.status === 'pending'
  )
  ```

**Task Structure**:
```typescript
{
  id: `task-${Date.now()}-${room.id}`,
  roomId: room.id,
  roomNumber: room.roomNumber,
  floor: room.floor || calculated,
  type: 'checkout',
  status: 'pending',
  priority: 'high',
  assignedTo: '',
  scheduledTime: moment().format('HH:mm'),
  checklist: from housekeepingChecklist (Settings)
}
```

**Storage**:
- **Active tasks**: `localStorage.getItem('housekeepingTasks')`
- **Archived tasks**: `localStorage.getItem('housekeepingArchive')`
- **Checklist**: `localStorage.getItem('housekeepingChecklist')`

**Auto-archive**: Tasks with `status === 'verified'` and `completedAt > 2 days ago` are moved to archive.

---

## 💰 4. Folios & Payments

### 4.1 Folio Structure

**One Folio Per Reservation**:
- Key: `reservationId` (unique)
- Location: `apps/hotel/src/services/FolioService.ts`

**Folio Fields**:
```typescript
{
  id: string,                    // "FOLIO-{timestamp}-{random}"
  folioNumber: string,           // "F{YYMMDD}-{roomNumber}-{random4chars}"
  reservationId: string,         // Links to reservation
  guestName: string,
  roomNumber: string,
  balance: number,               // Calculated from transactions
  creditLimit: number,           // Default: 5000
  paymentMethod: string,         // Default: 'cash'
  status: 'open' | 'closed',
  openDate: string,             // YYYY-MM-DD
  closedDate?: string,
  closedAt?: string,
  closedBy?: string,
  transactions: FolioTransaction[]
}
```

**Transaction Structure**:
```typescript
{
  id: string,
  folioId: string,
  date: string,                  // YYYY-MM-DD (uses Business Date for payments)
  time: string,                  // HH:mm:ss
  type: 'charge' | 'payment',
  category: string,              // 'room', 'payment', 'food', etc.
  description: string,
  debit: number,                 // For charges
  credit: number,                // For payments
  balance: number,               // Running balance
  postedBy: string,
  postedAt: string,
  paymentMethod?: string,        // For payments: 'cash', 'card', 'bank', etc.
  referenceId?: string,
  nightAuditDate?: string,       // For room charges
  prePosted?: boolean           // If pre-posted on reservation creation
}
```

---

### 4.2 Folio Creation

**Service-based**: `FolioService.createFolioForReservation(reservation, options?)`  
**Location**: `apps/hotel/src/services/FolioService.ts` (line ~34)

**Options**:
- `prePostCharges?: boolean` (default: `true`)
- `creditLimit?: number` (default: `5000`)
- `paymentMethod?: string` (default: `'cash'`)

**Pre-posting Logic** (if `prePostCharges === true`):
```typescript
const nights = Math.max(1, moment(checkOut).diff(moment(checkIn), 'days'))
const ratePerNight = totalAmount / nights

for (let i = 0; i < nights; i++) {
  const chargeDate = moment(checkIn).add(i, 'days').format('YYYY-MM-DD')
  transactions.push({
    type: 'charge',
    category: 'room',
    description: `ოთახის ღირებულება - ღამე ${i + 1}`,
    debit: ratePerNight,
    date: chargeDate,
    nightAuditDate: chargeDate,
    prePosted: true
  })
}
```

**Folio Number Format**:
```typescript
folioNumber: `F${moment().format('YYMMDD')}-${roomNumber}-${Math.random().toString(36).substring(2, 6)}`
```
- Example: `F251207-101-x8k4` (short 4-character random ID)

**Storage**: `localStorage.setItem('hotelFolios', JSON.stringify(folios))`

---

### 4.3 Empty Folio Creation

**Service-based**: `FolioService.createEmptyFolio(reservation, options?)`  
**Location**: `apps/hotel/src/services/FolioService.ts` (line ~139)

**Used by**:
- `FolioManager` (when folio needed but charges not pre-posted)
- `CheckOutModal` (when folio needed for payment)
- `PostingService` (when creating folio for room charge posting)

**Structure**: Same as above, but `transactions: []` and `balance: 0`

---

### 4.4 Inline Folio Creation (RoomCalendar)

**Function**: `createFolioOnCheckIn(reservation)`  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~1904)

**⚠️ NOTE**: This function stores single folio instead of full array:
```typescript
folios.push(newFolio)
localStorage.setItem('hotelFolios', JSON.stringify(folios))  // ✅ Correct
```
Actually, it does store full array - the code is correct.

---

### 4.5 Payment Storage

**Payment Transaction**:
```typescript
{
  type: 'payment',
  category: 'payment',
  description: `Payment by ${paymentMethod}`,
  debit: 0,
  credit: paymentAmount,
  date: localStorage.getItem('currentBusinessDate') || moment().format('YYYY-MM-DD'),  // Uses Business Date
  time: moment().format('HH:mm:ss'),
  paymentMethod: paymentMethod,  // 'cash', 'card', 'bank', etc.
  referenceId: `PAY-${reservation.id}-${Date.now()}`
}
```

**Locations**:
- `apps/hotel/src/components/FolioManager.tsx` (line ~219)
- `apps/hotel/src/components/FolioViewModal.tsx` (line ~142)
- `apps/hotel/src/components/CheckOutModal.tsx` (line ~78)

**Balance Calculation**:
```typescript
balance = transactions.reduce((balance, trx) => {
  return balance + (trx.debit || 0) - (trx.credit || 0)
}, 0)
```

---

## 💳 5. Cashier / სალარო

### 5.1 Shift Structure

**Location**: `apps/hotel/src/components/CashierModule.tsx` (line ~7)

**Shift Interface**:
```typescript
{
  id: string,                    // "CS{timestamp}"
  userId: string,
  userName: string,
  openingBalance: number,
  cashCollected: number,
  cardPayments: number,
  chequePayments: number,
  bankTransfers: number,
  expenses: number,
  totalCollected: number,
  expectedAmount: number,
  discrepancy: number,
  discrepancyReason?: string,
  openedAt: string,              // ISO timestamp
  closedAt?: string,
  closedDate?: string,           // Business Date
  status: 'open' | 'closed',
  withdrawal?: number,
  nextDayOpening?: number,
  transactionCount?: number,
  transactions?: any[],           // Folio payments + manual income
  manualTransactions?: any[]     // All manual transactions
}
```

**Storage**:
- **Current shift**: `localStorage.getItem('currentCashierShift')`
- **Shift history**: `localStorage.getItem('cashierShifts')` (array)
- **Manual transactions**: `localStorage.getItem('cashierManualTransactions')` (array)

---

### 5.2 Opening Balance

**Location**: `apps/hotel/src/components/CashierManagement.tsx` (line ~52)

**Auto-fill Logic**:
```typescript
const getPreviousClosingBalance = () => {
  const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
  if (history.length > 0) {
    const lastSession = history[history.length - 1]
    return lastSession?.closingBalance || 0
  }
  return 0
}

const [openingBalance, setOpeningBalance] = useState(() => {
  const prevBalance = getPreviousClosingBalance()
  return prevBalance > 0 ? prevBalance.toString() : ''
})
```

**Opening Process**:
```typescript
const openCashier = () => {
  const history = JSON.parse(localStorage.getItem('cashierHistory') || '[]')
  const lastSession = history.length > 0 ? history[history.length - 1] : null
  const previousClosingBalance = lastSession?.closingBalance || 0
  
  const balance = parseFloat(openingBalance) || previousClosingBalance
  // ... create new shift
}
```

---

### 5.3 Transaction Loading

**Location**: `apps/hotel/src/components/CashierModule.tsx` (line ~64)

**Sources**:

1. **Folio Payments**:
   ```typescript
   folios.forEach((folio: any) => {
     folio.transactions.forEach((t: any) => {
       if (t.credit > 0 && t.date === businessDate) {
         // Add to transactions
       }
     })
   })
   ```

2. **Manual Transactions**:
   ```typescript
   const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
   const todayManual = savedManual.filter((t: any) => t.date === businessDate)
   ```

**Transaction Types**:
- `type: 'income'` → Added to `transactions` array (counted in cash/card/bank totals)
- `type: 'expense'` → Added to `manualTransactions` array (subtracted from totals)

---

### 5.4 X-Report (Current Shift)

**Function**: `generateXReport()`  
**Location**: `apps/hotel/src/components/CashierModule.tsx` (line ~346)

**Calculations**:
```typescript
const allTransactions = [...transactions, ...manualTransactions]
const totals = calculateCashierTotals(allTransactions.filter(t => t.type === 'income'))
const expenses = allTransactions.filter(t => t.type === 'expense')
const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)

expectedCash = openingBalance + totals.cash - totalExpenses
```

**Totals by Method**:
```typescript
const calculateCashierTotals = (transactions: any[]) => {
  let cash = 0, card = 0, bank = 0
  transactions.forEach(t => {
    if (t.method === 'cash' || t.method === 'CASH') cash += t.amount
    else if (t.method === 'card' || t.method === 'credit_card' || t.method === 'CARD') card += t.amount
    else if (t.method === 'bank' || t.method === 'bank_transfer' || t.method === 'BANK') bank += t.amount
  })
  return { cash, card, bank, total: cash + card + bank }
}
```

**X-Report Fields**:
- Opening Balance
- Cash Sales
- Card Sales
- Bank Transfers
- Total Sales
- Expenses
- Expected Cash
- Transaction Count

---

### 5.5 Z-Report (Day Closing)

**Function**: `handleCloseShift()`  
**Location**: `apps/hotel/src/components/CashierModule.tsx` (line ~373)

**Calculations**:
```typescript
const expectedCash = (openingBalance || 0) + calculatedTotals.cash - calculatedTotals.expenses
const discrepancy = actualCash - expectedCash
const withdrawal = actualCash - nextDayBalance
```

**Tax Breakdown**:
```typescript
const taxData = calculateTaxBreakdown(calculatedTotals.total)
```

**Closed Shift Saved To**:
- `cashierShifts` (history array)
- Includes all transactions and manual transactions for reference

**⚠️ NOTE**: In Night Audit Z-REPORT "Cashier" block, some values show 0 while Cashier module has data → integration not fully wired.

---

## 📊 6. Financial Dashboard (Daily)

**Location**: `apps/hotel/src/components/FinancialDashboard.tsx`  
**Service**: `apps/hotel/src/services/FinancialReportsService.ts`

### 6.1 Revenue Calculation

**Function**: `generateDailyRevenueReport(date: string)`  
**Location**: `apps/hotel/src/services/FinancialReportsService.ts` (line ~6)

**Sources**:

1. **Room Charges** (from folio transactions):
   ```typescript
   const dayTransactions = folios.flatMap((f: any) => 
     f.transactions.filter((t: any) => {
       if (t.type !== 'charge') return false
       if (t.id && t.id.startsWith('adj-')) return false  // Exclude adjustments
       const transactionDate = moment(t.date).format('YYYY-MM-DD')
       return transactionDate === targetDate
     })
   )
   ```

2. **Group by Category**:
   ```typescript
   const revenueByCategory = this.groupByCategory(dayTransactions)
   ```

3. **Total Revenue**:
   ```typescript
   const totalRevenue = Object.values(revenueByCategory).reduce((sum: number, val: number) => {
     const numVal = Number(val) || 0
     return sum + numVal
   }, 0)
   ```

**Formula**: `Total Revenue = Sum of all charge transactions for the date`

---

### 6.2 Occupancy Calculation

**Function**: `generateManagerReport(date: string)`  
**Location**: `apps/hotel/src/services/FinancialReportsService.ts` (line ~281)

**Formula**:
```typescript
const occupiedRooms = reservations.filter((r: any) => r.status === 'CHECKED_IN').length
const totalRooms = rooms.length || 1
const occupancy = (occupiedRooms / totalRooms) * 100
```

**Example**: 3 rooms, 3 occupied → 100%

---

### 6.3 ADR (Average Daily Rate)

**Location**: `apps/hotel/src/services/FinancialReportsService.ts` (line ~323)

**Formula**:
```typescript
const roomRevenue = Number(revenueReport.revenue.byCategory.room) || 0
const adr = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0
```

**Example**: `450 / 3 = 150`

---

### 6.4 RevPAR (Revenue Per Available Room)

**Location**: `apps/hotel/src/services/FinancialReportsService.ts` (line ~327)

**Formula**:
```typescript
const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0
```

**Example**: For 3 rooms, `450 / 3 = 150`

---

### 6.5 Payment Methods

**Function**: `getPaymentSummary(date: string)`  
**Location**: `apps/hotel/src/services/FinancialReportsService.ts` (line ~219)

**Sources**:

1. **Cashier Manual Transactions**:
   ```typescript
   const savedManual = JSON.parse(localStorage.getItem('cashierManualTransactions') || '[]')
   const dayPayments = savedManual.filter((t: any) => 
     moment(t.date).format('YYYY-MM-DD') === targetDate && 
     t.type === 'income'
   )
   ```

2. **Folio Transactions**:
   ```typescript
   const folioPayments = folios.flatMap((f: any) =>
     (f.transactions || []).filter((t: any) => 
       moment(t.date).format('YYYY-MM-DD') === targetDate && 
       t.type === 'payment'
     )
   )
   ```

3. **Combine and Deduplicate** (by `referenceId`)

**Grouping**:
```typescript
const paymentMethods: Record<string, number> = {
  cash: 0, card: 0, bank: 0, company: 0, debit: 0, online: 0, voucher: 0, deposit: 0
}

allPayments.forEach((p: any) => {
  const method = p.paymentMethod || p.method || 'cash'
  const amount = Number(p.credit) || Number(p.amount) || 0
  if (paymentMethods.hasOwnProperty(method)) {
    paymentMethods[method] += amount
  } else {
    paymentMethods.cash += amount  // Default to cash
  }
})
```

---

### 6.6 Tax Summary

**Function**: `calculateTaxBreakdown(grossAmount: number)`  
**Location**: `apps/hotel/src/utils/taxCalculator.ts` (line ~15)

**Tax Rates Source**:
- Loads from `localStorage.getItem('hotelTaxes')`
- Default: `[{ name: 'VAT', rate: 18 }, { name: 'Service', rate: 10 }]`

**Formula (TAX INCLUSIVE)**:
```typescript
const totalTaxRate = taxes.reduce((sum, t) => sum + (t.rate || 0), 0)
const divisor = 1 + (totalTaxRate / 100)
const netAmount = grossAmount / divisor

// Each tax
const taxAmount = netAmount * (taxRate / 100)
const totalTax = sum of all tax amounts
```

**Example**:
- Gross: ₾100
- Total tax rate: 28% (18% VAT + 10% Service)
- Net: `100 / 1.28 = 78.13`
- VAT: `78.13 * 0.18 = 14.06`
- Service: `78.13 * 0.10 = 7.81`
- Total Tax: `21.87`

---

### 6.7 Financial Position

**Outstanding Balances**:
```typescript
const outstandingBalances = folios
  .filter((f: any) => f.status === 'open' && f.balance > 0)
  .reduce((sum: number, f: any) => sum + (Number(f.balance) || 0), 0)
```

**Cash Position**: `revenueReport.payments.methods.cash`  
**Credit Card Receipts**: `revenueReport.payments.methods.card`

---

## 🌙 7. Night Audit

### 7.1 Pre-checks

**Function**: `runPreChecks()`  
**Location**: `apps/hotel/src/components/NightAuditModule.tsx` (line ~865)

**Order of Checks**:

**0. Duplicate Prevention (CRITICAL - CHECK FIRST)**:
```typescript
const alreadyDone = auditHistory.find((a: any) => 
  a.date === selectedDate && 
  a.status === 'completed' &&
  !a.reversed
)
```
- ❌ **BLOCKING** - If audit for `selectedDate` already completed and not reversed → BLOCK
- Cannot override

**1. Pending Check-outs (CRITICAL)**:
```typescript
const pendingCheckOuts = reservations.filter((r: any) => {
  const checkOutDate = moment(r.checkOut).format('YYYY-MM-DD')
  return r.status === 'CHECKED_IN' && 
         checkOutDate <= selectedDate &&
         r.status !== 'CANCELLED'
})
```
- ❌ **BLOCKING** - Any reservations with `status === 'CHECKED_IN'` and `checkOut <= auditDate` → BLOCK
- Cannot override

**2. Pending Check-ins (CRITICAL)**:
```typescript
const pendingCheckIns = realStats.pendingCheckIns || realStats.unmarkedArrivals
```
- ❌ **BLOCKING** - Any with `status === 'CONFIRMED'` and `checkIn === auditDate` → must be processed as Check-in or No-show → BLOCK
- Cannot override

**3. Sequential Closing (CRITICAL)**:
```typescript
const lastAuditDate = localStorage.getItem('lastAuditDate')  // ⚠️ NOTE: Uses lastAuditDate, not lastNightAuditDate
if (lastAuditDate) {
  const lastClosed = JSON.parse(lastAuditDate)
  const daysBetween = moment(selectedDate).diff(moment(lastClosed), 'days')
  
  if (daysBetween > 1) {
    // ❌ BLOCKING - Gap detected
  } else if (daysBetween === 1) {
    // ✅ OK - Sequential
  }
}
```
- ❌ **BLOCKING** - If `daysBetween > 1` → BLOCK (no gaps allowed)
- ✅ If `daysBetween === 1` → OK
- ⚠️ **NOTE**: Uses `lastAuditDate` (legacy) instead of `lastNightAuditDate` priority

**4. Continuing Guests (INFO ONLY)**:
```typescript
if (realStats.occupiedRooms > 0) {
  // ✅ INFO - Not blocking
}
```
- ✅ **INFO** - Does not block audit

**5. Dirty Rooms (WARNING)**:
```typescript
if (realStats.dirtyRooms.length > 0) {
  // ⚠️ WARNING - Not blocking
}
```
- ⚠️ **WARNING** - Does not block audit

---

### 7.2 Night Audit Process Steps

**Function**: `processStep(stepIndex, auditResult)`  
**Location**: `apps/hotel/src/components/NightAuditModule.tsx` (line ~1198)

**Steps** (0-14):

**Step 0**: Block users
- Sets `systemLocked = 'true'`
- Sets `lockedBy = 'Night Audit'`

**Step 1**: Time check
- Validates audit time (can override if needed)

**Step 2**: Process check-ins
- Calls `processRealCheckIns()`
- Handles pending check-ins and no-shows

**Step 3**: Process check-outs
- Calls `processRealCheckOuts()`
- Finalizes check-outs

**Step 4**: Update room statuses
- Calls `updateRoomStatusesInCalendar()`

**Step 5**: Financial calculations
- Calls `calculateRealRevenue()`

**Step 6**: Room Charge Posting
- Calls `PostingService.postRoomCharges(selectedDate)`
- Posts charges for in-house guests
- Returns: `{ posted, failed, skipped, totalAmount, details }`

**Step 7**: Package Posting
- Calls `PackagePostingService.postPackageCharges(selectedDate)`

**Step 8**: Auto-close folios
- Calls `FolioAutoCloseService.autoCloseFolios(selectedDate)`

**Step 9**: Financial reconciliation
- Calls `FinancialReportsService.generateDailyRevenueReport(selectedDate)`
- Calls `FinancialReportsService.generateManagerReport(selectedDate)`

**Step 10**: Statistics
- Calls `calculateOccupancy()`

**Step 11**: PDF Reports
- Calls `generateReports()`

**Step 12**: Email
- Calls `sendEmails()`

**Step 13**: Backup
- Calls `createBackup()`

**Step 14**: Change business day
- Calls `changeBusinessDay()`
- Sets `lastNightAuditDate = selectedDate`
- Sets `currentBusinessDate = selectedDate`

---

### 7.3 Room Charge Posting

**Service**: `PostingService.postRoomCharges(auditDate: string)`  
**Location**: `apps/hotel/src/services/PostingService.ts` (line ~9)

**Logic**:

1. **Filter In-house Guests**:
   ```typescript
   const inHouseGuests = reservations.filter((res: any) => {
     const checkIn = moment(res.checkIn)
     const checkOut = moment(res.checkOut)
     const audit = moment(auditDate)
     const isCheckedIn = StatusHelpers.isCheckedIn(res.status) || StatusHelpers.isOccupied(res.status)
     const dateMatches = checkIn.isSameOrBefore(audit, 'day') && checkOut.isAfter(audit, 'day')
     return isCheckedIn && dateMatches
   })
   ```

2. **For Each Guest**:
   - Get or create folio
   - Check if already posted (by `nightAuditDate` or `referenceId`)
   - Calculate room rate (see `calculateRoomRate` below)
   - Create charge transaction
   - Update folio balance

3. **Skip Conditions**:
   - If `folio.initialRoomCharge?.allNightsPosted === true` and charge exists for this date → skip
   - If charge already posted (by `nightAuditDate` or `referenceId`) → skip

**Rate Calculation**:
```typescript
static calculateRoomRate(reservation: any, date: string) {
  const nights = checkOut.diff(checkIn, 'days')
  const totalAmount = reservation.totalAmount || 0
  const baseRatePerNight = nights > 0 ? totalAmount / nights : totalAmount
  
  // Weekend surcharge (10%)
  if (isWeekend && reservation.weekendSurcharge !== false) {
    adjustedRate *= 1.1
  }
  
  // Apply discounts
  // Calculate taxes
  // Return: { grossRate, netRate, totalTax, total, taxes }
}
```

---

### 7.4 Payments Received

**Location**: `apps/hotel/src/components/NightAuditModule.tsx` (line ~2509)

**Source**: Folio transactions filtered by date
```typescript
const validPayments = auditData.paymentsList.filter((p: any) => {
  const amount = p.amount || p.credit || 0
  if (amount <= 0) return false
  if (p.guestName === '1111' && amount === 0) return false  // Remove placeholders
  return true
})

const totalAmount = validPayments.reduce((sum: number, p: any) => 
  sum + Number(p.amount || p.credit || 0), 0
)
```

---

### 7.5 Storage Keys

**Night Audit History**:
- `localStorage.getItem('nightAudits')` - Array of completed audits

**Business Date**:
- `localStorage.getItem('lastNightAuditDate')` - Plain string `YYYY-MM-DD` (PREFERRED)
- `localStorage.getItem('lastAuditDate')` - JSON stringified (LEGACY FALLBACK)
- `localStorage.getItem('currentBusinessDate')` - Current business date

**Audit Lock**:
- `localStorage.getItem('AUDIT_LOCK_KEY')` - Prevents concurrent audits
- Format: `{ timestamp, date, tabId }`

---

## 📑 8. Manager's Daily Report

**Function**: `generateManagerReport(date: string)`  
**Location**: `apps/hotel/src/components/NightAuditModule.tsx` (line ~2368)  
**Service**: `apps/hotel/src/services/FinancialReportsService.ts` (line ~281)

### 8.1 Occupancy

**Formula**:
```typescript
const occupiedRooms = reservations.filter((r: any) => r.status === 'CHECKED_IN').length
const totalRooms = rooms.length || 1
const occupancy = (occupiedRooms / totalRooms) * 100
```

**Source**: Current `CHECKED_IN` reservations (regardless of original dates)

---

### 8.2 ADR

**Formula**:
```typescript
const roomRevenue = Number(revenueReport.revenue.byCategory.room) || 0
const adr = occupiedRooms > 0 ? roomRevenue / occupiedRooms : 0
```

**Source**: Room revenue from folio transactions (category = 'room') for the date

---

### 8.3 RevPAR

**Formula**:
```typescript
const revpar = totalRooms > 0 ? roomRevenue / totalRooms : 0
```

**Source**: Same room revenue as ADR

---

### 8.4 Room Revenue

**Source**: Folio transactions
```typescript
folios.forEach((folio: any) => {
  folio.transactions.forEach((t: any) => {
    if (t.category === 'room' && t.type === 'charge') {
      const chargeDate = t.date || t.nightAuditDate || moment(t.postedAt).format('YYYY-MM-DD')
      if (chargeDate === date) {
        roomRevenue += (t.debit || t.amount || 0)
      }
    }
  })
})
```

---

### 8.5 Gross / Net Revenue

**Gross Revenue**:
```typescript
const totalRevenue = roomRevenue + noShowRevenue
```

**Net Revenue** (Tax Inclusive):
```typescript
const vatRate = 0.18
const vatAmount = totalRevenue * vatRate / (1 + vatRate)
const netRevenue = totalRevenue - vatAmount
```

**⚠️ NOTE**: Uses hardcoded 18% VAT rate, not from tax settings.

---

### 8.6 Payments Received

**Source**: Folio transactions + Cashier manual transactions
```typescript
const payments = folios.flatMap((f: any) => 
  f.transactions?.filter((t: any) => t.type === 'payment') || []
)

const cashPayments = payments
  .filter((p: any) => p.paymentMethod === 'cash')
  .reduce((s: number, p: any) => s + (p.credit || 0), 0)

const cardPayments = payments
  .filter((p: any) => p.paymentMethod === 'card' || p.paymentMethod === 'credit_card')
  .reduce((s: number, p: any) => s + (p.credit || 0), 0)

const bankPayments = payments
  .filter((p: any) => p.paymentMethod === 'bank_transfer')
  .reduce((s: number, p: any) => s + (p.credit || 0), 0)
```

**⚠️ NOTE**: Payment amounts may not match actual Payment History / Cashier for the day (values like 500/700 cash, 600/800 bank show up out of nowhere).

---

## 📈 9. Reports Module (Period Reports)

**Location**: `apps/hotel/src/components/Reports.tsx`

### 9.1 Total Revenue

**Calculation**:
```typescript
const revenueData = useMemo(() => {
  const dailyRevenue: { [date: string]: number } = {}
  
  // From checked-out reservations
  filteredReservations.forEach(res => {
    if (res.status === 'CHECKED_OUT') {
      const checkOutDate = moment(res.checkOut).format('YYYY-MM-DD')
      if (dailyRevenue[checkOutDate] !== undefined) {
        dailyRevenue[checkOutDate] += Number(res.totalAmount || 0)
      }
    }
  })
  
  // From folio payments
  folios.forEach(folio => {
    (folio.transactions || []).forEach((t: any) => {
      if (t.type === 'payment') {
        const date = moment(t.date).format('YYYY-MM-DD')
        if (dailyRevenue[date] !== undefined) {
          dailyRevenue[date] += Number(t.credit || 0)
        }
      }
    })
  })
  
  const totalRevenue = Object.values(dailyRevenue).reduce((sum, val) => 
    sum + Number(val || 0), 0
  )
  
  return { daily: dailyRevenue, total: totalRevenue, ... }
}, [filteredReservations, folios, startDate, endDate])
```

**⚠️ NOTE**: Fixed string concatenation issue - now uses `Number()` conversion.

---

### 9.2 Average Daily Revenue

**Formula**:
```typescript
const avgDaily = days > 0 ? totalRevenue / days : 0
```

---

### 9.3 Daily Revenue Chart

**Data**: `revenueData.daily` object with date keys and revenue values

---

### 9.4 Occupancy Report

**Average Occupancy**:
```typescript
const avgOccupancy = Object.values(dailyOccupancy).reduce((sum, d) => 
  sum + d.percentage, 0
) / days
```

**Daily Occupancy**:
```typescript
const occupiedCount = reservations.filter(res => {
  if (['CANCELLED', 'NO_SHOW'].includes(res.status)) return false
  const checkIn = moment(res.checkIn)
  const checkOut = moment(res.checkOut)
  return date.isSameOrAfter(checkIn, 'day') && date.isBefore(checkOut, 'day')
}).length

dailyOccupancy[dateStr] = {
  occupied: occupiedCount,
  percentage: Math.round((occupiedCount / totalRooms) * 100)
}
```

---

### 9.5 Guests Report

**Total Guests**:
- Counted by unique `guestEmail` or `guestName`

**New vs Repeat**:
```typescript
const newGuests = guestList.filter(g => g.visits === 1).length
const returningGuests = guestList.filter(g => g.visits > 1).length
```

**Top Guests by Revenue**:
```typescript
const guestList = Array.from(guests.values())
  .sort((a, b) => b.totalSpent - a.totalSpent)
```

---

### 9.6 Rooms Report

**Revenue by Room Type**:
```typescript
const byType: { [type: string]: { bookings: number; revenue: number; rooms: number } } = {}
Object.values(roomStats).forEach(room => {
  if (!byType[room.type]) {
    byType[room.type] = { bookings: 0, revenue: 0, rooms: 0 }
  }
  byType[room.type].bookings += room.bookings
  byType[room.type].revenue += room.revenue
  byType[room.type].rooms++
})
```

**Room Ranking**:
- By revenue: `sort((a, b) => b.revenue - a.revenue)`
- By nights: `sort((a, b) => b.nights - a.nights)`

**⚠️ NOTE**: Room type revenue may show string concatenation (e.g., `₾00100100100`) if not using `Number()` conversion.

---

### 9.7 Sources Report

**Calculation**:
```typescript
const bySource: { [source: string]: { count: number; revenue: number } } = {}

filteredReservations.forEach(res => {
  const source = res.source || res.bookingSource || 'Direct'
  if (!bySource[source]) {
    bySource[source] = { count: 0, revenue: 0 }
  }
  bySource[source].count++
  bySource[source].revenue += res.totalAmount || 0
})
```

**Percentages**:
- `(source.count / total) * 100`
- `(source.revenue / totalRevenue) * 100`

---

## 🔍 10. Known Issues / Inconsistencies

### 10.1 Check-in Validation

**Issue**: Missing businessDate / closed days check in `canCheckIn()`  
**Location**: `apps/hotel/src/components/CheckInModal.tsx` (line ~525)

**Current**: Only checks room OCCUPIED status and active reservations  
**Missing**: No direct check that `checkInDate >= businessDay` or `isClosedDay(checkInDate)`

**Also**: Wrong comparison `r.id !== formData.roomId` should compare `reservation.id` vs current reservation id, not room id.

---

### 10.2 Folio Creation

**Issue**: `createFolioOnCheckIn()` in RoomCalendar  
**Location**: `apps/hotel/src/components/RoomCalendar.tsx` (line ~1904)

**Current**: Actually stores full array correctly  
**Note**: Code is correct, but inline creation duplicates FolioService logic

---

### 10.3 Night Audit Sequential Closing

**Issue**: Uses only `lastAuditDate` (legacy)  
**Location**: `apps/hotel/src/components/NightAuditModule.tsx` (line ~941)

**Current**:
```typescript
const lastAuditDate = localStorage.getItem('lastAuditDate')
```

**Should Use**: Same priority as `getBusinessDay()`:
1. `lastNightAuditDate` (preferred)
2. `lastAuditDate` (fallback)
3. None (first audit)

---

### 10.4 Manager's Daily Report

**Issues**:
- Payment amounts do not match actual Payment History / Cashier for the day
- Some VAT/Net Revenue differ from Financial Dashboard tax summary for same Business Day
- Uses hardcoded 18% VAT instead of tax settings

---

### 10.5 Z-REPORT Statistics

**Issues**:
- Occupancy/ADR/RevPAR in Statistics block don't match daily Financial Dashboard values
- Likely using different base (period instead of day, or wrong denominators)
- Movement (Check-in / Check-out / Stay-over) often shows 0/0/0
- Stay-over not computed from reservation date ranges
- Cashier section shows 0 for cash/card/bank even when Cashier module has valid daily transactions

---

### 10.6 Reports Module

**Issues** (FIXED):
- ✅ Revenue aggregation string concatenation - **FIXED** (now uses `Number()`)
- ✅ Average daily revenue huge exponent - **FIXED**
- ✅ Room type revenue strings - **FIXED**

**Remaining**:
- Some room type revenue may still show concatenated strings if not using `Number()` in all places

---

## 📝 11. localStorage Keys Reference

### Business Date & Audit
- `lastNightAuditDate` - Plain string `YYYY-MM-DD` (PREFERRED)
- `lastAuditDate` - JSON stringified (LEGACY)
- `currentBusinessDate` - Current business date
- `nightAudits` - Array of completed audits
- `AUDIT_LOCK_KEY` - Audit lock data

### Rooms & Reservations
- `hotelRooms` - Array of rooms
- `rooms` - Alternative key for rooms
- `simpleRooms` - Alternative key for rooms
- `hotelReservations` - Array of reservations

### Folios
- `hotelFolios` - Array of folios

### Cashier
- `currentCashierShift` - Current open shift
- `cashierShifts` - Array of closed shifts (history)
- `cashierHistory` - Alternative key for shift history
- `cashierManualTransactions` - Array of manual transactions

### Housekeeping
- `housekeepingTasks` - Array of active tasks
- `housekeepingArchive` - Array of archived tasks
- `housekeepingChecklist` - Checklist from Settings

### Settings
- `hotelInfo` - Hotel information
- `hotelTaxes` - Tax rates configuration
- `hotelSeasons` - Season pricing
- `hotelWeekdayPrices` - Weekday pricing
- `hotelSpecialDates` - Special date pricing
- `hotelFloors` - Floor configuration
- `hotelStaff` - Staff list

---

## 📌 Summary

This document describes the **current state** of the PMS system as implemented in code. All formulas, rules, and logic are documented as they exist today, without any modifications or improvements.

**Next Steps**: After reviewing this documentation, identify specific areas for refactoring, bug fixes, or rule improvements.

---

**Last Updated**: 2025-12-08  
**Documentation Status**: Complete (READ-ONLY)

