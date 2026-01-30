# 🏨 Guest Journey Data Flow Analysis
## Complete Flow from Check-in to Check-out

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Data Storage Keys](#data-storage-keys)
3. [Data Structures](#data-structures)
4. [Complete Guest Journey Flow](#complete-guest-journey-flow)
5. [Component Connections](#component-connections)
6. [Identified Issues & Disconnections](#identified-issues--disconnections)
7. [Visual Data Flow Diagram](#visual-data-flow-diagram)

---

## Overview

This document traces the complete data flow from reservation creation through check-in, folio management, payments, night audit, and check-out across all modules.

### Key Components:
- **RoomCalendar.tsx** - Calendar view, drag & drop reservations
- **CheckInModal.tsx** - Check-in process
- **CheckOutModal.tsx** - Check-out process
- **FolioManager.tsx** - Folio management
- **PostingService.ts** - Night audit room charge posting
- **FinancialDashboard.tsx** - Revenue tracking
- **NightAuditModule.tsx** - Day closing process
- **page.tsx** - Main dashboard orchestrator

---

## Data Storage Keys

### Primary localStorage Keys:

| Key | Purpose | Used By |
|-----|---------|---------|
| `hotelReservations` | All reservations | Calendar, CheckIn, CheckOut, NightAudit |
| `hotelFolios` | All guest folios | FolioManager, CheckOut, PostingService, FinancialDashboard |
| `hotelRooms` | Room definitions | Calendar, CheckIn, Settings |
| `nightAudits` | Audit history | NightAuditModule |
| `hotelFloors` | Floor definitions | Calendar, Settings |
| `hotelInfo` | Hotel settings | Settings, Reports |
| `hotelUsers` | User accounts | Settings |
| `hotelStaff` | Staff members | Settings |
| `hotelSeasons` | Seasonal pricing | Settings, Pricing |
| `hotelWeekdayPrices` | Weekday pricing | Settings, Pricing |
| `hotelSpecialDates` | Special date pricing | Settings, Pricing |
| `hotelExtraServices` | Extra services | Settings |
| `hotelPackages` | Package definitions | Settings |
| `hotelTaxes` | Tax settings | Settings, PostingService |
| `hotelQuickCharges` | Quick charge templates | Settings |
| `companyFolios` | Company folios | FolioRoutingService |
| `housekeepingTasks` | Housekeeping tasks | CheckOut |
| `currentBusinessDate` | Current business date | NightAudit |
| `lastAuditDate` | Last closed audit date | NightAudit, CheckIn |
| `nightAuditInProgress` | Audit lock | NightAudit |
| `systemLocked` | System lock flag | NightAudit, CheckIn |
| `currentUser` | Current logged-in user | All modules |

### API Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|--------|
| `/api/hotel/reservations` | GET | Get all reservations |
| `/api/hotel/reservations` | POST | Create reservation |
| `/api/hotel/reservations` | PUT | Update reservation |
| `/api/hotel/rooms` | GET | Get all rooms |
| `/api/hotel/rooms/status` | POST | Update room status |
| `/api/hotel/check-in` | POST | Check-in guest (legacy) |

---

## Data Structures

### Reservation Structure

```typescript
{
  id: string                    // "res-1234567890"
  reservationNumber: string      // "12345"
  roomId: string                // Room ID
  roomNumber: string            // Room number (e.g., "101")
  guestName: string
  guestEmail?: string
  guestPhone?: string
  checkIn: string              // "2024-01-15"
  checkOut: string             // "2024-01-17"
  status: string                // "CONFIRMED" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | "NO_SHOW"
  totalAmount: number           // Total reservation amount
  nights: number                // Number of nights
  adults: number
  children: number
  paymentMethod?: string        // "cash" | "card" | "transfer"
  checkedInAt?: string         // ISO timestamp
  checkedOutAt?: string         // ISO timestamp
  createdAt: string             // ISO timestamp
  type?: string                // Room type (e.g., "Standard", "Deluxe")
  roomType?: string            // Alias for type
}
```

### Folio Structure

```typescript
{
  id: string                    // "FOLIO-1234567890-abc123"
  folioNumber: string           // "F240115-101"
  reservationId: string         // Links to reservation.id
  guestName: string
  roomNumber: string
  balance: number               // Current balance (debits - credits)
  creditLimit: number          // Default: 5000
  paymentMethod: string         // "cash" | "card" | "transfer"
  status: string                // "open" | "closed"
  openDate: string              // "2024-01-15"
  closedDate?: string          // "2024-01-17"
  closedTime?: string          // "12:00:00"
  closedBy?: string            // User name
  transactions: FolioTransaction[]
  initialRoomCharge?: {        // Pre-posted room charges
    rate: number
    totalAmount: number
    nights: number
    allNightsPosted: boolean
  }
}
```

### FolioTransaction Structure

```typescript
{
  id: string                    // "TRX-1234567890-abc123" or "RC-..." or "adj-..."
  folioId: string               // Links to folio.id
  date: string                  // "2024-01-15"
  time: string                  // "23:59:59" or "HH:mm:ss"
  type: string                  // "charge" | "payment"
  category: string              // "room" | "restaurant" | "bar" | "spa" | etc.
  description: string
  debit: number                 // Charge amount
  credit: number                // Payment amount
  balance: number               // Running balance after this transaction
  postedBy: string              // User name or "Night Audit" or "System"
  postedAt: string              // ISO timestamp
  nightAuditDate?: string       // For room charges, the audit date
  referenceId?: string          // "ROOM-{reservationId}-{date}" for room charges
  prePosted?: boolean           // true if pre-posted on reservation creation
  paymentMethod?: string        // For payments: "cash" | "card" | "transfer"
  method?: string               // Alias for paymentMethod
  taxDetails?: TaxBreakdown[]   // Tax breakdown
}
```

### Room Structure

```typescript
{
  id: string                    // Room ID
  roomNumber: string            // "101"
  floor: number                 // Floor number
  type: string                  // "Standard" | "Deluxe" | "Suite"
  roomType?: string            // Alias for type
  status: string                // "VACANT" | "OCCUPIED" | "CLEANING" | "OUT_OF_ORDER"
  basePrice?: number           // Base price per night
  maxGuests: number
  beds: string                  // "1 King" | "2 Twin"
}
```

---

## Complete Guest Journey Flow

### Step 1: Reservation Creation (CheckInModal.tsx)

**Trigger:** User clicks on calendar cell or room card

**Process:**
1. User fills form in `CheckInModal.tsx`
2. Form validation:
   - Guest name required
   - Check-in/out dates
   - Room selection
   - Overlap checking against existing reservations
3. Price calculation:
   - Loads `roomRates` from localStorage
   - Calculates weekday/weekend rates
   - Uses `calculateTotalWithRates()` if rates available
   - Falls back to `basePrice * nights`
4. Reservation object created:
   ```typescript
   {
     ...formData,
     totalAmount: calculateTotal(),
     status: 'CONFIRMED',
     nights: calculateNights(),
     reservationNumber: generateReservationNumber()
   }
   ```
5. **Storage:**
   - **API:** `POST /api/hotel/reservations`
   - **localStorage:** Updated via `dataStore.ts` → `addReservation()`
   - **File:** Saved to `data/reservations.json`
6. **Room Status Update:**
   - API: `POST /api/hotel/rooms/status` → `status: 'OCCUPIED'`
   - Updates `hotelRooms` in localStorage

**Files:**
- `CheckInModal.tsx` (lines 299-337)
- `page.tsx` (lines 657-729) - `checkInGuest()` function
- `dataStore.ts` (lines 182-202) - `addReservation()`

---

### Step 2: Folio Creation (page.tsx → createFolioForReservation)

**Trigger:** After reservation is created in `checkInGuest()`

**Process:**
1. `createFolioForReservation()` called (page.tsx:579)
2. Checks if folio already exists for reservation
3. Calculates room charges:
   - `nights = checkOut - checkIn`
   - `ratePerNight = totalAmount / nights`
4. **Pre-posts ALL nights** as transactions:
   ```typescript
   for (let i = 0; i < nights; i++) {
     transactions.push({
       date: checkIn + i days,
       type: 'charge',
       category: 'room',
       debit: ratePerNight,
       balance: runningBalance,
       nightAuditDate: chargeDate,
       prePosted: true
     })
   }
   ```
5. Creates folio with:
   - `balance: totalAmount` (all nights pre-posted)
   - `initialRoomCharge.allNightsPosted: true`
   - All transactions in `transactions[]`
6. **Storage:**
   - **localStorage:** `hotelFolios` array updated

**Files:**
- `page.tsx` (lines 579-655) - `createFolioForReservation()`

**Key Feature:** All room charges are pre-posted on check-in, preventing duplicate posting during night audit.

---

### Step 3: Check-In Process (CheckInModal → page.tsx)

**Status Update:**
1. Reservation status: `CONFIRMED` → `CHECKED_IN`
2. **Storage:**
   - **API:** `PUT /api/hotel/reservations` (updates status)
   - **localStorage:** `hotelReservations` updated
   - **File:** `data/reservations.json` updated
3. Room status: Already `OCCUPIED` (set in Step 1)

**Files:**
- `page.tsx` (lines 657-729) - `checkInGuest()`
- `dataStore.ts` (lines 204-213) - `updateReservation()`

---

### Step 4: During Stay - Folio Management (FolioManager.tsx)

**Operations:**
1. **Post Extra Charges:**
   - User adds charges (restaurant, bar, spa, etc.)
   - Transaction added to `folio.transactions[]`
   - `balance` recalculated: `balance += debit`
   - **Storage:** `hotelFolios` updated in localStorage

2. **Process Payments:**
   - User makes payment
   - Transaction added: `type: 'payment'`, `credit: amount`
   - `balance` recalculated: `balance -= credit`
   - **Storage:** `hotelFolios` updated

3. **Folio Routing:**
   - Charges can be routed to company folios
   - Uses `FolioRoutingService`
   - **Storage:** `companyFolios` in localStorage

**Files:**
- `FolioManager.tsx` (lines 102-168) - `postCharge()`, payment handling
- `FolioRoutingManager.tsx` - Routing logic
- `FolioRoutingService.ts` - Routing service

---

### Step 5: Night Audit - Room Charge Posting (PostingService.ts)

**Trigger:** Night Audit process runs (NightAuditModule.tsx)

**Process:**
1. `PostingService.postRoomCharges(auditDate)` called
2. Loads reservations:
   - **First:** `localStorage.getItem('hotelReservations')`
   - **Fallback:** `GET /api/hotel/reservations`
3. Filters in-house guests:
   ```typescript
   status === 'CHECKED_IN' || status === 'OCCUPIED'
   checkIn <= auditDate < checkOut
   ```
4. For each reservation:
   - Loads or creates folio from `hotelFolios`
   - **Checks if pre-posted:**
     - If `folio.initialRoomCharge.allNightsPosted === true`
     - Checks if charge exists for `auditDate`
     - **Skips if already posted**
   - If not pre-posted:
     - Calculates room rate (weekday/weekend)
     - Creates transaction:
       ```typescript
       {
         type: 'charge',
         category: 'room',
         debit: ratePerNight,
         nightAuditDate: auditDate,
         referenceId: `ROOM-${reservationId}-${auditDate}`
       }
       ```
   - Updates folio balance
   - **Storage:** `hotelFolios` updated in localStorage

**Files:**
- `PostingService.ts` (lines 7-97) - `postRoomCharges()`
- `PostingService.ts` (lines 100-219) - `postRoomChargeForReservation()`
- `NightAuditModule.tsx` - Calls PostingService

**Key Feature:** Pre-posted charges prevent duplicates. Night audit only posts for reservations without pre-posting.

---

### Step 6: Financial Dashboard - Revenue Tracking (FinancialDashboard.tsx)

**Data Source:**
1. Loads `hotelFolios` from localStorage
2. Filters transactions by date:
   ```typescript
   transactions.filter(t => 
     t.type === 'charge' && 
     moment(t.date).format('YYYY-MM-DD') === selectedDate
   )
   ```
3. Groups by:
   - **Category:** room, restaurant, bar, spa, etc.
   - **Department:** Rooms, F&B, Spa, etc.
4. Calculates:
   - Total revenue
   - Tax summary (VAT, City Tax, Tourism Tax)
   - Payment methods breakdown
5. **Uses:** `FinancialReportsService.generateDailyRevenueReport()`

**Files:**
- `FinancialDashboard.tsx`
- `FinancialReportsService.ts` (lines 6-79) - `generateDailyRevenueReport()`

---

### Step 7: Check-Out Process (CheckOutModal.tsx)

**Trigger:** User clicks check-out on reservation

**Process:**
1. **Load Folio:**
   - Loads from `hotelFolios` by `reservationId`
   - Creates if doesn't exist
2. **Balance Check:**
   - Displays current `folio.balance`
   - If `balance > 0`: Shows payment prompt
3. **Payment Processing:**
   - User processes payment
   - Transaction added: `type: 'payment'`, `credit: amount`
   - `balance` recalculated
   - **Storage:** `hotelFolios` updated
4. **Check-Out Validation:**
   - Requires `balance <= 0.01` (allows rounding errors)
5. **Status Updates:**
   - Reservation: `CHECKED_IN` → `CHECKED_OUT`
     - **API:** `PUT /api/hotel/reservations`
     - **localStorage:** `hotelReservations` updated
   - Folio: `status: 'open'` → `status: 'closed'`
     - Sets `closedDate`, `closedTime`, `closedBy`
     - **Storage:** `hotelFolios` updated
   - Room: `OCCUPIED` → `CLEANING`
     - **API:** `POST /api/hotel/rooms/status`
6. **Housekeeping Task:**
   - Creates task in `housekeepingTasks`
   - **Storage:** `housekeepingTasks` in localStorage

**Files:**
- `CheckOutModal.tsx` (lines 35-256) - `loadFolio()`, `handlePayment()`, `processCheckOut()`

---

### Step 8: Night Audit - Day Closing (NightAuditModule.tsx)

**Process:**
1. **Pre-Checks:**
   - Pending check-ins
   - Pending check-outs
   - Dirty rooms
   - Unmarked arrivals
2. **Room Charge Posting:**
   - Calls `PostingService.postRoomCharges(auditDate)`
   - Results stored in `auditResult.postingResults`
3. **Collect Operations:**
   - `collectDayOperations(date)` called
   - Collects from:
     - **Reservations:** Check-ins, check-outs
     - **Folios:** Payments, room charges (from `transactions`)
   - Operations structure:
     ```typescript
     {
       time: string,           // "14:00" or "12:00"
       type: string,          // "CHECK_IN" | "CHECK_OUT" | "PAYMENT" | "ROOM_CHARGE"
       description: string,
       amount: number,
       roomNumber: string
     }
     ```
4. **Calculate Statistics:**
   - Check-ins count
   - Check-outs count
   - Revenue (from check-outs)
   - Occupancy rate
   - Payments total (from folio transactions)
   - Room charges total
5. **Save Audit:**
   - Creates audit record:
     ```typescript
     {
       id: timestamp,
       date: auditDate,
       status: 'completed',
       completedAt: ISO timestamp,
       user: currentUser.name,
       operations: [...],
       paymentsTotal: number,
       roomChargesTotal: number,
       postingResults: [...],
       stats: {...}
     }
     ```
   - **Storage:** `nightAudits` array in localStorage
6. **Business Date Update:**
   - `currentBusinessDate` = `auditDate + 1 day`
   - `lastAuditDate` = `auditDate`
   - **Storage:** Both in localStorage

**Files:**
- `NightAuditModule.tsx` (lines 1164-1473) - `collectDayOperations()`
- `NightAuditModule.tsx` (lines 1759-1801) - Audit saving
- `PostingService.ts` - Room charge posting

---

## Component Connections

### Data Flow Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESERVATION CREATION                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   CheckInModal.tsx                  │
        │   - Form validation                  │
        │   - Overlap checking                 │
        │   - Price calculation                │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   page.tsx → checkInGuest()         │
        │   - API: POST /api/reservations      │
        │   - localStorage: hotelReservations  │
        │   - File: data/reservations.json     │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   createFolioForReservation()       │
        │   - Pre-posts ALL nights            │
        │   - Creates folio with transactions │
        │   - localStorage: hotelFolios       │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   Room Status Update                │
        │   - API: POST /api/rooms/status     │
        │   - Status: OCCUPIED                │
        └─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DURING STAY                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────────────────────┐
        │   FolioManager.tsx                  │
        │   - Post extra charges              │
        │   - Process payments                │
        │   - Update balance                  │
        │   - localStorage: hotelFolios       │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   FinancialDashboard.tsx            │
        │   - Reads hotelFolios               │
        │   - Groups by category/department   │
        │   - Calculates revenue              │
        └─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NIGHT AUDIT                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────────────────────┐
        │   NightAuditModule.tsx              │
        │   - Calls PostingService            │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   PostingService.ts                 │
        │   - Reads hotelReservations          │
        │   - Filters in-house guests         │
        │   - Checks pre-posted charges       │
        │   - Posts room charges (if needed)   │
        │   - Updates hotelFolios             │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   collectDayOperations()             │
        │   - Collects from reservations      │
        │   - Collects from folios            │
        │   - Creates operations array        │
        └─────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────┐
        │   Save Audit                         │
        │   - localStorage: nightAudits       │
        │   - Updates business date            │
        └─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CHECK-OUT                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────────────────────┐
        │   CheckOutModal.tsx                  │
        │   - Loads folio                      │
        │   - Processes payment (if needed)    │
        │   - Validates balance = 0            │
        │   - Updates reservation status       │
        │   - Closes folio                     │
        │   - Updates room status              │
        │   - Creates housekeeping task        │
        └─────────────────────────────────────┘
```

---

## Identified Issues & Disconnections

### 🔴 Critical Issues

1. **Status Inconsistency:**
   - **Problem:** Multiple status formats used:
     - `CHECKED_IN` vs `checked_in`
     - `CHECKED_OUT` vs `checked_out`
     - `OCCUPIED` vs `occupied`
   - **Impact:** Filtering may miss reservations
   - **Location:** `PostingService.ts` (line 52), `NightAuditModule.tsx` (multiple)
   - **Fix:** Standardize to uppercase

2. **Folio Creation Duplication:**
   - **Problem:** Folio can be created in multiple places:
     - `page.tsx` → `createFolioForReservation()` (pre-posts all nights)
     - `FolioManager.tsx` → `createNewFolio()` (empty folio)
     - `PostingService.ts` → `createFolio()` (empty folio)
     - `CheckOutModal.tsx` → `createFolio()` (empty folio)
   - **Impact:** Inconsistent folio structures
   - **Fix:** Centralize folio creation logic

3. **Pre-Posted Charges Not Always Recognized:**
   - **Problem:** `PostingService` checks `folio.initialRoomCharge.allNightsPosted`, but folios created elsewhere don't have this flag
   - **Impact:** Duplicate room charges may be posted
   - **Location:** `PostingService.ts` (lines 115-132)
   - **Fix:** Ensure all folio creation paths set this flag

4. **Reservation-Folio Link Missing:**
   - **Problem:** If folio is created before reservation is saved, `reservationId` may not match
   - **Impact:** Folio not found during check-out
   - **Location:** `CheckOutModal.tsx` (line 40)
   - **Fix:** Ensure reservation is saved before folio creation

### 🟡 Medium Issues

5. **localStorage vs API Inconsistency:**
   - **Problem:** Some components read from localStorage, others from API
   - **Impact:** Data may be out of sync
   - **Location:** Multiple files
   - **Fix:** Implement sync mechanism or use single source of truth

6. **Balance Calculation Inconsistency:**
   - **Problem:** Balance calculated differently:
     - `FolioManager.tsx`: `balance = transactions.reduce((b, t) => b + debit - credit, 0)`
     - `CheckOutModal.tsx`: Direct `folio.balance` property
   - **Impact:** Balance may be incorrect
   - **Fix:** Always recalculate from transactions

7. **Transaction Date Mismatch:**
   - **Problem:** Room charges use `nightAuditDate`, but financial reports filter by `date`
   - **Impact:** Revenue may not appear in reports
   - **Location:** `FinancialReportsService.ts` (line 30)
   - **Fix:** Check both `date` and `nightAuditDate`

8. **Check-In Time Not Saved:**
   - **Problem:** `checkedInAt` timestamp not always saved
   - **Impact:** Operations show "00:00" or default "14:00"
   - **Location:** `CheckInModal.tsx`, `page.tsx`
   - **Fix:** Always save `checkedInAt` on check-in

### 🟢 Minor Issues

9. **Room Type Field Inconsistency:**
   - **Problem:** Uses both `type` and `roomType` fields
   - **Impact:** Room type may not display correctly
   - **Location:** Multiple files
   - **Fix:** Standardize to single field

10. **Payment Method Field Inconsistency:**
    - **Problem:** Uses both `paymentMethod` and `method` in transactions
    - **Impact:** Payment method may not display correctly
    - **Location:** `CheckOutModal.tsx`, `FolioManager.tsx`
    - **Fix:** Standardize to `paymentMethod`

---

## Visual Data Flow Diagram

### localStorage Keys Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DATA STORAGE                              │
└─────────────────────────────────────────────────────────────┘

hotelReservations ──┐
                    ├──► Calendar View
                    ├──► Check-In Process
                    ├──► Check-Out Process
                    └──► Night Audit

hotelFolios ────────┐
                    ├──► Folio Manager
                    ├──► Check-Out Process
                    ├──► Posting Service
                    └──► Financial Dashboard

hotelRooms ─────────┐
                    ├──► Calendar View
                    ├──► Check-In Process
                    └──► Settings

nightAudits ────────┐
                    └──► Night Audit Module

housekeepingTasks ──┐
                    └──► Check-Out Process
```

### Transaction Flow

```
RESERVATION CREATION
    │
    ├──► Reservation Object
    │       └──► hotelReservations[]
    │
    └──► Folio Creation
            ├──► Folio Object
            │       └──► hotelFolios[]
            │
            └──► Pre-Posted Transactions
                    ├──► Transaction 1 (Night 1)
                    ├──► Transaction 2 (Night 2)
                    └──► Transaction N (Night N)
                            └──► folio.transactions[]

DURING STAY
    │
    ├──► Extra Charges
    │       └──► folio.transactions[] (charge)
    │
    └──► Payments
            └──► folio.transactions[] (payment)

NIGHT AUDIT
    │
    └──► Room Charge Posting
            ├──► Check if pre-posted
            │       ├──► YES: Skip
            │       └──► NO: Post charge
            │               └──► folio.transactions[] (charge)

CHECK-OUT
    │
    ├──► Final Payment
    │       └──► folio.transactions[] (payment)
    │
    └──► Close Folio
            └──► folio.status = 'closed'
```

### Status Transitions

```
RESERVATION STATUS:
CONFIRMED ──► CHECKED_IN ──► CHECKED_OUT
    │              │              │
    │              │              └──► CANCELLED (if cancelled)
    │              │
    │              └──► NO_SHOW (if no-show)
    │
    └──► CANCELLED (if cancelled before check-in)

ROOM STATUS:
VACANT ──► OCCUPIED ──► CLEANING ──► VACANT
    │          │            │
    │          │            └──► OUT_OF_ORDER (if needed)
    │          │
    │          └──► (stays OCCUPIED during stay)
    │
    └──► OUT_OF_ORDER (if maintenance)

FOLIO STATUS:
open ──► closed
    │
    └──► (stays open during stay)
```

---

## Recommendations

### 1. Centralize Folio Creation
Create a single `FolioService.createFolio()` that:
- Checks if folio exists
- Creates with consistent structure
- Handles pre-posting logic
- Used by all components

### 2. Standardize Status Values
- Use uppercase constants: `CHECKED_IN`, `CHECKED_OUT`, `OCCUPIED`
- Create enum/constants file
- Update all components to use constants

### 3. Implement Data Sync
- Primary source: API
- localStorage as cache
- Sync on component mount
- Handle conflicts

### 4. Always Recalculate Balance
- Never trust `folio.balance` property
- Always calculate from `transactions`
- Update property after calculation

### 5. Standardize Field Names
- Use `type` (not `roomType`)
- Use `paymentMethod` (not `method`)
- Update all components

### 6. Add Transaction Validation
- Validate `date` and `nightAuditDate` consistency
- Check for duplicate transactions
- Validate balance calculations

---

## File Reference Map

| Component | File | Key Functions |
|-----------|------|---------------|
| Calendar | `RoomCalendar.tsx` | Drag & drop, resize, display |
| Check-In | `CheckInModal.tsx` | Form, validation, price calculation |
| Check-Out | `CheckOutModal.tsx` | Folio load, payment, check-out |
| Folio | `FolioManager.tsx` | Charges, payments, balance |
| Posting | `PostingService.ts` | Room charge posting |
| Financial | `FinancialDashboard.tsx` | Revenue reports |
| Night Audit | `NightAuditModule.tsx` | Day closing, operations |
| Main | `page.tsx` | Orchestration, folio creation |
| Data Store | `dataStore.ts` | API wrapper, file storage |

---

**Document Version:** 1.0  
**Last Updated:** 2024-01-15  
**Author:** AI Assistant


