# 📚 სისტემის წესები - სრული დოკუმენტაცია

ეს დოკუმენტაცია აღწერს პროექტში არსებული ყველა მოდულის წესებსა და ლოგიკას:
- 📅 კალენდრის წესები
- 📅 ჯავშნის შექმნის წესები
- ✅ Check-in / Check-out წესები
- ⚠️ No-show წესები
- 🌙 Night Audit წესები
- 🧹 დასუფთავების (Housekeeping) წესები
- 💰 სალაროს წესები

---

## 📅 კალენდრის წესები

### Business Day Logic

**`getBusinessDay()` Function:**
```typescript
// Priority:
1. lastNightAuditDate (if exists) - PREFERRED
2. lastAuditDate (fallback) - Legacy
3. Today (if no audit) - Default
```

**წესები:**
- თუ Night Audit არ არის გაკეთებული → Business Day = დღეს
- თუ Night Audit გაკეთებულია → Business Day = lastAuditDate + 1 day
- **მაგალითი**: თუ last audit = 2025-11-27 → Business Day = 2025-11-28

---

### 🔒 Closed Days Logic

**`isClosedDay()` Function:**

**თუ Night Audit არ არის გაკეთებული:**
- ✅ დახურული: წარსულის დღეები (დღესდან ადრე)
- ✅ ღია: დღეს და მომავალში

**თუ Night Audit გაკეთებულია:**
- ✅ დახურული: lastAuditDate-მდე (lastAuditDate-ის ჩათვლით)
- ✅ ღია: lastAuditDate-ის შემდეგ

**მაგალითი:**
- Last audit = 2025-11-27
- დახურული: 27-მდე (27-ის ჩათვლით)
- ღია: 28-დან და შემდეგ

---

### 📝 Booking Rules

**`canBookOnDate()` Function:**

**თუ Night Audit არ არის გაკეთებული:**
- ✅ დაშვებული: დღესდან და შემდეგ
- ❌ დაბლოკილი: წარსულის დღეები

**თუ Night Audit გაკეთებულია:**
- ✅ დაშვებული: Business Day-დან და შემდეგ
- ❌ დაბლოკილი: Business Day-მდე

---

### 🎯 Action Permissions on Closed Dates

**✅ ALWAYS ALLOWED Actions** (even on closed dates):
1. **check-out** - Check-out ყოველთვის დაშვებულია
2. **payment** - გადახდა ყოველთვის დაშვებულია
3. **view-details** - დეტალების ნახვა ყოველთვის დაშვებულია

**❌ BLOCKED Actions** (on closed dates):
1. **check-in** - დაბლოკილია, თუ check-in date დახურულია
2. **edit** - დაბლოკილია, თუ check-in date დახურულია
3. **cancel** - დაბლოკილია, თუ check-in date დახურულია
4. **no-show** - დაბლოკილია, თუ check-in date დახურულია
5. **new-reservation** - დაბლოკილია, თუ date დახურულია

---

### 💳 Payment Processing on Closed Dates

1. **Payment is ALWAYS allowed** - even on closed dates
2. **Post-Audit Payment Detection:**
   - ამოწმებს, თუ `checkOutDate` დახურულია
   - თუ დახურულია → marks as `isPostAudit: true`
   - აჩვენებს warning modal-ში

3. **Payment Record Metadata:**
   ```typescript
   {
     processedOn: "2025-11-28", // Today
     forDate: "2025-11-27",     // Original reservation date
     isPostAudit: true,
     note: "Payment processed after Night Audit"
   }
   ```

---

### 🎨 Visual Indicators

**Closed Days:**
- **Style**: `bg-gray-100 cursor-not-allowed opacity-50`
- **Text**: "დახურული" (in Georgian)
- **Behavior**: არ არის clickable

**Available Days:**
- **Style**: `bg-white hover:bg-blue-50 cursor-pointer`
- **Behavior**: Clickable for booking

**Cleaning Status Indicators:**
- 🔴 **დასალაგებელი** (`dirty`) - ორანჟისფერი (`bg-orange-200`)
- 🧹 **იწმინდება** (`cleaning`) - ყვითელი (`bg-yellow-200`)
- ✅ **სუფთა** (`clean`, `inspected`) - მწვანე (`bg-green-200`)

---

## 📅 ჯავშნის შექმნის წესები

### ALLOW reservation when:

1. ✅ **Room available on selected dates**
   - Room `status` = `VACANT` ან `AVAILABLE`
   - Room არ არის `OCCUPIED`, `MAINTENANCE`, ან `RESERVED`

2. ✅ **No conflicting reservation**
   - არ არსებობს სხვა reservation იმავე room-ზე overlapping dates-ზე
   - Check-in და Check-out dates არ ემთხვევა არსებულ reservations-ს

3. ✅ **Date >= currentBusinessDate**
   - Check-in date უნდა იყოს Business Day-ზე ან მომავალში
   - თუ Night Audit გაკეთებულია → Check-in >= lastAuditDate + 1 day
   - თუ Night Audit არ არის → Check-in >= დღეს

### BLOCK reservation when:

1. ❌ **Room has existing reservation on those dates**
   - არსებული reservation-ისთვის:
     - Same room (roomId ან roomNumber)
     - Overlapping dates (checkIn < other.checkOut AND checkOut > other.checkIn)
     - Status არ არის `NO_SHOW`, `CANCELLED`

2. ❌ **Date < currentBusinessDate (audited/past)**
   - Check-in date დახურულია Night Audit-ით
   - Check-in date წარსულშია (თუ audit არ არის გაკეთებული)

### Same-day checkout/checkin:

- ✅ **ALLOWED** - Guest A checkout Dec 5, Guest B checkin Dec 5
- Morning checkout, afternoon checkin
- Same room-ზე შეიძლება იყოს checkout და checkin იმავე დღეს
- Important: Check-out უნდა დასრულდეს check-in-ის შემდეგ (time-based)

---

## ✅ Check-in წესები

### Check-in პროცესი

**წინაპირობები:**
1. ✅ Reservation status უნდა იყოს `CONFIRMED` ან `PENDING`
2. ✅ Check-in date უნდა იყოს Business Day-ზე ან მომავალში
3. ✅ Check-in date არ უნდა იყოს დახურული (Night Audit-ის შემდეგ)
4. ✅ Room უნდა იყოს `VACANT` ან `AVAILABLE`

**Check-in Steps:**
1. **Folio Creation:**
   - ავტომატურად იქმნება Folio reservation-ისთვის
   - Folio Number: `F{YYMMDD}-{roomNumber}`
   - Status: `open`
   - Balance: 0 (initial)

2. **Reservation Status Update:**
   - Status → `CHECKED_IN`
   - `actualCheckIn` → current timestamp
   - Activity Log → `CHECK_IN` event

3. **Room Status Update:**
   - Room status → `OCCUPIED`
   - Room `cleaningStatus` → `null` ⚠️ **გასუფთავდა!**
   - Room-ი აღარ არის available
   - Occupied ოთახზე cleaningStatus არ ჩანს

### Check-in → cleaningStatus Reset

- Check-in-ისას: `cleaningStatus` → `null` (გასუფთავდა!)
- Room status → `OCCUPIED`
- Occupied ოთახზე cleaningStatus არ ჩანს (display logic hides it)

**Early Check-in:**
- ⚠️ თუ `actualCheckIn < checkInDate` → გამოდის confirmation alert
- მომხმარებელი უნდა დაადასტუროს ადრეული check-in

---

### Check-out წესები

### Check-out პროცესი

**წინაპირობები:**
1. ✅ Reservation status უნდა იყოს `CHECKED_IN`
2. ✅ Folio balance უნდა იყოს ≤ 0.01 (დასაშვებია მცირე rounding errors)
3. ✅ Check-out date შეიძლება იყოს დახურული (Check-out ყოველთვის დაშვებულია)

**Check-out Steps:**
1. **Balance Validation:**
   - ამოწმებს Folio balance-ს
   - თუ `balance > 0.01` → არ იძლევა check-out-ს
   - გამოდის alert: "Cannot check out with outstanding balance"

2. **Reservation Status Update:**
   - Status → `CHECKED_OUT`
   - `actualCheckOut` → current timestamp
   - `checkedOutAt` → current timestamp
   - Activity Log → `CHECK_OUT` event

3. **Folio Closure:**
   - Folio status → `closed`
   - `closedBy` → current user
   - `closedAt` → current timestamp

4. **Room Status Update:**
   - Room `status` → `available`
   - Room `cleaningStatus` → `dirty` ⚠️ **მნიშვნელოვანი!**
   - Room-ი აღარ არის occupied, მაგრამ საჭიროებს დასუფთავებას

5. **Housekeeping Task Creation:**
   - ავტომატურად იქმნება Housekeeping task
   - Task type: `checkout`
   - Task status: `pending`
   - Task priority: `high`
   - Task checklist: იტვირთება Settings-იდან (`housekeepingChecklist`)

**Late Check-out:**
- თუ check-out date უკვე დახურულია Night Audit-ით:
  - გამოდის alert: "Date უკვე დახურულია Night Audit-ით"
  - Late check-out ითვლება, დამატებითი ღამე დარიცხულია

---

## ⚠️ No-show წესები

### No-show პროცესი

**წინაპირობები:**
1. ✅ Reservation status უნდა იყოს `CONFIRMED` ან `PENDING`
2. ✅ Check-in date უნდა იყოს Business Day-ზე ან წარსულში
3. ✅ Check-in date არ უნდა იყოს დახურული (Night Audit-ის შემდეგ)

**No-show Options:**
1. **Charge Policy:**
   - `first` - პირველი ღამის გადასახადი
   - `full` - მთლიანი reservation-ის გადასახადი
   - `none` - გადასახადი არ არის
   - `custom` - მომხმარებლის მითითებული თანხა

2. **Room Release:**
   - ✅ `freeRoom: true` - ოთახი გათავისუფლდება
   - ❌ `freeRoom: false` - ოთახი დარჩება დაკავებული

**No-show Steps:**
1. **Conflict Check:**
   - თუ `freeRoom: true` → ამოწმებს სხვა reservations-ს
   - თუ conflict-ია → არ იძლევა room release-ს

2. **Reservation Status Update:**
   - Status → `NO_SHOW`
   - `noShowDate` → current timestamp
   - `noShowCharge` → გამოთვლილი თანხა
   - `noShowReason` → მომხმარებლის მითითებული მიზეზი
   - `markedAsNoShowAt` → current timestamp
   - `noShowMarkedBy` → current user
   - `roomReleased` → boolean flag
   - `visible: true` - კვლავ ჩანს reservations list-ში

3. **Room Status Update (თუ `freeRoom: true`):**
   - Room status → `VACANT`
   - Room გათავისუფლებულია ახალი reservation-ისთვის

4. **Activity Log:**
   - Activity Log → `NO_SHOW` event
   - ინახება charge, policy, reason, markedBy

**No-show Calculation:**
```typescript
const nights = moment(checkOut).diff(moment(checkIn), 'days')
const perNight = nights > 0 ? totalAmount / nights : totalAmount

switch (chargePolicy) {
  case 'first': return perNight
  case 'full': return totalAmount
  case 'none': return 0
  case 'custom': return customCharge || 0
}
```

---

### No-show Night Audit-ში

**ავტომატური დამუშავება:**
- 🔍 Night Audit-ისას ავტომატურად ამოწმებს CONFIRMED reservations-ს audit day-ზე
- ⚠️ კითხულობს მომხმარებლის დადასტურებას
- 📝 Status იცვლება `NO_SHOW`-ზე
- 💾 ინახება localStorage-ში
- 📋 ჩაწერილია Activity Log-ში

---

## 🌙 Night Audit წესები

### Night Audit Pre-Checks

#### 0. **Duplicate Prevention (CRITICAL - CHECK FIRST)**
- **შემოწმება**: ამოწმებს `auditHistory` state-ს და `localStorage.getItem('nightAudits')`-ს
- **პირობა**: თუ `date === selectedDate` და `status === 'completed'` და `!reversed`
- **შედეგი**: 
  - ❌ **BLOCKING** - არ იძლევა audit-ის დაწყებას
  - აჩვენებს: `🚫 {date} უკვე დახურულია {time}-ზე`
- **Override**: ❌ არ შეიძლება

#### 1. **Pending Check-outs (CRITICAL)**
- **შემოწმება**: `realStats.pendingCheckOuts.length > 0`
- **პირობა**: Check-out date ≤ audit date და status = 'CHECKED_IN'
- **შედეგი**: 
  - ❌ **BLOCKING** - ყველა pending check-out უნდა დასრულდეს
  - აჩვენებს: `❌ X დაუსრულებელი Check-out - უნდა დასრულდეს!`
- **Override**: ❌ არ შეიძლება

#### 2. **Pending Check-ins (CRITICAL)**
- **შემოწმება**: `realStats.unmarkedArrivals.length > 0`
- **პირობა**: Check-in date = audit date და status = 'CONFIRMED'
- **შედეგი**: 
  - ❌ **BLOCKING** - ყველა check-in უნდა იყოს დამუშავებული (Check-in ან NO-SHOW)
  - აჩვენებს: `❌ X დაუსრულებელი Check-in - გააკეთეთ Check-in ან NO-SHOW!`
- **Override**: ❌ არ შეიძლება

#### 3. **Sequential Closing (CRITICAL)**
- **შემოწმება**: `lastAuditDate` არსებობს
- **პირობა**: 
  - თუ `daysBetween > 1` → ❌ დღის გამოტოვება
  - თუ `daysBetween === 1` → ✅ Sequential
  - თუ `daysBetween === 0` → ❌ უკვე დახურულია
- **შედეგი**: 
  - ❌ **BLOCKING** - დღეები უნდა იხურებოდეს თანმიმდევრულად
  - აჩვენებს: `❌ დღის გამოტოვება! ჯერ დახურეთ {nextDate}`
- **Override**: ❌ არ შეიძლება

#### 4. **Continuing Guests (INFO ONLY)**
- **შემოწმება**: `realStats.occupiedRooms > 0`
- **შედეგი**: 
  - ✅ **INFO** - არ ბლოკავს audit-ს
  - აჩვენებს: `ℹ️ X სტუმარი რჩება (Continuing) - OK`
- **Override**: ✅ შეიძლება (არ არის critical)

#### 5. **Dirty Rooms (NON-CRITICAL)**
- **შემოწმება**: `realStats.dirtyRooms.length > 0`
- **პირობა**: Room `status` = 'available' ან 'VACANT' AND `cleaningStatus` = 'dirty' ან 'cleaning'
- **შედეგი**: 
  - ⚠️ **WARNING** - არ ბლოკავს audit-ს
  - აჩვენებს: `🔴 X ოთახი დასალაგებელია: [room list]`
- **Override**: ✅ შეიძლება

---

### Night Audit Process

**Start Night Audit Flow:**

1. **Button Click** → `startNightAudit()`
   - ამოწმებს localStorage-ს პირდაპირ (არა state)
   - ამოწმებს `isAuditRunning` flag-ს
   - თუ duplicate → Alert + STOP
   - თუ running → Alert + STOP

2. **User Warning Modal** (30 წამი countdown)
   - აჩვენებს: "Night Audit იწყება! სისტემა დაიბლოკება X წამში"
   - Skip button (Test Mode)

3. **After Countdown** → `startActualAudit()`
   - FINAL CHECK: კვლავ ამოწმებს localStorage-ს
   - თუ duplicate → Alert + STOP
   - თუ OK → იწყება audit process

4. **Audit Steps** (11 steps):
   - Step 0: User Blocking
   - Step 1: Time Check
   - Step 2: Check-in Process
   - Step 3: Check-out Process
   - Step 4: Room Status Update
   - Step 5: Revenue Calculation
   - Step 6: Occupancy Calculation
   - Step 7: Reports Generation
   - Step 8: Email Sending
   - Step 9: Backup Creation
   - Step 10: Business Day Change

5. **Complete Audit** → `completeAudit()`
   - FINAL CHECK: ამოწმებს duplicate-ს audit-ის დასრულებამდე
   - თუ duplicate → Alert + STOP + Reset
   - თუ OK → ინახავს history-ში
   - Updates: `lastAuditDate`, `lastNightAuditDate`, `currentBusinessDate`
   - Unlocks system
   - Resets form

---

### Statistics Calculation

**Real Statistics (`calculateRealStatistics`):**
- **Check-ins**: `actualCheckIn` ან `checkIn` === audit date, status = 'CHECKED_IN'
- **Check-outs**: `checkOut` === audit date, status = 'CHECKED_OUT' ან `autoCheckOut`
- **NO-SHOWS**: `checkIn` === audit date, status = 'NO_SHOW'
- **Revenue**: მხოლოდ actual check-ins (NO-SHOWS და CANCELLED გამორიცხულია)
- **Occupancy**: `(checkIns / totalRooms) * 100`

**Dirty Rooms Detection:**
- Room `status` = 'available' ან 'VACANT'
- Room `cleaningStatus` = 'dirty' ან 'cleaning'
- იყენებს `localStorage.getItem('hotelRooms')` cleaningStatus-ის მისაღებად

---

### Data Storage

**localStorage Keys:**
- `nightAudits`: Array of audit history
- `lastAuditDate`: JSON stringified date (legacy)
- `lastNightAuditDate`: Plain string date (YYYY-MM-DD) - **PREFERRED**
- `currentBusinessDate`: Business day (YYYY-MM-DD)
- `systemLocked`: System lock flag
- `lockedBy`: User who locked system
- `lockedAt`: Lock timestamp

---

### Duplicate Prevention

**Triple Check System:**
1. **Pre-Check** (`runPreChecks`): ამოწმებს `auditHistory` state-ს
2. **Start Check** (`startNightAudit`): ამოწმებს localStorage-ს პირდაპირ
3. **Before Actual Start** (`startActualAudit`): FINAL CHECK countdown-ის შემდეგ
4. **Before Complete** (`completeAudit`): FINAL CHECK audit-ის დასრულებამდე

---

## 🧹 დასუფთავების (Housekeeping) წესები

### Housekeeping Workflow

**Task Statuses:**
1. `pending` - დავალება შექმნილია, მოლოდინშია
2. `in_progress` - დავალება დაიწყო, მუშაობა მიმდინარეობს
3. `completed` - დავალება დასრულებულია, საჭიროებს შემოწმებას
4. `verified` - დავალება შემოწმებულია, ოთახი მზადაა

**Task Types:**
- `checkout` - Check-out-ის შემდეგ დასუფთავება (auto-created)
- `daily` - ყოველდღიური დასუფთავება
- `deep` - სრული/ღრმა დასუფთავება
- `checkin` - Check-in-ისთვის მომზადება

**Task Priority:**
- `low` - დაბალი
- `normal` - ნორმალური
- `high` - მაღალი (default checkout tasks-ისთვის)
- `urgent` - გადაუდებელი

---

### Room Cleaning Status Workflow

**Cleaning Status States:**
1. `dirty` - ოთახი საჭიროებს დასუფთავებას (🔴 დასალაგებელი)
2. `cleaning` - ოთახი იწმინდება (🧹 იწმინდება)
3. `clean` - ოთახი სუფთაა (✅ სუფთა)
4. `inspected` - ოთახი შემოწმებულია (✅ სუფთა)

**Status Transitions:**

1. **Check-out → Dirty:**
   - Check-out-ისას `cleaningStatus` → `dirty`
   - Room `status` → `available`
   - Auto-creates Housekeeping task

2. **Task Start → Cleaning:**
   - Task status → `in_progress`
   - Room `cleaningStatus` → `cleaning`
   - `startedAt` → current timestamp

3. **Task Verify → Clean:**
   - Task status → `verified`
   - Room `cleaningStatus` → `clean`
   - Room `status` → `available` (ან `VACANT`)
   - `verifiedAt` → current timestamp

---

### Checklist Management

**Checklist Source:**
- ✅ იტვირთება Settings-იდან: `localStorage.getItem('housekeepingChecklist')`
- ✅ თითოეული task იღებს checklist-ს Settings-იდან
- ✅ Checklist sync button: "🔄 ჩეკლისტის სინქრო"
  - Updates all `pending` და `in_progress` tasks
  - Resets `completed` status for all items

**Checklist Structure:**
```typescript
{
  item: string,        // Task description
  completed: boolean,  // Completion status
  required: boolean,   // Is required item
  category: string     // Category (e.g., 'ზოგადი')
}
```

---

### Auto-Task Creation

**Check-out Tasks:**
- ✅ Auto-creates task when room status = `CHECKOUT`
- ✅ Prevents duplicates (checks existing pending tasks)
- ✅ Uses Settings checklist
- ✅ Priority: `high`
- ✅ Type: `checkout`

**Duplicate Prevention:**
- Checks for existing pending task: `roomNumber + type + status = 'pending'`
- Skips creation if duplicate found

---

### Staff Assignment

**Staff Loading:**
- ✅ იტვირთება Settings-იდან: `localStorage.getItem('hotelStaff')`
- ✅ Filters for Housekeeping department/position/role
- ✅ Case-insensitive matching:
  - Department: 'housekeeping', 'hsk', 'დასუფთავება'
  - Position: 'housekeeper', 'დამლაგებელი'
  - Role: 'housekeeper'
- ✅ Fallback: Shows all active staff if no housekeeping staff found

**Assignment:**
- Staff name stored in task: `assignedTo`
- Filter by shift (დილა, საღამო, ღამე)

---

### Task Filtering & Sorting

**Filters:**
- Floor: `all` | `1` | `2` | `3` | ...
- Status: `all` | `pending` | `in_progress` | `completed` | `verified`

**Sorting:**
1. Pending tasks first
2. Then by creation time (newest first)

**Floor Detection:**
- Reads from room data: `room.floor`
- Fallback: Extracts from room number (e.g., 101 → floor 1)

---

### Task Actions

**Start Task:**
- Updates task status → `in_progress`
- Updates room `cleaningStatus` → `cleaning`
- Sets `startedAt` timestamp

**Complete Task:**
- Updates task status → `completed`
- Sets `completedAt` timestamp
- Task awaits verification

**Verify Task:**
- Updates task status → `verified`
- Updates room `cleaningStatus` → `clean`
- Updates room `status` → `VACANT` (ready for new guest)
- Sets `verifiedAt` timestamp
- Alert: "✅ დასუფთავება შემოწმებულია! 🟢 ოთახი მზადაა ახალი სტუმრისთვის."

---

### Task Archiving

**Auto-Archive Rules:**
- Tasks older than 2 days are archived
- Only `verified` tasks are archived
- Archived tasks moved to `housekeepingArchive` localStorage
- Active tasks remain in `housekeepingTasks` localStorage

---

### Statistics

**Displayed Statistics:**
- **სულ დავალებები** - Total tasks
- **მოლოდინში** - Pending tasks
- **მიმდინარე** - In-progress tasks
- **დასრულებული** - Completed tasks
- **შემოწმებული** - Verified tasks

---

### Data Storage

**localStorage Keys:**
- `housekeepingTasks`: Array of active tasks
- `housekeepingArchive`: Array of archived tasks
- `housekeepingChecklist`: Checklist from Settings
- `hotelStaff`: Staff data for assignment
- `hotelRooms`: Room data with `cleaningStatus`

---

## 💰 სალაროს წესები

### Shift Management

**Shift Opening:**
- გახსნა: საწყისი ბალანსი (auto-fill წინა დღის ნაშთიდან)
- Opening balance იტვირთება წინა shift-ის closing balance-დან
- Opening date/time იწერება

**Shift Closing:**
- დახურვა: ფაქტიური ნაღდი ფულის დათვლა
- შემდეგი დღისთვის დატოვება (carry forward amount)
- Closing date/time იწერება
- Shift status → `closed`

---

### Manual Transactions

**Income (შემოსავალი):**
- Type: `income`
- Method: `cash` | `card` | `bank`
- ემატება `transactions` array-ს
- Description: მომხმარებლის მითითებული აღწერა

**Expense (ხარჯი):**
- Type: `expense`
- Method: `cash` | `card` | `bank`
- ემატება `manualTransactions` array-ს
- Description: მომხმარებლის მითითებული აღწერა

**Transaction Structure:**
```typescript
{
  id: string,
  type: 'income' | 'expense',
  method: 'cash' | 'card' | 'bank',
  amount: number,
  description: string,
  date: string,
  time: string,
  createdBy: string,
  createdAt: string
}
```

---

### Reports

**X-Report (მიმდინარე Shift):**
- Shows current shift statistics
- Shift არ იხურება (continues)
- Displays:
  - Opening balance
  - Cash/Card/Bank totals from transactions
  - Manual transactions (expenses)
  - Expected cash vs actual cash
  - Current balance

**Z-Report (დღის დახურვა):**
- Generated during Night Audit
- Final shift report for the day
- Shift status → `closed`
- Includes all transactions for the day
- Used for accounting and reconciliation

---

### History Storage

**Shift History:**
- Stored in: `cashierShifts` localStorage
- Each shift includes:
  - Opening balance
  - Closing balance
  - All transactions
  - Manual transactions (expenses)
  - Opening/Closing dates/times
  - Shift status

**Transaction Storage:**
- Transactions saved with shift
- Manual transactions stored separately: `cashierManualTransactions`
- All transactions linked to shift ID

**Data Structure:**
```typescript
{
  id: string,
  shiftNumber: string,
  openingBalance: number,
  closingBalance: number,
  transactions: Transaction[],
  manualTransactions: Transaction[],
  openingDate: string,
  closingDate: string | null,
  status: 'open' | 'closed',
  openedBy: string,
  closedBy: string | null
}
```

---

### Calculations

**Calculated Totals:**
- `calculatedTotals`: cash + card + bank from transactions
- Separated by payment method:
  - Cash total: sum of cash transactions
  - Card total: sum of card transactions
  - Bank total: sum of bank transactions

**Expenses:**
- Calculated from `manualTransactions` where `type = 'expense'`
- Grouped by method (cash/card/bank)

**Expected Cash:**
- `expectedCash = openingBalance + cash - expenses`
- Opening balance + cash income - cash expenses
- Used for reconciliation with actual cash count

**Balance Calculation:**
- `currentBalance = openingBalance + totalIncome - totalExpenses`
- Real-time balance during shift
- Final balance = closing balance

---

### Reconciliation

**Cash Reconciliation:**
- Actual cash count (manual count)
- Expected cash (calculated)
- Difference = actual - expected
- Discrepancies logged for investigation

**Reconciliation Process:**
1. Count actual cash
2. Compare with expected cash
3. Record any differences
4. Note discrepancies in shift notes
5. Close shift with final balance

---

### Data Storage Keys

**localStorage Keys:**
- `cashierShifts`: Array of all shifts (open + closed)
- `cashierManualTransactions`: Manual expense transactions
- `currentCashierShift`: Current open shift ID (if any)
- `cashierSettings`: Cashier configuration and preferences

---

## 📊 Summary Table

| Action | Closed Check-in Date | Closed Check-out Date | No Audit |
|--------|---------------------|----------------------|----------|
| Check-in | ❌ Blocked | ✅ Allowed | ✅ Allowed (from today) |
| Check-out | ✅ Always Allowed | ✅ Always Allowed | ✅ Allowed |
| Payment | ✅ Always Allowed | ✅ Always Allowed | ✅ Allowed |
| View Details | ✅ Always Allowed | ✅ Always Allowed | ✅ Allowed |
| Edit | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| Cancel | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| NO-SHOW | ❌ Blocked | ✅ Allowed | ✅ Allowed |
| New Reservation | ❌ Blocked | ❌ Blocked | ✅ Allowed (from today) |

---

## 🔄 Workflow Diagrams

### Check-out → Housekeeping Workflow

```
Check-out
    ↓
Room status: available
Room cleaningStatus: dirty
    ↓
Auto-create Housekeeping Task (pending)
    ↓
Staff starts task
    ↓
Room cleaningStatus: cleaning
Task status: in_progress
    ↓
Staff completes checklist
    ↓
Task status: completed
    ↓
Supervisor verifies
    ↓
Room cleaningStatus: clean
Room status: VACANT
Task status: verified
    ↓
Room ready for new guest ✅
```

---

### Night Audit Pre-Checks Flow

```
Start Night Audit
    ↓
Check 0: Duplicate Prevention
    ↓ (if OK)
Check 1: Pending Check-outs
    ↓ (if OK)
Check 2: Pending Check-ins
    ↓ (if OK)
Check 3: Sequential Closing
    ↓ (if OK)
Check 4: Continuing Guests (INFO)
    ↓ (if OK)
Check 5: Dirty Rooms (WARNING)
    ↓
All checks passed ✅
    ↓
Start Audit Process
```

---

## ⚠️ Important Notes

1. **Date Comparison:**
   - Uses `moment().isSameOrBefore()` for closed dates
   - Uses `moment().isSameOrAfter()` for booking dates
   - All comparisons use 'day' granularity

2. **Business Day Calculation:**
   - Business Day = lastAuditDate + 1 day
   - თუ audit არ არის → Business Day = Today

3. **Payment on Closed Dates:**
   - Payment is ALWAYS allowed
   - Creates special payment record with `isPostAudit: true`
   - Shows warning in PaymentModal

4. **Check-out on Closed Dates:**
   - Check-out is ALWAYS allowed
   - May show special message for late check-out

5. **Cleaning Status Persistence:**
   - `cleaningStatus` ინახება `localStorage.getItem('hotelRooms')`-ში
   - Calendar და Room Grid იტვირთება cleaningStatus-ს localStorage-იდან
   - Night Audit ითვლის dirty rooms cleaningStatus-ის მიხედვით

6. **Read-Only Mode:**
   - Checked-out reservations become read-only after Night Audit
   - Edit button disabled, warning shown
   - View-only modal for closed dates

---

**ბოლო განახლება**: 2025-12-04

---

## 📝 დამატებული სექციები

- ✅ **ჯავშნის შექმნის წესები** - როდისაა დაშვებული/დაბლოკილი reservation-ის შექმნა
- ✅ **Check-in → cleaningStatus Reset** - cleaningStatus გასუფთავება check-in-ისას
- ✅ **სალაროს წესები** - Shift management, manual transactions, reports, reconciliation


