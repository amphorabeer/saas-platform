# Batch ↔ Tank Split/Merge and Calendar Occupancy Rules - AS-IS Audit

**Date:** 2025-01-27  
**Scope:** Brewery PMS - Current implementation analysis  
**Purpose:** Document actual behavior before refactoring to Lot-based system

---

## A) Data Model

### Core Entities

#### 1. **Batch** (`packages/database/prisma/schema.prisma:154-190`)
- **Primary Key:** `id` (String)
- **Links to Tank:** `tankId` (String?, nullable) → references `Tank.id`
- **Status Field:** `status` (BatchStatus enum: PLANNED, BREWING, FERMENTING, CONDITIONING, READY, PACKAGING, COMPLETED, CANCELLED)
- **Volume:** `volume` (Decimal, mandatory)
- **Timestamps:** `plannedDate`, `brewedAt`, `fermentationStartedAt`, `conditioningStartedAt`, `readyAt`, `completedAt`
- **Relations:**
  - `tank` → `Tank` (optional)
  - `LotBatch[]` → Links to `Lot` via `LotBatch` junction table
  - `timeline[]` → `BatchTimeline` events
  - `gravityReadings[]` → `GravityReading`

**Key Finding:** Batch has direct `tankId` field (legacy) AND can be linked to Lots via `LotBatch` (new system). Both systems coexist.

#### 2. **Tank** (`packages/database/prisma/schema.prisma:235-263`)
- **Primary Key:** `id` (String)
- **Capacity:** `capacity` (Decimal, nullable)
- **Status:** `status` (TankStatus: AVAILABLE, OCCUPIED, CLEANING, MAINTENANCE, OUT_OF_SERVICE)
- **Current Batch:** `currentBatchId` (String?, nullable) - **LEGACY FIELD**
- **Current Lot:** `currentLotId` (String?, nullable) - **NEW FIELD**
- **Current Phase:** `currentPhase` (LotPhase?, nullable)
- **Relations:**
  - `batches[]` → `Batch[]` (via `tankId`)
  - `TankAssignment[]` → Lot-based assignments
  - `occupations[]` → `TankOccupation[]` (legacy batch-based)

**Key Finding:** Dual tracking system - `currentBatchId` (legacy) and `currentLotId` (new). Both may be set simultaneously.

#### 3. **Equipment** (`packages/database/prisma/schema.prisma:389-426`)
- **Primary Key:** `id` (String)
- **Type:** `type` (EquipmentType: FERMENTER, UNITANK, BRITE, KETTLE, MASH_TUN, HLT, etc.)
- **Status:** `status` (EquipmentStatus: OPERATIONAL, NEEDS_MAINTENANCE, UNDER_MAINTENANCE, OUT_OF_SERVICE, NEEDS_CIP)
- **Capacity:** `capacity` (Int?, nullable)
- **Current Batch:** `currentBatchId` (String?, nullable) - **LEGACY FIELD**
- **Note:** `Equipment` and `Tank` are **separate models**. `Batch.tankId` references `Tank.id`, but `Equipment.currentBatchId` is also used in some code paths.

**Key Finding:** Confusion between `Tank` and `Equipment` models. Some code uses `Equipment` for tank operations.

#### 4. **Lot** (`packages/database/prisma/schema.prisma:483-508`)
- **Primary Key:** `id` (String)
- **Code:** `lotCode` (String, unique per tenant)
- **Phase:** `phase` (LotPhase: FERMENTATION, CONDITIONING, BRIGHT, PACKAGING)
- **Status:** `status` (LotStatus: PLANNED, ACTIVE, COMPLETED, CANCELLED)
- **Volume:** `plannedVolume`, `actualVolume` (Decimal)
- **Split Info:** `parentLotId`, `splitRatio` (for split operations)
- **Relations:**
  - `LotBatch[]` → Links to `Batch[]` via junction table
  - `TankAssignment[]` → Tank assignments for this lot
  - `Transfer[]` → Transfer history

**Key Finding:** Lot is the new abstraction layer, but not all operations use it yet.

#### 5. **TankAssignment** (`packages/database/prisma/schema.prisma:539-562`)
- **Primary Key:** `id` (String)
- **Links:** `tankId` → `Tank`, `lotId` → `Lot`
- **Phase:** `phase` (LotPhase)
- **Time Range:** `plannedStart`, `plannedEnd`, `actualStart`, `actualEnd`
- **Status:** `status` (AssignmentStatus: PLANNED, ACTIVE, COMPLETED, CANCELLED)
- **Volume:** `plannedVolume`, `actualVolume`
- **Flags:** `isBlendTarget`, `isSplitSource` (Boolean)

**Key Finding:** This is the **primary occupancy record** for the new Lot system. Calendar reads from this.

#### 6. **Transfer** (`packages/database/prisma/schema.prisma:564-589`)
- **Primary Key:** `id` (String)
- **Links:** `sourceLotId`, `sourceTankId`, `destLotId`, `destTankId`
- **Type:** `transferType` (TransferType: FERMENT_TO_CONDITION, CONDITION_TO_BRIGHT, TANK_TO_TANK, BLEND, SPLIT)
- **Status:** `status` (TransferStatus: PLANNED, IN_PROGRESS, COMPLETED, CANCELLED)
- **Volume:** `volume`, `measuredLoss`

**Key Finding:** Transfer records track lot movements, but not all batch operations create Transfer records.

#### 7. **TankOccupation** (`packages/database/prisma/schema.prisma:265-276`)
- **Primary Key:** `id` (String)
- **Links:** `tankId` → `Tank`, `batchId` → `Batch`
- **Phase:** `phase` (OccupationPhase: FERMENTATION, CONDITIONING, STORAGE)
- **Time Range:** `startedAt`, `endedAt`

**Key Finding:** Legacy model for batch-based occupancy. May not be actively used.

---

## B) Where Each Rule Lives

### Calendar Generation

**File:** `apps/brewery/src/lib/scheduler/calendar.ts`

**Function:** `generateCalendarData()` (lines 107-270)

**What it does:**
1. Fetches all `Equipment` with type `FERMENTER`, `UNITANK`, `BRITE`
2. Gets `TankAssignment` records (Lot-based) via `getTankOccupancy()`
3. **ALSO** fetches legacy `Batch` records with `tankId != null` and status in `['PLANNED', 'BREWING', 'FERMENTING', 'CONDITIONING', 'READY', 'PACKAGING']`
4. Converts both to `CalendarBlock` objects
5. Filters out legacy blocks that overlap with Lot blocks (lines 209-214)

**Key Finding:** Calendar shows **both** Lot-based assignments AND legacy batch-based blocks. Legacy blocks are filtered if they overlap with Lot blocks.

### Overlap Detection

**File:** `apps/brewery/src/lib/scheduler/validation.ts`

**Function:** `hasTimeOverlap()` (lines 53-55)
```typescript
export function hasTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
  return range1.start < range2.end && range1.end > range2.start
}
```

**Function:** `getOverlappingAssignments()` (lines 60-86)
- Queries `TankAssignment` where:
  - `status IN ['PLANNED', 'ACTIVE']` ← **PLANNED = OCCUPIED**
  - Overlap condition: `plannedStart < timeRange.end AND plannedEnd > timeRange.start`

**Function:** `checkTankAvailability()` (lines 92-155)
- Checks tank operational status
- Calls `getOverlappingAssignments()` to find conflicts
- **RULE:** Both `PLANNED` and `ACTIVE` assignments block the tank (line 70)

**Key Finding:** **PLANNED assignments are treated as OCCUPIED** - they block tank selection.

### Split Operations

#### Fermentation Split (1→2)

**File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts`

**Function:** `POST` handler (lines 46-116)

**What happens:**
1. Main batch updated: `status = 'FERMENTING'`, `volume = firstAllocation.volume`, `tankId = firstAllocation.tankId`
2. For each additional allocation (i > 0):
   - Creates **new Batch** with:
     - `batchNumber = ${originalBatchNumber}-${letter}` (e.g., `BRW-2025-0004-B`)
     - `status = 'FERMENTING'`
     - `volume = alloc.volume` (mandatory field)
     - `fermentationStartedAt = new Date()`
     - `originalGravity = actualOG || batch.originalGravity`
   - Updates `Equipment.currentBatchId = newBatch.id`
3. Creates `BatchTimeline` event with type `FERMENTATION_STARTED`
4. **NO `TankAssignment` records created** - uses legacy `Batch.tankId` + `Equipment.currentBatchId`

**What is stored:**
- Main batch: `Batch.update()` with new `tankId` and `volume`
- Split batches: `Batch.create()` for each additional allocation
- Equipment: `Equipment.updateMany()` sets `currentBatchId`
- Timeline: `BatchTimeline.create()`

**What calendar shows:**
- Legacy blocks from `Batch` records (via `batchToBlock()` function)
- Each split batch appears as separate block on its assigned tank

**Does it match recommended?** **NO**
- Should create `Lot` and `TankAssignment` records
- Should not create multiple `Batch` records (Batch should be immutable)
- Should use `Transfer` records for split operations

#### Conditioning Split (1→2)

**File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`

**Function:** `POST` handler (lines 47-127)

**What happens:**
1. Main batch updated: `status = 'CONDITIONING'`, `volume = firstAllocation.volume`, `tankId = firstAllocation.tankId`
2. For each additional allocation (i > 0):
   - Creates **new Batch** with:
     - `batchNumber = ${originalBatchNumber}-${letter}`
     - `status = 'CONDITIONING'` ← **Different from fermentation split**
     - `volume = alloc.volume`
     - `fermentationStartedAt = batch.fermentationStartedAt` ← **Preserved from original**
     - `conditioningStartedAt = new Date()`
   - Updates `Equipment.currentBatchId = newBatch.id`
3. Creates `BatchTimeline` event
4. **NO `TankAssignment` records created**

**What is stored:**
- Same as fermentation split, but with `CONDITIONING` status

**What calendar shows:**
- Legacy blocks from `Batch` records

**Does it match recommended?** **NO** - Same issues as fermentation split

### Merge/Blend Operations

#### Fermentation Blend (2→1)

**File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts`

**Function:** `POST` handler (lines 121-140)

**What happens:**
1. Batch updated: `status = 'FERMENTING'`, `tankId = targetTankId` (from `blendWithAssignmentId`)
2. Notes updated: `notes = ${batch.notes}\nშერეული: ${blendWithAssignmentId}`
3. **NO volume aggregation**
4. **NO `TankAssignment` records created**
5. **NO `Transfer` records created**

**What is stored:**
- Only `Batch.update()` for the new batch
- No changes to existing batch being blended into

**What calendar shows:**
- Two separate blocks (original batch + new batch) on same tank
- No indication they are blended

**Does it match recommended?** **NO**
- Should create `Lot` and link both batches via `LotBatch`
- Should mark `TankAssignment.isBlendTarget = true`
- Should create `Transfer` record with type `BLEND`

#### Conditioning Blend (2→1)

**File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`

**Function:** `POST` handler (lines 132-151)

**What happens:**
1. Batch updated: `status = 'CONDITIONING'`, `tankId = targetTankId`
2. Notes updated: `notes = ${batch.notes}\nშერეული: ${blendWithAssignmentId}`
3. **NO volume aggregation**
4. **NO `TankAssignment` records created**

**What is stored:**
- Only `Batch.update()` for the new batch

**What calendar shows:**
- Two separate blocks

**Does it match recommended?** **NO** - Same issues as fermentation blend

### Normal Transfer (1→1)

#### Fermentation to Conditioning

**File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`

**Function:** `POST` handler (lines 156-211)

**What happens:**
1. Batch updated: `status = 'CONDITIONING'`, `conditioningStartedAt = new Date()`
2. If `targetTankId` differs from `batch.tankId`:
   - Old tank: `Equipment.updateMany()` sets `currentBatchId = null`, `status = 'OPERATIONAL'`
   - New tank: `Equipment.updateMany()` sets `currentBatchId = batchId`
3. Batch `tankId` field **NOT updated** (line 169 - only status changed)
4. Creates `BatchTimeline` event
5. **NO `TankAssignment` records created**
6. **NO `Transfer` records created**

**What is stored:**
- `Batch.update()` - status and timestamps only
- `Equipment.updateMany()` - tank assignments
- `BatchTimeline.create()`

**What calendar shows:**
- Legacy block moves to new tank (if `tankId` was updated, but code doesn't update it!)

**Does it match recommended?** **NO**
- Should create `TankAssignment` for destination
- Should end source `TankAssignment`
- Should create `Transfer` record

---

## C) Actual Behavior and Edge Cases

### 1. PLANNED Status Treatment

**Where:** `apps/brewery/src/lib/scheduler/validation.ts:70`

```typescript
status: { in: ['PLANNED', 'ACTIVE'] }, // PLANNED = OCCUPIED!
```

**Behavior:** 
- `PLANNED` assignments are included in overlap checks
- `PLANNED` assignments block tank selection
- Calendar shows `PLANNED` blocks with opacity 0.8 (line 96 in `calendar.ts`)

**Does it match recommended?** **YES** - PLANNED = OCCUPIED is enforced

### 2. Calendar Rendering

**Where:** `apps/brewery/src/lib/scheduler/calendar.ts:generateCalendarData()`

**Behavior:**
1. Fetches `TankAssignment` records (Lot-based) via `getTankOccupancy()`
2. Fetches legacy `Batch` records with `tankId != null`
3. Converts both to `CalendarBlock`
4. Filters legacy blocks that overlap with Lot blocks (lines 209-214)
5. Shows both types of blocks

**Edge Case:** If a tank has both a `TankAssignment` (Lot) and a legacy `Batch.tankId`, the legacy block is filtered out if it overlaps.

**Does it match recommended?** **PARTIAL**
- Should show only `TankAssignment` blocks (Lot-based)
- Legacy `Batch` blocks should be migrated or ignored

### 3. Batch Immutability

**Current Behavior:** **Batches are MUTABLE**
- `Batch.update()` is called to change `status`, `tankId`, `volume`
- Split operations create **new Batch records** with suffixes
- Batch `tankId` can be changed multiple times

**Does it match recommended?** **NO**
- Recommended: Batch should be immutable after creation
- Split should create `Lot` records, not new `Batch` records

### 4. Overlap Formula

**Where:** `apps/brewery/src/lib/scheduler/validation.ts:53-55`

```typescript
export function hasTimeOverlap(range1: TimeRange, range2: TimeRange): boolean {
  return range1.start < range2.end && range1.end > range2.start
}
```

**Behavior:**
- Overlap exists when: `newStart < existingEnd AND newEnd > existingStart`
- This is the standard interval overlap formula
- Applied to `TankAssignment.plannedStart` and `plannedEnd`

**Does it match recommended?** **YES** - Standard overlap detection

### 5. Blending Gated by Checkbox

**Where:** `apps/brewery/src/components/production/StartFermentationModal.tsx:54`

**Behavior:**
- UI has `blendMode` checkbox (line 309-318)
- When checked, user must select `selectedBlendTarget` (line 417-444)
- API receives `isBlend: true` and `blendWithAssignmentId`
- **BUT:** No validation that blending is allowed (no `BlendingConfig` check)
- **BUT:** No `enableBlending` flag required in API

**Does it match recommended?** **PARTIAL**
- UI has checkbox ✅
- API doesn't require explicit `enableBlending` flag ❌
- No `BlendingConfig` validation ❌

### 6. Multi-Batch Same Tank

**Current Behavior:**
- Multiple `Batch` records can have same `tankId`
- `Equipment.currentBatchId` only stores ONE batch ID
- Calendar shows multiple blocks on same tank (from `Batch` records)
- No validation prevents multiple batches on same tank

**Edge Case:** If two batches are assigned to same tank, `Equipment.currentBatchId` will only reference the last one updated.

**Does it match recommended?** **NO**
- Should use `TankAssignment` to track multiple lots on same tank
- Should validate capacity and overlap

### 7. Capacity Validation

**Where:** `apps/brewery/src/lib/scheduler/validation.ts:133-148`

**Behavior:**
- Checks `volume > tank.capacity` → error
- Checks `volume > maxFill` → error
- Checks `volume < minFill` → warning
- Applied in `checkTankAvailability()` but **NOT called** in split/merge APIs

**Does it match recommended?** **PARTIAL**
- Validation exists ✅
- Not enforced in split/merge operations ❌

---

## D) Scenario Audits

### S1) One Batch Split into Two Fermenters (1→2)

**Where implemented:**
- `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts:46-116`
- `apps/brewery/src/components/production/StartFermentationModal.tsx:50-327`

**What happens:**
1. User selects "გაყოფა რამდენიმე ტანკში" checkbox
2. User adds multiple tank allocations with volumes
3. API receives `isSplit: true`, `allocations: [{tankId, volume}, ...]`
4. Main batch updated: `tankId = allocations[0].tankId`, `volume = allocations[0].volume`
5. For each additional allocation, creates new `Batch` with suffix (e.g., `-B`, `-C`)
6. Each new batch gets `status = 'FERMENTING'`, `volume = alloc.volume`
7. `Equipment.currentBatchId` updated for each tank

**What is stored:**
- `Batch.update()` for main batch
- `Batch.create()` for each split batch (2-N)
- `Equipment.updateMany()` for each tank
- `BatchTimeline.create()` for main batch

**What calendar shows:**
- Multiple blocks (one per batch) on different tanks
- Each block shows batch number (e.g., `BRW-2025-0004`, `BRW-2025-0004-B`)

**Does it match recommended?** **NO**
- Creates multiple `Batch` records (should be immutable)
- No `Lot` or `TankAssignment` records
- No `Transfer` records

### S2) Two Batches into One Fermenter (2→1 during fermentation / double brew)

**Where implemented:**
- `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts:121-140`
- `apps/brewery/src/components/production/StartFermentationModal.tsx:417-444`

**What happens:**
1. User selects "შერევა არსებულ ბაჩთან" checkbox
2. User selects existing batch from dropdown (fetched from `/api/tanks/active-assignments`)
3. API receives `isBlend: true`, `blendWithAssignmentId: <assignmentId>`
4. **BUT:** API doesn't use `blendWithAssignmentId` - it's stored in notes only
5. New batch updated: `status = 'FERMENTING'`, `tankId = <targetTankId>` (from assignment)
6. Notes updated with blend info

**What is stored:**
- `Batch.update()` for new batch only
- No changes to existing batch
- No `Lot` or `TankAssignment` records
- No `Transfer` records

**What calendar shows:**
- Two separate blocks on same tank
- No visual indication of blending

**Does it match recommended?** **NO**
- Should create `Lot` linking both batches
- Should mark `TankAssignment.isBlendTarget = true`
- Should create `Transfer` record

### S3) Fermentation Lot Transferred to Conditioning (1→1)

**Where implemented:**
- `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts:156-211`
- `apps/brewery/src/components/production/TransferToConditioningModal.tsx`

**What happens:**
1. User clicks "Transfer to Conditioning" on batch detail page
2. Modal opens with tank selection
3. User can select new tank or "stay in same tank"
4. API receives `targetTankId` (or `stayInSameTank: true`)
5. Batch updated: `status = 'CONDITIONING'`, `conditioningStartedAt = new Date()`
6. If `targetTankId` differs:
   - Old tank: `Equipment.currentBatchId = null`
   - New tank: `Equipment.currentBatchId = batchId`
7. **Batch `tankId` field NOT updated** (only status changed)

**What is stored:**
- `Batch.update()` - status and timestamps
- `Equipment.updateMany()` - tank assignments
- `BatchTimeline.create()`

**What calendar shows:**
- Block moves to new tank (if `tankId` was updated, but it's not!)

**Does it match recommended?** **NO**
- Should create `TankAssignment` for destination
- Should end source `TankAssignment`
- Should create `Transfer` record

### S4) Fermentation Split to Two Conditioning Tanks After Completion (1→2 post-fermentation split)

**Where implemented:**
- `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts:47-127`
- `apps/brewery/src/components/production/TransferToConditioningModal.tsx:333-414`

**What happens:**
1. User selects "გაყოფა რამდენიმე ტანკში" checkbox
2. User adds multiple tank allocations
3. API receives `isSplit: true`, `allocations: [{tankId, volume}, ...]`
4. Main batch updated: `status = 'CONDITIONING'`, `volume = firstAllocation.volume`
5. For each additional allocation, creates new `Batch` with:
   - `status = 'CONDITIONING'` ← **Different from fermentation split**
   - `fermentationStartedAt = batch.fermentationStartedAt` ← **Preserved**
   - `conditioningStartedAt = new Date()`
6. Each new batch gets `volume = alloc.volume`

**What is stored:**
- `Batch.update()` for main batch
- `Batch.create()` for each split batch
- `Equipment.updateMany()` for each tank
- `BatchTimeline.create()`

**What calendar shows:**
- Multiple blocks on different tanks, all with `CONDITIONING` status

**Does it match recommended?** **NO** - Same issues as S1

### S5) Two Fermenters Merged into One Conditioning Tank (2→1 merge/blend)

**Where implemented:**
- `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts:132-151`
- `apps/brewery/src/components/production/TransferToConditioningModal.tsx:415-446`

**What happens:**
1. User selects "შერევა არსებულ ბაჩთან" checkbox
2. User selects existing batch from dropdown
3. API receives `isBlend: true`, `blendWithAssignmentId: <id>`
4. Batch updated: `status = 'CONDITIONING'`, `tankId = <targetTankId>`
5. Notes updated with blend info
6. **NO volume aggregation**
7. **NO changes to existing batch**

**What is stored:**
- `Batch.update()` for new batch only
- No `Lot` or `TankAssignment` records
- No `Transfer` records

**What calendar shows:**
- Two separate blocks on same tank

**Does it match recommended?** **NO** - Same issues as S2

### S6) PLANNED Calendar Block: Does it Lock Tank Selection? Can it Overlap?

**Where implemented:**
- `apps/brewery/src/lib/scheduler/validation.ts:60-86`
- `apps/brewery/src/lib/scheduler/validation.ts:92-155`

**What happens:**
1. `getOverlappingAssignments()` queries `TankAssignment` with:
   - `status IN ['PLANNED', 'ACTIVE']` ← **PLANNED included**
   - Overlap condition: `plannedStart < timeRange.end AND plannedEnd > timeRange.start`
2. `checkTankAvailability()` calls `getOverlappingAssignments()`
3. If overlaps found, returns error: `"Tank ${tank.name} has overlapping assignments"`
4. This blocks tank selection in UI

**What is stored:**
- `TankAssignment` records with `status = 'PLANNED'` block the tank

**What calendar shows:**
- `PLANNED` blocks shown with opacity 0.8 (line 96 in `calendar.ts`)
- Blocks are visible and counted in `plannedBlocks` summary

**Does it match recommended?** **YES**
- PLANNED = OCCUPIED is enforced ✅
- Overlap detection works ✅
- Calendar shows PLANNED blocks ✅

---

## E) Mismatches vs Recommended Rules

### 1. Batch Immutable? (yes/no)

**Current:** **NO** - Batches are mutable
- `Batch.update()` called to change `status`, `tankId`, `volume`
- Split operations create new `Batch` records

**Recommended:** **YES** - Batch should be immutable after creation
- Split should create `Lot` records, not new `Batch` records
- Status changes should be via `Lot` and `TankAssignment`

### 2. Calendar Shows Assignments/Lots or Batches?

**Current:** **BOTH**
- Shows `TankAssignment` blocks (Lot-based) ✅
- Shows legacy `Batch` blocks (via `batchToBlock()`) ❌
- Filters overlapping legacy blocks

**Recommended:** **ASSIGNMENTS/LOTS ONLY**
- Should show only `TankAssignment` blocks
- Legacy `Batch` blocks should be migrated or ignored

### 3. PLANNED Treated as OCCUPIED? (yes/no)

**Current:** **YES** ✅
- `getOverlappingAssignments()` includes `PLANNED` status
- `checkTankAvailability()` rejects if `PLANNED` overlaps
- Calendar shows `PLANNED` blocks

**Recommended:** **YES** ✅ - Matches current behavior

### 4. Overlap Formula Enforced? (yes/no)

**Current:** **YES** ✅
- `hasTimeOverlap()` uses standard formula: `start1 < end2 AND end1 > start2`
- Applied in `getOverlappingAssignments()`

**Recommended:** **YES** ✅ - Matches current behavior

**BUT:** Not enforced in split/merge APIs ❌
- `start-fermentation/route.ts` doesn't call `checkTankAvailability()` for split
- `transfer-conditioning/route.ts` doesn't call `checkTankAvailability()` for split/blend

### 5. Blending Gated by Checkbox? (yes/no)

**Current:** **PARTIAL**
- UI has checkbox ✅ (`blendMode` in modals)
- API doesn't require explicit `enableBlending` flag ❌
- No `BlendingConfig` validation ❌

**Recommended:** **YES**
- UI checkbox ✅ (already exists)
- API should require `enableBlending: true` flag
- Should validate against `BlendingConfig` (recipe match, yeast match, etc.)

---

## F) Next Steps - Top 10 Code Changes Needed

### 1. **Migrate Split Operations to Lot System**
   - **File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts`
   - **Change:** Instead of creating new `Batch` records, create `Lot` records with `parentLotId` and `splitRatio`
   - **Create:** `TankAssignment` records for each split destination
   - **Create:** `Transfer` records with type `SPLIT`

### 2. **Migrate Blend Operations to Lot System**
   - **File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts` (lines 121-140)
   - **File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts` (lines 132-151)
   - **Change:** Create `Lot` linking both batches via `LotBatch`
   - **Update:** Mark `TankAssignment.isBlendTarget = true`
   - **Create:** `Transfer` records with type `BLEND`
   - **Validate:** Check `BlendingConfig` before allowing blend

### 3. **Enforce Blending Checkbox in API**
   - **File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts`
   - **File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`
   - **Change:** Require `enableBlending: true` flag for blend operations
   - **Validate:** Call `validateBlending()` from `lib/scheduler/validation.ts`

### 4. **Add Overlap Validation to Split APIs**
   - **File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts` (line 46)
   - **File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts` (line 47)
   - **Change:** Call `checkTankAvailability()` for each destination tank before creating split batches
   - **Reject:** If any destination has overlapping assignments

### 5. **Create Transfer Records for All Transfers**
   - **File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`
   - **Change:** Create `Transfer` record for every transfer operation (normal, split, blend)
   - **Link:** `sourceLotId`, `destLotId` (or create new lot if needed)

### 6. **Create TankAssignment Records for All Operations**
   - **File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts`
   - **File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`
   - **Change:** Create `TankAssignment` records instead of only updating `Batch.tankId`
   - **End:** Source `TankAssignment` when transferring

### 7. **Remove Legacy Batch Block Rendering**
   - **File:** `apps/brewery/src/lib/scheduler/calendar.ts:141-186`
   - **Change:** Remove `existingBatches` query and `batchToBlock()` conversion
   - **Show:** Only `TankAssignment` blocks from `getTankOccupancy()`

### 8. **Make Batch Immutable**
   - **File:** All batch update APIs
   - **Change:** Stop updating `Batch.tankId`, `Batch.status` directly
   - **Use:** `Lot` and `TankAssignment` for all tank assignments
   - **Keep:** `Batch` only for recipe, volume, gravity, timestamps

### 9. **Unify Tank and Equipment Models**
   - **File:** All APIs using `Equipment` for tank operations
   - **Change:** Use `Tank` model consistently
   - **Remove:** `Equipment.currentBatchId` usage (use `Tank.currentLotId` instead)

### 10. **Add Capacity Validation to Split/Merge**
   - **File:** `apps/brewery/src/app/api/batches/[id]/start-fermentation/route.ts`
   - **File:** `apps/brewery/src/app/api/batches/[id]/transfer-conditioning/route.ts`
   - **Change:** Call `checkTankAvailability()` with volume parameter
   - **Validate:** Total volume doesn't exceed tank capacity
   - **Check:** Min/max fill percentages

---

## Summary

**Current State:**
- Dual system: Legacy `Batch.tankId` + new `Lot`/`TankAssignment`
- Split operations create new `Batch` records (not immutable)
- Blend operations don't create `Lot` or `Transfer` records
- Calendar shows both legacy and new system blocks
- PLANNED = OCCUPIED is enforced ✅
- Overlap detection works ✅
- Blending has UI checkbox but no API validation ❌

**Recommended State:**
- Fully Lot-based system
- Batch immutable after creation
- All operations create `TankAssignment` and `Transfer` records
- Calendar shows only `TankAssignment` blocks
- Blending requires explicit flag and config validation
- Capacity and overlap validation enforced in all operations












