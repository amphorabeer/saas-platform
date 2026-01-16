// =====================================================
// BrewMaster PRO - ცენტრალიზებული მონაცემთა ფაილი
// ყველა მოდული იყენებს ერთ წყაროს
// =====================================================

// =====================================================
// TYPES
// =====================================================

export type BatchStatus = 'planned' | 'brewing' | 'fermenting' | 'conditioning' | 'ready' | 'packaged' | 'completed' | 'cancelled'
export type TankStatus = 'available' | 'in_use' | 'cleaning' | 'maintenance'
export type TankType = 'fermenter' | 'brite' | 'unitank' | 'kettle' | 'mash_tun' | 'hlt'
export type TankCapability = 'fermenting' | 'conditioning' | 'brewing' | 'storage'
export type IngredientCategory = 'malt' | 'hops' | 'yeast' | 'adjunct' | 'water_chemistry'
export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'
export type TestStatus = 'pending' | 'in_progress' | 'passed' | 'warning' | 'failed'
export type TimelineEventType = 'start' | 'mash' | 'boil' | 'transfer' | 'reading' | 'addition' | 'dry_hop' | 'note' | 'temperature' | 'complete'
export type IngredientType = 'grain' | 'hop' | 'yeast' | 'adjunct' | 'water_chemistry'

// =====================================================
// INTERFACES
// =====================================================

export interface Recipe {
  id: string
  name: string
  style: string
  abv: number
  ibu: number
  color: number // SRM
  og: number
  fg: number
  batchSize: number
  boilTime: number
  ingredients: RecipeIngredient[]
  steps: string[]
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface RecipeIngredient {
  ingredientId: string
  name: string
  category: IngredientCategory
  amount: number
  unit: string
  additionTime?: number // minutes
}

export interface Tank {
  id: string
  name: string
  type: TankType
  capacity: number // liters
  status: TankStatus
  currentBatchId?: string
  currentTemp?: number
  targetTemp?: number
  pressure?: number
  location: string
  capabilities?: TankCapability[] // ['fermenting', 'conditioning'] for unitank
}

export interface GravityReading {
  id: string
  date: Date
  gravity: number
  temperature: number
  notes?: string
  recordedBy: string
}

export interface TimelineEvent {
  id: string
  date: Date
  type: TimelineEventType
  title: string
  description: string
  user: string
  data?: Record<string, any>
}

export interface BatchIngredient {
  id: string
  name: string
  amount: number
  unit: string
  type: IngredientType
  additionTime?: number
  addedAt?: Date
  lotNumber?: string
}

export interface Batch {
  id: string
  batchNumber: string
  recipeId: string
  recipeName: string
  style: string
  status: BatchStatus
  tankId?: string
  tankName?: string
  volume: number
  og: number
  currentGravity?: number
  targetFg: number
  temperature?: number
  progress: number
  startDate: Date
  estimatedEndDate?: Date
  actualEndDate?: Date
  brewerId: string
  brewerName: string
  notes?: string
  gravityReadings: GravityReading[]
  timeline: TimelineEvent[]
  ingredients: BatchIngredient[]
}

export interface Ingredient {
  id: string
  name: string
  category: IngredientCategory
  supplier: string
  quantity: number
  unit: string
  minQuantity: number
  costPerUnit: number
  lotNumber?: string
  expiryDate?: Date
  location: string
}

export interface Customer {
  id: string
  name: string
  type: 'bar' | 'restaurant' | 'shop' | 'distributor' | 'other'
  contactPerson: string
  email: string
  phone: string
  address: string
  city: string
  balance: number
  totalOrders: number
  lastOrderDate?: Date
  notes?: string
}

export interface Order {
  id: string
  orderNumber: string
  customerId: string
  customerName: string
  status: OrderStatus
  items: OrderItem[]
  subtotal: number
  discount: number
  total: number
  paymentStatus: PaymentStatus
  paidAmount: number
  orderDate: Date
  deliveryDate?: Date
  deliveredDate?: Date
  notes?: string
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productType: 'keg' | 'bottle' | 'can'
  quantity: number
  unitPrice: number
  total: number
}

export interface Product {
  id: string
  name: string
  recipeId: string
  batchId?: string
  type: 'keg' | 'bottle' | 'can'
  size: number // liters for keg, ml for bottle/can
  quantity: number
  price: number
  available: boolean
}

export interface Keg {
  id: string
  serialNumber: string
  size: number // liters
  status: 'available' | 'filled' | 'at_customer' | 'needs_cleaning' | 'damaged'
  currentProductId?: string
  currentProductName?: string
  customerId?: string
  customerName?: string
  filledDate?: Date
  sentDate?: Date
  returnDate?: Date
}

export interface Staff {
  id: string
  name: string
  role: string
  email: string
  phone: string
}

// =====================================================
// STAFF DATA
// =====================================================

export const staff: Staff[] = [
  { id: '1', name: 'ნიკა ზედგინიძე', role: 'მთავარი ტექნოლოგი', email: 'nika@brewmaster.ge', phone: '+995 555 123 456' },
  { id: '2', name: 'გიორგი კაპანაძე', role: 'QC მენეჯერი', email: 'giorgi@brewmaster.ge', phone: '+995 555 234 567' },
  { id: '3', name: 'მარიამ წერეთელი', role: 'ლაბორანტი', email: 'mariam@brewmaster.ge', phone: '+995 555 345 678' },
  { id: '4', name: 'დავით ხარაიშვილი', role: 'გაყიდვების მენეჯერი', email: 'davit@brewmaster.ge', phone: '+995 555 456 789' },
  { id: '5', name: 'ანა ბერიძე', role: 'ფინანსისტი', email: 'ana@brewmaster.ge', phone: '+995 555 567 890' },
]

// =====================================================
// RECIPES
// =====================================================

export const recipes: Recipe[] = [
  {
    id: '1',
    name: 'Georgian Amber Lager',
    style: 'Amber Lager',
    abv: 5.2,
    ibu: 25,
    color: 14,
    og: 1.052,
    fg: 1.012,
    batchSize: 2000,
    boilTime: 60,
    ingredients: [
      { ingredientId: '1', name: 'Pilsner Malt', category: 'malt', amount: 180, unit: 'kg' },
      { ingredientId: '2', name: 'Munich Malt', category: 'malt', amount: 40, unit: 'kg' },
      { ingredientId: '3', name: 'Crystal 60', category: 'malt', amount: 15, unit: 'kg' },
      { ingredientId: '7', name: 'Saaz', category: 'hops', amount: 1.2, unit: 'kg', additionTime: 60 },
      { ingredientId: '8', name: 'Hallertau', category: 'hops', amount: 0.8, unit: 'kg', additionTime: 15 },
      { ingredientId: '11', name: 'SafLager W-34/70', category: 'yeast', amount: 4, unit: 'pack' },
    ],
    steps: ['Mash at 64°C for 60 min', 'Mash out at 76°C', 'Boil 60 min', 'Ferment at 12°C for 14 days', 'Lager at 2°C for 21 days'],
    notes: 'ჩვენი ფლაგმანი ლაგერი',
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2024-06-20'),
  },
  {
    id: '2',
    name: 'Tbilisi IPA',
    style: 'American IPA',
    abv: 6.5,
    ibu: 65,
    color: 8,
    og: 1.065,
    fg: 1.014,
    batchSize: 2000,
    boilTime: 60,
    ingredients: [
      { ingredientId: '1', name: 'Pilsner Malt', category: 'malt', amount: 200, unit: 'kg' },
      { ingredientId: '4', name: 'Pale Ale Malt', category: 'malt', amount: 30, unit: 'kg' },
      { ingredientId: '9', name: 'Cascade', category: 'hops', amount: 1.5, unit: 'kg', additionTime: 60 },
      { ingredientId: '10', name: 'Citra', category: 'hops', amount: 2.0, unit: 'kg', additionTime: 0 },
      { ingredientId: '12', name: 'US-05', category: 'yeast', amount: 4, unit: 'pack' },
    ],
    steps: ['Mash at 66°C for 60 min', 'Boil 60 min', 'Dry hop day 5', 'Ferment at 18°C for 10 days'],
    createdAt: new Date('2023-03-10'),
    updatedAt: new Date('2024-08-15'),
  },
  {
    id: '3',
    name: 'Kolkheti Wheat',
    style: 'Hefeweizen',
    abv: 5.0,
    ibu: 15,
    color: 4,
    og: 1.048,
    fg: 1.010,
    batchSize: 1500,
    boilTime: 60,
    ingredients: [
      { ingredientId: '5', name: 'Wheat Malt', category: 'malt', amount: 80, unit: 'kg' },
      { ingredientId: '1', name: 'Pilsner Malt', category: 'malt', amount: 60, unit: 'kg' },
      { ingredientId: '8', name: 'Hallertau', category: 'hops', amount: 0.6, unit: 'kg', additionTime: 60 },
      { ingredientId: '13', name: 'WB-06', category: 'yeast', amount: 3, unit: 'pack' },
    ],
    steps: ['Mash at 65°C for 60 min', 'Boil 60 min', 'Ferment at 20°C for 7 days'],
    createdAt: new Date('2023-05-20'),
    updatedAt: new Date('2024-04-10'),
  },
  {
    id: '4',
    name: 'Svaneti Pilsner',
    style: 'Czech Pilsner',
    abv: 4.8,
    ibu: 35,
    color: 4,
    og: 1.046,
    fg: 1.010,
    batchSize: 2000,
    boilTime: 90,
    ingredients: [
      { ingredientId: '1', name: 'Pilsner Malt', category: 'malt', amount: 190, unit: 'kg' },
      { ingredientId: '7', name: 'Saaz', category: 'hops', amount: 2.0, unit: 'kg', additionTime: 60 },
      { ingredientId: '7', name: 'Saaz', category: 'hops', amount: 1.0, unit: 'kg', additionTime: 15 },
      { ingredientId: '11', name: 'SafLager W-34/70', category: 'yeast', amount: 4, unit: 'pack' },
    ],
    steps: ['Triple decoction mash', 'Boil 90 min', 'Ferment at 10°C for 21 days', 'Lager at 2°C for 28 days'],
    createdAt: new Date('2023-08-01'),
    updatedAt: new Date('2024-09-05'),
  },
  {
    id: '5',
    name: 'Caucasus Stout',
    style: 'Dry Stout',
    abv: 4.5,
    ibu: 40,
    color: 35,
    og: 1.044,
    fg: 1.012,
    batchSize: 1500,
    boilTime: 60,
    ingredients: [
      { ingredientId: '1', name: 'Pilsner Malt', category: 'malt', amount: 80, unit: 'kg' },
      { ingredientId: '6', name: 'Roasted Barley', category: 'malt', amount: 15, unit: 'kg' },
      { ingredientId: '3', name: 'Crystal 60', category: 'malt', amount: 10, unit: 'kg' },
      { ingredientId: '8', name: 'Hallertau', category: 'hops', amount: 1.2, unit: 'kg', additionTime: 60 },
      { ingredientId: '12', name: 'US-05', category: 'yeast', amount: 3, unit: 'pack' },
    ],
    steps: ['Mash at 68°C for 60 min', 'Boil 60 min', 'Ferment at 18°C for 10 days'],
    createdAt: new Date('2023-10-15'),
    updatedAt: new Date('2024-07-20'),
  },
]

// =====================================================
// TANKS
// =====================================================

export const tanks: Tank[] = [
  { id: '1', name: 'FV-01', type: 'fermenter', capacity: 2000, status: 'in_use', currentBatchId: '1', currentTemp: 18.5, targetTemp: 18, location: 'საფერმენტაციო დარბაზი', capabilities: ['fermenting'] },
  { id: '2', name: 'FV-02', type: 'fermenter', capacity: 2000, status: 'in_use', currentBatchId: '2', currentTemp: 12, targetTemp: 12, location: 'საფერმენტაციო დარბაზი', capabilities: ['fermenting'] },
  { id: '3', name: 'FV-03 (Unitank)', type: 'unitank', capacity: 1500, status: 'available', location: 'საფერმენტაციო დარბაზი', capabilities: ['fermenting', 'conditioning'] },
  { id: '9', name: 'FV-04', type: 'fermenter', capacity: 2000, status: 'available', location: 'საფერმენტაციო დარბაზი', capabilities: ['fermenting'] },
  { id: '10', name: 'FV-05', type: 'fermenter', capacity: 1500, status: 'available', location: 'საფერმენტაციო დარბაზი', capabilities: ['fermenting'] },
  { id: '4', name: 'BBT-01', type: 'brite', capacity: 2000, status: 'in_use', currentBatchId: '3', currentTemp: 4, targetTemp: 4, location: 'საფერმენტაციო დარბაზი', capabilities: ['conditioning'] },
  { id: '5', name: 'BBT-02', type: 'brite', capacity: 1000, status: 'in_use', currentBatchId: '4', currentTemp: 2, targetTemp: 2, location: 'საფერმენტაციო დარბაზი', capabilities: ['conditioning'] },
  { id: '11', name: 'BBT-03', type: 'brite', capacity: 2000, status: 'available', location: 'საფერმენტაციო დარბაზი', capabilities: ['conditioning'] },
  { id: '12', name: 'BBT-04', type: 'brite', capacity: 1500, status: 'available', location: 'საფერმენტაციო დარბაზი', capabilities: ['conditioning'] },
  { id: '6', name: 'Kettle', type: 'kettle', capacity: 500, status: 'available', location: 'სახარში დარბაზი', capabilities: ['brewing'] },
  { id: '7', name: 'Mash Tun', type: 'mash_tun', capacity: 500, status: 'available', location: 'სახარში დარბაზი', capabilities: ['brewing'] },
  { id: '8', name: 'HLT', type: 'hlt', capacity: 800, status: 'available', currentTemp: 78, location: 'სახარში დარბაზი', capabilities: ['brewing'] },
]

// =====================================================
// BATCHES
// =====================================================

export const batches: Batch[] = [
  {
    id: '1',
    batchNumber: 'BRW-2025-0156',
    recipeId: '1',
    recipeName: 'Georgian Amber Lager',
    style: 'Amber Lager',
    status: 'fermenting',
    tankId: '1',
    tankName: 'FV-01',
    volume: 1850,
    og: 1.052,
    currentGravity: 1.024,
    targetFg: 1.012,
    temperature: 18.5,
    progress: 65,
    startDate: new Date('2025-12-08'),
    estimatedEndDate: new Date('2025-12-22'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    notes: 'Dry hop დღე 10-ზე',
    gravityReadings: [
      { id: 'gr1-1', date: new Date('2025-12-08T10:00'), gravity: 1.052, temperature: 18.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Initial OG' },
      { id: 'gr1-2', date: new Date('2025-12-10T14:30'), gravity: 1.038, temperature: 18.5, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr1-3', date: new Date('2025-12-12T09:15'), gravity: 1.024, temperature: 18.5, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr1-4', date: new Date('2025-12-12T16:00'), gravity: 1.024, temperature: 18.5, recordedBy: 'ნიკა ზედგინიძე', notes: 'Stable gravity' },
    ],
    timeline: [
      { id: 'tl1-1', date: new Date('2025-12-08T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'პარტია BRW-2025-0156 დაიწყო', user: 'ნიკა ზედგინიძე' },
      { id: 'tl1-2', date: new Date('2025-12-08T09:30'), type: 'mash', title: 'Mash-in დასრულდა', description: 'Mash temperature: 65°C', user: 'ნიკა ზედგინიძე' },
      { id: 'tl1-3', date: new Date('2025-12-08T12:00'), type: 'boil', title: 'Boil დაიწყო', description: 'Boil time: 60 minutes', user: 'ნიკა ზედგინიძე' },
      { id: 'tl1-4', date: new Date('2025-12-08T10:00'), type: 'reading', title: 'Initial OG', description: 'OG: 1.052', user: 'ნიკა ზედგინიძე' },
      { id: 'tl1-5', date: new Date('2025-12-08T13:00'), type: 'transfer', title: 'Transfer to FV-01', description: 'Transferred to fermentation tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl1-6', date: new Date('2025-12-10T14:30'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.038', user: 'ნიკა ზედგინიძე' },
      { id: 'tl1-7', date: new Date('2025-12-12T09:15'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.024', user: 'ნიკა ზედგინიძე' },
    ],
    ingredients: [
      { id: 'bi1-1', name: 'Pilsner Malt', amount: 85, unit: 'kg', type: 'grain', addedAt: new Date('2025-12-08T08:00') },
      { id: 'bi1-2', name: 'Munich Malt', amount: 24, unit: 'kg', type: 'grain', addedAt: new Date('2025-12-08T08:00') },
      { id: 'bi1-3', name: 'Crystal 60', amount: 12, unit: 'kg', type: 'grain', addedAt: new Date('2025-12-08T08:00') },
      { id: 'bi1-4', name: 'Saaz', amount: 1.2, unit: 'kg', type: 'hop', additionTime: 60, addedAt: new Date('2025-12-08T12:00') },
      { id: 'bi1-5', name: 'SafLager W-34/70', amount: 6, unit: 'პაკეტი', type: 'yeast', addedAt: new Date('2025-12-08T13:00') },
    ],
  },
  {
    id: '2',
    batchNumber: 'BRW-2025-0155',
    recipeId: '2',
    recipeName: 'Tbilisi IPA',
    style: 'American IPA',
    status: 'fermenting',
    tankId: '2',
    tankName: 'FV-02',
    volume: 2000,
    og: 1.065,
    currentGravity: 1.018,
    targetFg: 1.014,
    temperature: 12,
    progress: 90,
    startDate: new Date('2025-12-03'),
    estimatedEndDate: new Date('2025-12-17'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    gravityReadings: [
      { id: 'gr2-1', date: new Date('2025-12-03T10:00'), gravity: 1.065, temperature: 12.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Initial OG' },
      { id: 'gr2-2', date: new Date('2025-12-05T14:00'), gravity: 1.042, temperature: 12.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr2-3', date: new Date('2025-12-08T10:00'), gravity: 1.025, temperature: 12.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr2-4', date: new Date('2025-12-10T14:00'), gravity: 1.018, temperature: 12.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr2-5', date: new Date('2025-12-12T10:00'), gravity: 1.018, temperature: 12.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Stable gravity' },
    ],
    timeline: [
      { id: 'tl2-1', date: new Date('2025-12-03T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'პარტია BRW-2025-0155 დაიწყო', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-2', date: new Date('2025-12-03T09:00'), type: 'mash', title: 'Mash-in', description: 'Mash temperature: 68°C', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-3', date: new Date('2025-12-03T11:30'), type: 'boil', title: 'Boil დაიწყო', description: 'Boil time: 75 minutes', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-4', date: new Date('2025-12-03T10:00'), type: 'reading', title: 'Initial OG', description: 'OG: 1.065', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-5', date: new Date('2025-12-03T12:00'), type: 'addition', title: 'Hop addition', description: 'Cascade added at 60 min', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-6', date: new Date('2025-12-03T12:45'), type: 'addition', title: 'Hop addition', description: 'Citra added at 15 min', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-7', date: new Date('2025-12-03T13:00'), type: 'transfer', title: 'Transfer to FV-02', description: 'Transferred to fermentation tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-8', date: new Date('2025-12-05T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.042', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-9', date: new Date('2025-12-08T10:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.025', user: 'ნიკა ზედგინიძე' },
      { id: 'tl2-10', date: new Date('2025-12-10T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.018', user: 'ნიკა ზედგინიძე' },
    ],
    ingredients: [
      { id: 'bi2-1', name: 'Pale Ale Malt', amount: 95, unit: 'kg', type: 'grain', addedAt: new Date('2025-12-03T08:00') },
      { id: 'bi2-2', name: 'Crystal 60', amount: 8, unit: 'kg', type: 'grain', addedAt: new Date('2025-12-03T08:00') },
      { id: 'bi2-3', name: 'Cascade', amount: 2.0, unit: 'kg', type: 'hop', additionTime: 60, addedAt: new Date('2025-12-03T12:00') },
      { id: 'bi2-4', name: 'Citra', amount: 1.5, unit: 'kg', type: 'hop', additionTime: 15, addedAt: new Date('2025-12-03T12:45') },
      { id: 'bi2-5', name: 'US-05', amount: 8, unit: 'პაკეტი', type: 'yeast', addedAt: new Date('2025-12-03T13:00') },
    ],
  },
  {
    id: '3',
    batchNumber: 'BRW-2025-0154',
    recipeId: '3',
    recipeName: 'Kolkheti Wheat',
    style: 'Hefeweizen',
    status: 'conditioning',
    tankId: '4',
    tankName: 'BBT-01',
    volume: 1500,
    og: 1.048,
    currentGravity: 1.010,
    targetFg: 1.010,
    temperature: 4,
    progress: 70,
    startDate: new Date('2025-11-28'),
    estimatedEndDate: new Date('2025-12-12'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    gravityReadings: [
      { id: 'gr3-1', date: new Date('2025-11-28T10:00'), gravity: 1.048, temperature: 20.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Initial OG' },
      { id: 'gr3-2', date: new Date('2025-12-01T14:00'), gravity: 1.020, temperature: 20.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr3-3', date: new Date('2025-12-04T10:00'), gravity: 1.012, temperature: 20.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr3-4', date: new Date('2025-12-07T14:00'), gravity: 1.010, temperature: 4.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'FG reached, transferred to conditioning' },
    ],
    timeline: [
      { id: 'tl3-1', date: new Date('2025-11-28T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'პარტია BRW-2025-0154 დაიწყო', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-2', date: new Date('2025-11-28T09:00'), type: 'mash', title: 'Mash-in', description: 'Mash temperature: 66°C', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-3', date: new Date('2025-11-28T11:00'), type: 'boil', title: 'Boil დაიწყო', description: 'Boil time: 60 minutes', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-4', date: new Date('2025-11-28T10:00'), type: 'reading', title: 'Initial OG', description: 'OG: 1.048', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-5', date: new Date('2025-11-28T12:00'), type: 'transfer', title: 'Transfer to FV-03', description: 'Transferred to fermentation tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-6', date: new Date('2025-12-01T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.020', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-7', date: new Date('2025-12-04T10:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.012', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-8', date: new Date('2025-12-07T14:00'), type: 'reading', title: 'Final gravity', description: 'FG: 1.010', user: 'ნიკა ზედგინიძე' },
      { id: 'tl3-9', date: new Date('2025-12-07T15:00'), type: 'transfer', title: 'Transfer to BBT-01', description: 'Transferred to conditioning tank', user: 'ნიკა ზედგინიძე' },
    ],
    ingredients: [
      { id: 'bi3-1', name: 'Pilsner Malt', amount: 60, unit: 'kg', type: 'grain', addedAt: new Date('2025-11-28T08:00') },
      { id: 'bi3-2', name: 'Wheat Malt', amount: 40, unit: 'kg', type: 'grain', addedAt: new Date('2025-11-28T08:00') },
      { id: 'bi3-3', name: 'Hallertau', amount: 0.8, unit: 'kg', type: 'hop', additionTime: 60, addedAt: new Date('2025-11-28T11:00') },
      { id: 'bi3-4', name: 'WB-06', amount: 5, unit: 'პაკეტი', type: 'yeast', addedAt: new Date('2025-11-28T12:00') },
    ],
  },
  {
    id: '4',
    batchNumber: 'BRW-2025-0153',
    recipeId: '4',
    recipeName: 'Svaneti Pilsner',
    style: 'Czech Pilsner',
    status: 'ready',
    tankId: '5',
    tankName: 'BBT-02',
    volume: 950,
    og: 1.046,
    currentGravity: 1.010,
    targetFg: 1.010,
    temperature: 2,
    progress: 100,
    startDate: new Date('2025-11-15'),
    estimatedEndDate: new Date('2025-11-29'),
    actualEndDate: new Date('2025-11-29'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    gravityReadings: [
      { id: 'gr4-1', date: new Date('2025-11-15T10:00'), gravity: 1.046, temperature: 10.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Initial OG' },
      { id: 'gr4-2', date: new Date('2025-11-18T14:00'), gravity: 1.025, temperature: 10.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr4-3', date: new Date('2025-11-22T10:00'), gravity: 1.015, temperature: 10.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr4-4', date: new Date('2025-11-26T14:00'), gravity: 1.010, temperature: 2.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'FG reached' },
    ],
    timeline: [
      { id: 'tl4-1', date: new Date('2025-11-15T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'პარტია BRW-2025-0153 დაიწყო', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-2', date: new Date('2025-11-15T09:00'), type: 'mash', title: 'Mash-in', description: 'Mash temperature: 50°C', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-3', date: new Date('2025-11-15T10:00'), type: 'reading', title: 'Initial OG', description: 'OG: 1.046', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-4', date: new Date('2025-11-15T11:30'), type: 'boil', title: 'Boil დაიწყო', description: 'Boil time: 90 minutes', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-5', date: new Date('2025-11-15T13:00'), type: 'transfer', title: 'Transfer to FV-04', description: 'Transferred to fermentation tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-6', date: new Date('2025-11-18T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.025', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-7', date: new Date('2025-11-22T10:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.015', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-8', date: new Date('2025-11-26T14:00'), type: 'reading', title: 'Final gravity', description: 'FG: 1.010', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-9', date: new Date('2025-11-26T15:00'), type: 'transfer', title: 'Transfer to BBT-02', description: 'Transferred to conditioning tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl4-10', date: new Date('2025-11-29T10:00'), type: 'complete', title: 'პარტია მზადაა', description: 'Conditioning completed, ready for packaging', user: 'ნიკა ზედგინიძე' },
    ],
    ingredients: [
      { id: 'bi4-1', name: 'Pilsner Malt', amount: 50, unit: 'kg', type: 'grain', addedAt: new Date('2025-11-15T08:00') },
      { id: 'bi4-2', name: 'Saaz', amount: 1.0, unit: 'kg', type: 'hop', additionTime: 90, addedAt: new Date('2025-11-15T11:30') },
      { id: 'bi4-3', name: 'Saaz', amount: 0.5, unit: 'kg', type: 'hop', additionTime: 30, addedAt: new Date('2025-11-15T12:30') },
      { id: 'bi4-4', name: 'SafLager W-34/70', amount: 4, unit: 'პაკეტი', type: 'yeast', addedAt: new Date('2025-11-15T13:00') },
    ],
  },
  {
    id: '5',
    batchNumber: 'BRW-2025-0152',
    recipeId: '1',
    recipeName: 'Georgian Amber Lager',
    style: 'Amber Lager',
    status: 'packaged',
    volume: 1800,
    og: 1.052,
    currentGravity: 1.012,
    targetFg: 1.012,
    progress: 100,
    startDate: new Date('2025-11-01'),
    actualEndDate: new Date('2025-11-28'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    gravityReadings: [
      { id: 'gr5-1', date: new Date('2025-11-01T10:00'), gravity: 1.052, temperature: 18.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Initial OG' },
      { id: 'gr5-2', date: new Date('2025-11-04T14:00'), gravity: 1.035, temperature: 18.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr5-3', date: new Date('2025-11-08T10:00'), gravity: 1.020, temperature: 18.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr5-4', date: new Date('2025-11-12T14:00'), gravity: 1.014, temperature: 18.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr5-5', date: new Date('2025-11-16T10:00'), gravity: 1.012, temperature: 2.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'FG reached' },
    ],
    timeline: [
      { id: 'tl5-1', date: new Date('2025-11-01T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'პარტია BRW-2025-0152 დაიწყო', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-2', date: new Date('2025-11-01T09:30'), type: 'mash', title: 'Mash-in', description: 'Mash temperature: 65°C', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-3', date: new Date('2025-11-01T10:00'), type: 'reading', title: 'Initial OG', description: 'OG: 1.052', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-4', date: new Date('2025-11-01T12:00'), type: 'boil', title: 'Boil დაიწყო', description: 'Boil time: 60 minutes', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-5', date: new Date('2025-11-01T13:00'), type: 'transfer', title: 'Transfer to FV-01', description: 'Transferred to fermentation tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-6', date: new Date('2025-11-04T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.035', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-7', date: new Date('2025-11-08T10:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.020', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-8', date: new Date('2025-11-12T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.014', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-9', date: new Date('2025-11-16T10:00'), type: 'reading', title: 'Final gravity', description: 'FG: 1.012', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-10', date: new Date('2025-11-16T15:00'), type: 'transfer', title: 'Transfer to BBT-03', description: 'Transferred to conditioning tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl5-11', date: new Date('2025-11-28T10:00'), type: 'complete', title: 'შეფუთვა დასრულდა', description: 'Packaged and ready for sale', user: 'ნიკა ზედგინიძე' },
    ],
    ingredients: [
      { id: 'bi5-1', name: 'Pilsner Malt', amount: 85, unit: 'kg', type: 'grain', addedAt: new Date('2025-11-01T08:00') },
      { id: 'bi5-2', name: 'Munich Malt', amount: 24, unit: 'kg', type: 'grain', addedAt: new Date('2025-11-01T08:00') },
      { id: 'bi5-3', name: 'Crystal 60', amount: 12, unit: 'kg', type: 'grain', addedAt: new Date('2025-11-01T08:00') },
      { id: 'bi5-4', name: 'Saaz', amount: 1.2, unit: 'kg', type: 'hop', additionTime: 60, addedAt: new Date('2025-11-01T12:00') },
      { id: 'bi5-5', name: 'SafLager W-34/70', amount: 6, unit: 'პაკეტი', type: 'yeast', addedAt: new Date('2025-11-01T13:00') },
    ],
  },
  {
    id: '6',
    batchNumber: 'BRW-2025-0151',
    recipeId: '5',
    recipeName: 'Caucasus Stout',
    style: 'Dry Stout',
    status: 'completed',
    volume: 1450,
    og: 1.044,
    currentGravity: 1.012,
    targetFg: 1.012,
    progress: 100,
    startDate: new Date('2025-10-20'),
    actualEndDate: new Date('2025-11-15'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    gravityReadings: [
      { id: 'gr6-1', date: new Date('2025-10-20T10:00'), gravity: 1.044, temperature: 20.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'Initial OG' },
      { id: 'gr6-2', date: new Date('2025-10-23T14:00'), gravity: 1.028, temperature: 20.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr6-3', date: new Date('2025-10-27T10:00'), gravity: 1.018, temperature: 20.0, recordedBy: 'ნიკა ზედგინიძე' },
      { id: 'gr6-4', date: new Date('2025-11-01T14:00'), gravity: 1.012, temperature: 4.0, recordedBy: 'ნიკა ზედგინიძე', notes: 'FG reached' },
    ],
    timeline: [
      { id: 'tl6-1', date: new Date('2025-10-20T08:00'), type: 'start', title: 'ხარშვა დაიწყო', description: 'პარტია BRW-2025-0151 დაიწყო', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-2', date: new Date('2025-10-20T09:00'), type: 'mash', title: 'Mash-in', description: 'Mash temperature: 68°C', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-3', date: new Date('2025-10-20T10:00'), type: 'reading', title: 'Initial OG', description: 'OG: 1.044', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-4', date: new Date('2025-10-20T11:00'), type: 'boil', title: 'Boil დაიწყო', description: 'Boil time: 60 minutes', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-5', date: new Date('2025-10-20T12:00'), type: 'transfer', title: 'Transfer to FV-05', description: 'Transferred to fermentation tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-6', date: new Date('2025-10-23T14:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.028', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-7', date: new Date('2025-10-27T10:00'), type: 'reading', title: 'Gravity reading', description: 'SG: 1.018', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-8', date: new Date('2025-11-01T14:00'), type: 'reading', title: 'Final gravity', description: 'FG: 1.012', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-9', date: new Date('2025-11-01T15:00'), type: 'transfer', title: 'Transfer to BBT-04', description: 'Transferred to conditioning tank', user: 'ნიკა ზედგინიძე' },
      { id: 'tl6-10', date: new Date('2025-11-15T10:00'), type: 'complete', title: 'პარტია დასრულდა', description: 'Completed and sold', user: 'ნიკა ზედგინიძე' },
    ],
    ingredients: [
      { id: 'bi6-1', name: 'Pale Ale Malt', amount: 55, unit: 'kg', type: 'grain', addedAt: new Date('2025-10-20T08:00') },
      { id: 'bi6-2', name: 'Roasted Barley', amount: 8, unit: 'kg', type: 'grain', addedAt: new Date('2025-10-20T08:00') },
      { id: 'bi6-3', name: 'Crystal 60', amount: 5, unit: 'kg', type: 'grain', addedAt: new Date('2025-10-20T08:00') },
      { id: 'bi6-4', name: 'Cascade', amount: 1.0, unit: 'kg', type: 'hop', additionTime: 60, addedAt: new Date('2025-10-20T11:00') },
      { id: 'bi6-5', name: 'US-05', amount: 5, unit: 'პაკეტი', type: 'yeast', addedAt: new Date('2025-10-20T12:00') },
    ],
  },
]

// =====================================================
// INGREDIENTS
// =====================================================

export const ingredients: Ingredient[] = [
  // Malts - Base Malts
  { id: '1', name: 'Pilsner Malt', category: 'malt', supplier: 'MaltCo', quantity: 850, unit: 'kg', minQuantity: 200, costPerUnit: 3.5, location: 'საწყობი A' },
  { id: '2', name: 'Munich Malt', category: 'malt', supplier: 'MaltCo', quantity: 120, unit: 'kg', minQuantity: 50, costPerUnit: 4.2, location: 'საწყობი A' },
  { id: '4', name: 'Pale Ale Malt', category: 'malt', supplier: 'MaltCo', quantity: 200, unit: 'kg', minQuantity: 50, costPerUnit: 3.8, location: 'საწყობი A' },
  { id: '5', name: 'Wheat Malt', category: 'malt', supplier: 'MaltCo', quantity: 180, unit: 'kg', minQuantity: 50, costPerUnit: 4.0, location: 'საწყობი A' },
  { id: 'MALT-VIENNA', name: 'Vienna Malt', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 50, costPerUnit: 4.0, location: 'საწყობი A' },
  { id: 'MALT-MARIS', name: 'Maris Otter', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 50, costPerUnit: 4.5, location: 'საწყობი A' },
  { id: 'MALT-2ROW', name: '2-Row Barley', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 50, costPerUnit: 3.6, location: 'საწყობი A' },
  { id: 'MALT-6ROW', name: '6-Row Barley', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 50, costPerUnit: 3.4, location: 'საწყობი A' },
  { id: 'MALT-RAHR', name: 'Rahr Pale Ale', category: 'malt', supplier: 'Rahr', quantity: 0, unit: 'kg', minQuantity: 50, costPerUnit: 3.9, location: 'საწყობი A' },
  { id: 'MALT-GOLDEN', name: 'Golden Promise', category: 'malt', supplier: 'Simpsons', quantity: 0, unit: 'kg', minQuantity: 30, costPerUnit: 4.8, location: 'საწყობი A' },
  
  // Malts - Specialty/Crystal
  { id: '3', name: 'Crystal 60', category: 'malt', supplier: 'MaltCo', quantity: 45, unit: 'kg', minQuantity: 20, costPerUnit: 5.5, location: 'საწყობი A' },
  { id: 'MALT-CRY10', name: 'Crystal 10', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.2, location: 'საწყობი A' },
  { id: 'MALT-CRY20', name: 'Crystal 20', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.3, location: 'საწყობი A' },
  { id: 'MALT-CRY40', name: 'Crystal 40', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.4, location: 'საწყობი A' },
  { id: 'MALT-CRY80', name: 'Crystal 80', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.6, location: 'საწყობი A' },
  { id: 'MALT-CRY120', name: 'Crystal 120', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.8, location: 'საწყობი A' },
  { id: 'MALT-CARAPILS', name: 'CaraPils', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.0, location: 'საწყობი A' },
  { id: 'MALT-CARAMUN', name: 'CaraMunich', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.7, location: 'საწყობი A' },
  { id: 'MALT-CARAVIEN', name: 'CaraVienne', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.5, location: 'საწყობი A' },
  
  // Malts - Roasted/Dark
  { id: '6', name: 'Roasted Barley', category: 'malt', supplier: 'MaltCo', quantity: 25, unit: 'kg', minQuantity: 10, costPerUnit: 6.0, location: 'საწყობი A' },
  { id: 'MALT-ROAST300', name: 'Roasted Malt 300 EBC', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.2, location: 'საწყობი A' },
  { id: 'MALT-ROAST500', name: 'Roasted Malt 500 EBC', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.4, location: 'საწყობი A' },
  { id: 'MALT-CHOC', name: 'Chocolate Malt', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.5, location: 'საწყობი A' },
  { id: 'MALT-BLACK', name: 'Black Patent', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.8, location: 'საწყობი A' },
  { id: 'MALT-CARAFAS', name: 'Carafa Special I', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.3, location: 'საწყობი A' },
  { id: 'MALT-CARAFAS2', name: 'Carafa Special II', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.5, location: 'საწყობი A' },
  { id: 'MALT-CARAFAS3', name: 'Carafa Special III', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 6.7, location: 'საწყობი A' },
  
  // Malts - Other
  { id: 'MALT-ACID', name: 'Acidulated Malt', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 10, costPerUnit: 5.0, location: 'საწყობი A' },
  { id: 'MALT-SMOKED', name: 'Smoked Malt', category: 'malt', supplier: 'Weyermann', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.5, location: 'საწყობი A' },
  { id: 'MALT-AMBER', name: 'Amber Malt', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.2, location: 'საწყობი A' },
  { id: 'MALT-BISCUIT', name: 'Biscuit Malt', category: 'malt', supplier: 'Dingemans', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.4, location: 'საწყობი A' },
  { id: 'MALT-AROMATIC', name: 'Aromatic Malt', category: 'malt', supplier: 'Dingemans', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 5.3, location: 'საწყობი A' },
  { id: 'MALT-FLAKED', name: 'Flaked Oats', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 3.8, location: 'საწყობი A' },
  { id: 'MALT-FLAKCORN', name: 'Flaked Corn', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 3.5, location: 'საწყობი A' },
  { id: 'MALT-FLAKRYE', name: 'Flaked Rye', category: 'malt', supplier: 'MaltCo', quantity: 0, unit: 'kg', minQuantity: 20, costPerUnit: 4.2, location: 'საწყობი A' },
  
  // Hops - Noble/European
  { id: '7', name: 'Saaz', category: 'hops', supplier: 'HopUnion', quantity: 8, unit: 'kg', minQuantity: 3, costPerUnit: 180, location: 'მაცივარი', expiryDate: new Date('2025-06-01') },
  { id: '8', name: 'Hallertau', category: 'hops', supplier: 'HopUnion', quantity: 5, unit: 'kg', minQuantity: 2, costPerUnit: 160, location: 'მაცივარი', expiryDate: new Date('2025-05-15') },
  { id: 'HOP-TETTNANG', name: 'Tettnang', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 170, location: 'მაცივარი' },
  { id: 'HOP-SPALT', name: 'Spalt', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 165, location: 'მაცივარი' },
  { id: 'HOP-MITTEL', name: 'Mittelfrüh', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 165, location: 'მაცივარი' },
  { id: 'HOP-HERSB', name: 'Hersbrucker', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 160, location: 'მაცივარი' },
  { id: 'HOP-PERLE', name: 'Perle', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 155, location: 'მაცივარი' },
  { id: 'HOP-MAGNUM', name: 'Magnum', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 175, location: 'მაცივარი' },
  
  // Hops - American
  { id: '9', name: 'Cascade', category: 'hops', supplier: 'HopUnion', quantity: 6, unit: 'kg', minQuantity: 3, costPerUnit: 200, location: 'მაცივარი', expiryDate: new Date('2025-07-01') },
  { id: 'HOP-CENT', name: 'Centennial', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 3, costPerUnit: 210, location: 'მაცივარი' },
  { id: '10', name: 'Citra', category: 'hops', supplier: 'HopUnion', quantity: 3, unit: 'kg', minQuantity: 2, costPerUnit: 350, location: 'მაცივარი', expiryDate: new Date('2025-04-01') },
  { id: 'HOP-MOSAIC', name: 'Mosaic', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 380, location: 'მაცივარი' },
  { id: 'HOP-AMARILLO', name: 'Amarillo', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 320, location: 'მაცივარი' },
  { id: 'HOP-SIMCOE', name: 'Simcoe', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 340, location: 'მაცივარი' },
  { id: 'HOP-CHINOOK', name: 'Chinook', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 220, location: 'მაცივარი' },
  { id: 'HOP-COLUMBUS', name: 'Columbus', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 210, location: 'მაცივარი' },
  { id: 'HOP-WILLAM', name: 'Willamette', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 185, location: 'მაცივარი' },
  { id: 'HOP-NUGGET', name: 'Nugget', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 195, location: 'მაცივარი' },
  { id: 'HOP-GALENA', name: 'Galena', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 190, location: 'მაცივარი' },
  
  // Hops - New World/Tropical
  { id: 'HOP-GALAXY', name: 'Galaxy', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 400, location: 'მაცივარი' },
  { id: 'HOP-VICSEC', name: 'Vic Secret', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 390, location: 'მაცივარი' },
  { id: 'HOP-ELLA', name: 'Ella', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 370, location: 'მაცივარი' },
  { id: 'HOP-NELSON', name: 'Nelson Sauvin', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 420, location: 'მაცივარი' },
  { id: 'HOP-RIWAKA', name: 'Riwaka', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 410, location: 'მაცივარი' },
  { id: 'HOP-WAKATU', name: 'Wakatu', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 360, location: 'მაცივარი' },
  
  // Hops - British
  { id: 'HOP-FUGGLE', name: 'Fuggle', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 190, location: 'მაცივარი' },
  { id: 'HOP-GOLDING', name: 'East Kent Golding', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 200, location: 'მაცივარი' },
  { id: 'HOP-CHALLENGE', name: 'Challenger', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 205, location: 'მაცივარი' },
  { id: 'HOP-TARGET', name: 'Target', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 195, location: 'მაცივარი' },
  { id: 'HOP-NORTHDOWN', name: 'Northdown', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 198, location: 'მაცივარი' },
  { id: 'HOP-PROGRESS', name: 'Progress', category: 'hops', supplier: 'HopUnion', quantity: 0, unit: 'kg', minQuantity: 2, costPerUnit: 192, location: 'მაცივარი' },
  
  // Yeasts - Lager
  { id: '11', name: 'SafLager W-34/70', category: 'yeast', supplier: 'YeastLab', quantity: 15, unit: 'pack', minQuantity: 8, costPerUnit: 12, location: 'მაცივარი', expiryDate: new Date('2025-03-01') },
  { id: 'YEAST-WLP800', name: 'WLP800 Pilsner', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-WLP830', name: 'WLP830 German Lager', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-WLP840', name: 'WLP840 American Lager', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-WLP833', name: 'WLP833 German Bock', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-S189', name: 'S-189 Swiss Lager', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 13, location: 'მაცივარი' },
  { id: 'YEAST-S23', name: 'S-23 European Lager', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 13, location: 'მაცივარი' },
  { id: 'YEAST-2124', name: 'W-34/70 (Premium)', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 14, location: 'მაცივარი' },
  
  // Yeasts - Ale
  { id: '12', name: 'US-05', category: 'yeast', supplier: 'YeastLab', quantity: 20, unit: 'pack', minQuantity: 10, costPerUnit: 8, location: 'მაცივარი', expiryDate: new Date('2025-02-15') },
  { id: 'YEAST-S04', name: 'S-04', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 9, location: 'მაცივარი' },
  { id: 'YEAST-WLP001', name: 'WLP001 California Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 16, location: 'მაცივარი' },
  { id: 'YEAST-WLP002', name: 'WLP002 English Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 16, location: 'მაცივარი' },
  { id: 'YEAST-WLP013', name: 'WLP013 London Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 16, location: 'მაცივარი' },
  { id: 'YEAST-WLP028', name: 'WLP028 Edinburgh Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 16, location: 'მაცივარი' },
  { id: 'YEAST-WLP060', name: 'WLP060 American Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 16, location: 'მაცივარი' },
  { id: 'YEAST-WLP090', name: 'WLP090 San Diego Super', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 17, location: 'მაცივარი' },
  { id: 'YEAST-WY1056', name: 'Wyeast 1056 American Ale', category: 'yeast', supplier: 'Wyeast', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 15, location: 'მაცივარი' },
  { id: 'YEAST-WY1098', name: 'Wyeast 1098 British Ale', category: 'yeast', supplier: 'Wyeast', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 15, location: 'მაცივარი' },
  { id: 'YEAST-WY1187', name: 'Wyeast 1187 Ringwood Ale', category: 'yeast', supplier: 'Wyeast', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 15, location: 'მაცივარი' },
  
  // Yeasts - Wheat/Belgian
  { id: '13', name: 'WB-06', category: 'yeast', supplier: 'YeastLab', quantity: 8, unit: 'pack', minQuantity: 5, costPerUnit: 10, location: 'მაცივარი', expiryDate: new Date('2025-04-01') },
  { id: 'YEAST-WLP300', name: 'WLP300 Hefeweizen', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 17, location: 'მაცივარი' },
  { id: 'YEAST-WLP380', name: 'WLP380 Hefeweizen IV', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 17, location: 'მაცივარი' },
  { id: 'YEAST-WLP400', name: 'WLP400 Belgian Wit', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-WLP500', name: 'WLP500 Trappist Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-WLP530', name: 'WLP530 Abbey Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-WLP550', name: 'WLP550 Belgian Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 18, location: 'მაცივარი' },
  { id: 'YEAST-T58', name: 'T-58', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 11, location: 'მაცივარი' },
  { id: 'YEAST-BE256', name: 'BE-256', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 12, location: 'მაცივარი' },
  
  // Yeasts - Specialty
  { id: 'YEAST-WLP041', name: 'WLP041 Pacific Ale', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 17, location: 'მაცივარი' },
  { id: 'YEAST-WLP051', name: 'WLP051 California V', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 17, location: 'მაცივარი' },
  { id: 'YEAST-WLP145', name: 'WLP145 Denny\'s Favorite', category: 'yeast', supplier: 'White Labs', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 17, location: 'მაცივარი' },
  { id: 'YEAST-K97', name: 'K-97', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 10, location: 'მაცივარი' },
  { id: 'YEAST-DV10', name: 'DV10', category: 'yeast', supplier: 'Fermentis', quantity: 0, unit: 'pack', minQuantity: 5, costPerUnit: 12, location: 'მაცივარი' },
  
  // Water Chemistry
  { id: '14', name: 'Gypsum (CaSO4)', category: 'water_chemistry', supplier: 'BrewChem', quantity: 2, unit: 'kg', minQuantity: 0.5, costPerUnit: 25, location: 'საწყობი B' },
  { id: '15', name: 'Calcium Chloride', category: 'water_chemistry', supplier: 'BrewChem', quantity: 1.5, unit: 'kg', minQuantity: 0.5, costPerUnit: 30, location: 'საწყობი B' },
]

// =====================================================
// CUSTOMERS
// =====================================================

export const customers: Customer[] = [
  {
    id: '1',
    name: 'ფუნიკულიორი',
    type: 'bar',
    contactPerson: 'გიორგი მელაძე',
    email: 'funicular@mail.ge',
    phone: '+995 322 123 456',
    address: 'ჭავჭავაძის 42',
    city: 'თბილისი',
    balance: 0,
    totalOrders: 24,
    lastOrderDate: new Date('2024-12-11'),
  },
  {
    id: '2',
    name: 'Wine Bar 8000',
    type: 'bar',
    contactPerson: 'ნინო კვირიკაშვილი',
    email: 'winebar8000@mail.ge',
    phone: '+995 322 234 567',
    address: 'აბაშიძის 8',
    city: 'თბილისი',
    balance: 0,
    totalOrders: 18,
    lastOrderDate: new Date('2024-12-09'),
  },
  {
    id: '3',
    name: 'Craft Corner',
    type: 'bar',
    contactPerson: 'ლევან ჩხეიძე',
    email: 'craftcorner@mail.ge',
    phone: '+995 322 345 678',
    address: 'პეკინის 12',
    city: 'თბილისი',
    balance: 2400,
    totalOrders: 15,
    lastOrderDate: new Date('2024-12-05'),
  },
  {
    id: '4',
    name: 'გუდვილი',
    type: 'shop',
    contactPerson: 'თეა ბერიძე',
    email: 'goodwill@mail.ge',
    phone: '+995 322 456 789',
    address: 'წერეთლის 115',
    city: 'თბილისი',
    balance: 1520,
    totalOrders: 32,
    lastOrderDate: new Date('2024-12-08'),
  },
  {
    id: '5',
    name: 'პაბი London',
    type: 'bar',
    contactPerson: 'ზაზა გიორგაძე',
    email: 'publon@mail.ge',
    phone: '+995 322 567 890',
    address: 'მარჯანიშვილის 5',
    city: 'თბილისი',
    balance: 4800,
    totalOrders: 12,
    lastOrderDate: new Date('2024-12-01'),
    notes: 'გადავადებული გადახდა',
  },
  {
    id: '6',
    name: 'მოსეს ბარი',
    type: 'bar',
    contactPerson: 'მოსე ტყემალაძე',
    email: 'mosesbar@mail.ge',
    phone: '+995 322 678 901',
    address: 'რუსთაველის 28',
    city: 'თბილისი',
    balance: 0,
    totalOrders: 8,
    lastOrderDate: new Date('2024-11-28'),
  },
  {
    id: '7',
    name: 'Brewery Taproom',
    type: 'bar',
    contactPerson: '-',
    email: 'taproom@brewmaster.ge',
    phone: '+995 322 111 222',
    address: 'დიდუბე',
    city: 'თბილისი',
    balance: 0,
    totalOrders: 0,
    notes: 'საკუთარი taproom',
  },
  {
    id: '8',
    name: 'BeerGe',
    type: 'distributor',
    contactPerson: 'ლაშა ხარატიშვილი',
    email: 'beerge@mail.ge',
    phone: '+995 555 888 999',
    address: 'ვარკეთილი',
    city: 'თბილისი',
    balance: 10000,
    totalOrders: 45,
    lastOrderDate: new Date('2024-12-10'),
  },
]

// =====================================================
// PRODUCTS (მზა პროდუქცია)
// =====================================================

export const products: Product[] = [
  // Georgian Amber Lager
  { id: '1', name: 'Georgian Amber Lager 30L კეგი', recipeId: '1', type: 'keg', size: 30, quantity: 8, price: 2400, available: true },
  { id: '2', name: 'Georgian Amber Lager 50L კეგი', recipeId: '1', type: 'keg', size: 50, quantity: 4, price: 3800, available: true },
  { id: '3', name: 'Georgian Amber Lager 0.5L ბოთლი', recipeId: '1', type: 'bottle', size: 500, quantity: 240, price: 8, available: true },
  { id: '4', name: 'Georgian Amber Lager 0.33L ბოთლი', recipeId: '1', type: 'bottle', size: 330, quantity: 360, price: 6, available: true },
  
  // Tbilisi IPA
  { id: '5', name: 'Tbilisi IPA 30L კეგი', recipeId: '2', type: 'keg', size: 30, quantity: 6, price: 2650, available: true },
  { id: '6', name: 'Tbilisi IPA 50L კეგი', recipeId: '2', type: 'keg', size: 50, quantity: 3, price: 4200, available: true },
  { id: '7', name: 'Tbilisi IPA 0.5L ბოთლი', recipeId: '2', type: 'bottle', size: 500, quantity: 180, price: 10, available: true },
  
  // Kolkheti Wheat
  { id: '8', name: 'Kolkheti Wheat 30L კეგი', recipeId: '3', type: 'keg', size: 30, quantity: 4, price: 2200, available: true },
  { id: '9', name: 'Kolkheti Wheat 0.5L ბოთლი', recipeId: '3', type: 'bottle', size: 500, quantity: 120, price: 7, available: true },
  
  // Svaneti Pilsner
  { id: '10', name: 'Svaneti Pilsner 30L კეგი', recipeId: '4', type: 'keg', size: 30, quantity: 5, price: 2300, available: true },
  { id: '11', name: 'Svaneti Pilsner 0.5L ბოთლი', recipeId: '4', type: 'bottle', size: 500, quantity: 200, price: 7, available: true },
  
  // Caucasus Stout
  { id: '12', name: 'Caucasus Stout 30L კეგი', recipeId: '5', type: 'keg', size: 30, quantity: 2, price: 2500, available: true },
  { id: '13', name: 'Caucasus Stout 0.5L ბოთლი', recipeId: '5', type: 'bottle', size: 500, quantity: 60, price: 9, available: true },
]

// =====================================================
// ORDERS
// =====================================================

export const orders: Order[] = [
  {
    id: '1',
    orderNumber: 'ORD-2024-0045',
    customerId: '1',
    customerName: 'ფუნიკულიორი',
    status: 'delivered',
    items: [
      { id: '1', productId: '1', productName: 'Georgian Amber Lager 30L კეგი', productType: 'keg', quantity: 4, unitPrice: 2400, total: 9600 },
      { id: '2', productId: '7', productName: 'Tbilisi IPA 0.5L ბოთლი', productType: 'bottle', quantity: 48, unitPrice: 10, total: 480 },
    ],
    subtotal: 10080,
    discount: 0,
    total: 10080,
    paymentStatus: 'paid',
    paidAmount: 10080,
    orderDate: new Date('2024-12-09'),
    deliveryDate: new Date('2024-12-11'),
    deliveredDate: new Date('2024-12-11'),
  },
  {
    id: '2',
    orderNumber: 'ORD-2024-0044',
    customerId: '8',
    customerName: 'BeerGe',
    status: 'shipped',
    items: [
      { id: '1', productId: '1', productName: 'Georgian Amber Lager 30L კეგი', productType: 'keg', quantity: 6, unitPrice: 2400, total: 14400 },
      { id: '2', productId: '5', productName: 'Tbilisi IPA 30L კეგი', productType: 'keg', quantity: 4, unitPrice: 2650, total: 10600 },
    ],
    subtotal: 25000,
    discount: 0,
    total: 25000,
    paymentStatus: 'partial',
    paidAmount: 15000,
    orderDate: new Date('2024-12-08'),
    deliveryDate: new Date('2024-12-12'),
  },
  {
    id: '3',
    orderNumber: 'ORD-2024-0043',
    customerId: '2',
    customerName: 'Wine Bar 8000',
    status: 'delivered',
    items: [
      { id: '1', productId: '8', productName: 'Kolkheti Wheat 30L კეგი', productType: 'keg', quantity: 2, unitPrice: 2200, total: 4400 },
      { id: '2', productId: '11', productName: 'Svaneti Pilsner 0.5L ბოთლი', productType: 'bottle', quantity: 72, unitPrice: 7, total: 504 },
    ],
    subtotal: 4904,
    discount: 0,
    total: 4904,
    paymentStatus: 'paid',
    paidAmount: 4904,
    orderDate: new Date('2024-12-07'),
    deliveryDate: new Date('2024-12-09'),
    deliveredDate: new Date('2024-12-09'),
  },
  {
    id: '4',
    orderNumber: 'ORD-2024-0046',
    customerId: '4',
    customerName: 'გუდვილი',
    status: 'confirmed',
    items: [
      { id: '1', productId: '3', productName: 'Georgian Amber Lager 0.5L ბოთლი', productType: 'bottle', quantity: 120, unitPrice: 8, total: 960 },
      { id: '2', productId: '7', productName: 'Tbilisi IPA 0.5L ბოთლი', productType: 'bottle', quantity: 80, unitPrice: 10, total: 800 },
    ],
    subtotal: 1760,
    discount: 0,
    total: 1760,
    paymentStatus: 'pending',
    paidAmount: 0,
    orderDate: new Date('2024-12-11'),
    deliveryDate: new Date('2024-12-14'),
  },
  {
    id: '5',
    orderNumber: 'ORD-2024-0042',
    customerId: '5',
    customerName: 'პაბი London',
    status: 'delivered',
    items: [
      { id: '1', productId: '1', productName: 'Georgian Amber Lager 30L კეგი', productType: 'keg', quantity: 2, unitPrice: 2400, total: 4800 },
    ],
    subtotal: 4800,
    discount: 0,
    total: 4800,
    paymentStatus: 'overdue',
    paidAmount: 0,
    orderDate: new Date('2024-12-01'),
    deliveryDate: new Date('2024-12-03'),
    deliveredDate: new Date('2024-12-03'),
    notes: 'გადახდა ვადაგადაცილებულია!',
  },
  {
    id: '6',
    orderNumber: 'ORD-2024-0047',
    customerId: '3',
    customerName: 'Craft Corner',
    status: 'pending',
    items: [
      { id: '1', productId: '5', productName: 'Tbilisi IPA 30L კეგი', productType: 'keg', quantity: 3, unitPrice: 2650, total: 7950 },
      { id: '2', productId: '12', productName: 'Caucasus Stout 30L კეგი', productType: 'keg', quantity: 1, unitPrice: 2500, total: 2500 },
    ],
    subtotal: 10450,
    discount: 450,
    total: 10000,
    paymentStatus: 'pending',
    paidAmount: 0,
    orderDate: new Date('2024-12-12'),
    deliveryDate: new Date('2024-12-16'),
  },
]

// =====================================================
// KEGS
// =====================================================

export const kegs: Keg[] = [
  { id: '1', serialNumber: 'K30-001', size: 30, status: 'filled', currentProductId: '1', currentProductName: 'Georgian Amber Lager', filledDate: new Date('2024-12-08') },
  { id: '2', serialNumber: 'K30-002', size: 30, status: 'filled', currentProductId: '1', currentProductName: 'Georgian Amber Lager', filledDate: new Date('2024-12-08') },
  { id: '3', serialNumber: 'K30-003', size: 30, status: 'at_customer', currentProductId: '1', currentProductName: 'Georgian Amber Lager', customerId: '1', customerName: 'ფუნიკულიორი', sentDate: new Date('2024-12-11') },
  { id: '4', serialNumber: 'K30-004', size: 30, status: 'at_customer', currentProductId: '1', currentProductName: 'Georgian Amber Lager', customerId: '1', customerName: 'ფუნიკულიორი', sentDate: new Date('2024-12-11') },
  { id: '5', serialNumber: 'K30-005', size: 30, status: 'available' },
  { id: '6', serialNumber: 'K30-006', size: 30, status: 'needs_cleaning', returnDate: new Date('2024-12-10') },
  { id: '7', serialNumber: 'K50-001', size: 50, status: 'filled', currentProductId: '2', currentProductName: 'Georgian Amber Lager 50L', filledDate: new Date('2024-12-09') },
  { id: '8', serialNumber: 'K50-002', size: 50, status: 'at_customer', currentProductId: '6', currentProductName: 'Tbilisi IPA 50L', customerId: '8', customerName: 'BeerGe', sentDate: new Date('2024-12-10') },
  { id: '9', serialNumber: 'K30-007', size: 30, status: 'damaged' },
  { id: '10', serialNumber: 'K30-008', size: 30, status: 'available' },
]

// =====================================================
// CALENDAR EVENTS (generated from batches + manual)
// =====================================================

export interface CalendarEvent {
  id: string
  type: 'brewing' | 'fermentation' | 'conditioning' | 'packaging' | 'maintenance' | 'delivery'
  title: string
  batchId?: string
  batchNumber?: string
  recipe?: string
  tankId?: string
  tankName?: string
  startDate: Date
  endDate: Date
  status: 'scheduled' | 'active' | 'completed'
  progress?: number
  temperature?: number
  notes?: string
}

export const calendarEvents: CalendarEvent[] = [
  // ფერმენტაციის ივენთები (პარტიებიდან)
  {
    id: 'evt-1',
    type: 'fermentation',
    title: 'BRW-0156 ფერმენტაცია',
    batchId: '1',
    batchNumber: 'BRW-2024-0156',
    recipe: 'Georgian Amber Lager',
    tankId: '1',
    tankName: 'FV-01',
    startDate: new Date('2024-12-10'),
    endDate: new Date('2024-12-24'),
    status: 'active',
    progress: 65,
    temperature: 18.5,
    notes: 'Dry hop დღე 10-ზე',
  },
  {
    id: 'evt-2',
    type: 'fermentation',
    title: 'BRW-0155 ფერმენტაცია',
    batchId: '2',
    batchNumber: 'BRW-2024-0155',
    recipe: 'Tbilisi IPA',
    tankId: '2',
    tankName: 'FV-02',
    startDate: new Date('2024-12-05'),
    endDate: new Date('2024-12-19'),
    status: 'active',
    progress: 90,
    temperature: 12,
  },
  {
    id: 'evt-3',
    type: 'conditioning',
    title: 'BRW-0154 კონდიცირება',
    batchId: '3',
    batchNumber: 'BRW-2024-0154',
    recipe: 'Kolkheti Wheat',
    tankId: '4',
    tankName: 'BBT-01',
    startDate: new Date('2024-12-08'),
    endDate: new Date('2024-12-15'),
    status: 'active',
    progress: 70,
    temperature: 4,
  },
  // დაგეგმილი ხარშვები
  {
    id: 'evt-4',
    type: 'brewing',
    title: 'BRW-0157 ხარშვა',
    batchNumber: 'BRW-2024-0157',
    recipe: 'Georgian Amber Lager',
    tankId: '6',
    tankName: 'Kettle',
    startDate: new Date('2024-12-16'),
    endDate: new Date('2024-12-16'),
    status: 'scheduled',
  },
  {
    id: 'evt-5',
    type: 'brewing',
    title: 'BRW-0158 ხარშვა',
    batchNumber: 'BRW-2024-0158',
    recipe: 'Svaneti Pilsner',
    tankId: '6',
    tankName: 'Kettle',
    startDate: new Date('2024-12-18'),
    endDate: new Date('2024-12-18'),
    status: 'scheduled',
  },
  // მოვლის ივენთი
  {
    id: 'evt-6',
    type: 'maintenance',
    title: 'FV-02 CIP გაწმენდა',
    tankId: '2',
    tankName: 'FV-02',
    startDate: new Date('2024-12-20'),
    endDate: new Date('2024-12-20'),
    status: 'scheduled',
    notes: 'ფერმენტაციის შემდეგ',
  },
  // მიწოდების ივენთები
  {
    id: 'evt-7',
    type: 'delivery',
    title: 'მიწოდება: გუდვილი',
    startDate: new Date('2024-12-14'),
    endDate: new Date('2024-12-14'),
    status: 'scheduled',
    notes: 'ORD-2024-0046',
  },
  {
    id: 'evt-8',
    type: 'delivery',
    title: 'მიწოდება: Craft Corner',
    startDate: new Date('2024-12-16'),
    endDate: new Date('2024-12-16'),
    status: 'scheduled',
    notes: 'ORD-2024-0047',
  },
]

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export const getBatchById = (id: string) => batches.find(b => b.id === id)
export const getTankById = (id: string) => tanks.find(t => t.id === id)
export const getRecipeById = (id: string) => recipes.find(r => r.id === id)
export const getCustomerById = (id: string) => customers.find(c => c.id === id)
export const getOrderById = (id: string) => orders.find(o => o.id === id)
export const getProductById = (id: string) => products.find(p => p.id === id)
export const getIngredientById = (id: string) => ingredients.find(i => i.id === id)

export const getBatchesForTank = (tankId: string) => batches.filter(b => b.tankId === tankId)
export const getOrdersForCustomer = (customerId: string) => orders.filter(o => o.customerId === customerId)
export const getKegsAtCustomer = (customerId: string) => kegs.filter(k => k.customerId === customerId)
export const getEventsForTank = (tankId: string) => calendarEvents.filter(e => e.tankId === tankId)
export const getEventsForBatch = (batchId: string) => calendarEvents.filter(e => e.batchId === batchId)

export const getActiveBatches = () => batches.filter(b => ['brewing', 'fermenting', 'conditioning', 'ready'].includes(b.status))
export const getAvailableTanks = () => tanks.filter(t => t.status === 'available')
export const getPendingOrders = () => orders.filter(o => ['pending', 'confirmed', 'in_production', 'ready'].includes(o.status))
export const getLowStockIngredients = () => ingredients.filter(i => i.quantity <= i.minQuantity)

// Statistics
export const getStats = () => ({
  production: {
    total: batches.length,
    fermenting: batches.filter(b => b.status === 'fermenting').length,
    conditioning: batches.filter(b => b.status === 'conditioning').length,
    ready: batches.filter(b => b.status === 'ready').length,
    totalVolume: batches.filter(b => ['fermenting', 'conditioning', 'ready'].includes(b.status)).reduce((sum, b) => sum + b.volume, 0),
  },
  tanks: {
    total: tanks.length,
    inUse: tanks.filter(t => t.status === 'in_use').length,
    available: tanks.filter(t => t.status === 'available').length,
  },
  sales: {
    pendingOrders: orders.filter(o => o.status === 'pending').length,
    totalRevenue: orders.filter(o => o.status === 'delivered').reduce((sum, o) => sum + o.total, 0),
    outstandingPayments: orders.filter(o => o.paymentStatus !== 'paid').reduce((sum, o) => sum + (o.total - o.paidAmount), 0),
  },
  inventory: {
    lowStock: ingredients.filter(i => i.quantity <= i.minQuantity).length,
    kegsAvailable: kegs.filter(k => k.status === 'available').length,
    kegsAtCustomers: kegs.filter(k => k.status === 'at_customer').length,
  },
})
