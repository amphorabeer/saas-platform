# 🔍 Debug Code & Test Mode Analysis Report

**Generated:** 2025-12-10  
**Scope:** `apps/hotel/src/`  
**Purpose:** Identify all debug code, test modes, and development-only code for production cleanup

---

## 📊 Summary Statistics

- **console.log statements:** 198 matches
- **console.error/warn:** 202 matches (mostly KEEP - error handling)
- **Test mode flags:** 0 matches
- **TODO/FIXME comments:** 3 matches
- **Hardcoded test data:** 8 matches
- **localhost URLs:** 3 matches
- **alert() statements:** 249 matches (mostly KEEP - user feedback)
- **debugger statements:** 0 matches
- **Temporary/placeholder values:** 152 matches (mostly KEEP - UI placeholders)

---

## 🔴 REMOVE - Debug Console.log Statements

### RoomCalendar.tsx

| Line | Content | Recommendation |
|------|---------|----------------|
| 722 | `console.log('Clicking on date:', date) // Debug log` | **[REMOVE]** - Debug log |
| 768 | `console.log('Overlap check:', { dateStr, resCheckIn, resCheckOut, isOccupied, status: r.status })` | **[REMOVE]** - Debug log |
| 777 | `console.log('Can book:', canBook, 'Reason:', blockReason) // Debug` | **[REMOVE]** - Debug log |
| 819 | `console.log('Opening modal for:', dateStr) // Debug` | **[REMOVE]** - Debug log |
| 1146 | `console.log('🔍 validateDrop called:', { target, reservationId: reservation?.id })` | **[REMOVE]** - Debug log |
| 1149 | `console.log('❌ FAIL: target or reservation is null')` | **[REMOVE]** - Debug log |
| 1155 | `console.log('❌ FAIL: target date is closed:', target.date)` | **[REMOVE]** - Debug log |
| 1161 | `console.log('🏠 Target room lookup:', { targetRoomId: target.roomId, found: !!targetRoom, roomIds: rooms.map(r => ({id: r.id, type: typeof r.id})) })` | **[REMOVE]** - Debug log |
| 1164 | `console.log('❌ FAIL: room not found')` | **[REMOVE]** - Debug log |
| 1170 | `console.log('❌ FAIL: room is in maintenance')` | **[REMOVE]** - Debug log |
| 1179 | `console.log('📅 Date calculation:', { nights, newCheckIn: newCheckIn.format('YYYY-MM-DD'), newCheckOut: newCheckOut.format('YYYY-MM-DD') })` | **[REMOVE]** - Debug log |
| 1183 | `console.log('❌ FAIL: nights < 1')` | **[REMOVE]** - Debug log |
| 1193 | `console.log('❌ FAIL: date in range is closed:', dateStr)` | **[REMOVE]** - Debug log |
| 1210 | `console.log('⚠️ Conflict found:', { dateStr, conflictReservation: r.id, rCheckIn, rCheckOut })` | **[REMOVE]** - Debug log |
| 1217 | `console.log('❌ FAIL: has conflict on date:', dateStr)` | **[REMOVE]** - Debug log |
| 1222 | `console.log('✅ validateDrop PASSED!')` | **[REMOVE]** - Debug log |
| 1312 | `console.log('🔚 handleDragEnd:', { currentIsDragging, hasRes: !!currentDraggedReservation, currentDropTarget })` | **[REMOVE]** - Debug log |
| 1467 | `console.log('✅ Folio updated after room change:', { reservationId: currentDraggedReservation.id, ... })` | **[REMOVE]** - Debug log |
| 1551 | `console.log('Left resize:', { dateStr, currentCheckIn, currentCheckOut })` | **[REMOVE]** - Debug log |
| 1575 | `console.log('Right resize preview:', { dateStr, newCheckOut, currentCheckIn })` | **[REMOVE]** - Debug log |
| 1706 | `console.log('No folios in localStorage')` | **[REMOVE]** - Debug log |
| 1717 | `console.log('Updating folio after resize:', { reservationId: currentDraggedReservation.id, ... })` | **[REMOVE]** - Debug log |
| 1729 | `console.log('Updated initialRoomCharge:', folio.initialRoomCharge)` | **[REMOVE]** - Debug log |
| 1744 | `console.log('Updated transaction:', roomChargeTransaction)` | **[REMOVE]** - Debug log |
| 1767 | `console.log('Folio recalculated:', { totalRoomCharge, ... })` | **[REMOVE]** - Debug log |
| 1785 | `console.log('No folio found for reservation:', currentDraggedReservation.id)` | **[REMOVE]** - Debug log |
| 1822 | `console.log('🖱️ mouseUp:', { isDraggingRef: isDraggingRef.current, ... })` | **[REMOVE]** - Debug log |
| 2444 | `console.log('Notification would be sent to:', reservation.guestEmail)` | **[REMOVE]** - Debug log |
| 3699 | `console.log('Cell clicked:', dateStr) // Debug` | **[REMOVE]** - Debug log |
| 3707 | `console.log('Calling handleSlotClick for:', dateStr) // Debug` | **[REMOVE]** - Debug log |
| 3710 | `console.log('Click blocked:', { hasReservation, isBlocked, isClosed }) // Debug` | **[REMOVE]** - Debug log |
| 3713 | `console.log('Date not bookable or closed:', dateStr, { canBook: canBookOnDate(date), isClosed }) // Debug` | **[REMOVE]** - Debug log |
| 4865 | `console.log('ReservationDetails: Loading folio data', { reservationId: reservation.id, ... })` | **[REMOVE]** - Debug log |
| 4937 | `console.log('ReservationDetails: Received folioUpdated event', event.detail)` | **[REMOVE]** - Debug log |

### NightAuditModule.tsx

| Line | Content | Recommendation |
|------|---------|----------------|
| 619 | `console.log('Cleared stale audit lock')` | **[REMOVE]** - Debug log |
| 643 | `console.log('Night Audit - Selected Date:', selectedDate)` | **[REMOVE]** - Debug log |
| 644 | `console.log('Night Audit - All Reservations:', reservations.map((r: any) => ({ id: r.id, ... })))` | **[REMOVE]** - Debug log (large data dump) |
| 671 | `console.log('Night Audit - Pending Check-ins:', pendingCheckIns.length, pendingCheckIns.map((r: any) => r.guestName))` | **[REMOVE]** - Debug log |
| 672 | `console.log('Night Audit - Unmarked Arrivals:', unmarkedArrivals.length, unmarkedArrivals.map((r: any) => r.guestName))` | **[REMOVE]** - Debug log |
| 727 | `console.log(\`⚠️ ${dirtyCount} ოთახი დასალაგებელია\`)` | **[REVIEW]** - Could be useful for debugging, but should use proper logging |
| 813 | `console.log(\`Stats for ${date}:\`, { checkIns, checkOuts, noShows, occupiedRooms, occupancy, revenue })` | **[REMOVE]** - Debug log |
| 1149 | `console.log('Audit countdown cancelled')` | **[REMOVE]** - Debug log |
| 2679 | `console.log('Z-REPORT: Loaded reservations from API:', reservations.length)` | **[REMOVE]** - Debug log |
| 3484 | `console.log('Z-Report Stats Debug:', { totalRooms, ... })` | **[REMOVE]** - Debug log |

### CheckInModal.tsx

| Line | Content | Recommendation |
|------|---------|----------------|
| 98 | `console.log('Loaded roomRates:', rates)` | **[REMOVE]** - Debug log |
| 110 | `console.log('Loaded seasons:', loadedSeasons)` | **[REMOVE]** - Debug log |
| 114-123 | `console.log('=== SEASON DEBUG ===')` + multiple season debug logs | **[REMOVE]** - Extensive debug block |
| 136 | `console.log('Loaded weekday prices:', weekdays)` | **[REMOVE]** - Debug log |
| 148 | `console.log('Loaded special dates:', parsed)` | **[REMOVE]** - Debug log |
| 197-200 | `console.log('=== SEASON MODIFIER DEBUG ===')` + test date logs | **[REMOVE]** - Debug block |
| 205-261 | `console.log('=== SEASON MODIFIER DEBUG ===')` + extensive season checking logs | **[REMOVE]** - Large debug block |
| 272 | `console.log(\`Weekday "${weekdayPrice.dayName}" modifier: ${weekdayPrice.priceModifier}%\`)` | **[REMOVE]** - Debug log |
| 297 | `console.log(\`Special date "${special.name}" modifier: ${special.priceModifier}%\`)` | **[REMOVE]** - Debug log |
| 311 | `console.log('calculatePricePerNight:', { date, roomTypeName, rate, roomRates })` | **[REMOVE]** - Debug log |
| 328 | `console.log(\`Price for ${date}: base=${basePrice}, special="${specialDate.name}" ${specialDate.modifier}%, final=${finalPrice}\`)` | **[REMOVE]** - Debug log |
| 344 | `console.log(\`Price for ${date}: after weekday "${weekdayMod.dayName}" ${weekdayMod.modifier}%, final=${basePrice}\`)` | **[REMOVE]** - Debug log |
| 427 | `console.log('Updating totalAmount:', total)` | **[REMOVE]** - Debug log |
| 470 | `console.log('Overlap check:', { newCheckIn: checkInDate.format('YYYY-MM-DD'), ... })` | **[REMOVE]** - Debug log |

### migrateFolios.ts

| Line | Content | Recommendation |
|------|---------|----------------|
| 29 | `console.log(\`Fixing: \${f.roomNumber} → \${room.roomNumber}\`);` | **[KEEP]** - Migration script output (user feedback) |
| 38 | `console.log(\`Fixed \${fixed} folios. Refresh page.\`);` | **[KEEP]** - Migration script output |
| 54 | `console.log('💡 Make sure rooms are loaded first. Try refreshing the page.')` | **[KEEP]** - Migration script user guidance |
| 58-59 | `console.log('📦 Rooms:', rooms.length)` + `console.log('📁 Folios:', folios.length)` | **[KEEP]** - Migration script status |
| 72 | `console.log(\`✅ Fixing folio \${folio.folioNumber}: \${oldRoomNumber} → \${folio.roomNumber}\`)` | **[KEEP]** - Migration script progress |
| 76 | `console.log(\`⚠️ Room not found for folio \${folio.folioNumber}: \${folio.roomNumber}\`)` | **[KEEP]** - Migration script warning |
| 96 | `console.log(\`✅ Fixing folioNumber: \${oldFolioNumber} → \${folio.folioNumber}\`)` | **[KEEP]** - Migration script progress |
| 109-111 | Multiple console.log statements for migration results | **[KEEP]** - Migration script output |

**Note:** `migrateFolios.ts` is a migration utility script. Console logs here are intentional for user feedback during migration.

### page.tsx

| Line | Content | Recommendation |
|------|---------|----------------|
| 364 | `// Add global debug functions for console` | **[REVIEW]** - Check if debug functions are still needed |
| 488-489 | `console.error('❌ Error fetching reservations:', error)` + `console.error('Error details:', error.message)` | **[KEEP]** - Error handling |
| 544 | `console.log('  - localStorage: Used for caching/debugging (not synchronized)')` | **[REMOVE]** - Debug info in production |

### reservations/route.ts

| Line | Content | Recommendation |
|------|---------|----------------|
| 241 | `console.log('Updating reservation with data:', JSON.stringify(updateData, null, 2))` | **[REMOVE]** - Debug log (sensitive data) |
| 275-277 | Multiple `console.error` statements | **[KEEP]** - Error handling |

---

## 🟢 KEEP - Error Handling (console.error/warn)

All `console.error()` and `console.warn()` statements are **KEEP** - they are essential for error handling and debugging production issues.

**Files with error handling:**
- Invoice.tsx
- RoomCalendar.tsx
- NightAuditModule.tsx
- CheckInModal.tsx
- Reports.tsx
- FolioViewModal.tsx
- FinancialDashboard.tsx
- FolioManager.tsx
- FolioSystem.tsx
- PostingService.ts
- NightAuditPostingSummary.tsx
- page.tsx
- All API routes

**Total:** 202 error handling statements (KEEP)

---

## 🟡 REVIEW - TODO Comments

| File | Line | Content | Recommendation |
|------|------|---------|----------------|
| RoomCalendar.tsx | 2442 | `// TODO: Send notification if requested` | **[REVIEW]** - Check if notification feature is implemented |
| SettingsNew.tsx | 3442 | `placeholder="REV-XXX"` | **[KEEP]** - UI placeholder (not code) |
| SettingsNew.tsx.backup | 3371 | `placeholder="REV-XXX"` | **[KEEP]** - Backup file, can be ignored |

---

## 🔴 REMOVE - Hardcoded Test Data

| File | Line | Content | Recommendation |
|------|------|---------|----------------|
| page.tsx | 990 | `'ტესტ მონაცემი'` in confirmation message | **[REVIEW]** - User-facing text, might be intentional |
| login/page.tsx | 135 | `href="http://localhost:3000/auth/signup?module=hotel"` | **[REMOVE]** - Hardcoded localhost URL |
| SettingsNew.tsx | 916 | `placeholder="123456789"` | **[KEEP]** - UI placeholder |
| SettingsNew.tsx.backup | 845 | `placeholder="123456789"` | **[KEEP]** - Backup file |
| HotelSettings.tsx | 38 | `taxId: '123456789'` | **[REVIEW]** - Default value, might be intentional |
| config.ts | 18-19 | `'http://localhost:3000'` fallback URLs | **[REVIEW]** - Development fallback, should use env vars only |

---

## 🔴 REMOVE - localhost URLs

| File | Line | Content | Recommendation |
|------|------|---------|----------------|
| login/page.tsx | 135 | `href="http://localhost:3000/auth/signup?module=hotel"` | **[REMOVE]** - Replace with environment variable or relative path |
| config.ts | 18 | `url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'` | **[REVIEW]** - Development fallback, ensure env var is set in production |
| config.ts | 19 | `apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'` | **[REVIEW]** - Development fallback, ensure env var is set in production |

---

## 🟢 KEEP - Alert Statements (User Feedback)

All `alert()` statements are **KEEP** - they provide user feedback for:
- Success messages
- Error notifications
- Confirmation dialogs
- Validation warnings

**Total:** 249 alert statements (KEEP)

**Note:** Consider replacing with toast notifications in future refactoring for better UX.

---

## 🟢 KEEP - Placeholder Values (UI)

All `placeholder` attributes in JSX are **KEEP** - they are UI elements, not code issues.

**Total:** 152 placeholder matches (KEEP)

---

## 📋 Action Items Summary

### 🔴 High Priority - Remove Immediately

1. **Remove all debug console.log statements** (198 instances)
   - RoomCalendar.tsx: ~30 instances
   - NightAuditModule.tsx: ~10 instances
   - CheckInModal.tsx: ~20 instances (extensive season debug blocks)
   - page.tsx: 1 instance
   - reservations/route.ts: 1 instance

2. **Fix localhost URLs**
   - `login/page.tsx:135` - Replace with env var or relative path
   - `config.ts:18-19` - Ensure env vars are set, remove localhost fallback

### 🟡 Medium Priority - Review

1. **Review TODO comments**
   - RoomCalendar.tsx:2442 - Notification feature status

2. **Review test data references**
   - page.tsx:990 - "ტესტ მონაცემი" in user message
   - HotelSettings.tsx:38 - Default taxId value

3. **Review debug functions**
   - page.tsx:364 - Global debug functions

### 🟢 Low Priority - Keep

1. **Keep all console.error/warn** (202 instances) - Error handling
2. **Keep all alert() statements** (249 instances) - User feedback
3. **Keep all placeholder attributes** (152 instances) - UI elements
4. **Keep migrateFolios.ts console.log** - Migration script output

---

## 🛠️ Recommended Cleanup Script

```bash
# Remove debug console.log statements (be careful - review first)
# Option 1: Comment out (safer)
find apps/hotel/src -type f \( -name "*.tsx" -o -name "*.ts" \) -exec sed -i '' 's/console\.log(/\/\/ console.log(/g' {} \;

# Option 2: Remove lines with "// Debug" comment
# (Manual review recommended before deletion)
```

---

## ✅ Verification Checklist

After cleanup, verify:
- [ ] No console.log statements in production code (except error handling)
- [ ] No localhost URLs in production code
- [ ] All environment variables are properly configured
- [ ] Error handling console.error/warn are preserved
- [ ] User-facing alerts are preserved
- [ ] Migration scripts retain their console output

---

**Report Generated:** 2025-12-10  
**Next Steps:** Review and execute cleanup based on recommendations above.

