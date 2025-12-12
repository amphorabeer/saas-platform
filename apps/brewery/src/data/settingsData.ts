export type UserRole = 'admin' | 'manager' | 'operator' | 'viewer'
export type UserStatus = 'active' | 'inactive'
export type Theme = 'dark' | 'light' | 'system'
export type AccentColor = 'copper' | 'blue' | 'green' | 'purple' | 'red'
export type DateFormat = 'DD.MM.YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
export type Currency = 'GEL' | 'USD' | 'EUR'
export type GravityUnit = 'SG' | 'Plato' | 'Brix'
export type VolumeUnit = 'L' | 'gal' | 'bbl'

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  role: UserRole
  position?: string
  status: UserStatus
  avatarUrl?: string
  lastActivity?: Date
  createdAt: Date
  twoFactorEnabled: boolean
}

export interface CompanySettings {
  name: string
  legalName: string
  taxId: string
  address: string
  phone: string
  email: string
  website?: string
  logoUrl?: string
  bankName?: string
  bankAccount?: string
  bankSwift?: string
}

export interface AppearanceSettings {
  theme: Theme
  accentColor: AccentColor
  language: 'ka' | 'en' | 'ru'
  dateFormat: DateFormat
  currency: Currency
  numberFormat: string
}

export interface NotificationSettings {
  emailNotifications: {
    lowStock: boolean
    newOrder: boolean
    orderStatusChange: boolean
    invoiceDue: boolean
    maintenanceReminder: boolean
    dailySummary: boolean
    weeklyReport: boolean
  }
  pushNotifications: {
    fermentationComplete: boolean
    temperatureAlert: boolean
    criticalStock: boolean
    newOrder: boolean
  }
  recipients: {
    [key: string]: string[]
  }
}

export interface ProductionSettings {
  batchPrefix: string
  batchFormat: string
  nextBatchNumber: number
  defaultFermentationTemp: number
  defaultFermentationDays: number
  defaultConditioningTemp: number
  defaultConditioningDays: number
  tempAlertMin: number
  tempAlertMax: number
  tempAlertThreshold: number
  gravityUnit: GravityUnit
  volumeUnit: VolumeUnit
}

export interface FinanceSettings {
  outgoingInvoicePrefix: string
  incomingInvoicePrefix: string
  nextOutgoingNumber: number
  nextIncomingNumber: number
  defaultPaymentTermDays: number
  lateFeePercentage: number
  vatPercentage: number
  vatIncluded: boolean
  defaultIncomeAccount: string
  defaultExpenseAccount: string
  defaultBankAccount: string
}

export interface Integration {
  id: string
  name: string
  type: 'email' | 'sheets' | 'stripe' | 'telegram' | 'api'
  status: 'active' | 'inactive' | 'error'
  config: Record<string, any>
  lastSync?: Date
}

export interface SecuritySettings {
  minPasswordLength: number
  requireUppercase: boolean
  requireNumber: boolean
  requireSpecialChar: boolean
  passwordExpiryDays: number
  sessionDurationHours: number
  autoLogoutEnabled: boolean
  autoLogoutMinutes: number
  twoFactorRequired: 'none' | 'admin' | 'all'
  logLogins: boolean
  logActions: boolean
  logRetentionDays: number
}

export interface ActivityLog {
  id: string
  userId: string
  userName: string
  action: string
  details?: string
  ipAddress: string
  timestamp: Date
}

export interface Backup {
  id: string
  date: Date
  size: number
  status: 'success' | 'failed'
  downloadUrl?: string
}

export const mockUsers: User[] = [
  {
    id: '1',
    firstName: 'ნიკა',
    lastName: 'ზედგინიძე',
    email: 'nika@brewmaster.ge',
    phone: '+995 555 123 456',
    role: 'admin',
    position: 'მთავარი მეხარშე',
    status: 'active',
    lastActivity: new Date(),
    createdAt: new Date('2022-01-15'),
    twoFactorEnabled: true,
  },
  {
    id: '2',
    firstName: 'გიორგი',
    lastName: 'კაპანაძე',
    email: 'giorgi@brewmaster.ge',
    phone: '+995 555 234 567',
    role: 'manager',
    position: 'QC მენეჯერი',
    status: 'active',
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
    createdAt: new Date('2022-03-20'),
    twoFactorEnabled: false,
  },
  {
    id: '3',
    firstName: 'მარიამ',
    lastName: 'წერეთელი',
    email: 'mariam@brewmaster.ge',
    phone: '+995 555 345 678',
    role: 'operator',
    position: 'ლაბორანტი',
    status: 'active',
    lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000),
    createdAt: new Date('2023-01-10'),
    twoFactorEnabled: false,
  },
  {
    id: '4',
    firstName: 'დავით',
    lastName: 'მაისურაძე',
    email: 'davit@brewmaster.ge',
    role: 'operator',
    position: 'ოპერატორი',
    status: 'inactive',
    lastActivity: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    createdAt: new Date('2023-06-15'),
    twoFactorEnabled: false,
  },
]

export const mockCompanySettings: CompanySettings = {
  name: 'BrewMaster PRO',
  legalName: 'შპს ბრიუმასტერი',
  taxId: '404123456',
  address: 'თბილისი, საბურთალო, ვაჟა-ფშაველას გამზ. 71',
  phone: '+995 555 123 456',
  email: 'info@brewmaster.ge',
  website: 'www.brewmaster.ge',
  bankName: 'საქართველოს ბანკი',
  bankAccount: 'GE29BG0000000123456789',
  bankSwift: 'BAGAGE22',
}

export const mockAppearanceSettings: AppearanceSettings = {
  theme: 'dark',
  accentColor: 'copper',
  language: 'ka',
  dateFormat: 'DD.MM.YYYY',
  currency: 'GEL',
  numberFormat: '1,234.56',
}

export const mockProductionSettings: ProductionSettings = {
  batchPrefix: 'BRW-',
  batchFormat: 'BRW-YYYY-NNNN',
  nextBatchNumber: 157,
  defaultFermentationTemp: 18,
  defaultFermentationDays: 14,
  defaultConditioningTemp: 4,
  defaultConditioningDays: 7,
  tempAlertMin: 2,
  tempAlertMax: 25,
  tempAlertThreshold: 2,
  gravityUnit: 'SG',
  volumeUnit: 'L',
}

export const mockFinanceSettings: FinanceSettings = {
  outgoingInvoicePrefix: 'INV-S-',
  incomingInvoicePrefix: 'INV-P-',
  nextOutgoingNumber: 90,
  nextIncomingNumber: 46,
  defaultPaymentTermDays: 14,
  lateFeePercentage: 0.1,
  vatPercentage: 18,
  vatIncluded: false,
  defaultIncomeAccount: '4100 - გაყიდვები',
  defaultExpenseAccount: '5100 - მასალები',
  defaultBankAccount: '1100 - საბანკო ანგარიში',
}

export const mockIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Email (SMTP)',
    type: 'email',
    status: 'active',
    config: {
      host: 'smtp.gmail.com',
      port: 587,
      username: 'brewmaster@gmail.com',
    },
    lastSync: new Date('2024-12-12T14:30:00'),
  },
  {
    id: '2',
    name: 'Google Sheets',
    type: 'sheets',
    status: 'active',
    config: {
      sheetId: 'brewmaster-data',
    },
    lastSync: new Date('2024-12-12T12:00:00'),
  },
  {
    id: '3',
    name: 'Stripe',
    type: 'stripe',
    status: 'inactive',
    config: {},
  },
  {
    id: '4',
    name: 'Telegram Bot',
    type: 'telegram',
    status: 'inactive',
    config: {},
  },
  {
    id: '5',
    name: 'Inventory API',
    type: 'api',
    status: 'inactive',
    config: {},
  },
]

export const mockSecuritySettings: SecuritySettings = {
  minPasswordLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
  passwordExpiryDays: 90,
  sessionDurationHours: 24,
  autoLogoutEnabled: true,
  autoLogoutMinutes: 30,
  twoFactorRequired: 'admin',
  logLogins: true,
  logActions: true,
  logRetentionDays: 365,
}

export const mockActivityLog: ActivityLog[] = [
  { id: '1', userId: '1', userName: 'ნიკა ზედგინიძე', action: 'შესვლა', ipAddress: '192.168.1.1', timestamp: new Date('2024-12-12T14:30:00') },
  { id: '2', userId: '2', userName: 'გიორგი კაპანაძე', action: 'პარტიის შექმნა', details: 'BRW-2024-0156', ipAddress: '192.168.1.2', timestamp: new Date('2024-12-12T14:25:00') },
  { id: '3', userId: '3', userName: 'მარიამ წერეთელი', action: 'შესვლა', ipAddress: '192.168.1.3', timestamp: new Date('2024-12-12T14:00:00') },
  { id: '4', userId: '1', userName: 'ნიკა ზედგინიძე', action: 'პარამეტრების ცვლილება', details: 'წარმოების პარამეტრები', ipAddress: '192.168.1.1', timestamp: new Date('2024-12-12T13:45:00') },
  { id: '5', userId: '2', userName: 'გიორგი კაპანაძე', action: 'ინვოისის შექმნა', details: 'INV-S-089', ipAddress: '192.168.1.2', timestamp: new Date('2024-12-12T13:30:00') },
]

export const mockBackups: Backup[] = [
  { id: '1', date: new Date('2024-12-12T03:00:00'), size: 245 * 1024 * 1024, status: 'success' },
  { id: '2', date: new Date('2024-12-11T03:00:00'), size: 243 * 1024 * 1024, status: 'success' },
  { id: '3', date: new Date('2024-12-10T03:00:00'), size: 240 * 1024 * 1024, status: 'success' },
  { id: '4', date: new Date('2024-12-09T03:00:00'), size: 238 * 1024 * 1024, status: 'success' },
  { id: '5', date: new Date('2024-12-08T03:00:00'), size: 0, status: 'failed' },
]

export const rolePermissions = {
  admin: { production: 'full', inventory: 'full', sales: 'full', finances: 'full', settings: 'full' },
  manager: { production: 'full', inventory: 'full', sales: 'full', finances: 'view', settings: 'none' },
  operator: { production: 'full', inventory: 'view', sales: 'none', finances: 'none', settings: 'none' },
  viewer: { production: 'view', inventory: 'view', sales: 'view', finances: 'none', settings: 'none' },
}

export const roleConfig = {
  admin: { name: 'ადმინისტრატორი', icon: '👑', color: 'purple' },
  manager: { name: 'მენეჯერი', icon: '🔧', color: 'blue' },
  operator: { name: 'ოპერატორი', icon: '👤', color: 'green' },
  viewer: { name: 'მნახველი', icon: '👁️', color: 'gray' },
}

export const getRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMinutes < 1) return 'ახლა'
  if (diffMinutes < 60) return `${diffMinutes} წთ წინ`
  if (diffHours < 24) return `${diffHours} სთ წინ`
  if (diffDays < 7) return `${diffDays} დღის წინ`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} კვირის წინ`
  return `${Math.floor(diffDays / 30)} თვის წინ`
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

