# კალენდრის ფაზების ფერები

## 📍 ფაილების მდებარეობა

### 1. **BATCH_PHASE_CONFIG** (`/apps/brewery/src/constants/index.ts`)
განსაზღვრავს ფაზების ფერებს EventDetailModal-ისთვის და სხვა UI კომპონენტებისთვის.

### 2. **TimelineBar** (`/apps/brewery/src/components/calendar/TimelineBar.tsx`)
განსაზღვრავს calendar timeline-ზე ბლოკების ფერებს.

### 3. **ResourceTimeline** (`/apps/brewery/src/components/calendar/ResourceTimeline.tsx`)
განსაზღვრავს რესურსების სექციების ფერებს.

---

## 🎨 ფაზების ფერები

### **PLANNED (დაგეგმილი)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-slate-500`
  - `headerColor`: `bg-gradient-to-r from-slate-600 to-slate-700`
  - `textColor`: `text-slate-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-slate-500 to-slate-400`

### **BREWING (ხარშვა)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-amber-500`
  - `headerColor`: `bg-gradient-to-r from-amber-500 to-orange-600`
  - `textColor`: `text-amber-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-amber-500 to-yellow-500`
- **ResourceTimeline:**
  - Brewhouse section: `color="amber"`

### **FERMENTING (ფერმენტაცია)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-green-500`
  - `headerColor`: `bg-gradient-to-r from-green-500 to-emerald-600`
  - `textColor`: `text-green-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-copper to-amber-600`
- **ResourceTimeline:**
  - Fermentation section: `color="copper"`

### **CONDITIONING (კონდიციონირება)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-blue-500`
  - `headerColor`: `bg-gradient-to-r from-blue-500 to-cyan-600`
  - `textColor`: `text-blue-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-blue-600 to-blue-400`
- **ResourceTimeline:**
  - Conditioning section: `color="blue"`

### **READY (მზადაა)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-emerald-500`
  - `headerColor`: `bg-gradient-to-r from-emerald-500 to-green-600`
  - `textColor`: `text-emerald-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-green-500 to-emerald-400`

### **PACKAGING (დაფასოება)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-purple-500`
  - `headerColor`: `bg-gradient-to-r from-purple-500 to-violet-600`
  - `textColor`: `text-purple-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-green-600 to-green-400`

### **COMPLETED (დასრულებული)**
- **BATCH_PHASE_CONFIG:**
  - `color`: `bg-gray-500`
  - `headerColor`: `bg-gradient-to-r from-gray-500 to-gray-600`
  - `textColor`: `text-gray-400`
- **TimelineBar:**
  - `bg-gradient-to-r from-slate-500 to-slate-400 opacity-70`

---

## 🔀 შერევა (Blend) და გაყოფა (Split)

### **შერევა (Blend)**
- იყენებს იგივე ფერებს, როგორც ჩვეულებრივი ბაჩები
- Blend indicator: `🔄` (შეცვლილია `🔀`-დან)
- Badge: `bg-purple-500/20 text-purple-400` (BlendBadge component)

### **გაყოფა (Split)**
- Parent lot (დასრულებული): `bg-gradient-to-r from-slate-500 to-slate-400 opacity-60` (ისტორიული)
- Child lots (აქტიური): იყენებს ჩვეულებრივ ფაზის ფერებს
- `isParentHistory`: true → ნაცრისფერი (ისტორიული)
- `isHistorical`: true → ნაცრისფერი (დასრულებული)

---

## 📊 სპეციალური ფერები

### **ისტორიული ბლოკები (Historical)**
- `bg-gradient-to-r from-slate-500 to-slate-400 opacity-60`
- გამოიყენება:
  - დასრულებული ფერმენტაციისთვის (`isHistorical && type === 'fermentation'`)
  - Parent lot-ის ისტორიისთვის (`isParentHistory`)
  - დასრულებული non-fermentation events-ისთვის (`isHistorical && type !== 'fermentation'`)

### **CIP (Cleaning in Place)**
- `bg-gradient-to-r from-blue-500 to-cyan-400`
- Warning: `bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse` (cip_warning)

### **Maintenance (მომსახურება)**
- `bg-gradient-to-r from-red-600 to-red-400`

---

## 🎯 რესურსების სექციების ფერები

### **Brewhouse (ხარშვის ქვაბი)**
- `color="amber"` (ResourceSection component)

### **Fermentation (ფერმენტაცია)**
- `color="copper"` (ResourceSection component)

### **Conditioning (კონდიციონირება)**
- `color="blue"` (ResourceSection component)

---

## 📝 შენიშვნები

1. **TimelineBar** იყენებს `batchStatus`-ს პრიორიტეტად, თუ არსებობს
2. **ისტორიული ბლოკები** ყოველთვის ნაცრისფერია (opacity-60 ან opacity-70)
3. **Blend batches** იყენებენ იგივე ფერებს, როგორც ჩვეულებრივი ბაჩები
4. **Split batches** - parent lot-ები ნაცრისფერია, child lots-ები აქტიური ფერებით

---

## 🔧 ფაილების განახლება

თუ გინდა ფერების შეცვლა:

1. **EventDetailModal header-ისთვის:** `/apps/brewery/src/constants/index.ts` → `BATCH_PHASE_CONFIG`
2. **Timeline bar-ისთვის:** `/apps/brewery/src/components/calendar/TimelineBar.tsx` → `getBarColor()`
3. **Resource section-ებისთვის:** `/apps/brewery/src/components/calendar/ResourceTimeline.tsx` → `ResourceSection` color prop


