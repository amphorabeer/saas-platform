# Hotel PMS - Bug Report & Fixes

## 🐛 Found Bugs

### Bug #1: Folio Balance Calculation - Tax Not Included Properly
**Location**: `src/components/FolioManager.tsx:120`
**Severity**: High
**Description**: 
When posting a charge with tax, the balance is calculated as `folio.balance + grossAmount`, but the tax amount is calculated separately and not properly reflected in the balance. The transaction shows tax details but balance calculation doesn't account for tax properly.

**Expected**: 
Balance should be: `folio.balance + grossAmount` (where grossAmount includes tax if tax is included in price, or `netAmount + taxAmount` if tax is added)

**Actual**: 
Balance is `folio.balance + grossAmount`, but tax calculation shows `taxAmount = grossAmount * taxRate / 100`, which suggests tax is included in grossAmount, but the logic is confusing.

**Fix**: 
Clarify if tax is included in `charge.amount` or added separately. If tax is included, balance calculation is correct. If tax should be added, use `netAmount + taxAmount`.

---

### Bug #2: PaymentService Balance Calculation - Not Recalculating from Transactions
**Location**: `src/services/PaymentService.ts:77,93`
**Severity**: High
**Description**: 
PaymentService calculates balance as `folio.balance - params.amount` directly, but doesn't recalculate balance from all transactions. This can cause inconsistencies if folio.balance is out of sync.

**Expected**: 
Balance should be recalculated from all transactions: `sum(debit) - sum(credit)`

**Actual**: 
Balance is calculated as `folio.balance - params.amount`, which assumes folio.balance is already correct.

**Fix**: 
Recalculate balance from transactions array before applying new payment, or ensure balance is always recalculated after each transaction.

---

### Bug #3: Check-in Process - Folio Not Created Automatically
**Location**: `src/components/CheckInModal.tsx`
**Severity**: Medium
**Description**: 
CheckInModal creates a reservation but doesn't create a folio automatically. Folio is only created when first accessed (lazy creation), which can cause issues if folio is needed immediately.

**Expected**: 
Folio should be created automatically when reservation status changes to 'CHECKED_IN'.

**Actual**: 
Folio is created lazily when first accessed (in FolioManager or CheckOutModal).

**Fix**: 
Create folio in the check-in handler in RoomCalendar or in the API route that processes check-in.

---

### Bug #4: Tax Calculation - Inconsistent Tax Rates
**Location**: `src/services/PostingService.ts:calculateTaxes()`
**Severity**: Medium
**Description**: 
Tax calculation uses hardcoded rates (VAT 18%, City Tax 3%, Tourism Tax 1%), but these should be configurable from settings. Also, tax calculation logic may not match ExtraChargesService tax calculation.

**Expected**: 
Tax rates should be loaded from `taxSettings` in localStorage, and calculation should be consistent across all services.

**Actual**: 
Hardcoded rates in PostingService, different rates in ExtraChargesService categories.

**Fix**: 
Create a centralized tax calculation service that loads rates from settings and provides consistent calculation.

---

### Bug #5: Balance Recalculation - No Validation
**Location**: Multiple files (FolioManager, PaymentService, PostingService)
**Severity**: Medium
**Description**: 
Balance is calculated incrementally but never validated against the sum of all transactions. If a transaction is added incorrectly or balance is manually modified, inconsistencies can occur.

**Expected**: 
Balance should be recalculated from transactions: `balance = sum(all transactions.debit) - sum(all transactions.credit)`

**Actual**: 
Balance is updated incrementally: `balance = previousBalance + debit - credit`

**Fix**: 
Add a `recalculateBalance()` function that validates and recalculates balance from transactions array.

---

### Bug #6: Night Audit - Business Date Not Updated Properly
**Location**: `src/components/NightAuditModule.tsx`
**Severity**: High
**Description**: 
After Night Audit completes, `lastNightAuditDate` and `currentBusinessDate` should be updated, but there might be race conditions or the update might not persist correctly.

**Expected**: 
After audit completes: `lastNightAuditDate = auditDate`, `currentBusinessDate = auditDate + 1 day`

**Actual**: 
Need to verify the update logic in `completeAudit()` function.

**Fix**: 
Ensure `localStorage.setItem('lastNightAuditDate', auditDate)` and `localStorage.setItem('currentBusinessDate', moment(auditDate).add(1, 'day').format('YYYY-MM-DD'))` are called atomically.

---

### Bug #7: Folio Transaction Balance - Running Balance Not Calculated Correctly
**Location**: `src/components/FolioManager.tsx:120,174`
**Severity**: High
**Description**: 
Each transaction has a `balance` field that should represent the running balance after that transaction. However, the calculation uses `folio.balance` which might not be the correct running balance if transactions are not processed in order.

**Expected**: 
Transaction balance should be: `previousTransaction.balance + currentTransaction.debit - currentTransaction.credit`

**Actual**: 
Transaction balance is: `folio.balance + debit - credit`, which assumes folio.balance is the last transaction's balance.

**Fix**: 
Calculate running balance from previous transactions: `const previousBalance = folio.transactions.length > 0 ? folio.transactions[folio.transactions.length - 1].balance : 0`

---

### Bug #8: Payment History - Not Saved to localStorage
**Location**: `src/services/PaymentService.ts:109`
**Severity**: Low
**Description**: 
PaymentService mentions saving to payment history but the code might not be complete.

**Expected**: 
Payment should be saved to `paymentHistory` in localStorage.

**Actual**: 
Need to verify if payment history is actually saved.

**Fix**: 
Ensure payment is added to `paymentHistory` array in localStorage.

---

### Bug #9: Check-out Validation - Balance Check Not Enforced
**Location**: `src/components/CheckOutModal.tsx:149`
**Severity**: Medium
**Description**: 
Check-out should not be allowed if balance > 0, but the validation might not be strict enough.

**Expected**: 
Check-out button should be disabled if `folio.balance > 0.01` (allowing for rounding errors).

**Actual**: 
`canCheckOut` is set based on `folio.balance <= 0`, but might allow checkout with small positive balance due to floating point errors.

**Fix**: 
Use `Math.abs(folio.balance) < 0.01` to allow for rounding errors, or require explicit zero balance confirmation.

---

### Bug #10: Room Charge Posting - Duplicate Check May Fail
**Location**: `src/services/PostingService.ts:70-85`
**Severity**: Medium
**Description**: 
Duplicate check looks for existing charge with same `nightAuditDate` and `category === 'room'`, but if folio is reloaded or transactions are modified, duplicate might not be detected.

**Expected**: 
Duplicate check should be robust and check both `nightAuditDate` and `referenceId`.

**Actual**: 
Only checks `nightAuditDate` and `category`, might miss duplicates if referenceId is different.

**Fix**: 
Also check `referenceId` which includes reservation ID and date: `referenceId: ROOM-${reservation.id}-${auditDate}`

---

## 🔧 Priority Fixes

### High Priority:
1. Bug #2: PaymentService Balance Calculation
2. Bug #7: Folio Transaction Balance
3. Bug #6: Night Audit Business Date Update

### Medium Priority:
4. Bug #1: Folio Balance Tax Calculation
5. Bug #3: Check-in Folio Creation
6. Bug #4: Tax Calculation Consistency
7. Bug #5: Balance Recalculation Validation
8. Bug #9: Check-out Validation
9. Bug #10: Duplicate Check

### Low Priority:
10. Bug #8: Payment History

---

## ✅ Applied Fixes

### Fix #1: Folio Balance Calculation - Running Balance from Transactions
**Location**: `src/components/FolioManager.tsx`
**Fix**: 
- Added `recalculateBalance()` function that calculates balance from all transactions
- Changed transaction balance calculation to use previous transaction's balance
- Balance is now recalculated from transactions array after each update

### Fix #2: PaymentService Balance Calculation
**Location**: `src/services/PaymentService.ts`
**Fix**: 
- Balance is now recalculated from existing transactions before applying new payment
- Uses `reduce()` to sum all debits and credits
- Ensures balance consistency

### Fix #3: PostingService Balance Calculation
**Location**: `src/services/PostingService.ts`
**Fix**: 
- Balance recalculated from transactions before posting room charge
- Transaction balance uses running balance calculation
- Duplicate check now also checks `referenceId` in addition to `nightAuditDate`

### Fix #4: Tax Rates from Settings
**Location**: `src/services/PostingService.ts:calculateTaxes()`
**Fix**: 
- Tax rates now loaded from `taxSettings` in localStorage
- Falls back to defaults (VAT 18%, City Tax 3%, Tourism Tax 1%) if settings not found

### Fix #5: Check-in Folio Creation
**Location**: `src/components/RoomCalendar.tsx`
**Fix**: 
- Added `createFolioOnCheckIn()` function
- Folio is now created automatically when check-in is processed
- Logs activity when folio is created

### Fix #6: Check-out Balance Validation
**Location**: `src/components/CheckOutModal.tsx`
**Fix**: 
- Changed validation to use `Math.abs(folio.balance) > 0.01` to allow for rounding errors
- Better error message showing exact balance amount

---

## 📝 Testing Checklist

- [x] Balance calculation - Fixed (recalculates from transactions)
- [x] Payment processing - Fixed (recalculates before applying)
- [x] Room charge posting - Fixed (recalculates and checks duplicates)
- [x] Tax calculation - Fixed (loads from settings)
- [x] Check-in folio creation - Fixed (automatic creation)
- [x] Check-out validation - Fixed (allows rounding errors)
- [ ] Post room charge during Night Audit → Verify no duplicates
- [ ] Night Audit completion → Verify business date updated
- [ ] Balance recalculation → Verify sum of transactions matches balance

