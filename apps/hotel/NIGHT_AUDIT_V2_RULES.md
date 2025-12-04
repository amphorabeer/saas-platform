# 🌙 Night Audit System v2 - სრული წესები

## 📋 ზოგადი ინფორმაცია

Night Audit System v2 არის გაუმჯობესებული Night Audit სისტემა, რომელიც მოიცავს:
- მკაცრ validation rules
- Duplicate prevention
- Real-time statistics
- Multi-step audit process
- User blocking during audit

---

## ✅ Pre-Checks (ვალიდაცია Night Audit-ის დაწყებამდე)

### 0. **Duplicate Prevention (CRITICAL - CHECK FIRST)**
- **შემოწმება**: ამოწმებს `auditHistory` state-ს და `localStorage.getItem('nightAudits')`-ს
- **პირობა**: თუ `date === selectedDate` და `status === 'completed'` და `!reversed`
- **შედეგი**: 
  - ❌ **BLOCKING** - არ იძლევა audit-ის დაწყებას
  - აჩვენებს: `🚫 {date} უკვე დახურულია {time}-ზე`
  - Details: დახურვის თარიღი, დრო, მომხმარებელი, სტატუსი
- **Override**: ❌ არ შეიძლება

### 1. **Pending Check-outs (CRITICAL)**
- **შემოწმება**: `realStats.pendingCheckOuts.length > 0`
- **პირობა**: Check-out date ≤ audit date და status = 'CHECKED_IN'
- **შედეგი**: 
  - ❌ **BLOCKING** - ყველა pending check-out უნდა დასრულდეს
  - აჩვენებს: `❌ X დაუსრულებელი Check-out - უნდა დასრულდეს!`
  - Details: სია guest names და room numbers
- **Override**: ❌ არ შეიძლება

### 2. **Pending Check-ins (CRITICAL)**
- **შემოწმება**: `realStats.unmarkedArrivals.length > 0`
- **პირობა**: Check-in date = audit date და status = 'CONFIRMED'
- **შედეგი**: 
  - ❌ **BLOCKING** - ყველა check-in უნდა იყოს დამუშავებული (Check-in ან NO-SHOW)
  - აჩვენებს: `❌ X დაუსრულებელი Check-in - გააკეთეთ Check-in ან NO-SHOW!`
  - Details: სია guest names და room numbers
- **Override**: ❌ არ შეიძლება

### 3. **Sequential Closing (CRITICAL)**
- **შემოწმება**: `lastAuditDate` არსებობს
- **პირობა**: 
  - თუ `daysBetween > 1` → ❌ დღის გამოტოვება
  - თუ `daysBetween === 1` → ✅ Sequential
  - თუ `daysBetween === 0` → ❌ უკვე დახურულია (handled by check #0)
- **შედეგი**: 
  - ❌ **BLOCKING** - დღეები უნდა იხურებოდეს თანმიმდევრულად
  - აჩვენებს: `❌ დღის გამოტოვება! ჯერ დახურეთ {nextDate}`
- **Override**: ❌ არ შეიძლება

### 4. **Continuing Guests (INFO ONLY)**
- **შემოწმება**: `realStats.occupiedRooms > 0`
- **შედეგი**: 
  - ✅ **INFO** - არ ბლოკავს audit-ს
  - აჩვენებს: `ℹ️ X სტუმარი რჩება (Continuing) - OK`
- **Override**: ✅ შეიძლება (არ არის critical)

### 5. **Dirty Rooms (NON-CRITICAL)**
- **შემოწმება**: `realStats.dirtyRooms.length > 0`
- **შედეგი**: 
  - ⚠️ **WARNING** - არ ბლოკავს audit-ს
  - აჩვენებს: `🧹 X ოთახი დასუფთავებაში: [room list]`
- **Override**: ✅ შეიძლება

---

## 🚀 Night Audit Process

### Start Night Audit Flow:

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

## 🔒 Duplicate Prevention

### Triple Check System:

1. **Pre-Check** (`runPreChecks`):
   - ამოწმებს `auditHistory` state-ს
   - თუ duplicate → returns checks with blocking message

2. **Start Check** (`startNightAudit`):
   - ამოწმებს localStorage-ს პირდაპირ
   - თუ duplicate → Alert + STOP

3. **Before Actual Start** (`startActualAudit`):
   - FINAL CHECK countdown-ის შემდეგ
   - თუ duplicate → Alert + STOP

4. **Before Complete** (`completeAudit`):
   - FINAL CHECK audit-ის დასრულებამდე
   - თუ duplicate → Alert + STOP + Reset

---

## 📊 Statistics Calculation

### Real Statistics (`calculateRealStatistics`):

- **Check-ins**: `actualCheckIn` ან `checkIn` === audit date, status = 'CHECKED_IN'
- **Check-outs**: `checkOut` === audit date, status = 'CHECKED_OUT' ან `autoCheckOut`
- **NO-SHOWS**: `checkIn` === audit date, status = 'NO_SHOW'
- **Revenue**: მხოლოდ actual check-ins (NO-SHOWS და CANCELLED გამორიცხულია)
- **Occupancy**: `(checkIns / totalRooms) * 100`

---

## 💾 Data Storage

### localStorage Keys:

- `nightAudits`: Array of audit history
- `lastAuditDate`: JSON stringified date (legacy)
- `lastNightAuditDate`: Plain string date (YYYY-MM-DD) - **PREFERRED**
- `currentBusinessDate`: Business day (YYYY-MM-DD)
- `systemLocked`: System lock flag
- `lockedBy`: User who locked system
- `lockedAt`: Lock timestamp

---

## ⚠️ Important Notes

1. **State vs localStorage**: 
   - Pre-checks იყენებს `auditHistory` state-ს
   - Start checks იყენებს localStorage-ს პირდაპირ
   - ეს უზრუნველყოფს race condition-ების თავიდან აცილებას

2. **isAuditRunning Flag**:
   - იცავს concurrent audit-ებისგან
   - Reset-დება audit-ის დასრულებისას

3. **History Sync**:
   - `loadAuditHistory()` იძახება audit-ის დასრულების შემდეგ
   - ეს უზრუნველყოფს state-ის სინქრონიზაციას

---

**ბოლო განახლება**: 2025-11-28



