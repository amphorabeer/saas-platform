# Zustand Store Analysis - Database Integration Status

## 📋 Summary

This document lists all components using Zustand store actions and identifies which ones need database integration.

---

## 🔴 Store Actions That DO NOT Send API Requests (Need Database Integration)

### 1. **addBatch** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:257-280`
- **Status:** Only updates local Zustand state
- **Used by:**
  - ✅ `NewBatchModal.tsx` - **FIXED** (now uses API)
- **Action Required:** ✅ Already fixed

### 2. **updateBatch** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:282-288`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `TankDetailModal.tsx:152` - Updates batch temperature
- **Action Required:** Replace with API call to `/api/batches/[id]` (PATCH/PUT)

### 3. **deleteBatch** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:290-298`
- **Status:** Only updates local Zustand state
- **Used by:** None found in components
- **Action Required:** Create API endpoint `/api/batches/[id]` (DELETE) if needed

### 4. **startBrewing** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:301-318`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `StartFermentationModal.tsx:137` - Sets OG before fermentation
- **Action Required:** Replace with API call to `/api/batches/[id]/start-brewing` (POST)

### 5. **markReady** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:493-515`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `EventDetailModal.tsx:69` - Marks batch as ready
- **Action Required:** Replace with API call to `/api/batches/[id]/mark-ready` (POST)

### 6. **startPackaging** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:517-540`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `PackagingModal.tsx:94` - Starts packaging phase
- **Action Required:** Replace with API call to `/api/batches/[id]/start-packaging` (POST)

### 7. **completeBatch** ⚠️
- **Location:** `apps/brewery/src/store/breweryStore.ts:574-620`
- **Status:** Updates local state + Equipment API (partial)
- **Used by:**
  - `EventDetailModal.tsx:70` - Completes batch
- **Action Required:** Replace with API call to `/api/batches/[id]/complete` (POST)

### 8. **addGravityReading** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:641-673`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `TransferToConditioningModal.tsx:93` - Adds final gravity reading
- **Action Required:** Replace with API call to `/api/batches/[id]/gravity-readings` (POST)

### 9. **addTimelineEvent** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:676-691`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `StartFermentationModal.tsx:155` - Adds timeline event
  - `TransferToConditioningModal.tsx:119` - Adds timeline event
  - `PackagingModal.tsx:93` - Adds timeline event
- **Action Required:** Replace with API call to `/api/batches/[id]/timeline` (POST)

### 10. **addPackagingRecord** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:542-572`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `PackagingModal.tsx:92` - Adds packaging record
- **Action Required:** Replace with API call to `/api/batches/[id]/packaging` (POST)

### 11. **updateTankTemp** ❌
- **Location:** `apps/brewery/src/store/breweryStore.ts:719-730`
- **Status:** Only updates local Zustand state
- **Used by:**
  - `StartFermentationModal.tsx:165` - Updates tank temperature
- **Action Required:** Replace with API call to `/api/equipment/[id]` (PUT) for temperature

---

## 🟢 Store Actions That DO Send API Requests (Partial Integration)

### 1. **startFermentation** ⚠️
- **Location:** `apps/brewery/src/store/breweryStore.ts:320-392`
- **Status:** Updates local state + Equipment API + Batch API (optional)
- **API Calls:**
  - ✅ `PUT /api/equipment/[id]` - Updates equipment
  - ⚠️ `POST /api/batches/[id]/start-fermentation` - Optional (may fail if batch not in DB)
- **Used by:**
  - `StartFermentationModal.tsx:144` - Starts fermentation
- **Action Required:** Ensure batch exists in DB before calling, or create batch if needed

### 2. **transferToConditioning** ⚠️
- **Location:** `apps/brewery/src/store/breweryStore.ts:394-491`
- **Status:** Updates local state + Equipment API + Batch API (optional)
- **API Calls:**
  - ✅ `PUT /api/equipment/[id]` - Updates new tank
  - ✅ `PUT /api/equipment/[id]` - Clears old tank (NEEDS_CIP)
  - ⚠️ `POST /api/batches/[id]/transfer` - Optional (may fail if batch not in DB)
- **Used by:**
  - `TransferToConditioningModal.tsx:105,112` - Transfers to conditioning
- **Action Required:** Ensure batch exists in DB before calling, or create batch if needed

---

## 📁 Components Using Store Actions

### 1. **NewBatchModal.tsx** ✅ FIXED
- **Actions Used:** `addBatch` (removed)
- **Status:** ✅ Now uses `POST /api/batches` directly
- **Action Required:** None

### 2. **StartFermentationModal.tsx** ⚠️ NEEDS FIX
- **Actions Used:**
  - `startBrewing` - ❌ No API
  - `startFermentation` - ⚠️ Partial API (batch may not exist)
  - `addTimelineEvent` - ❌ No API
  - `updateTankTemp` - ❌ No API
- **Action Required:**
  - Replace `startBrewing` with API call
  - Ensure batch exists before `startFermentation`
  - Replace `addTimelineEvent` with API call
  - Replace `updateTankTemp` with API call

### 3. **TransferToConditioningModal.tsx** ⚠️ NEEDS FIX
- **Actions Used:**
  - `addGravityReading` - ❌ No API
  - `transferToConditioning` - ⚠️ Partial API (batch may not exist)
  - `addTimelineEvent` - ❌ No API
- **Action Required:**
  - Replace `addGravityReading` with API call
  - Ensure batch exists before `transferToConditioning`
  - Replace `addTimelineEvent` with API call

### 4. **PackagingModal.tsx** ⚠️ NEEDS FIX
- **Actions Used:**
  - `startPackaging` - ❌ No API
  - `addPackagingRecord` - ❌ No API
  - `addTimelineEvent` - ❌ No API
- **Action Required:**
  - Replace `startPackaging` with API call
  - Replace `addPackagingRecord` with API call
  - Replace `addTimelineEvent` with API call

### 5. **EventDetailModal.tsx** ⚠️ NEEDS FIX
- **Actions Used:**
  - `markReady` - ❌ No API
  - `completeBatch` - ⚠️ Partial API (only equipment)
- **Action Required:**
  - Replace `markReady` with API call
  - Replace `completeBatch` with full API call (batch + equipment)

### 6. **TankDetailModal.tsx** ⚠️ NEEDS FIX
- **Actions Used:**
  - `updateBatch` - ❌ No API (updates temperature)
- **Action Required:**
  - Replace `updateBatch` with API call to `/api/batches/[id]` (PATCH)

---

## 🎯 Priority Fix Order

### High Priority (Core Batch Operations)
1. ✅ **NewBatchModal** - Already fixed
2. **StartFermentationModal** - Critical for batch lifecycle
3. **TransferToConditioningModal** - Critical for batch lifecycle
4. **PackagingModal** - Critical for batch lifecycle
5. **EventDetailModal** - Used for phase transitions

### Medium Priority (Supporting Operations)
6. **TankDetailModal** - Temperature updates
7. **Gravity Readings** - Data collection
8. **Timeline Events** - Audit trail

### Low Priority (Nice to Have)
9. **deleteBatch** - If needed
10. **Tank Temperature** - Real-time updates

---

## 📝 API Endpoints Needed

### Batch Operations
- ✅ `POST /api/batches` - Create batch (exists)
- ⚠️ `PATCH /api/batches/[id]` - Update batch (needs verification)
- ⚠️ `POST /api/batches/[id]/start-brewing` - Start brewing (needs creation)
- ✅ `POST /api/batches/[id]/start-fermentation` - Start fermentation (exists)
- ✅ `POST /api/batches/[id]/transfer` - Transfer batch (exists)
- ⚠️ `POST /api/batches/[id]/mark-ready` - Mark ready (needs creation)
- ⚠️ `POST /api/batches/[id]/start-packaging` - Start packaging (needs creation)
- ⚠️ `POST /api/batches/[id]/complete` - Complete batch (needs creation)
- ⚠️ `POST /api/batches/[id]/gravity-readings` - Add gravity reading (needs creation)
- ⚠️ `POST /api/batches/[id]/timeline` - Add timeline event (needs creation)
- ⚠️ `POST /api/batches/[id]/packaging` - Add packaging record (needs creation)

### Equipment Operations
- ✅ `PUT /api/equipment/[id]` - Update equipment (exists)
- ⚠️ `PUT /api/equipment/[id]` - Update temperature (needs verification)

---

## 🔧 Recommended Approach

1. **Phase 1:** Fix critical batch lifecycle operations
   - StartFermentationModal
   - TransferToConditioningModal
   - PackagingModal
   - EventDetailModal

2. **Phase 2:** Fix supporting operations
   - TankDetailModal
   - Gravity readings
   - Timeline events

3. **Phase 3:** Clean up
   - Remove unused store actions
   - Update store to only use for read-only data
   - Consider removing store entirely if all operations use API

