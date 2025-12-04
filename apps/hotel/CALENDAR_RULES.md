# 📅 კალენდრის წესები - სრული დოკუმენტაცია

## 📋 ზოგადი ინფორმაცია

RoomCalendar კომპონენტი არის ოთახების და reservations-ის ვიზუალიზაციის სისტემა, რომელიც მოიცავს:
- Business Day logic
- Closed dates handling
- Booking restrictions
- Action permissions on closed dates
- Payment processing on closed dates

---

## 📅 Business Day Logic

### `getBusinessDay()` Function:

```typescript
// Priority:
1. lastNightAuditDate (if exists) - PREFERRED
2. lastAuditDate (fallback) - Legacy
3. Today (if no audit) - Default
```

**Rules**:
- თუ Night Audit არ არის გაკეთებული → Business Day = დღეს
- თუ Night Audit გაკეთებულია → Business Day = lastAuditDate + 1 day
- **მაგალითი**: თუ last audit = 2025-11-27 → Business Day = 2025-11-28

---

## 🔒 Closed Days Logic

### `isClosedDay()` Function:

**თუ Night Audit არ არის გაკეთებული**:
- ✅ დახურული: წარსულის დღეები (დღესდან ადრე)
- ✅ ღია: დღეს და მომავალში

**თუ Night Audit გაკეთებულია**:
- ✅ დახურული: lastAuditDate-მდე (lastAuditDate-ის ჩათვლით)
- ✅ ღია: lastAuditDate-ის შემდეგ

**მაგალითი**:
- Last audit = 2025-11-27
- დახურული: 27-მდე (27-ის ჩათვლით)
- ღია: 28-დან და შემდეგ

---

## 📝 Booking Rules

### `canBookOnDate()` Function:

**თუ Night Audit არ არის გაკეთებული**:
- ✅ დაშვებული: დღესდან და შემდეგ
- ❌ დაბლოკილი: წარსულის დღეები

**თუ Night Audit გაკეთებულია**:
- ✅ დაშვებული: Business Day-დან და შემდეგ
- ❌ დაბლოკილი: Business Day-მდე

**მაგალითი**:
- Business Day = 2025-11-28
- დაშვებული: 28-დან და შემდეგ
- დაბლოკილი: 27-მდე

---

## 🎯 Action Permissions on Closed Dates

### `getAllowedActionsForClosedDate()` Function:

### ✅ **ALWAYS ALLOWED Actions** (even on closed dates):
1. **check-out** - Check-out ყოველთვის დაშვებულია
2. **payment** - გადახდა ყოველთვის დაშვებულია
3. **view-details** - დეტალების ნახვა ყოველთვის დაშვებულია

### ❌ **BLOCKED Actions** (on closed dates):
1. **check-in** - დაბლოკილია, თუ check-in date დახურულია
2. **edit** - დაბლოკილია, თუ check-in date დახურულია
3. **cancel** - დაბლოკილია, თუ check-in date დახურულია
4. **no-show** - დაბლოკილია, თუ check-in date დახურულია
5. **new-reservation** - დაბლოკილია, თუ date დახურულია

### Relevant Date Logic (`getRelevantDate()`):

- **check-in, no-show** → `reservation.checkIn` date
- **check-out** → `reservation.checkOut` date
- **edit, cancel** → `reservation.checkIn` date

---

## 💳 Payment Processing on Closed Dates

### Special Rules:

1. **Payment is ALWAYS allowed** - even on closed dates
2. **Post-Audit Payment Detection**:
   - ამოწმებს, თუ `checkOutDate` დახურულია
   - თუ დახურულია → marks as `isPostAudit: true`
   - აჩვენებს warning modal-ში

3. **Payment Record Metadata**:
   ```typescript
   {
     processedOn: "2025-11-28", // Today
     forDate: "2025-11-27",     // Original reservation date
     isPostAudit: true,
     note: "Payment processed after Night Audit"
   }
   ```

4. **Payment History Storage**:
   - ინახება `localStorage.getItem('paymentHistory')`
   - Includes full metadata for audit trail

---

## 🎨 Visual Indicators

### Closed Days:
- **Style**: `bg-gray-100 cursor-not-allowed opacity-50`
- **Text**: "დახურული" (in Georgian)
- **Behavior**: არ არის clickable

### Available Days:
- **Style**: `bg-white hover:bg-blue-50 cursor-pointer`
- **Behavior**: Clickable for booking

### Blocked Dates:
- **Style**: `bg-red-100 cursor-not-allowed`
- **Text**: "BLOCKED"
- **Behavior**: Manual block (not related to Night Audit)

---

## 🔍 Context Menu Rules

### Reservation Context Menu:

**Header Info**:
- Guest name
- Room number
- Status
- ⚠️ Warning if check-in/check-out date is closed

**Always Available Actions**:
- 👁️ View Details ✓
- 🚪 Check Out ✓ (if status = CHECKED_IN)
- 💳 Payment ✓

**Conditional Actions**:
- ✅ Check In (if status = CONFIRMED, not closed)
- ✏️ Edit (if not closed)
- ❌ Mark as NO-SHOW (if status = CONFIRMED, not closed)
- 🗑️ Cancel (if not closed)

**Visual Indicators**:
- ✓ Green checkmark = Always allowed
- 🔒 Locked icon = Blocked (closed date)
- ⚠️ Warning = Date closed indicator

---

## 📊 Data Sources

### Priority Order:

1. **lastNightAuditDate** (localStorage) - **PREFERRED**
   - Format: Plain string (YYYY-MM-DD)
   - Source: Night Audit System v2

2. **lastAuditDate** (localStorage) - **FALLBACK**
   - Format: JSON stringified
   - Source: Legacy Night Audit System

3. **Today** (moment()) - **DEFAULT**
   - Format: Current date
   - Used when no audit exists

---

## 🔄 State Management

### useEffect Dependencies:

```typescript
useEffect(() => {
  if (!isAuditRunning) {
    loadRealData()
    loadAuditHistory()
  }
}, [selectedDate, isAuditRunning])
```

**Rules**:
- Loads data when `selectedDate` changes
- Skips reload if audit is running (prevents race conditions)

---

## ⚠️ Important Notes

1. **Date Comparison**:
   - Uses `moment().isSameOrBefore()` for closed dates
   - Uses `moment().isSameOrAfter()` for booking dates
   - All comparisons use 'day' granularity

2. **Business Day Calculation**:
   - Business Day = lastAuditDate + 1 day
   - თუ audit არ არის → Business Day = Today

3. **Payment on Closed Dates**:
   - Payment is ALWAYS allowed
   - Creates special payment record with `isPostAudit: true`
   - Shows warning in PaymentModal

4. **Check-out on Closed Dates**:
   - Check-out is ALWAYS allowed
   - May show special message for late check-out

---

## 🎯 Summary Table

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

**ბოლო განახლება**: 2025-11-28



