// =====================================================
// BrewMaster PRO - ცენტრალიზებული მონაცემთა ფაილი
// ყველა მოდული იყენებს ერთ წყაროს
// =====================================================

// =====================================================
// TYPES
// =====================================================

export type BatchStatus = 'planned' | 'brewing' | 'fermenting' | 'conditioning' | 'ready' | 'packaged' | 'completed' | 'cancelled'
export type TankStatus = 'available' | 'in_use' | 'cleaning' | 'maintenance'
export type TankType = 'fermenter' | 'brite' | 'kettle' | 'mash_tun' | 'hlt'
export type IngredientCategory = 'malt' | 'hops' | 'yeast' | 'adjunct' | 'water_chemistry'
export type OrderStatus = 'pending' | 'confirmed' | 'in_production' | 'ready' | 'shipped' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'
export type TestStatus = 'pending' | 'in_progress' | 'passed' | 'warning' | 'failed'

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
  { id: '1', name: 'ნიკა ზედგინიძე', role: 'მთავარი მეხარშე', email: 'nika@brewmaster.ge', phone: '+995 555 123 456' },
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
  { id: '1', name: 'FV-01', type: 'fermenter', capacity: 2000, status: 'in_use', currentBatchId: '1', currentTemp: 18.5, targetTemp: 18, location: 'საფერმენტაციო დარბაზი' },
  { id: '2', name: 'FV-02', type: 'fermenter', capacity: 2000, status: 'in_use', currentBatchId: '2', currentTemp: 12, targetTemp: 12, location: 'საფერმენტაციო დარბაზი' },
  { id: '3', name: 'FV-03', type: 'fermenter', capacity: 1500, status: 'available', location: 'საფერმენტაციო დარბაზი' },
  { id: '4', name: 'BBT-01', type: 'brite', capacity: 2000, status: 'in_use', currentBatchId: '3', currentTemp: 4, targetTemp: 4, location: 'საფერმენტაციო დარბაზი' },
  { id: '5', name: 'BBT-02', type: 'brite', capacity: 1000, status: 'in_use', currentBatchId: '4', currentTemp: 2, targetTemp: 2, location: 'საფერმენტაციო დარბაზი' },
  { id: '6', name: 'Kettle', type: 'kettle', capacity: 500, status: 'available', location: 'სახარში დარბაზი' },
  { id: '7', name: 'Mash Tun', type: 'mash_tun', capacity: 500, status: 'available', location: 'სახარში დარბაზი' },
  { id: '8', name: 'HLT', type: 'hlt', capacity: 800, status: 'available', currentTemp: 78, location: 'სახარში დარბაზი' },
]

// =====================================================
// BATCHES
// =====================================================

export const batches: Batch[] = [
  {
    id: '1',
    batchNumber: 'BRW-2024-0156',
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
    startDate: new Date('2024-12-10'),
    estimatedEndDate: new Date('2024-12-24'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
    notes: 'Dry hop დღე 10-ზე',
  },
  {
    id: '2',
    batchNumber: 'BRW-2024-0155',
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
    startDate: new Date('2024-12-05'),
    estimatedEndDate: new Date('2024-12-19'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
  },
  {
    id: '3',
    batchNumber: 'BRW-2024-0154',
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
    startDate: new Date('2024-12-01'),
    estimatedEndDate: new Date('2024-12-15'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
  },
  {
    id: '4',
    batchNumber: 'BRW-2024-0153',
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
    startDate: new Date('2024-11-15'),
    estimatedEndDate: new Date('2024-12-10'),
    actualEndDate: new Date('2024-12-10'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
  },
  {
    id: '5',
    batchNumber: 'BRW-2024-0152',
    recipeId: '1',
    recipeName: 'Georgian Amber Lager',
    style: 'Amber Lager',
    status: 'packaged',
    volume: 1800,
    og: 1.052,
    currentGravity: 1.012,
    targetFg: 1.012,
    progress: 100,
    startDate: new Date('2024-11-01'),
    actualEndDate: new Date('2024-11-28'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
  },
  {
    id: '6',
    batchNumber: 'BRW-2024-0151',
    recipeId: '5',
    recipeName: 'Caucasus Stout',
    style: 'Dry Stout',
    status: 'completed',
    volume: 1450,
    og: 1.044,
    currentGravity: 1.012,
    targetFg: 1.012,
    progress: 100,
    startDate: new Date('2024-10-20'),
    actualEndDate: new Date('2024-11-15'),
    brewerId: '1',
    brewerName: 'ნიკა ზედგინიძე',
  },
]

// =====================================================
// INGREDIENTS
// =====================================================

export const ingredients: Ingredient[] = [
  // Malts
  { id: '1', name: 'Pilsner Malt', category: 'malt', supplier: 'MaltCo', quantity: 850, unit: 'kg', minQuantity: 200, costPerUnit: 3.5, location: 'საწყობი A' },
  { id: '2', name: 'Munich Malt', category: 'malt', supplier: 'MaltCo', quantity: 120, unit: 'kg', minQuantity: 50, costPerUnit: 4.2, location: 'საწყობი A' },
  { id: '3', name: 'Crystal 60', category: 'malt', supplier: 'MaltCo', quantity: 45, unit: 'kg', minQuantity: 20, costPerUnit: 5.5, location: 'საწყობი A' },
  { id: '4', name: 'Pale Ale Malt', category: 'malt', supplier: 'MaltCo', quantity: 200, unit: 'kg', minQuantity: 50, costPerUnit: 3.8, location: 'საწყობი A' },
  { id: '5', name: 'Wheat Malt', category: 'malt', supplier: 'MaltCo', quantity: 180, unit: 'kg', minQuantity: 50, costPerUnit: 4.0, location: 'საწყობი A' },
  { id: '6', name: 'Roasted Barley', category: 'malt', supplier: 'MaltCo', quantity: 25, unit: 'kg', minQuantity: 10, costPerUnit: 6.0, location: 'საწყობი A' },
  
  // Hops
  { id: '7', name: 'Saaz', category: 'hops', supplier: 'HopUnion', quantity: 8, unit: 'kg', minQuantity: 3, costPerUnit: 180, location: 'მაცივარი', expiryDate: new Date('2025-06-01') },
  { id: '8', name: 'Hallertau', category: 'hops', supplier: 'HopUnion', quantity: 5, unit: 'kg', minQuantity: 2, costPerUnit: 160, location: 'მაცივარი', expiryDate: new Date('2025-05-15') },
  { id: '9', name: 'Cascade', category: 'hops', supplier: 'HopUnion', quantity: 6, unit: 'kg', minQuantity: 3, costPerUnit: 200, location: 'მაცივარი', expiryDate: new Date('2025-07-01') },
  { id: '10', name: 'Citra', category: 'hops', supplier: 'HopUnion', quantity: 3, unit: 'kg', minQuantity: 2, costPerUnit: 350, location: 'მაცივარი', expiryDate: new Date('2025-04-01') },
  
  // Yeasts
  { id: '11', name: 'SafLager W-34/70', category: 'yeast', supplier: 'YeastLab', quantity: 15, unit: 'pack', minQuantity: 8, costPerUnit: 12, location: 'მაცივარი', expiryDate: new Date('2025-03-01') },
  { id: '12', name: 'US-05', category: 'yeast', supplier: 'YeastLab', quantity: 20, unit: 'pack', minQuantity: 10, costPerUnit: 8, location: 'მაცივარი', expiryDate: new Date('2025-02-15') },
  { id: '13', name: 'WB-06', category: 'yeast', supplier: 'YeastLab', quantity: 8, unit: 'pack', minQuantity: 5, costPerUnit: 10, location: 'მაცივარი', expiryDate: new Date('2025-04-01') },
  
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
  { id: '9', serialNumber: 'K30-007', size: 30, status: 'damaged', notes: 'დაზიანებულია valve' },
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
    title: 'BRW-0154 კონდიციონირება',
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
