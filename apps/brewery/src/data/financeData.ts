export type TransactionType = 'income' | 'expense'

export type IncomeCategory = 'sale' | 'deposit' | 'refund' | 'other'

export type ExpenseCategory = 'ingredients' | 'packaging' | 'equipment' | 'utilities' | 'salary' | 'rent' | 'marketing' | 'other'

export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue'

export type PaymentMethod = 'bank_transfer' | 'cash' | 'card'

export type InvoiceType = 'outgoing' | 'incoming'



export interface Transaction {

  id: string

  type: TransactionType

  date: Date

  amount: number

  category: IncomeCategory | ExpenseCategory

  description: string

  customerId?: string

  customerName?: string

  supplierId?: string

  supplierName?: string

  orderId?: string

  orderNumber?: string

  invoiceId?: string

  invoiceNumber?: string

  paymentMethod?: PaymentMethod

  notes?: string

}



export interface InvoiceItem {

  id: string

  description: string

  quantity: number

  unitPrice: number

  total: number

}



export interface Payment {

  id: string

  invoiceId: string

  date: Date

  amount: number

  method: PaymentMethod

  reference?: string

  notes?: string

}



export interface Invoice {

  id: string

  invoiceNumber: string

  type: InvoiceType

  date: Date

  dueDate: Date

  customerId?: string

  customerName?: string

  customerAddress?: string

  supplierId?: string

  supplierName?: string

  items: InvoiceItem[]

  subtotal: number

  discount: number

  total: number

  paidAmount: number

  status: PaymentStatus

  payments: Payment[]

  notes?: string

}



export interface MonthlyFinancials {

  month: string

  year: number

  income: number

  expenses: number

  profit: number

  expensesByCategory: Record<ExpenseCategory, number>

}



export interface Budget {

  category: ExpenseCategory

  monthlyBudget: number

  yearlyBudget: number

}



export const mockTransactions: Transaction[] = [

  // შემოსავლები

  {

    id: '1',

    type: 'income',

    date: new Date('2024-12-11'),

    amount: 15200,

    category: 'sale',

    description: 'ORD-0045 გაყიდვა',

    customerId: '1',

    customerName: 'ფუნიკულიორი',

    orderId: '1',

    orderNumber: 'ORD-2024-0045',

    invoiceId: '1',

    invoiceNumber: 'INV-S-089',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '2',

    type: 'income',

    date: new Date('2024-12-10'),

    amount: 8400,

    category: 'sale',

    description: 'ORD-0044 გაყიდვა',

    customerId: '8',

    customerName: 'BeerGe',

    orderNumber: 'ORD-2024-0044',

    invoiceNumber: 'INV-S-088',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '3',

    type: 'income',

    date: new Date('2024-12-09'),

    amount: 5932,

    category: 'sale',

    description: 'ORD-0043 გაყიდვა',

    customerName: 'Wine Bar 8000',

    invoiceNumber: 'INV-S-087',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '4',

    type: 'income',

    date: new Date('2024-12-07'),

    amount: 600,

    category: 'deposit',

    description: 'კეგის დეპოზიტი',

    customerName: 'პაბი London',

    paymentMethod: 'cash',

  },

  // ხარჯები

  {

    id: '5',

    type: 'expense',

    date: new Date('2024-12-10'),

    amount: 3500,

    category: 'ingredients',

    description: 'სვია Cascade, Citra',

    supplierName: 'HopUnion',

    invoiceNumber: 'INV-045',

  },

  {

    id: '6',

    type: 'expense',

    date: new Date('2024-12-08'),

    amount: 1850,

    category: 'ingredients',

    description: 'Pilsner Malt 500kg',

    supplierName: 'MaltCo',

    invoiceNumber: 'INV-044',

  },

  {

    id: '7',

    type: 'expense',

    date: new Date('2024-12-09'),

    amount: 1200,

    category: 'utilities',

    description: 'ელექტროენერგია',

    supplierName: 'თელასი',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '8',

    type: 'expense',

    date: new Date('2024-12-09'),

    amount: 850,

    category: 'utilities',

    description: 'წყალი',

    supplierName: 'წყალკანალი',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '9',

    type: 'expense',

    date: new Date('2024-12-05'),

    amount: 2400,

    category: 'packaging',

    description: 'ბოთლები 0.5L x1000',

    supplierName: 'GlassCo',

    invoiceNumber: 'INV-042',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '10',

    type: 'expense',

    date: new Date('2024-12-01'),

    amount: 18000,

    category: 'salary',

    description: 'ხელფასი დეკემბერი',

    paymentMethod: 'bank_transfer',

  },

  {

    id: '11',

    type: 'expense',

    date: new Date('2024-12-01'),

    amount: 8000,

    category: 'rent',

    description: 'იჯარა დეკემბერი',

    supplierName: 'რეალთა',

    paymentMethod: 'bank_transfer',

  },

]



export const mockInvoicesOutgoing: Invoice[] = [

  {

    id: '1',

    invoiceNumber: 'INV-S-089',

    type: 'outgoing',

    date: new Date('2024-12-11'),

    dueDate: new Date('2024-12-25'),

    customerId: '1',

    customerName: 'ფუნიკულიორი',

    customerAddress: 'ვაკე, თბილისი',

    items: [

      { id: '1', description: 'Georgian Amber Lager 30L კეგი', quantity: 4, unitPrice: 2400, total: 9600 },

      { id: '2', description: 'Tbilisi IPA 0.5L ბოთლი', quantity: 48, unitPrice: 8, total: 384 },

      { id: '3', description: 'კეგის დეპოზიტი 30L', quantity: 4, unitPrice: 150, total: 600 },

    ],

    subtotal: 10584,

    discount: 0,

    total: 10584,

    paidAmount: 10584,

    status: 'paid',

    payments: [

      { id: '1', invoiceId: '1', date: new Date('2024-12-12'), amount: 10584, method: 'bank_transfer' }

    ],

  },

  {

    id: '2',

    invoiceNumber: 'INV-S-086',

    type: 'outgoing',

    date: new Date('2024-12-08'),

    dueDate: new Date('2024-12-22'),

    customerName: 'გუდვილი',

    items: [

      { id: '1', description: 'Georgian Amber 0.5L', quantity: 120, unitPrice: 8, total: 960 },

      { id: '2', description: 'Tbilisi IPA 0.5L', quantity: 80, unitPrice: 7, total: 560 },

    ],

    subtotal: 1520,

    discount: 0,

    total: 1520,

    paidAmount: 0,

    status: 'pending',

    payments: [],

  },

  {

    id: '3',

    invoiceNumber: 'INV-S-085',

    type: 'outgoing',

    date: new Date('2024-12-05'),

    dueDate: new Date('2024-12-19'),

    customerName: 'BeerGe',

    items: [

      { id: '1', description: 'Georgian Amber 30L კეგი', quantity: 6, unitPrice: 2400, total: 14400 },

      { id: '2', description: 'Tbilisi IPA 50L კეგი', quantity: 4, unitPrice: 2650, total: 10600 },

    ],

    subtotal: 25000,

    discount: 0,

    total: 25000,

    paidAmount: 15000,

    status: 'partial',

    payments: [

      { id: '1', invoiceId: '3', date: new Date('2024-12-08'), amount: 15000, method: 'bank_transfer' }

    ],

  },

  {

    id: '4',

    invoiceNumber: 'INV-S-084',

    type: 'outgoing',

    date: new Date('2024-12-01'),

    dueDate: new Date('2024-12-10'),

    customerName: 'პაბი London',

    items: [

      { id: '1', description: 'Georgian Amber 30L კეგი', quantity: 2, unitPrice: 2400, total: 4800 },

    ],

    subtotal: 4800,

    discount: 0,

    total: 4800,

    paidAmount: 0,

    status: 'overdue',

    payments: [],

  },

]



export const mockInvoicesIncoming: Invoice[] = [

  {

    id: '10',

    invoiceNumber: 'INV-045',

    type: 'incoming',

    date: new Date('2024-12-05'),

    dueDate: new Date('2024-12-08'),

    supplierName: 'HopUnion',

    items: [

      { id: '1', description: 'Cascade Hops 5kg', quantity: 1, unitPrice: 1200, total: 1200 },

      { id: '2', description: 'Citra Hops 3kg', quantity: 1, unitPrice: 1250, total: 1250 },

    ],

    subtotal: 2450,

    discount: 0,

    total: 2450,

    paidAmount: 0,

    status: 'overdue',

    payments: [],

  },

  {

    id: '11',

    invoiceNumber: 'INV-044',

    type: 'incoming',

    date: new Date('2024-12-06'),

    dueDate: new Date('2024-12-15'),

    supplierName: 'MaltCo',

    items: [

      { id: '1', description: 'Pilsner Malt 500kg', quantity: 1, unitPrice: 1850, total: 1850 },

    ],

    subtotal: 1850,

    discount: 0,

    total: 1850,

    paidAmount: 0,

    status: 'pending',

    payments: [],

  },

  {

    id: '12',

    invoiceNumber: 'INV-043',

    type: 'incoming',

    date: new Date('2024-12-09'),

    dueDate: new Date('2024-12-20'),

    supplierName: 'თელასი',

    items: [

      { id: '1', description: 'ელექტროენერგია დეკემბერი', quantity: 1, unitPrice: 980, total: 980 },

    ],

    subtotal: 980,

    discount: 0,

    total: 980,

    paidAmount: 0,

    status: 'pending',

    payments: [],

  },

  {

    id: '13',

    invoiceNumber: 'INV-042',

    type: 'incoming',

    date: new Date('2024-12-01'),

    dueDate: new Date('2024-12-10'),

    supplierName: 'GlassCo',

    items: [

      { id: '1', description: 'ბოთლი 0.5L x1000', quantity: 1, unitPrice: 2400, total: 2400 },

    ],

    subtotal: 2400,

    discount: 0,

    total: 2400,

    paidAmount: 2400,

    status: 'paid',

    payments: [

      { id: '1', invoiceId: '13', date: new Date('2024-12-05'), amount: 2400, method: 'bank_transfer' }

    ],

  },

]



export const mockMonthlyFinancials: MonthlyFinancials[] = [

  { month: 'იან', year: 2024, income: 85000, expenses: 62000, profit: 23000, expensesByCategory: { ingredients: 28000, packaging: 8000, salary: 15000, rent: 6000, utilities: 3000, equipment: 1500, marketing: 500, other: 0 } },

  { month: 'თებ', year: 2024, income: 92000, expenses: 68000, profit: 24000, expensesByCategory: { ingredients: 30000, packaging: 9000, salary: 15000, rent: 6000, utilities: 3500, equipment: 3000, marketing: 1000, other: 500 } },

  { month: 'მარ', year: 2024, income: 105000, expenses: 72000, profit: 33000, expensesByCategory: { ingredients: 32000, packaging: 10000, salary: 16000, rent: 6000, utilities: 3500, equipment: 2500, marketing: 1500, other: 500 } },

  { month: 'აპრ', year: 2024, income: 112000, expenses: 75000, profit: 37000, expensesByCategory: { ingredients: 33000, packaging: 11000, salary: 16000, rent: 6000, utilities: 4000, equipment: 3000, marketing: 1500, other: 500 } },

  { month: 'მაი', year: 2024, income: 128000, expenses: 82000, profit: 46000, expensesByCategory: { ingredients: 36000, packaging: 13000, salary: 17000, rent: 6000, utilities: 4500, equipment: 3500, marketing: 1500, other: 500 } },

  { month: 'ივნ', year: 2024, income: 115000, expenses: 78000, profit: 37000, expensesByCategory: { ingredients: 34000, packaging: 12000, salary: 17000, rent: 6000, utilities: 4000, equipment: 3000, marketing: 1500, other: 500 } },

  { month: 'ივლ', year: 2024, income: 135000, expenses: 88000, profit: 47000, expensesByCategory: { ingredients: 38000, packaging: 14000, salary: 18000, rent: 8000, utilities: 4500, equipment: 3500, marketing: 1500, other: 500 } },

  { month: 'აგვ', year: 2024, income: 122000, expenses: 80000, profit: 42000, expensesByCategory: { ingredients: 35000, packaging: 12000, salary: 18000, rent: 8000, utilities: 4000, equipment: 1500, marketing: 1000, other: 500 } },

  { month: 'სექ', year: 2024, income: 118000, expenses: 76000, profit: 42000, expensesByCategory: { ingredients: 33000, packaging: 11000, salary: 18000, rent: 8000, utilities: 3500, equipment: 1500, marketing: 500, other: 500 } },

  { month: 'ოქტ', year: 2024, income: 109000, expenses: 70000, profit: 39000, expensesByCategory: { ingredients: 30000, packaging: 10000, salary: 18000, rent: 8000, utilities: 3000, equipment: 500, marketing: 0, other: 500 } },

  { month: 'ნოე', year: 2024, income: 102000, expenses: 68000, profit: 34000, expensesByCategory: { ingredients: 28000, packaging: 9000, salary: 18000, rent: 8000, utilities: 3500, equipment: 1000, marketing: 0, other: 500 } },

  { month: 'დეკ', year: 2024, income: 125400, expenses: 82300, profit: 43100, expensesByCategory: { ingredients: 35200, packaging: 12400, salary: 18000, rent: 8000, utilities: 4200, equipment: 2500, marketing: 0, other: 2000 } },

]



export const mockBudgets: Budget[] = [

  { category: 'ingredients', monthlyBudget: 32000, yearlyBudget: 384000 },

  { category: 'packaging', monthlyBudget: 10000, yearlyBudget: 120000 },

  { category: 'salary', monthlyBudget: 18000, yearlyBudget: 216000 },

  { category: 'rent', monthlyBudget: 8000, yearlyBudget: 96000 },

  { category: 'utilities', monthlyBudget: 5000, yearlyBudget: 60000 },

  { category: 'equipment', monthlyBudget: 3000, yearlyBudget: 36000 },

  { category: 'marketing', monthlyBudget: 2000, yearlyBudget: 24000 },

  { category: 'other', monthlyBudget: 2000, yearlyBudget: 24000 },

]



export const expenseCategoryConfig = {

  ingredients: { name: 'ინგრედიენტები', icon: '🌾', color: 'amber' },

  packaging: { name: 'შეფუთვა', icon: '📦', color: 'blue' },

  equipment: { name: 'აღჭურვილობა', icon: '⚙️', color: 'gray' },

  utilities: { name: 'კომუნალური', icon: '💡', color: 'yellow' },

  salary: { name: 'ხელფასი', icon: '👥', color: 'green' },

  rent: { name: 'იჯარა', icon: '🏠', color: 'purple' },

  marketing: { name: 'მარკეტინგი', icon: '📢', color: 'pink' },

  other: { name: 'სხვა', icon: '📝', color: 'gray' },

}



export const incomeCategoryConfig = {

  sale: { name: 'გაყიდვა', icon: '💰' },

  deposit: { name: 'დეპოზიტი', icon: '🔒' },

  refund: { name: 'დაბრუნება', icon: '↩️' },

  other: { name: 'სხვა', icon: '📝' },

}



export const mockSuppliers = [

  { id: '1', name: 'HopUnion', category: 'ingredients' },

  { id: '2', name: 'MaltCo', category: 'ingredients' },

  { id: '3', name: 'YeastLab', category: 'ingredients' },

  { id: '4', name: 'GlassCo', category: 'packaging' },

  { id: '5', name: 'LabelPrint', category: 'packaging' },

  { id: '6', name: 'თელასი', category: 'utilities' },

  { id: '7', name: 'წყალკანალი', category: 'utilities' },

  { id: '8', name: 'რეალთა', category: 'rent' },

  { id: '9', name: 'TechBrew Ltd', category: 'equipment' },

]

export const mockCustomers = [
  { id: '1', name: 'ფუნიკულიორი' },
  { id: '2', name: 'Wine Bar 8000' },
  { id: '3', name: 'Craft Corner' },
  { id: '4', name: 'გუდვილი' },
  { id: '5', name: 'პაბი London' },
  { id: '8', name: 'BeerGe' },
]
