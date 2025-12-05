# 🏨 Hotel PMS - სრული პროექტის სტრუქტურის ანალიზი

**პროექტი**: SaaS Multi-Module Platform - Hotel Management System  
**ტექნოლოგიები**: Next.js 14, React 18, TypeScript, Tailwind CSS  
**სტრუქტურა**: Monorepo (Turborepo + pnpm workspaces)  
**ბაზა**: PostgreSQL + Prisma (პაკეტებში), localStorage (hotel app-ში)  
**თარიღი**: 2025-01-XX

---

## 📋 1. პროექტის ზოგადი სტრუქტურა

```
saas-platform/
├── apps/                          # აპლიკაციები
│   ├── hotel/                     # ⭐ Hotel Management System (მთავარი)
│   ├── restaurant/                # Restaurant Management
│   ├── web/                       # Web apps
│   │   ├── landing/              # Marketing website
│   │   └── super-admin/          # Platform administration
│   └── winery/                    # Winery Management
├── packages/                      # Shared packages
│   ├── auth/                      # Authentication logic
│   ├── database/                  # Prisma schemas & migrations
│   ├── ui/                        # Shared UI components
│   ├── types/                     # Shared TypeScript types
│   ├── utils/                     # Utility functions
│   └── config/                    # Shared configurations
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # pnpm workspace config
├── turbo.json                     # Turborepo config
└── tsconfig.json                  # Root TypeScript config
```

---

## 🏗️ 2. Hotel App სტრუქტურა (apps/hotel/)

### 2.1 ძირითადი სტრუქტურა

```
apps/hotel/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx              # ⭐ Main Dashboard (2044 lines)
│   │   ├── layout.tsx            # Root layout
│   │   ├── globals.css           # Global styles
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── api/                  # API Routes
│   │       ├── email/
│   │       │   └── send/
│   │       │       └── route.ts
│   │       └── hotel/
│   │           ├── check-in/
│   │           │   └── route.ts
│   │           ├── reservations/
│   │           │   ├── route.ts
│   │           │   └── [id]/
│   │           │       └── route.ts
│   │           └── rooms/
│   │               ├── route.ts
│   │               ├── [id]/
│   │               │   └── route.ts
│   │               └── status/
│   │                   └── route.ts
│   ├── components/                # React Components (50+ files)
│   │   ├── RoomCalendar.tsx      # ⭐ Main calendar (4135 lines)
│   │   ├── NightAuditModule.tsx  # ⭐ Night Audit (3089 lines)
│   │   ├── NightAuditView.tsx    # Night Audit View (1879 lines)
│   │   ├── FolioSystem.tsx       # Guest Folio System
│   │   ├── FinancialDashboard.tsx
│   │   ├── Reports.tsx           # Reports dashboard
│   │   ├── SettingsNew.tsx       # ⭐ New Settings Module
│   │   ├── SettingsHub.tsx       # Settings Hub
│   │   ├── CashierManagement.tsx
│   │   ├── HousekeepingView.tsx
│   │   ├── ReservationsView.tsx
│   │   ├── RoomGridView.tsx
│   │   ├── CheckInModal.tsx
│   │   ├── CheckOutModal.tsx
│   │   ├── EditReservationModal.tsx
│   │   ├── EnhancedPaymentModal.tsx
│   │   ├── FolioViewModal.tsx
│   │   ├── ExtraChargesPanel.tsx
│   │   ├── SystemLockOverlay.tsx
│   │   └── settings/             # Settings sub-components
│   │       ├── ActivityLogs.tsx
│   │       ├── ExtraServicesManager.tsx
│   │       ├── PackagesManager.tsx
│   │       ├── PricingSettings.tsx
│   │       └── QuickChargesManager.tsx
│   ├── lib/                      # Utility Libraries
│   │   ├── dataStore.ts          # ⭐ File-based data storage
│   │   ├── activityLogger.ts     # Activity logging
│   │   ├── systemLockService.ts  # System locking
│   │   ├── reportService.ts      # PDF/Email reports
│   │   └── config.ts             # App configuration
│   ├── services/                 # Business Logic Services
│   │   ├── PaymentService.ts
│   │   ├── PostingService.ts
│   │   ├── FolioAutoCloseService.ts
│   │   ├── FolioRoutingService.ts
│   │   ├── PackagePostingService.ts
│   │   ├── ExtraChargesService.ts
│   │   └── FinancialReportsService.ts
│   └── types/                    # TypeScript Types
│       ├── folio.types.ts
│       ├── folioRouting.types.ts
│       ├── package.types.ts
│       └── extraCharges.types.ts
├── data/                         # JSON Data Files
│   ├── rooms.json               # Room definitions
│   └── reservations.json        # Reservation data
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── postcss.config.js
```

---

## 🔑 3. ძირითადი კომპონენტები და მათი დანიშნულება

### 3.1 Core Components

#### **page.tsx** (Main Dashboard)
- **ზომა**: ~2044 lines
- **დანიშნულება**: მთავარი dashboard, tab management, routing
- **ფუნქციები**:
  - Multi-tab interface (dashboard, calendar, reservations, reports, etc.)
  - User authentication & role-based access
  - Quick menu navigation
  - Mobile responsive menu
  - System lock overlay
  - Real-time stats display

#### **RoomCalendar.tsx** ⭐
- **ზომა**: ~4135 lines
- **დანიშნულება**: Room reservation calendar - ყველაზე კომპლექსური კომპონენტი
- **ფუნქციები**:
  - Drag & drop reservations
  - Week/Month view toggle
  - Search & filter (room type, guest name)
  - Availability bar with percentages
  - Date picker with calendar dropdown
  - Floor-based room grouping
  - Reservation details modals
  - Check-in/Check-out workflows
  - Payment processing
  - Folio management
  - Context menus (right-click)
  - Blocked dates & maintenance rooms
  - Business day indicator
  - Night Audit integration

#### **NightAuditModule.tsx** ⭐
- **ზომა**: ~3089 lines
- **დანიშნულება**: Night Audit (დღის დახურვა) სისტემა
- **ფუნქციები**:
  - Sequential day closing validation
  - Checklist-based workflow
  - Statistics calculation
  - No-show processing
  - Folio auto-close
  - Admin override panel
  - Business day management

#### **SettingsNew.tsx** ⭐
- **დანიშნულება**: ახალი Settings მოდული
- **ფუნქციები**:
  - Hotel information management
  - Room types & pricing
  - User management
  - Housekeeping checklist
  - System settings
  - Activity logs
  - Data export/import

#### **FolioSystem.tsx**
- **დანიშნულება**: Guest Folio (ანგარიში) მენეჯმენტი
- **ფუნქციები**:
  - Folio creation & management
  - Charge posting
  - Payment processing
  - Folio routing
  - Auto-close functionality

#### **Reports.tsx**
- **დანიშნულება**: რეპორტების dashboard
- **ფუნქციები**:
  - Revenue reports
  - Occupancy reports
  - Guest reports
  - Room reports
  - Payment reports
  - Cancellation reports
  - Source reports
  - CSV export
  - Print functionality

### 3.2 Modal Components

- **CheckInModal.tsx**: Check-in form
- **CheckOutModal.tsx**: Check-out form
- **EditReservationModal.tsx**: Edit reservation details
- **EnhancedPaymentModal.tsx**: Payment processing
- **FolioViewModal.tsx**: Folio details view
- **ExtraChargesPanel.tsx**: Extra charges management

### 3.3 View Components

- **ReservationsView.tsx**: Reservations list view
- **RoomGridView.tsx**: Room grid view
- **HousekeepingView.tsx**: Housekeeping management
- **FinancialDashboard.tsx**: Financial overview
- **CashierManagement.tsx**: Cashier operations

---

## 🔄 4. Data Flow & Storage

### 4.1 Data Storage Strategy

**Current Implementation**: 
- **File-based storage** (`dataStore.ts`) - JSON files in `data/` directory
- **localStorage** - User preferences, system settings, activity logs
- **Future**: PostgreSQL + Prisma (already in packages/database)

### 4.2 Data Files

```
data/
├── rooms.json              # Room definitions (15 rooms by default)
└── reservations.json       # Reservation data
```

### 4.3 localStorage Keys

- `currentUser` - Current logged-in user
- `maintenanceRooms` - Rooms in maintenance
- `blockedDates` - Blocked dates for rooms
- `hotelInfo` - Hotel information
- `systemSettings` - System settings
- `userPasswords` - User passwords (hashed)
- `activityLogs` - Activity logs
- `lastNightAuditDate` - Last night audit date
- `lastAuditDate` - Last audit date
- `currentBusinessDate` - Current business date

### 4.4 API Routes

```
/api/hotel/
├── rooms/
│   ├── GET    /api/hotel/rooms              # Get all rooms
│   ├── POST   /api/hotel/rooms              # Create room
│   ├── GET    /api/hotel/rooms/[id]         # Get room by ID
│   ├── PUT    /api/hotel/rooms/[id]         # Update room
│   ├── DELETE /api/hotel/rooms/[id]         # Delete room
│   └── PUT    /api/hotel/rooms/status       # Update room status
├── reservations/
│   ├── GET    /api/hotel/reservations      # Get all reservations
│   ├── POST   /api/hotel/reservations      # Create reservation
│   ├── GET    /api/hotel/reservations/[id] # Get reservation by ID
│   ├── PUT    /api/hotel/reservations/[id] # Update reservation
│   └── DELETE /api/hotel/reservations/[id]  # Delete reservation
├── check-in/
│   └── POST   /api/hotel/check-in          # Check-in guest
└── email/
    └── POST   /api/email/send              # Send email
```

---

## 🎨 5. UI/UX Features

### 5.1 Design System

- **Framework**: Tailwind CSS
- **Responsive**: Mobile-first approach
- **Icons**: Emoji-based (🏨, 📅, 💰, etc.)
- **Language**: Georgian (ქართული)

### 5.2 Key UI Features

- **Multi-tab Interface**: Tab-based navigation
- **Drag & Drop**: Reservation movement
- **Search & Filter**: Real-time search
- **Modals**: Multiple modal dialogs
- **Context Menus**: Right-click actions
- **Responsive Design**: Mobile & desktop
- **Dark Mode Support**: (partial)

---

## 🔐 6. Authentication & Authorization

### 6.1 User Roles

- **admin**: Full access
- **manager**: Most features (no Night Audit)
- **receptionist**: Limited access (no reports, no Night Audit)

### 6.2 Permission System

```typescript
const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager'
const canViewReports = currentUser?.role !== 'receptionist'
const canCloseDay = currentUser?.role === 'admin'
```

### 6.3 Authentication Flow

1. User visits `/login`
2. Enters username/password
3. Credentials checked against localStorage
4. User stored in localStorage as `currentUser`
5. Redirected to main dashboard
6. Protected routes check for `currentUser`

---

## 📊 7. Key Features

### 7.1 Reservation Management

- ✅ Create/Edit/Delete reservations
- ✅ Drag & drop to change dates/rooms
- ✅ Check-in/Check-out workflows
- ✅ Payment processing
- ✅ Folio generation
- ✅ Extra charges
- ✅ Package management
- ✅ No-show handling

### 7.2 Room Management

- ✅ Room status tracking (VACANT, OCCUPIED, CLEANING, MAINTENANCE)
- ✅ Floor-based organization
- ✅ Room type management
- ✅ Pricing management
- ✅ Maintenance mode
- ✅ Blocked dates

### 7.3 Financial Features

- ✅ Payment processing
- ✅ Folio management
- ✅ Charge posting
- ✅ Financial reports
- ✅ Revenue tracking
- ✅ Occupancy reports

### 7.4 Night Audit

- ✅ Sequential day closing
- ✅ Validation rules
- ✅ Checklist workflow
- ✅ Statistics calculation
- ✅ Business day management
- ✅ Admin override

### 7.5 Reports

- ✅ Revenue reports
- ✅ Occupancy reports
- ✅ Guest reports
- ✅ Room reports
- ✅ Payment reports
- ✅ CSV export
- ✅ Print functionality

---

## 🛠️ 8. Technologies & Dependencies

### 8.1 Core Dependencies

```json
{
  "next": "^14.0.4",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "typescript": "^5.3.3",
  "tailwindcss": "^3.4.0"
}
```

### 8.2 Key Libraries

- **moment**: Date manipulation (`^2.30.1`)
- **react-dnd**: Drag & drop (`^16.0.1`)
- **recharts**: Charts (`^3.5.0`)
- **jspdf**: PDF generation (`^2.5.2`)
- **jspdf-autotable**: PDF tables (`^3.8.4`)
- **html2canvas**: Screenshot generation (`^1.4.1`)

### 8.3 Workspace Packages

- `@saas-platform/auth`: Authentication
- `@saas-platform/database`: Database (Prisma)
- `@saas-platform/types`: Shared types
- `@saas-platform/ui`: Shared UI components
- `@saas-platform/utils`: Utility functions

---

## 📁 9. File Size Overview

### Largest Components

1. **RoomCalendar.tsx**: ~4135 lines
2. **NightAuditModule.tsx**: ~3089 lines
3. **NightAuditView.tsx**: ~1879 lines
4. **page.tsx**: ~2044 lines
5. **Reports.tsx**: ~1000+ lines

### Component Count

- **Total Components**: 50+ files
- **Modal Components**: 10+ files
- **View Components**: 5+ files
- **Settings Components**: 6+ files
- **Service Files**: 7 files
- **Type Files**: 4 files
- **Lib Files**: 5 files

---

## 🔧 10. Development Workflow

### 10.1 Scripts

```bash
# Development
pnpm dev                    # Start all apps
cd apps/hotel && pnpm dev   # Start hotel app only (port 3010)

# Build
pnpm build                  # Build all apps
cd apps/hotel && pnpm build # Build hotel app

# Type Checking
pnpm type-check             # Type check all apps

# Linting
pnpm lint                   # Lint all apps
```

### 10.2 Port Configuration

- **Hotel App**: `http://localhost:3010`
- **Restaurant App**: (default Next.js port)
- **Web Apps**: (default Next.js port)

---

## 🎯 11. Key Business Logic

### 11.1 Reservation Status Flow

```
PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT
                ↓
            CANCELLED
                ↓
            NO_SHOW
```

### 11.2 Room Status Flow

```
VACANT → OCCUPIED → CLEANING → VACANT
   ↓
MAINTENANCE → VACANT
```

### 11.3 Night Audit Flow

1. Validation (check for open folios, pending payments)
2. Checklist completion
3. Statistics calculation
4. No-show processing
5. Folio auto-close
6. Business day increment
7. Date storage in localStorage

---

## 📝 12. Important Notes

### 12.1 Data Persistence

- **Current**: File-based (JSON) + localStorage
- **Future**: PostgreSQL migration planned
- **Migration Path**: Data export/import functionality exists

### 12.2 State Management

- **Current**: React useState/useEffect
- **No Global State**: Each component manages its own state
- **Data Sync**: API calls + localStorage

### 12.3 Internationalization

- **Current**: Georgian (ქართული) only
- **No i18n Library**: Hardcoded strings
- **Future**: i18n support planned

### 12.4 Testing

- **Current**: No test files found
- **Future**: Testing framework to be added

---

## 🚀 13. Recent Changes & Improvements

### Recent Additions

1. **SettingsNew.tsx**: New comprehensive settings module
2. **Reports.tsx**: Enhanced reporting dashboard
3. **RoomCalendar.tsx**: 
   - Search & filter functionality
   - Availability bar
   - Date picker with calendar
   - Improved header layout
4. **Dashboard Stats**: Reduced height by 50%
5. **Modal z-index**: Fixed header overlapping issue

### Known Issues Fixed

- ✅ Search input visibility
- ✅ Availability bar duplication
- ✅ Date picker dropdown visibility
- ✅ Header overlapping modals
- ✅ Room row height optimization

---

## 📚 14. Documentation Files

- `PROJECT_ANALYSIS.md` - Project analysis
- `PROJECT_EXPORT.md` - Export documentation
- `NIGHT_AUDIT_RULES.md` - Night Audit rules
- `NIGHT_AUDIT_V2_RULES.md` - Night Audit v2 rules
- `SETTINGS_HUB_STRUCTURE.md` - Settings structure
- `CALENDAR_RULES.md` - Calendar rules

---

## 🎓 15. Code Patterns & Conventions

### 15.1 Component Structure

```typescript
'use client'  // Client component

import { useState, useEffect, useMemo } from 'react'
import moment from 'moment'

export default function ComponentName() {
  // State
  const [state, setState] = useState()
  
  // Effects
  useEffect(() => {
    // Load data
  }, [])
  
  // Memoized values
  const memoized = useMemo(() => {
    // Calculations
  }, [dependencies])
  
  // Handlers
  const handleAction = () => {
    // Logic
  }
  
  // Render
  return (
    <div>
      {/* JSX */}
    </div>
  )
}
```

### 15.2 Data Fetching Pattern

```typescript
// Load from localStorage
useEffect(() => {
  const data = localStorage.getItem('key')
  if (data) {
    setState(JSON.parse(data))
  }
}, [])

// Save to localStorage
const saveData = () => {
  localStorage.setItem('key', JSON.stringify(data))
}
```

### 15.3 API Call Pattern

```typescript
const fetchData = async () => {
  try {
    const response = await fetch('/api/hotel/rooms')
    const data = await response.json()
    setRooms(data)
  } catch (error) {
    console.error('Error:', error)
  }
}
```

---

## 🔍 16. Search & Navigation Tips

### Key Files to Know

- **Main Entry**: `apps/hotel/src/app/page.tsx`
- **Calendar**: `apps/hotel/src/components/RoomCalendar.tsx`
- **Night Audit**: `apps/hotel/src/components/NightAuditModule.tsx`
- **Settings**: `apps/hotel/src/components/SettingsNew.tsx`
- **Data Storage**: `apps/hotel/src/lib/dataStore.ts`
- **API Routes**: `apps/hotel/src/app/api/hotel/`

### Common Tasks

1. **Add New Feature**: Create component in `src/components/`
2. **Add API Endpoint**: Create route in `src/app/api/`
3. **Add Service**: Create file in `src/services/`
4. **Add Type**: Create file in `src/types/`
5. **Modify Data**: Update `dataStore.ts` or API routes

---

## 📞 17. Integration Points

### 17.1 External Services

- **Email**: `/api/email/send` (nodemailer)
- **PDF Generation**: jspdf + jspdf-autotable
- **Charts**: recharts

### 17.2 Internal Integrations

- **Activity Logging**: `ActivityLogger` from `lib/activityLogger.ts`
- **System Lock**: `SystemLockService` from `lib/systemLockService.ts`
- **Reports**: `reportService` from `lib/reportService.ts`

---

## 🎯 18. Future Improvements

### Planned Features

1. PostgreSQL migration
2. Real-time updates (WebSockets)
3. Multi-language support (i18n)
4. Advanced reporting
5. Mobile app
6. API documentation
7. Unit & E2E tests
8. Performance optimization

---

## 📋 19. Quick Reference

### Tab IDs in page.tsx

- `dashboard` - Dashboard
- `calendar` - Room Calendar
- `reservations` - Reservations View
- `folios` - Folio System
- `housekeeping` - Housekeeping
- `roomgrid` - Room Grid
- `reports` - Reports
- `nightaudit` - Night Audit
- `new-night-audit` - New Night Audit
- `cashier` - Cashier
- `financial` - Financial Dashboard
- `charges-settings` - Charges Settings
- `settings-hub` - Settings Hub
- `settings-new` - New Settings ⭐

### localStorage Keys

- `currentUser` - Current user
- `maintenanceRooms` - Maintenance rooms
- `blockedDates` - Blocked dates
- `hotelInfo` - Hotel info
- `systemSettings` - System settings
- `userPasswords` - User passwords
- `activityLogs` - Activity logs
- `lastNightAuditDate` - Last audit date
- `currentBusinessDate` - Business date

---

**დამზადებული**: 2025-01-XX  
**ვერსია**: 1.0.0  
**სტატუსი**: ✅ Production Ready











