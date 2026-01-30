# 🍺 Brewery Management System - Architecture Documentation

**Version:** 1.0  
**Last Updated:** 2025-12-22  
**Project Type:** Monorepo SaaS Platform (Turborepo)  
**Tech Stack:** Next.js 14, React, TypeScript, Prisma, PostgreSQL, Zustand

---

## 📋 Table of Contents

1. [Project Overview](#1-project-overview)
2. [Database Schema](#2-database-schema)
3. [API Endpoints](#3-api-endpoints)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Data Flow](#5-data-flow)
6. [State Management](#6-state-management)
7. [Current Status](#7-current-status)
8. [Code Examples](#8-code-examples)

---

## 1. Project Overview

### 1.1 What is This Project?

Brewery Management System is a comprehensive SaaS platform for managing brewery operations, including:
- **Batch Production Tracking**: Full lifecycle from planning to completion
- **Tank Management**: Equipment tracking with lot-based fermentation system
- **Inventory Management**: Raw materials, packaging, and finished goods
- **Calendar/Scheduling**: Visual timeline for production planning
- **Quality Control**: Gravity readings, temperature monitoring
- **Sales & Orders**: Customer management and order tracking

### 1.2 Technology Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (via Prisma ORM)
- **State Management**: Zustand (with persistence)
- **UI**: React, Tailwind CSS
- **Monorepo**: Turborepo
- **Package Manager**: pnpm

### 1.3 Monorepo Structure

```
saas-platform/
├── apps/
│   ├── brewery/          # Main brewery management app
│   ├── hotel/            # Hotel management (separate app)
│   └── web/              # Landing pages, super-admin
├── packages/
│   ├── database/         # Prisma schema & client
│   ├── ui/               # Shared UI components
│   ├── auth/             # Authentication utilities
│   └── brewery-domain/   # Domain logic & types
└── package.json          # Root workspace config
```

---

## 2. Database Schema

### 2.1 Core Models

#### **Batch** - Production batches
```prisma
model Batch {
  id                    String            @id @default(cuid())
  tenantId              String
  batchNumber           String            // Format: BRW-2025-0001
  recipeId              String
  status                BatchStatus       @default(PLANNED)
  volume                Decimal
  originalGravity        Decimal?
  currentGravity         Decimal?
  finalGravity           Decimal?
  tankId                String?           // Legacy FK to Tank (deprecated)
  plannedDate           DateTime
  brewedAt              DateTime?
  fermentationStartedAt DateTime?
  conditioningStartedAt DateTime?
  readyAt               DateTime?
  completedAt           DateTime?
  
  // Relations
  recipe                Recipe
  tank                  Tank?             // Legacy relation
  LotBatch              LotBatch[]       // ✅ New: Lot-based tracking
  timeline              BatchTimeline[]
  gravityReadings       GravityReading[]
}
```

**Batch Status Flow:**
```
PLANNED → BREWING → FERMENTING → CONDITIONING → READY → PACKAGING → COMPLETED
```

#### **Equipment** - Physical equipment (tanks, pumps, etc.)
```prisma
model Equipment {
  id                     String           @id @default(cuid())
  tenantId               String
  name                   String           // e.g., "FV-01", "Stor-1"
  type                   String?          // FERMENTER, BRITE_TANK, UNITANK, CONDITIONING_TANK, PUMP, etc.
  status                 String?          // OPERATIONAL, IN_USE, NEEDS_CIP, UNDER_MAINTENANCE, OUT_OF_SERVICE
  capacity               Float?
  currentBatchId         String?          // Legacy field
  nextCIP                DateTime?
  lastCIP                DateTime?
  
  // Relations
  tankAssignments        TankAssignment[] // ✅ New: Lot-based assignments
  CIPLog                 CIPLog[]
  MaintenanceLog         MaintenanceLog[]
  ProblemReport          ProblemReport[]
}
```

**Equipment Types:**
- `FERMENTER` - Fermentation tanks
- `BRITE_TANK` / `BRITE` - Bright/conditioning tanks
- `UNITANK` - Uni-tanks (can ferment and condition)
- `CONDITIONING_TANK` - Dedicated conditioning tanks
- `PUMP`, `MILL`, `BOILER`, etc. - Other equipment

**Equipment Status Flow:**
```
OPERATIONAL → IN_USE → NEEDS_CIP → (CIP performed) → OPERATIONAL
                ↓
         UNDER_MAINTENANCE / OUT_OF_SERVICE
```

#### **Lot** - Lot-based fermentation tracking
```prisma
model Lot {
  id            String   @id @default(cuid())
  lotNumber     String   // Format: FERM-20251222-001
  tenantId      String
  phase         LotPhase // FERMENTATION, CONDITIONING, BRIGHT, PACKAGING
  status        LotStatus // PLANNED, ACTIVE, COMPLETED, CANCELLED
  parentLotId   String?  // For split scenarios
  parentLot     Lot?     @relation("LotHierarchy")
  childLots     Lot[]    @relation("LotHierarchy")
  
  // Relations
  lotBatches    LotBatch[]
  tankAssignments TankAssignment[]
  transfersOut  Transfer[] @relation("TransferSource")
  transfersIn   Transfer[] @relation("TransferDestination")
}
```

**Lot Phases:**
- `FERMENTATION` - Active fermentation
- `CONDITIONING` - Cold conditioning
- `BRIGHT` - Ready for packaging (batch.status = READY)
- `PACKAGING` - Currently being packaged

#### **TankAssignment** - Links Lots to Equipment
```prisma
model TankAssignment {
  id            String   @id @default(cuid())
  tenantId      String
  tankId        String   // FK to Equipment (NOT Tank!)
  lotId         String   // FK to Lot
  startTime     DateTime
  endTime       DateTime
  plannedVolume Decimal
  actualVolume  Decimal?
  phase         LotPhase // FERMENTATION, CONDITIONING, BRIGHT, PACKAGING
  status        AssignmentStatus // PLANNED, ACTIVE, COMPLETED, CANCELLED
  
  // Relations
  tank          Equipment @relation(fields: [tankId], references: [id])
  lot           Lot       @relation(fields: [lotId], references: [id], onDelete: Cascade)
}
```

**Critical:** `TankAssignment.tankId` → `Equipment.id` (NOT `Tank.id`!)

#### **LotBatch** - Links Batches to Lots
```prisma
model LotBatch {
  id                 String   @id @default(cuid())
  lotId              String
  batchId            String
  volumeContribution Decimal
  batchPercentage    Decimal
  
  // Relations
  lot                Lot      @relation(fields: [lotId], references: [id], onDelete: Cascade)
  Batch              Batch    @relation(fields: [batchId], references: [id])
}
```

### 2.2 Relations Diagram

```
Batch ──┐
        ├──> LotBatch ──> Lot ──> TankAssignment ──> Equipment
Batch ──┘

Equipment ──> TankAssignment ──> Lot ──> LotBatch ──> Batch

Legacy (deprecated):
Batch.tankId ──> Tank (still exists but not used for new assignments)
```

### 2.3 Key Enums

#### BatchStatus
```typescript
enum BatchStatus {
  PLANNED      // Just created, not started
  BREWING      // Mash/boil in progress
  FERMENTING   // Active fermentation
  CONDITIONING // Cold conditioning
  READY        // Ready for packaging
  PACKAGING    // Currently being packaged
  COMPLETED    // Finished
  CANCELLED    // Cancelled
}
```

#### LotPhase
```typescript
enum LotPhase {
  FERMENTATION  // Active fermentation
  CONDITIONING  // Cold conditioning
  BRIGHT        // Ready (batch.status = READY)
  PACKAGING     // Being packaged (batch.status = PACKAGING)
}
```

#### AssignmentStatus
```typescript
enum AssignmentStatus {
  PLANNED   // Scheduled but not started
  ACTIVE    // Currently in use
  COMPLETED // Finished
  CANCELLED // Cancelled
}
```

---

## 3. API Endpoints

### 3.1 Equipment API

#### `GET /api/equipment`
**Purpose:** Fetch all equipment for tenant

**Query Params:**
- `type` (optional): Filter by equipment type
- `status` (optional): Filter by status

**Response:**
```typescript
Equipment[] // Includes tankAssignments with lot and batch info
```

**Key Include:**
```typescript
tankAssignments: {
  where: { status: { in: ['PLANNED', 'ACTIVE'] } },
  orderBy: { createdAt: 'desc' },
  take: 1,
  select: {
    id: true,
    phase: true,
    status: true,
    plannedVolume: true,
    lot: {
      select: {
        lotNumber: true,
        lotBatches: {
          include: {
            Batch: {
              select: { 
                id: true,
                batchNumber: true, 
                status: true,  // ✅ CRITICAL!
                volume: true 
              }
            }
          }
        }
      }
    }
  }
}
```

#### `POST /api/equipment`
**Purpose:** Create new equipment

**Request Body:**
```typescript
{
  name: string
  type: string  // FERMENTER, BRITE_TANK, etc.
  status?: string
  capacity?: number
  // ... other fields
}
```

### 3.2 Batches API

#### `GET /api/batches`
**Purpose:** List batches with optional status filter

**Query Params:**
- `status` (optional): Comma-separated statuses (e.g., "FERMENTING,CONDITIONING")
- `limit` (optional): Default 50

**Response:**
```typescript
{ batches: Batch[] }
```

#### `POST /api/batches`
**Purpose:** Create new batch

**Request Body:**
```typescript
{
  recipeId: string
  volume: number
  plannedDate: string  // ISO date
  notes?: string
  // ❌ tankId NOT included - assigned later via fermentation start
}
```

**Response:**
```typescript
Batch // Status: PLANNED, tankId: null
```

### 3.3 Fermentation Start API

#### `POST /api/fermentation/start`
**Purpose:** Start fermentation for batch(es)

**Request Body:**
```typescript
{
  batchIds: string[]           // Can be 1 (simple) or multiple (blend)
  allocations: {
    tankId: string              // Equipment.id
    volume: number
  }[]
  plannedStart: string          // ISO datetime
  plannedEnd: string            // ISO datetime
  actualOG?: number
  temperature?: number
  notes?: string
  enableBlending?: boolean
  targetLotId?: string         // For blending
}
```

**Scenarios:**
1. **Simple**: 1 batch → 1 tank
2. **Split**: 1 batch → multiple tanks (creates parent + child lots)
3. **Blend**: Multiple batches → 1 tank (blends into existing lot)

**What It Does:**
1. Validates tank availability
2. Creates `Lot` (or uses existing for blend)
3. Creates `LotBatch` linking batch to lot
4. Creates `TankAssignment` linking lot to equipment
5. Updates `Batch.status = FERMENTING`
6. Updates `Equipment.status = IN_USE`
7. Creates `BatchTimeline` event

**Critical:** Does NOT set `Batch.tankId` (FK conflict - it points to Tank model, not Equipment)

### 3.4 Conditioning Start API

#### `POST /api/conditioning/start`
**Purpose:** Transfer batch from fermentation to conditioning

**Request Body:**
```typescript
{
  batchId: string
  allocations?: { tankId: string; volume: number }[]
  plannedStart: string
  plannedEnd: string
  finalGravity?: number
  temperature?: number
  stayInSameTank?: boolean  // For unitanks
  isSplit?: boolean
  enableBlending?: boolean
  targetLotId?: string
}
```

**Modes:**
1. **Stay in Same Tank**: Unitank scenario - updates phase only
2. **Blend**: Multiple batches → 1 conditioning tank
3. **Split/Simple**: Transfer to new tank(s)

**What It Does:**
1. Finds old fermentation `TankAssignment`(s)
2. Completes old assignment(s) → `status: COMPLETED`
3. Frees old tank(s) → `Equipment.status = NEEDS_CIP`
4. Creates new conditioning `Lot` and `TankAssignment`
5. Updates `Batch.status = CONDITIONING`
6. Updates new `Equipment.status = IN_USE`

### 3.5 Mark Ready API

#### `POST /api/batches/[id]/mark-ready`
**Purpose:** Mark batch as ready for packaging

**What It Does:**
1. Updates `TankAssignment.phase = BRIGHT` (for active assignments)
2. Updates `Batch.status = READY`
3. Creates timeline event

**Note:** Tank stays `IN_USE` - not released yet

### 3.6 Start Packaging API

#### `POST /api/batches/[id]/start-packaging`
**Purpose:** Start packaging process

**What It Does:**
1. Updates `TankAssignment.phase = PACKAGING`
2. Updates `TankAssignment.status = ACTIVE` (NOT COMPLETED!)
3. Updates `Batch.status = PACKAGING`
4. Creates `PackagingRun` record
5. Equipment stays `IN_USE` (not released)

**Critical Fix:** Previously set `status = COMPLETED` which caused assignments to disappear. Now keeps `ACTIVE` until batch completion.

### 3.7 Complete Batch API

#### `POST /api/batches/[id]/complete`
**Purpose:** Complete batch and free tanks

**What It Does:**
1. Updates `Batch.status = COMPLETED`
2. Finds all active `TankAssignment` records via `LotBatch` relationship
3. Completes assignments → `status: COMPLETED`, `endTime: now()`
4. Frees equipment → `status: NEEDS_CIP`, `currentBatchId: null`, `nextCIP: now()`
5. Completes all related `Lot` records
6. Creates timeline event

---

## 4. Frontend Architecture

### 4.1 Pages

#### **Production Page** (`/app/production/page.tsx`)

**Purpose:** Main production dashboard

**Tabs:**
- **Batches**: List of all batches with filtering
- **Tanks**: Visual grid/list of fermentation tanks

**Data Sources:**
- **API**: `/api/equipment`, `/api/batches` (primary source)
- **Zustand**: Real-time updates only (not primary source)

**Key Features:**
- Batch creation via `NewBatchModal`
- Tank detail view via `TankDetailModal`
- Real-time status updates
- Filter by status, search by batch number

**Tanks Transformation:**
```typescript
// Equipment from API → Tank for UI
const tanks = equipment
  .filter(eq => ['FERMENTER', 'BRITE_TANK', 'UNITANK', 'CONDITIONING_TANK'].includes(eq.type))
  .map(eq => {
    const activeAssignment = eq.tankAssignments?.[0]
    const batch = activeAssignment?.lot?.lotBatches?.[0]?.Batch
    
    return {
      id: eq.id,
      name: eq.name,
      type: mapEquipmentType(eq.type),
      status: getTankStatus(eq, batch),
      phase: activeAssignment?.phase,
      batch: shouldShowBatch ? { ...batch } : undefined
    }
  })
```

**Status Logic:**
- **Tank Status**: Based on `Equipment.status` + `Batch.status`
  - `NEEDS_CIP` → `'cleaning'`
  - `UNDER_MAINTENANCE` → `'maintenance'`
  - `Batch.COMPLETED` → `'cleaning'` (needs CIP)
  - `IN_USE` + active batch → `'in_use'`
  - Default → `'available'`

- **Batch Status Display**: **Batch.status is PRIMARY source!**
  ```typescript
  const getBatchStatus = () => {
    // ✅ PRIORITY 1: Batch.status (real-time, accurate)
    if (batchStatus === 'READY') return 'ready'
    if (batchStatus === 'PACKAGING') return 'packaging'
    // ...
    
    // ✅ PRIORITY 2: TankAssignment.phase (fallback only)
    if (actualPhase === 'BRIGHT') return 'ready'
    // ...
  }
  ```

#### **Calendar Page** (`/app/calendar/page.tsx`)

**Purpose:** Weekly timeline view of tank schedules

**Data Sources:**
- **API**: Fetches `/api/equipment`, `/api/batches`, `/api/cip-logs` on mount
- No Zustand dependency (uses API directly)

**Tanks Filter:**
```typescript
// Case-insensitive filter
.filter(eq => {
  const type = eq.type?.toLowerCase()
  return ['fermenter', 'brite', 'brite_tank', 'unitank', 'conditioning_tank'].includes(type)
})
```

**Events Generation:**
- **Batch Events**: From `apiBatches` array
- **CIP Events**: From `apiCipLogs` array
- Events mapped to calendar days based on `startDate` and `endDate`

**Key Components:**
- `TankTimeline`: Main calendar grid
- `TankRow`: Individual tank row with events
- `TimelineBar`: Visual event bars
- `EventDetailModal`: Event details and actions

### 4.2 Components Hierarchy

#### **Brewery Components** (`/components/brewery/`)

**NewBatchModal**
- Creates batch via `POST /api/batches`
- No tank selection (tank assigned later)
- Form: recipe, volume, date, notes

**StartBrewingModal**
- Starts brewing phase
- Updates batch status to `BREWING`

#### **Production Components** (`/components/production/`)

**TankCard**
- Displays tank status, batch info, phase
- Click opens `TankDetailModal`

**TankDetailModal**
- Detailed tank view
- Tabs: Overview, Temperature, Gravity, Log, CIP
- Shows active batch info
- Phase label from `batch.status` (primary) or `tank.phase` (fallback)

**BatchCard**
- Batch list item
- Status badge, progress bar
- Click navigates to batch detail

#### **Fermentation Components** (`/components/fermentation/`)

**StartFermentationModalV2**
- Fetches equipment from `/api/equipment`
- Filters for fermentation tanks (`FERMENTER`, `UNITANK`)
- Supports Simple, Split, Blend scenarios
- Calls `POST /api/fermentation/start`

**TransferToConditioningModalV2**
- Fetches equipment from `/api/equipment`
- Filters for conditioning tanks (`BRITE_TANK`, `BRITE`, `CONDITIONING_TANK`, `UNITANK`)
- Supports Stay in Same Tank, Blend, Split modes
- Calls `POST /api/conditioning/start`

#### **Calendar Components** (`/components/calendar/`)

**TankTimeline**
- Main calendar grid component
- Receives `tanks` prop (from API)
- Renders week view with tank rows

**TankRow**
- Individual tank row
- Renders events via `TimelineBar`

**TimelineBar**
- Visual event bars on calendar
- Color-coded by event type
- Clickable to open `EventDetailModal`

**TankInfo**
- Tank information sidebar
- Shows tank details and current batch

---

## 5. Data Flow

### 5.1 Batch Creation Flow

```
1. User clicks "New Batch" → NewBatchModal opens
2. User selects recipe, enters volume, date
3. POST /api/batches
   → Creates Batch with status: PLANNED, tankId: null
   → Returns batch
4. Modal closes, production page refreshes
5. Batch appears in "Batches" tab with status "Planned"
```

### 5.2 Fermentation Start Flow

```
1. User clicks "Start Fermentation" on planned batch
2. StartFermentationModalV2 opens
   → Fetches /api/equipment (filters for FERMENTER/UNITANK)
   → User selects tank(s) and volumes
3. POST /api/fermentation/start
   → Creates Lot (or uses existing for blend)
   → Creates LotBatch (batch → lot)
   → Creates TankAssignment (lot → equipment)
   → Updates Batch.status = FERMENTING
   → Updates Equipment.status = IN_USE
4. Production page refreshes
5. Tank shows "in_use" with batch info
6. Batch status changes to "Fermenting"
```

### 5.3 Conditioning Transfer Flow

```
1. User clicks "Transfer to Conditioning" on fermenting batch
2. TransferToConditioningModalV2 opens
   → Fetches /api/equipment (filters for BRITE_TANK/CONDITIONING_TANK)
   → User selects mode: Stay in Same Tank / New Tank / Blend
3. POST /api/conditioning/start
   → Finds old fermentation TankAssignment(s)
   → Completes old assignment(s) → status: COMPLETED
   → Frees old tank(s) → Equipment.status = NEEDS_CIP
   → Creates new conditioning Lot + TankAssignment
   → Updates Batch.status = CONDITIONING
   → Updates new Equipment.status = IN_USE
4. Production page refreshes
5. Old tank shows "cleaning" (NEEDS_CIP)
6. New tank shows "in_use" with batch
7. Batch status changes to "Conditioning"
```

### 5.4 Mark Ready Flow

```
1. User clicks "Mark Ready" on conditioning batch
2. POST /api/batches/[id]/mark-ready
   → Updates TankAssignment.phase = BRIGHT
   → Updates Batch.status = READY
3. Production page refreshes
4. Tank still shows "in_use" (not released yet)
5. Batch status changes to "Ready"
6. Phase label shows "მზადაა" (from batch.status)
```

### 5.5 Packaging Start Flow

```
1. User clicks "Start Packaging" on ready batch
2. POST /api/batches/[id]/start-packaging
   → Updates TankAssignment.phase = PACKAGING
   → Updates TankAssignment.status = ACTIVE (NOT COMPLETED!)
   → Updates Batch.status = PACKAGING
   → Creates PackagingRun record
3. Production page refreshes
4. Tank still shows "in_use"
5. Batch status changes to "Packaging"
6. Phase label shows "დაფასოვება"
```

### 5.6 Batch Completion Flow

```
1. User clicks "Complete Batch" on packaging batch
2. POST /api/batches/[id]/complete
   → Updates Batch.status = COMPLETED
   → Finds all active TankAssignments via LotBatch
   → Completes assignments → status: COMPLETED, endTime: now()
   → Frees equipment → status: NEEDS_CIP, currentBatchId: null
   → Completes all related Lots
3. Production page refreshes
4. Tank shows "cleaning" (NEEDS_CIP)
5. Batch no longer shown on tank (shouldShowBatch = false for completed)
6. Batch appears in "Completed" filter
```

### 5.7 Calendar Events Generation Flow

```
1. Calendar page loads
   → Fetches /api/equipment
   → Fetches /api/batches
   → Fetches /api/cip-logs (optional)
2. Transform equipment to tanks
   → Filter by type (fermenter, brite, etc.)
   → Map to Tank interface
3. Convert batches to events
   → Map each batch to CalendarEvent
   → Calculate startDate/endDate
   → Determine event type from batch.status
4. Render TankTimeline
   → Shows tanks as rows
   → Shows events as bars on calendar grid
```

---

## 6. State Management

### 6.1 Zustand Store (`/store/breweryStore.ts`)

**Purpose:** Client-side state for real-time updates (NOT primary data source)

**Initial State:**
- Mock data from `/data/centralData.ts` and `/data/equipmentData.ts`
- Used for development/testing
- **Production uses API as primary source**

**Key Actions:**
- `addBatch`, `updateBatch`, `deleteBatch`
- `startFermentation`, `transferToConditioning`, `markReady`, `startPackaging`, `completeBatch`
- `addEquipment`, `updateEquipment`, `updateEquipmentStatus`

**Important:** Store actions are **NOT used** in production flow. All data comes from API endpoints.

### 6.2 API-First Architecture

**Production Page:**
```typescript
// ✅ Primary: API
const [apiEquipment, setApiEquipment] = useState<Equipment[]>([])
const [batches, setBatches] = useState<any[]>([])

// ✅ Secondary: Zustand (for real-time updates only)
const zustandEquipment = useBreweryStore(state => state.equipment)
const zustandBatches = useBreweryStore(state => state.batches)

// Fetch on mount
useEffect(() => {
  fetchEquipment()  // API call
  fetchBatches()    // API call
}, [])
```

**Calendar Page:**
```typescript
// ✅ API only (no Zustand)
const [apiEquipment, setApiEquipment] = useState<any[]>([])
const [apiBatches, setApiBatches] = useState<any[]>([])

useEffect(() => {
  fetchData()  // Fetches from API
}, [])
```

---

## 7. Current Status

### 7.1 Working Features ✅

1. **Batch Creation**
   - ✅ Create batch via `NewBatchModal`
   - ✅ Batch created with `status: PLANNED`, `tankId: null`
   - ✅ Appears in batches list

2. **Fermentation Start**
   - ✅ Simple: 1 batch → 1 tank
   - ✅ Split: 1 batch → multiple tanks (parent + child lots)
   - ✅ Blend: Multiple batches → 1 tank
   - ✅ Creates Lot, LotBatch, TankAssignment
   - ✅ Updates Batch.status = FERMENTING
   - ✅ Updates Equipment.status = IN_USE

3. **Conditioning Transfer**
   - ✅ Stay in Same Tank (unitank)
   - ✅ Transfer to New Tank
   - ✅ Blend mode
   - ✅ Split mode
   - ✅ Frees old tanks → NEEDS_CIP
   - ✅ Updates Batch.status = CONDITIONING

4. **Mark Ready**
   - ✅ Updates TankAssignment.phase = BRIGHT
   - ✅ Updates Batch.status = READY

5. **Start Packaging**
   - ✅ Updates TankAssignment.phase = PACKAGING
   - ✅ Keeps TankAssignment.status = ACTIVE (not COMPLETED)
   - ✅ Updates Batch.status = PACKAGING

6. **Complete Batch**
   - ✅ Completes all TankAssignments
   - ✅ Frees equipment → NEEDS_CIP
   - ✅ Completes all Lots
   - ✅ Updates Batch.status = COMPLETED

7. **Production Page**
   - ✅ Displays tanks with correct status
   - ✅ Shows batch info when tank in use
   - ✅ Phase label from batch.status (primary)
   - ✅ Tank status based on equipment + batch status

8. **Calendar Page**
   - ✅ Fetches equipment and batches from API
   - ✅ Filters tanks correctly (case-insensitive)
   - ✅ Generates events from batches
   - ✅ Displays weekly timeline

### 7.2 Known Issues ⚠️

1. **Type Mismatches**
   - CalendarEvent type conflicts between calendar and production components
   - Some components expect different event type unions

2. **Legacy Fields**
   - `Batch.tankId` still exists but not used for new assignments
   - `Equipment.currentBatchId` maintained for backward compatibility
   - `Tank` model exists but not used (Equipment is used instead)

3. **Status Synchronization**
   - Production page uses API as primary source
   - Calendar page uses API as primary source
   - Zustand store may have stale data (not critical - API is source of truth)

### 7.3 Sync Requirements

**Production ↔ Calendar:**
- Both use API as primary source
- Both fetch independently on mount
- No direct sync needed (both read from same DB)

**Real-time Updates:**
- After batch actions, pages refresh data from API
- Zustand store not used for sync (API is source of truth)

---

## 8. Code Examples

### 8.1 Batch Status Priority Logic

```typescript
// production/page.tsx - getBatchStatus()
const getBatchStatus = (): 'fermenting' | 'conditioning' | 'ready' | 'packaging' | ... => {
  const batchStatus = batch?.status?.toUpperCase()
  
  // ✅ PRIORITY 1: Batch.status (real-time, accurate)
  switch (batchStatus) {
    case 'READY': return 'ready'
    case 'PACKAGING': return 'packaging'
    case 'COMPLETED': return 'completed'
    case 'CONDITIONING': return 'conditioning'
    case 'FERMENTING': return 'fermenting'
    // ...
  }
  
  // ✅ PRIORITY 2: TankAssignment.phase (fallback only)
  switch (actualPhase) {
    case 'BRIGHT': return 'ready'
    case 'PACKAGING': return 'packaging'
    case 'CONDITIONING': return 'conditioning'
    case 'FERMENTATION': return 'fermenting'
  }
  
  return 'fermenting'
}
```

**Key Principle:** `Batch.status > TankAssignment.phase`

### 8.2 Tank Status Logic

```typescript
// production/page.tsx - getTankStatus()
const getTankStatus = (): 'available' | 'in_use' | 'cleaning' | 'maintenance' => {
  const eqStatus = eq.status?.toUpperCase()
  const batchStatus = batch?.status?.toLowerCase()
  
  // Priority 1: Equipment explicit status
  if (eqStatus === 'NEEDS_CIP' || eqStatus === 'NEEDS_MAINTENANCE') return 'cleaning'
  if (eqStatus === 'UNDER_MAINTENANCE' || eqStatus === 'OUT_OF_SERVICE') return 'maintenance'
  
  // Priority 2: Batch COMPLETED → Tank needs CIP
  if (batchStatus === 'completed') return 'cleaning'
  
  // Priority 3: Active batch = in use
  if (hasActiveBatch && batchStatus !== 'completed') return 'in_use'
  
  return 'available'
}
```

### 8.3 Equipment API Response Structure

```typescript
// GET /api/equipment response
Equipment {
  id: string
  name: string
  type: "FERMENTER" | "BRITE_TANK" | "UNITANK" | ...
  status: "OPERATIONAL" | "IN_USE" | "NEEDS_CIP" | ...
  capacity: number
  tankAssignments?: [{
    id: string
    phase: "FERMENTATION" | "CONDITIONING" | "BRIGHT" | "PACKAGING"
    status: "PLANNED" | "ACTIVE" | "COMPLETED"
    plannedVolume: number
    lot: {
      lotNumber: string
      lotBatches: [{
        Batch: {
          id: string
          batchNumber: string
          status: "PLANNED" | "FERMENTING" | "CONDITIONING" | "READY" | "PACKAGING" | "COMPLETED"
          volume: number
        }
      }]
    }
  }]
}
```

### 8.4 Fermentation Start - Simple Scenario

```typescript
// POST /api/fermentation/start
async function handleSimpleStart(batch, allocations) {
  const alloc = allocations[0]
  
  await prisma.$transaction(async (tx) => {
    // 1. Create Lot
    const lot = await tx.lot.create({
      data: {
        lotNumber: await generateLotNumber(tenantId, 'FERMENTATION'),
        tenantId,
        phase: 'FERMENTATION',
        status: 'PLANNED',
      }
    })
    
    // 2. Create LotBatch
    await tx.lotBatch.create({
      data: {
        lotId: lot.id,
        batchId: batch.id,
        volumeContribution: alloc.volume,
        batchPercentage: 100,
      }
    })
    
    // 3. Create TankAssignment
    await tx.tankAssignment.create({
      data: {
        tenantId,
        tankId: alloc.tankId,  // Equipment.id
        lotId: lot.id,
        startTime: new Date(plannedStart),
        endTime: new Date(plannedEnd),
        plannedVolume: alloc.volume,
        phase: 'FERMENTATION',
        status: 'PLANNED',
      }
    })
    
    // 4. Update Equipment
    await tx.equipment.update({
      where: { id: alloc.tankId },
      data: {
        status: 'IN_USE',
        currentBatchId: batch.id,  // Legacy field
      }
    })
    
    // 5. Update Batch
    await tx.batch.update({
      where: { id: batch.id },
      data: {
        status: 'FERMENTING',
        // ❌ tankId NOT set (FK conflict - points to Tank model)
      }
    })
  })
}
```

### 8.5 Complete Batch - Tank Release

```typescript
// POST /api/batches/[id]/complete
await prisma.$transaction(async (tx) => {
  // 1. Update Batch
  await tx.batch.update({
    where: { id: batchId },
    data: { status: 'COMPLETED', completedAt: new Date() }
  })
  
  // 2. Find active assignments via LotBatch
  const activeAssignments = await tx.tankAssignment.findMany({
    where: {
      lot: {
        lotBatches: {
          some: { batchId: batchId }
        }
      },
      status: { in: ['PLANNED', 'ACTIVE'] }
    }
  })
  
  // 3. Complete assignments and free tanks
  for (const assignment of activeAssignments) {
    await tx.tankAssignment.update({
      where: { id: assignment.id },
      data: { status: 'COMPLETED', endTime: new Date() }
    })
    
    await tx.equipment.update({
      where: { id: assignment.tankId },
      data: {
        status: 'NEEDS_CIP',  // ✅ Not AVAILABLE - needs CIP!
        currentBatchId: null,
        nextCIP: new Date(),
      }
    })
  }
  
  // 4. Complete lots
  await tx.lot.updateMany({
    where: {
      lotBatches: { some: { batchId: batchId } },
      status: { not: 'COMPLETED' }
    },
    data: { status: 'COMPLETED' }
  })
})
```

---

## 9. Key Questions Answered

### Q: როგორ იქმნება ახალი Batch?
**A:** 
1. User opens `NewBatchModal`
2. Selects recipe, enters volume, date
3. `POST /api/batches` creates batch with `status: PLANNED`, `tankId: null`
4. Batch appears in list, ready for fermentation start

### Q: როგორ ინიჭება Tank Batch-ს?
**A:**
1. User clicks "Start Fermentation" on planned batch
2. `StartFermentationModalV2` opens, user selects tank(s)
3. `POST /api/fermentation/start` creates:
   - `Lot` (fermentation lot)
   - `LotBatch` (links batch to lot)
   - `TankAssignment` (links lot to equipment)
4. Equipment status → `IN_USE`
5. Batch status → `FERMENTING`

**Note:** `Batch.tankId` is NOT set (legacy field, FK points to Tank model, not Equipment)

### Q: რა ხდება როცა Batch გადადის FERMENTING → CONDITIONING?
**A:**
1. `POST /api/conditioning/start`
2. Finds old fermentation `TankAssignment`
3. Completes old assignment → `status: COMPLETED`
4. Frees old tank → `Equipment.status = NEEDS_CIP`
5. Creates new conditioning `Lot` + `TankAssignment`
6. Updates `Batch.status = CONDITIONING`
7. Updates new `Equipment.status = IN_USE`

### Q: როგორ თავისუფლდება Tank როცა Batch COMPLETED ხდება?
**A:**
1. `POST /api/batches/[id]/complete`
2. Finds all active `TankAssignment` records via `LotBatch` relationship
3. Completes assignments → `status: COMPLETED`, `endTime: now()`
4. Frees equipment → `status: NEEDS_CIP` (not AVAILABLE - needs CIP!)
5. Sets `currentBatchId: null`, `nextCIP: new Date()`
6. Completes all related `Lot` records

### Q: Calendar-ზე როგორ ჩნდება batch events?
**A:**
1. Calendar page fetches `/api/batches` on mount
2. Transforms batches to `CalendarEvent[]`:
   ```typescript
   batchEvents = apiBatches.map(batch => ({
     id: batch.id,
     type: mapBatchStatusToEventType(batch.status),
     title: batch.recipe?.name,
     tankId: batch.tankId,  // Legacy field
     startDate: batch.startDate,
     endDate: batch.estimatedEndDate,
     status: mapBatchStatusToEventStatus(batch.status),
   }))
   ```
3. Events rendered on `TankTimeline` grid

### Q: Production და Calendar როგორ არის სინქრონიზებული?
**A:**
- Both use **API as primary source** (not Zustand)
- Both fetch independently on mount
- After actions, pages refresh from API
- No direct sync needed (both read from same database)

### Q: რა არის განსხვავება Equipment types-ს შორის?
**A:**
- **FERMENTER**: Dedicated fermentation tanks
- **BRITE_TANK / BRITE**: Bright/conditioning tanks
- **UNITANK**: Can ferment AND condition (same tank)
- **CONDITIONING_TANK**: Dedicated conditioning tanks
- **PUMP, MILL, BOILER**: Other equipment (not tanks)

**Filter Logic:**
- Production/Calendar filter: `['FERMENTER', 'BRITE_TANK', 'UNITANK', 'CONDITIONING_TANK']`
- Case-insensitive: `eq.type?.toLowerCase()` matches `'brite'` or `'brite_tank'`

### Q: Zustand store რა როლი აქვს?
**A:**
- **Development/Testing**: Provides mock data
- **Real-time Updates**: Can be used for optimistic updates (not currently used)
- **NOT Primary Source**: Production uses API endpoints as source of truth
- **Legacy**: Some components may still reference it, but API is authoritative

### Q: რა API endpoints არსებობს და რას აკეთებენ?
**A:**

**Equipment:**
- `GET /api/equipment` - List all equipment (with tankAssignments)
- `POST /api/equipment` - Create equipment
- `GET /api/equipment/[id]` - Get single equipment
- `DELETE /api/equipment/[id]` - Delete equipment
- `POST /api/equipment/[id]/cip` - Record CIP log

**Batches:**
- `GET /api/batches` - List batches (with status filter)
- `POST /api/batches` - Create batch
- `GET /api/batches/[id]` - Get single batch
- `POST /api/batches/[id]/complete` - Complete batch
- `POST /api/batches/[id]/mark-ready` - Mark as ready
- `POST /api/batches/[id]/start-packaging` - Start packaging

**Fermentation:**
- `POST /api/fermentation/start` - Start fermentation (simple/split/blend)

**Conditioning:**
- `POST /api/conditioning/start` - Start conditioning (stay/blend/split)

**Lots:**
- `GET /api/lots/active` - Get active lots (for blending)

---

## 10. Critical Architecture Decisions

### 10.1 Lot-Based Fermentation System

**Why:** Enables complex scenarios (split, blend) without direct Batch-Tank coupling

**Architecture:**
```
Batch → LotBatch → Lot → TankAssignment → Equipment
```

**Benefits:**
- One batch can be in multiple tanks (split)
- Multiple batches can blend into one tank
- Clean separation of concerns
- Flexible phase transitions

### 10.2 Equipment vs Tank Models

**Decision:** Use `Equipment` model for tanks, not separate `Tank` model

**Reason:**
- Unified equipment management
- Tanks are just equipment with specific types
- `TankAssignment.tankId` → `Equipment.id`

**Legacy:**
- `Tank` model still exists but not used
- `Batch.tankId` → `Tank.id` (FK conflict - not set for new batches)

### 10.3 Batch.status as Primary Source

**Decision:** `Batch.status` always takes priority over `TankAssignment.phase`

**Reason:**
- Batch.status is real-time and accurate
- TankAssignment.phase may be stale
- UI should reflect actual batch state

**Implementation:**
```typescript
// ✅ CORRECT
if (batch.status === 'READY') return 'ready'
if (tankAssignment.phase === 'BRIGHT') return 'ready'  // Fallback

// ❌ WRONG
if (tankAssignment.phase === 'BRIGHT') return 'ready'
if (batch.status === 'READY') return 'ready'
```

### 10.4 Tank Release → NEEDS_CIP (Not AVAILABLE)

**Decision:** When tank is freed, set status to `NEEDS_CIP`, not `AVAILABLE`

**Reason:**
- Ensures CIP is performed before reuse
- Prevents skipping cleaning step
- Better workflow enforcement

**Flow:**
```
IN_USE → (batch completes) → NEEDS_CIP → (CIP performed) → OPERATIONAL/AVAILABLE
```

---

## 11. Migration Notes

### 11.1 From Direct Batch-Tank to Lot-Based

**Old Architecture:**
```
Batch.tankId → Tank.id
```

**New Architecture:**
```
Batch → LotBatch → Lot → TankAssignment → Equipment
```

**Migration:**
- Existing `Batch.tankId` values preserved (legacy)
- New batches don't set `tankId`
- All new assignments use `TankAssignment`

### 11.2 Equipment Types Normalization

**Issue:** Mixed case types (`'brite'` vs `'BRITE_TANK'`)

**Solution:** Case-insensitive filtering
```typescript
const type = eq.type?.toLowerCase()
return ['fermenter', 'brite', 'brite_tank', 'unitank', 'conditioning_tank'].includes(type)
```

---

## 12. Testing Checklist

### 12.1 Batch Workflow
- [ ] Create batch → appears in list
- [ ] Start fermentation → tank shows "in_use", batch shows "fermenting"
- [ ] Transfer to conditioning → old tank "cleaning", new tank "in_use", batch "conditioning"
- [ ] Mark ready → batch "ready", phase "BRIGHT"
- [ ] Start packaging → batch "packaging", phase "PACKAGING"
- [ ] Complete batch → tank "cleaning", batch "completed", batch not shown on tank

### 12.2 Calendar Display
- [ ] Equipment types filtered correctly (brite, brite_tank both work)
- [ ] Batch events appear on correct dates
- [ ] Tank rows show all fermentation/conditioning tanks
- [ ] Events clickable, show details

### 12.3 Status Consistency
- [ ] Production page batch status matches API
- [ ] Calendar page batch status matches API
- [ ] Tank status reflects equipment + batch status correctly
- [ ] Phase labels use batch.status (primary) not phase (fallback)

---

## 13. Future Improvements

1. **Real-time Updates**: WebSocket or Server-Sent Events for live status
2. **Batch.tankId Removal**: Remove legacy field after full migration
3. **Tank Model Removal**: Remove unused Tank model
4. **Type Unification**: Resolve CalendarEvent type conflicts
5. **Optimistic Updates**: Use Zustand for immediate UI feedback
6. **Caching Strategy**: Implement React Query or SWR for API caching

---

## 📝 Summary

This Brewery Management System uses a **lot-based fermentation architecture** where:
- **Batches** are linked to **Lots** via `LotBatch`
- **Lots** are assigned to **Equipment** via `TankAssignment`
- **Batch.status** is the primary source of truth for UI display
- **API endpoints** are the authoritative data source (not Zustand)
- **Equipment** model is used for tanks (not separate Tank model)

The system supports complex scenarios like splitting batches across multiple tanks and blending multiple batches into one tank, all while maintaining clean data relationships and accurate status tracking.







