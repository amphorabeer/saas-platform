# Settings Hub მენიუს სტრუქტურა

## 📋 Overview

Settings Hub არის Unified Settings Interface, რომელიც აერთიანებს ყველა Settings კომპონენტს ერთ ადგილას.

---

## 🏗️ Main Structure

```
SettingsHub
├── Header
│   ├── Title: "⚙️ Settings Hub"
│   ├── Description: "Manage your hotel configuration"
│   └── Search Bar: "🔍 Search settings..."
│
├── Recently Used Section (Optional)
│   └── Quick Access Buttons (max 5 unique)
│
└── Main Content Area
    ├── Left Sidebar (Navigation)
    │   └── Categories List
    │       └── Subsections (when expanded)
    │
    └── Right Content Area
        └── Section-specific Components
```

---

## 📂 Settings Sections

### **1. 🏠 Dashboard** (`dashboard`)
- **ID**: `dashboard`
- **Icon**: 🏠
- **Description**: Quick overview and shortcuts
- **Color**: blue
- **Subsections**: None
- **Component**: `SettingsDashboard`
- **Features**:
  - Quick Stats Cards (Rooms, Staff, Rates, Checklist)
  - Quick Action Cards (links to other sections)
  - Overview of all settings

---

### **2. 🏨 Hotel Configuration** (`hotel`)
- **ID**: `hotel`
- **Icon**: 🏨
- **Description**: Basic hotel information and setup
- **Color**: purple
- **Subsections**:
  - `info` - Hotel Information (📋)
  - `floors` - Floors & Layout (🏢)
  - `facilities` - Facilities (🏊)
- **Component**: `HotelSettings`
- **Tabs (8 total)**:
  1. 🏨 **Hotel Info** - Hotel information form (Name, Company, Tax ID, Bank, Address, Phone, Email, Logo)
  2. 🛏️ **Rooms** - Rooms management (List, Add, Edit, Delete, Search, Filter)
  3. 🏷️ **Room Types** - Room type configuration (Standard, Deluxe, Suite with pricing)
  4. 🏢 **Floors** - Floor management (Add/Remove floors)
  5. 👥 **Staff** - Staff management (Add, Edit, Search, Filter by department)
  6. 🧹 **Housekeeping** - Checklist management (Category-based tasks)
  7. 💰 **Pricing** - Room pricing (Base, Weekend, Holiday rates, Bulk actions)
  8. 📋 **Activity Logs** - System activity logs (Date filter, Clear logs)

---

### **3. 🛏️ Rooms & Inventory** (`rooms`)
- **ID**: `rooms`
- **Icon**: 🛏️
- **Description**: Manage rooms and types
- **Color**: green
- **Subsections**:
  - `roomList` - All Rooms (🚪)
  - `roomTypes` - Room Categories (🏷️)
  - `amenities` - Amenities (🛁)
- **Component**: `RoomsSettings` (Placeholder)
- **Status**: To be implemented
- **Future Features**:
  - Room list management
  - Room type configuration
  - Amenities management

---

### **4. 💰 Pricing & Charges** (`pricing`)
- **ID**: `pricing`
- **Icon**: 💰
- **Description**: Rates, extra charges, and taxes
- **Color**: yellow
- **Subsections**:
  - `rates` - Room Rates (💵)
  - `extras` - Extra Services (➕)
  - `packages` - Packages (📦)
  - `taxes` - Taxes & Fees (📊)
  - `quickButtons` - Quick Charges (⚡)
- **Component**: `PricingSettings`
- **Tabs (5 total)**:
  1. 💵 **Room Rates** - Visual rate cards (Standard, Deluxe, Suite) with Weekday/Weekend/Holiday rates, Bulk actions
  2. ➕ **Extra Services** - Extra services management (integrated with ChargesSettings)
  3. 📦 **Packages** - Package management (integrated with PackagePostingService)
  4. 📊 **Taxes** - Tax configuration (VAT, City Tax, Tourism Tax, Service Charge)
  5. ⚡ **Quick Charges** - Quick charge buttons configuration (integrated with ChargesSettings)
- **Features**:
  - Import/Export functionality
  - Bulk Actions (Increase/Decrease/Reset)
  - Visual rate cards with inline editing
  - Rate history and scheduling (placeholders)

---

### **5. ⚙️ Operations** (`operations`)
- **ID**: `operations`
- **Icon**: ⚙️
- **Description**: Daily operations settings
- **Color**: red
- **Subsections**:
  - `checklist` - Housekeeping (🧹)
  - `maintenance` - Maintenance (🔧)
  - `nightAudit` - Night Audit (🌙)
- **Component**: `OperationsSettings` (Placeholder)
- **Status**: To be implemented
- **Future Features**:
  - Housekeeping checklist management
  - Maintenance scheduling
  - Night Audit configuration

---

### **6. 👥 Staff & Access** (`staff`)
- **ID**: `staff`
- **Icon**: 👥
- **Description**: Users, roles, and permissions
- **Color**: indigo
- **Subsections**:
  - `users` - Users (👤)
  - `roles` - Roles (🔐)
  - `departments` - Departments (🏢)
- **Component**: `StaffSettings` (Placeholder)
- **Status**: To be implemented
- **Future Features**:
  - User management
  - Role configuration
  - Department management
  - Permission settings

---

### **7. 🖥️ System** (`system`)
- **ID**: `system`
- **Icon**: 🖥️
- **Description**: System configuration and logs
- **Color**: gray
- **Subsections**:
  - `general` - General (⚙️)
  - `logs` - Activity Logs (📋)
  - `backup` - Backup (💾)
  - `integrations` - Integrations (🔌)
- **Component**: `SystemSettings` (Placeholder)
- **Status**: To be implemented
- **Future Features**:
  - General system settings
  - Activity logs viewer
  - Backup/restore functionality
  - Third-party integrations

---

## 🎯 Navigation Structure

### **Sidebar Navigation**

```
Categories
├── 🏠 Dashboard
├── 🏨 Hotel Configuration
│   ├── 📋 Hotel Information
│   ├── 🏢 Floors & Layout
│   └── 🏊 Facilities
├── 🛏️ Rooms & Inventory
│   ├── 🚪 All Rooms
│   ├── 🏷️ Room Categories
│   └── 🛁 Amenities
├── 💰 Pricing & Charges
│   ├── 💵 Room Rates
│   ├── ➕ Extra Services
│   ├── 📦 Packages
│   ├── 📊 Taxes & Fees
│   └── ⚡ Quick Charges
├── ⚙️ Operations
│   ├── 🧹 Housekeeping
│   ├── 🔧 Maintenance
│   └── 🌙 Night Audit
├── 👥 Staff & Access
│   ├── 👤 Users
│   ├── 🔐 Roles
│   └── 🏢 Departments
└── 🖥️ System
    ├── ⚙️ General
    ├── 📋 Activity Logs
    ├── 💾 Backup
    └── 🔌 Integrations
```

---

## 🔍 Search Functionality

### **Search Scope:**
- Section Titles
- Section Descriptions
- Subsection Labels

### **Search Behavior:**
- Real-time filtering
- Case-insensitive
- Hides Recently Used when searching
- Highlights matching sections

---

## ⏱️ Recently Used Tracking

### **How It Works:**
1. User clicks on a section or subsection
2. `trackUsage()` function is called
3. Section ID is added to `recentlyUsed` array
4. Duplicates are removed
5. Limited to 5 unique items
6. Saved to `localStorage` as `recentSettings`

### **Display Logic:**
- Shows unique sections only (no duplicates)
- If subsection is used, shows parent section
- Maximum 5 items displayed
- Hidden when search is active

### **Storage:**
- **Key**: `recentSettings`
- **Format**: `string[]` (array of section IDs)
- **Example**: `["hotel", "pricing", "dashboard"]`

---

## 📊 Component Hierarchy

```
SettingsHub (Main Component)
│
├── Header
│   ├── Title & Description
│   └── Search Bar
│
├── Recently Used Section
│   └── Quick Access Buttons (max 5 unique)
│
├── Main Content Area
│   ├── Left Sidebar (Navigation)
│   │   └── Categories List with Subsections
│   │
│   └── Right Content Area
│       │
│       ├── SettingsDashboard (when activeSection === 'dashboard')
│       │   ├── StatCard (x4): Rooms, Staff, Rates, Checklist
│       │   └── QuickActionCard (x6): Links to other sections
│       │
│       ├── HotelSettings (when activeSection === 'hotel')
│       │   ├── Header with "Add New" button
│       │   ├── Tabs Navigation (8 tabs)
│       │   ├── HotelInfoTab
│       │   │   └── Form fields (Name, Company, Tax ID, Bank, etc.)
│       │   ├── RoomsTab
│       │   │   ├── Search & Filters
│       │   │   ├── Rooms Grid
│       │   │   │   └── RoomCard (per room)
│       │   │   └── Add Room Button
│       │   ├── RoomTypesTab
│       │   │   └── Room Type Cards (Standard, Deluxe, Suite)
│       │   ├── FloorsTab
│       │   │   └── Floor Grid with Add/Remove
│       │   ├── StaffTab
│       │   │   ├── Search & Filter
│       │   │   └── Staff Grid
│       │   ├── ChecklistTab
│       │   │   └── Category-based Task Lists
│       │   ├── PricingTab
│       │   │   └── Room Type Pricing Cards with Bulk Actions
│       │   ├── LogsTab
│       │   │   ├── Date Filter
│       │   │   └── Logs Table
│       │   └── AddEditModal (shared for Rooms, Staff, Checklist)
│       │
│       ├── PricingSettings (when activeSection === 'pricing')
│       │   ├── Header with Import/Export/Add buttons
│       │   ├── Sub-tabs Navigation (5 tabs)
│       │   ├── RoomRatesManager
│       │   │   ├── Rate Cards (Standard, Deluxe, Suite)
│       │   │   │   └── RateInput (Weekday, Weekend, Holiday)
│       │   │   └── Bulk Actions
│       │   ├── ExtraServicesManager
│       │   ├── PackagesManager
│       │   ├── TaxesManager
│       │   └── QuickChargesManager
│       │
│       ├── RoomsSettings (when activeSection === 'rooms')
│       │   └── Placeholder: "Rooms settings component will be integrated here"
│       │
│       ├── OperationsSettings (when activeSection === 'operations')
│       │   └── Placeholder: "Operations settings component will be integrated here"
│       │
│       ├── StaffSettings (when activeSection === 'staff')
│       │   └── Placeholder: "Staff settings component will be integrated here"
│       │
│       └── SystemSettings (when activeSection === 'system')
│           └── Placeholder: "System settings component will be integrated here"
│
└── QuickSettingsMenu (Floating Button)
    └── Quick Access Menu
```

---

## 🎨 UI Components

### **Header**
- Sticky position (top of page)
- Title and description
- Search bar (right-aligned)
- Responsive design

### **Recently Used Section**
- Conditional display (only when not searching)
- Horizontal button layout
- Icon + Title format
- Hover effects

### **Sidebar Navigation**
- Sticky position (when scrolling)
- Category list with icons
- Expandable subsections
- Active state highlighting
- Responsive (hidden on mobile, shown on desktop)

### **Content Area**
- Dynamic content based on active section
- Smooth transitions
- Full-width on mobile
- 9-column width on desktop (when sidebar visible)

---

## 🔄 State Management

### **State Variables:**
```typescript
const [activeSection, setActiveSection] = useState('dashboard')
const [searchTerm, setSearchTerm] = useState('')
const [recentlyUsed, setRecentlyUsed] = useState<string[]>([])
```

### **State Flow:**
1. **Initial Load**: Loads `recentSettings` from localStorage
2. **Section Change**: Updates `activeSection`, tracks usage
3. **Search**: Filters sections, hides Recently Used
4. **Usage Tracking**: Updates `recentlyUsed`, saves to localStorage

---

## 📱 Responsive Design

### **Desktop (lg and above):**
- Sidebar: 3 columns
- Content: 9 columns
- Full navigation visible

### **Mobile/Tablet:**
- Sidebar: Hidden or collapsed
- Content: Full width
- Hamburger menu for navigation

---

## 🔗 Integration Points

### **With Main App (`page.tsx`):**
- Tab ID: `settings-hub`
- Accessible via Quick Menu
- Accessible via Mobile Menu
- Tab label: "⚙️ Settings Hub"

### **With Other Components:**
- **HotelSettings**: Full integration
- **PricingSettings**: Full integration
- **ChargesSettings**: Separate component (not in Hub)
- **SettingsModal**: Legacy component (still available)

---

## 📦 Data Storage

### **localStorage Keys:**
- `recentSettings` - Recently used section IDs
- `hotelInfo` - Hotel information
- `hotelRooms` - Room data (via API)
- `roomTypes` - Room type configurations
- `hotelFloors` - Floor list
- `hotelStaff` - Staff members
- `housekeepingChecklist` - Checklist items
- `roomRates` - Room rate configurations
- `taxSettings` - Tax rates
- `quickButtons` - Quick charge buttons

---

## 🚀 Usage Flow

### **User Journey:**
```
1. User opens Dashboard
2. Clicks "⚡ სწრაფი მენიუ"
3. Selects "⚙️ Settings Hub"
4. Settings Hub opens with Dashboard view
5. User clicks "🏨 Hotel Configuration" in sidebar
6. HotelSettings component loads
7. User navigates through tabs
8. Actions are tracked in Recently Used
```

---

## 🎯 Key Features

### **1. Unified Interface**
- All settings in one place
- Consistent navigation
- Easy access

### **2. Smart Search**
- Real-time filtering
- Searches all sections and subsections
- Hides Recently Used during search

### **3. Recently Used Tracking**
- Automatic tracking
- Unique items only
- Quick access to frequently used settings

### **4. Expandable Navigation**
- Main sections always visible
- Subsections expand on click
- Clear hierarchy

### **5. Responsive Design**
- Works on all screen sizes
- Mobile-friendly
- Touch-optimized

---

## 📝 Component Status

| Component | Status | Integration |
|-----------|--------|-------------|
| SettingsHub | ✅ Complete | ✅ Integrated |
| SettingsDashboard | ✅ Complete | ✅ Integrated |
| HotelSettings | ✅ Complete | ✅ Integrated |
| PricingSettings | ✅ Complete | ✅ Integrated |
| RoomsSettings | ⏳ Placeholder | ⏳ Pending |
| OperationsSettings | ⏳ Placeholder | ⏳ Pending |
| StaffSettings | ⏳ Placeholder | ⏳ Pending |
| SystemSettings | ⏳ Placeholder | ⏳ Pending |

---

## 🔧 Future Enhancements

### **Planned Features:**
1. **Keyboard Navigation**
   - Arrow keys for navigation
   - Enter to select
   - Escape to close

2. **Breadcrumbs**
   - Show current location
   - Quick navigation path

3. **Favorites/Pinned**
   - Pin frequently used sections
   - Custom quick access

4. **Settings Presets**
   - Save configuration presets
   - Quick apply settings

5. **Export/Import**
   - Export all settings
   - Import from backup
   - Settings templates

6. **Advanced Search**
   - Filter by category
   - Search in settings values
   - Recent searches

---

## 📌 Important Notes

### **Architecture:**
- Settings Hub არის **Full Page Component** (არა Modal)
- Legacy `SettingsModal` კვლავ ხელმისაწვდომია Header-ის "⚙️ პარამეტრები" ღილაკიდან
- `ChargesSettings` არის დამოუკიდებელი კომპონენტი (არა Hub-ის ნაწილი)

### **Navigation vs Content:**
- **Subsections** (Sidebar-ში) ამჟამად მხოლოდ **visual navigation**-ისთვისაა
- **Actual Content** განისაზღვრება **Main Section Component**-ით
- **HotelSettings** აქვს **8 internal tabs** (არა subsections)
- **PricingSettings** აქვს **5 internal tabs** (არა subsections)

### **Current Behavior:**
- Clicking on a **Main Section** (e.g., "Hotel Configuration") → Opens that section's component
- Clicking on a **Subsection** (e.g., "Hotel Information") → Currently just tracks usage, doesn't navigate to specific tab
- **Future Enhancement**: Subsections could navigate to specific tabs within components

### **Real UI Structure (from Screenshots):**

#### **Left Sidebar:**
- **Fixed width** (3 columns on desktop)
- **Categories** header
- **Active section** highlighted in light blue background
- **Subsections** appear indented when parent is active
- **Icons** displayed next to each item

#### **Right Content Area:**
- **9 columns** width on desktop (when sidebar visible)
- **Full width** on mobile
- **Component-specific headers** with icons
- **Placeholder text** for unimplemented sections:
  - "Rooms settings component will be integrated here"
  - "Operations settings component will be integrated here"
  - "Staff settings component will be integrated here"
  - "System settings component will be integrated here"

#### **HotelSettings Component:**
- **8 tabs** in horizontal scrollable row:
  1. 🏨 Hotel Info
  2. 🛏️ Rooms
  3. 🏷️ Room Types
  4. 🏢 Floors
  5. 👥 Staff
  6. 🧹 Housekeeping
  7. 💰 Pricing
  8. 📋 Activity Logs
- **Active tab** underlined in blue
- **Tab content** displayed below tabs

#### **PricingSettings Component:**
- **5 tabs** in horizontal row:
  1. 💵 Room Rates
  2. ➕ Extra Services
  3. 📦 Packages
  4. 📊 Taxes
  5. ⚡ Quick Charges
- **Header actions**: Import, Export, + Add Item buttons
- **Room Rates tab** shows visual cards for Standard, Deluxe, Suite
- **Bulk Actions** section below rate cards

### **Data Flow:**
- **Sidebar Navigation** → Sets `activeSection` state
- **activeSection** → Renders corresponding component
- **Component Internal Tabs** → Managed by component's own state

---

## 🎨 Color Scheme

| Section | Color | Usage |
|---------|-------|-------|
| Dashboard | blue | Primary actions |
| Hotel | purple | Configuration |
| Rooms | green | Inventory |
| Pricing | yellow | Financial |
| Operations | red | Daily ops |
| Staff | indigo | Access control |
| System | gray | System settings |

---

## 📞 Access Methods

1. **Quick Menu** → ⚙️ Settings Hub
2. **Mobile Menu** → ⚙️ Settings Hub
3. **Direct Tab** (if already open)
4. **Floating Button** → View All Settings → Settings Hub

---

## ✅ Checklist

- [x] Settings Hub component created
- [x] Navigation sidebar implemented
- [x] Search functionality
- [x] Recently Used tracking
- [x] HotelSettings integration
- [x] PricingSettings integration
- [x] Responsive design
- [x] localStorage persistence
- [ ] RoomsSettings implementation
- [ ] OperationsSettings implementation
- [ ] StaffSettings implementation
- [ ] SystemSettings implementation

