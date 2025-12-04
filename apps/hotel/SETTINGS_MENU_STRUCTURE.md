# Settings მენიუს სტრუქტურა

## 📋 მთავარი Settings კომპონენტები

### 1. **SettingsModal** (`components/SettingsModal.tsx`)
მთავარი Settings Modal კომპონენტი, რომელიც იხსნება Header-ის "⚙️ პარამეტრები" ღილაკიდან.

#### **Tabs სტრუქტურა:**
```typescript
const tabs = [
  { id: 'info', label: 'სასტუმროს ინფორმაცია', icon: '🏨' },
  { id: 'rooms', label: 'ოთახების მართვა', icon: '🛏️' },
  { id: 'roomTypes', label: 'ოთახის ტიპები', icon: '🏷️' },
  { id: 'floors', label: 'სართულები', icon: '🏢' },
  { id: 'staff', label: 'თანამშრომლები', icon: '👥' },
  { id: 'checklist', label: 'Checklist', icon: '✅' },
  { id: 'pricing', label: 'ფასები', icon: '💰' },
  { id: 'logs', label: 'ლოგები', icon: '📋' }
]
```

#### **Tab-ების დეტალური აღწერა:**

##### 🏨 **1. სასტუმროს ინფორმაცია** (`info`)
- **ფუნქციები:**
  - სასტუმროს დასახელება
  - კომპანიის დასახელება
  - საიდენტიფიკაციო კოდი (Tax ID)
  - ბანკის დასახელება
  - ანგარიშის ნომერი
  - მისამართი
  - ტელეფონი
  - ელ-ფოსტა
  - სასტუმროს ლოგო URL
- **Storage:** `localStorage.getItem('hotelInfo')`
- **Save Function:** `saveHotelInfo()`

##### 🛏️ **2. ოთახების მართვა** (`rooms`)
- **ფუნქციები:**
  - ოთახების სია (Table View)
  - ახალი ოთახის დამატება
  - ოთახის რედაქტირება
  - ოთახის წაშლა (validation: არ შეიძლება წაშლა თუ აქვს active reservations)
- **API Endpoints:**
  - `POST /api/hotel/rooms` - ახალი ოთახის დამატება
  - `PUT /api/hotel/rooms/:id` - ოთახის განახლება
  - `DELETE /api/hotel/rooms/:id` - ოთახის წაშლა
- **Validation:** `canDeleteRoom()` - ამოწმებს active reservations-ს

##### 🏷️ **3. ოთახის ტიპები** (`roomTypes`)
- **Component:** `RoomTypeManager`
- **ფუნქციები:**
  - ოთახის ტიპების მართვა
  - ტიპის დამატება/რედაქტირება/წაშლა
  - Base Price დაყენება
- **Storage:** `localStorage.getItem('roomTypes')`
- **Default Types:**
  - Standard (₾150)
  - Deluxe (₾180)
  - Suite (₾250)

##### 🏢 **4. სართულები** (`floors`)
- **Component:** `FloorManager`
- **ფუნქციები:**
  - სართულების სია
  - ახალი სართულის დამატება
  - სართულის წაშლა
- **Storage:** `localStorage.getItem('hotelFloors')`
- **Default:** [1, 2, 3]

##### 👥 **5. თანამშრომლები** (`staff`)
- **Component:** `StaffManager`
- **ფუნქციები:**
  - თანამშრომლების მართვა
  - დამატება/რედაქტირება/წაშლა
  - როლების მართვა
- **Storage:** `localStorage.getItem('hotelStaff')`

##### ✅ **6. Checklist** (`checklist`)
- **Component:** `ChecklistManager`
- **ფუნქციები:**
  - Housekeeping Checklist-ის მართვა
  - Task-ების დამატება/რედაქტირება/წაშლა
- **Storage:** `localStorage.getItem('housekeepingChecklist')`

##### 💰 **7. ფასები** (`pricing`)
- **ფუნქციები:**
  - Room Type-ების ფასების დაყენება
  - Standard, Deluxe, Suite ფასები
- **UI:** Card-based layout with price inputs

##### 📋 **8. ლოგები** (`logs`)
- **ფუნქციები:**
  - სისტემის აქტივობის ისტორია
  - თარიღით ფილტრაცია
  - ლოგების გასუფთავება
- **Component:** `ActivityLogger.getLogs()`
- **Features:**
  - User, Role, Action, Timestamp
  - Details JSON display
  - Date filtering
  - Clear logs functionality

---

### 2. **ChargesSettings** (`components/ChargesSettings.tsx`)
დამოუკიდებელი Settings კომპონენტი, რომელიც იხსნება Main Navigation-ის "⚙️ Charges Settings" ღილაკიდან.

#### **Tabs სტრუქტურა:**
```typescript
const tabs = ['items', 'categories', 'taxes', 'quick']
```

#### **Tab-ების დეტალური აღწერა:**

##### 📦 **1. Items & Prices** (`items`)
- **ფუნქციები:**
  - Charge Items-ის მართვა
  - Search & Filter (Category, Status)
  - Item Cards Display
  - Add/Edit/Delete Items
- **Item Properties:**
  - Name, Code
  - Category
  - Unit Price
  - Unit (piece, hour, day, km, person, service)
  - Department
  - Stock Tracking (optional)
  - Active/Inactive Status
- **Storage:** `localStorage.getItem('chargeItems')`
- **Service:** `ExtraChargesService.ITEMS`

##### 📂 **2. Categories** (`categories`)
- **ფუნქციები:**
  - Category Cards Display
  - Category Statistics (Item Count)
  - Department, Tax Rate, Service Charge Rate
- **Storage:** `localStorage.getItem('chargeCategories')`
- **Service:** `ExtraChargesService.CATEGORIES`

##### 💰 **3. Taxes & Fees** (`taxes`)
- **ფუნქციები:**
  - Tax Rates Configuration
    - VAT (default: 18%)
    - City Tax (default: 3%)
    - Tourism Tax (default: 1%)
    - Service Charge (default: 10%)
- **Storage:** `localStorage.getItem('taxSettings')`
- **Save Function:** `saveTaxes()`

##### ⚡ **4. Quick Buttons** (`quick`)
- **ფუნქციები:**
  - Quick Charge Buttons Configuration
  - Add/Remove Quick Buttons
  - Position Management
- **Storage:** `localStorage.getItem('quickButtons')`
- **Default Buttons:**
  - MB-WATER (💧)
  - MB-COLA (🥤)
  - MB-BEER (🍺)
  - FB-BREAKFAST (☕)
  - LDRY-SHIRT (👔)
  - TRANS-TAXI (🚕)

---

## 🔗 Navigation Integration

### **Main Navigation Menu** (`app/page.tsx`)

#### **Quick Menu Dropdown:**
```typescript
// Header-ში Quick Menu ღილაკი
<button onClick={() => setShowQuickMenu(!showQuickMenu)}>
  ⚡ სწრაფი მენიუ
</button>

// Dropdown Menu Items:
- 💰 Financial Dashboard → activeTab: 'financial'
- ⚙️ Charges Settings → activeTab: 'charges-settings'
- 🌙 Night Audit → activeTab: 'nightaudit' (if canCloseDay)
```

#### **Mobile Menu:**
```typescript
// Mobile Menu Items:
- 💰 სალარო → activeTab: 'cashier'
- 💰 Financial Dashboard → activeTab: 'financial'
- ⚙️ Charges Settings → activeTab: 'charges-settings'
- 🌙 დღის დახურვა → activeTab: 'nightaudit' (if canCloseDay)
```

#### **Settings Button (Header):**
```typescript
// Header-ში Settings ღილაკი (მხოლოდ Admin/Manager-ებისთვის)
{canEdit && (
  <button onClick={() => setShowSettingsModal(true)}>
    ⚙️ პარამეტრები
  </button>
)}

// Opens: SettingsModal
```

---

## 📊 Settings Data Storage

### **localStorage Keys:**

#### **SettingsModal:**
- `hotelInfo` - სასტუმროს ინფორმაცია
- `hotelFloors` - სართულების სია
- `roomTypes` - ოთახის ტიპები
- `hotelStaff` - თანამშრომლები
- `housekeepingChecklist` - Checklist items

#### **ChargesSettings:**
- `chargeItems` - Charge Items
- `chargeCategories` - Categories
- `taxSettings` - Tax Rates
- `quickButtons` - Quick Button Configuration

#### **Activity Logs:**
- `activityLogs` - სისტემის აქტივობის ისტორია (ActivityLogger)

---

## 🎯 Access Control

### **SettingsModal:**
- **Access:** `canEdit` permission (Admin/Manager roles)
- **Location:** Header → ⚙️ პარამეტრები

### **ChargesSettings:**
- **Access:** All users (no restriction)
- **Location:** Quick Menu → ⚙️ Charges Settings

---

## 🔄 Component Dependencies

### **SettingsModal Dependencies:**
- `FloorManager` - სართულების მართვა
- `RoomTypeManager` - ოთახის ტიპების მართვა
- `StaffManager` - თანამშრომლების მართვა
- `ChecklistManager` - Checklist მართვა
- `ActivityLogger` - Activity logging

### **ChargesSettings Dependencies:**
- `ExtraChargesService` - Extra charges service
- `localStorage` - Data persistence

---

## 📝 Usage Examples

### **Opening SettingsModal:**
```typescript
// In app/page.tsx
const [showSettingsModal, setShowSettingsModal] = useState(false)

{showSettingsModal && canEdit && (
  <SettingsModal 
    onClose={() => setShowSettingsModal(false)}
    rooms={rooms}
    onRoomsUpdate={loadRooms}
  />
)}
```

### **Opening ChargesSettings:**
```typescript
// In app/page.tsx
const addTabFromMenu = (tabId: string) => {
  if (tabId === 'charges-settings') {
    setActiveTab('charges-settings')
  }
}

{activeTab === 'charges-settings' && (
  <ChargesSettings />
)}
```

---

## 🎨 UI Structure

### **SettingsModal Layout:**
```
┌─────────────────────────────────────┐
│ Header: პარამეტრები          [×]    │
├─────────────────────────────────────┤
│ Tabs: [🏨] [🛏️] [🏷️] [🏢] [👥] ... │
├─────────────────────────────────────┤
│                                     │
│         Content Area                │
│    (Tab-specific content)           │
│                                     │
├─────────────────────────────────────┤
│ Footer: [დახურვა]                    │
└─────────────────────────────────────┘
```

### **ChargesSettings Layout:**
```
┌─────────────────────────────────────┐
│ Header: ⚙️ Charges Settings          │
│        [+ Add New Item]             │
├─────────────────────────────────────┤
│ Tabs: [📦] [📂] [💰] [⚡]            │
├─────────────────────────────────────┤
│                                     │
│         Content Area                │
│    (Tab-specific content)           │
│                                     │
└─────────────────────────────────────┘
```

---

## 🔧 Future Enhancements

### **Suggested Additional Settings:**
1. **User Management** - User roles and permissions
2. **System Settings** - General system configuration
3. **Integration Settings** - Third-party integrations
4. **Notification Settings** - Email/SMS notifications
5. **Backup & Restore** - Data backup configuration
6. **Reports Settings** - Report templates and schedules
7. **Payment Gateway Settings** - Payment method configuration
8. **Language Settings** - Multi-language support

---

## 📌 Notes

- SettingsModal არის Modal კომპონენტი (overlay)
- ChargesSettings არის Full Page კომპონენტი (tab content)
- ორივე კომპონენტი იყენებს localStorage-ს data persistence-ისთვის
- SettingsModal-ს აქვს Access Control (canEdit)
- ChargesSettings-ს არ აქვს Access Control (ყველასთვის ხელმისაწვდომი)



