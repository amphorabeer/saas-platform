export type EquipmentType = 'fermenter' | 'brite' | 'kettle' | 'mash_tun' | 'hlt' | 'pump' | 'chiller' | 'cip' | 'other'

export type EquipmentStatus = 'operational' | 'needs_maintenance' | 'under_maintenance' | 'out_of_service'

export type MaintenanceType = 'cip' | 'inspection' | 'annual' | 'corrective' | 'other'

export type Priority = 'low' | 'medium' | 'high'

export type Severity = 'low' | 'medium' | 'high'



export interface Equipment {

  id: string

  name: string

  type: EquipmentType

  model?: string

  manufacturer?: string

  serialNumber?: string

  capacity?: number

  workingPressure?: number

  installationDate: Date

  warrantyDate?: Date

  location: string

  status: EquipmentStatus

  currentTemp?: number

  currentPressure?: number

  currentBatchId?: string

  currentBatchNumber?: string

  lastCIP?: Date

  nextCIP?: Date

  cipIntervalDays: number

  inspectionIntervalDays: number

  annualMaintenanceDate?: Date

  totalHours?: number

  totalBatches?: number

  uptime?: number

  notes?: string

}



export interface MaintenanceRecord {

  id: string

  equipmentId: string

  equipmentName: string

  type: MaintenanceType

  status: 'scheduled' | 'completed' | 'overdue'

  scheduledDate: Date

  completedDate?: Date

  duration?: number

  performedBy?: string

  cost?: number

  partsUsed?: string[]

  description?: string

  priority: Priority

}



export interface CIPLog {

  id: string

  equipmentId: string

  equipmentName: string

  cipType: 'full' | 'caustic_only' | 'sanitizer_only' | 'rinse'

  date: Date

  duration: number

  temperature?: number

  causticConcentration?: number

  performedBy: string

  result: 'success' | 'needs_repeat' | 'problem'

  notes?: string

}



export interface ProblemReport {

  id: string

  equipmentId: string

  equipmentName: string

  problemType: string

  severity: Severity

  description: string

  reportedDate: Date

  reportedBy: string

  status: 'open' | 'in_progress' | 'resolved'

  resolvedDate?: Date

  resolution?: string

  photoUrl?: string

}



export interface SparePart {

  id: string

  name: string

  category: string

  compatibleEquipment: string[]

  quantity: number

  minQuantity: number

  price: number

  supplier?: string

  notes?: string

}



export const mockEquipment: Equipment[] = [

  {

    id: '1',

    name: 'FV-01',

    type: 'fermenter',

    model: 'Unitank 2000',

    manufacturer: 'SS Brewtech',

    serialNumber: 'SSB-2022-0458',

    capacity: 2000,

    workingPressure: 2.0,

    installationDate: new Date('2022-03-15'),

    warrantyDate: new Date('2025-03-15'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'operational',

    currentTemp: 18.5,

    currentPressure: 1.2,

    currentBatchId: '1',

    currentBatchNumber: 'BRW-2024-0156',

    lastCIP: new Date('2024-12-09'),

    nextCIP: new Date('2024-12-16'),

    cipIntervalDays: 7,

    inspectionIntervalDays: 30,

    annualMaintenanceDate: new Date('2025-03-15'),

    totalHours: 850,

    totalBatches: 28,

    uptime: 98.5,

  },

  {

    id: '2',

    name: 'FV-02',

    type: 'fermenter',

    model: 'Unitank 2000',

    manufacturer: 'SS Brewtech',

    serialNumber: 'SSB-2022-0459',

    capacity: 2000,

    installationDate: new Date('2022-03-15'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'operational',

    currentTemp: 12,

    currentBatchId: '2',

    currentBatchNumber: 'BRW-2024-0155',

    lastCIP: new Date('2024-12-07'),

    nextCIP: new Date('2024-12-14'),

    cipIntervalDays: 7,

    inspectionIntervalDays: 30,

  },

  {

    id: '3',

    name: 'FV-03',

    type: 'fermenter',

    model: 'Unitank 1500',

    manufacturer: 'SS Brewtech',

    capacity: 1500,

    installationDate: new Date('2023-01-20'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'needs_maintenance',

    lastCIP: new Date('2024-11-30'),

    nextCIP: new Date('2024-12-10'),

    cipIntervalDays: 7,

    inspectionIntervalDays: 30,

  },

  {

    id: '4',

    name: 'BBT-01',

    type: 'brite',

    model: 'Brite Tank 2000',

    manufacturer: 'SS Brewtech',

    capacity: 2000,

    installationDate: new Date('2022-03-15'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'operational',

    currentTemp: 4,

    currentBatchId: '3',

    currentBatchNumber: 'BRW-2024-0154',

    lastCIP: new Date('2024-12-08'),

    nextCIP: new Date('2024-12-15'),

    cipIntervalDays: 7,

    inspectionIntervalDays: 30,

  },

  {

    id: '5',

    name: 'BBT-02',

    type: 'brite',

    model: 'Brite Tank 1000',

    manufacturer: 'SS Brewtech',

    capacity: 1000,

    installationDate: new Date('2023-06-10'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'operational',

    lastCIP: new Date('2024-12-08'),

    nextCIP: new Date('2024-12-15'),

    cipIntervalDays: 7,

    inspectionIntervalDays: 30,

  },

  {

    id: '6',

    name: 'Kettle',

    type: 'kettle',

    model: 'Brew Kettle 500',

    manufacturer: 'Blichmann',

    capacity: 500,

    installationDate: new Date('2022-01-10'),

    location: 'სახარში დარბაზი',

    status: 'operational',

    lastCIP: new Date('2024-12-07'),

    nextCIP: new Date('2024-12-18'),

    cipIntervalDays: 10,

    inspectionIntervalDays: 60,

  },

  {

    id: '7',

    name: 'Mash Tun',

    type: 'mash_tun',

    model: 'MT-500',

    manufacturer: 'Blichmann',

    capacity: 500,

    installationDate: new Date('2022-01-10'),

    location: 'სახარში დარბაზი',

    status: 'operational',

    cipIntervalDays: 10,

    inspectionIntervalDays: 60,

  },

  {

    id: '8',

    name: 'HLT',

    type: 'hlt',

    model: 'Hot Liquor Tank 800',

    manufacturer: 'Blichmann',

    capacity: 800,

    installationDate: new Date('2022-01-10'),

    location: 'სახარში დარბაზი',

    status: 'operational',

    currentTemp: 78,

    cipIntervalDays: 14,

    inspectionIntervalDays: 60,

  },

  {

    id: '9',

    name: 'Pump-01',

    type: 'pump',

    model: 'March Pump',

    manufacturer: 'March',

    installationDate: new Date('2022-01-10'),

    location: 'სახარში დარბაზი',

    status: 'operational',

    inspectionIntervalDays: 30,

    cipIntervalDays: 7,

  },

  {

    id: '10',

    name: 'Pump-02',

    type: 'pump',

    model: 'March Pump',

    manufacturer: 'March',

    installationDate: new Date('2023-03-15'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'needs_maintenance',

    inspectionIntervalDays: 30,

    cipIntervalDays: 7,

  },

  {

    id: '11',

    name: 'Chiller',

    type: 'chiller',

    model: 'Glycol Chiller GC-1',

    manufacturer: 'G&D Chillers',

    installationDate: new Date('2022-03-01'),

    location: 'ტექნიკური ოთახი',

    status: 'operational',

    inspectionIntervalDays: 90,

    cipIntervalDays: 0,

  },

  {

    id: '12',

    name: 'CIP Station',

    type: 'cip',

    model: 'CIP-200',

    manufacturer: 'Alfa Laval',

    capacity: 200,

    installationDate: new Date('2022-03-15'),

    location: 'საფერმენტაციო დარბაზი',

    status: 'operational',

    inspectionIntervalDays: 30,

    cipIntervalDays: 0,

  },

]



export const mockMaintenanceRecords: MaintenanceRecord[] = [

  {

    id: '1',

    equipmentId: '3',

    equipmentName: 'FV-03',

    type: 'cip',

    status: 'overdue',

    scheduledDate: new Date('2024-12-10'),

    priority: 'high',

  },

  {

    id: '2',

    equipmentId: '10',

    equipmentName: 'Pump-02',

    type: 'inspection',

    status: 'overdue',

    scheduledDate: new Date('2024-12-08'),

    priority: 'medium',

  },

  {

    id: '3',

    equipmentId: '4',

    equipmentName: 'BBT-01',

    type: 'cip',

    status: 'scheduled',

    scheduledDate: new Date('2024-12-15'),

    priority: 'medium',

  },

  {

    id: '4',

    equipmentId: '9',

    equipmentName: 'Pump-01',

    type: 'inspection',

    status: 'scheduled',

    scheduledDate: new Date('2024-12-17'),

    priority: 'low',

  },

  {

    id: '5',

    equipmentId: '1',

    equipmentName: 'FV-01',

    type: 'cip',

    status: 'completed',

    scheduledDate: new Date('2024-12-09'),

    completedDate: new Date('2024-12-09'),

    duration: 45,

    performedBy: 'ნიკა ზედგინიძე',

    priority: 'medium',

  },

  {

    id: '6',

    equipmentId: '6',

    equipmentName: 'Kettle',

    type: 'cip',

    status: 'scheduled',

    scheduledDate: new Date('2024-12-18'),

    priority: 'medium',

  },

  {

    id: '7',

    equipmentId: '11',

    equipmentName: 'Chiller',

    type: 'inspection',

    status: 'scheduled',

    scheduledDate: new Date('2025-01-02'),

    priority: 'low',

  },

  {

    id: '8',

    equipmentId: '2',

    equipmentName: 'FV-02',

    type: 'annual',

    status: 'scheduled',

    scheduledDate: new Date('2025-01-15'),

    priority: 'high',

  },

]



export const mockCIPLogs: CIPLog[] = [

  {

    id: '1',

    equipmentId: '1',

    equipmentName: 'FV-01',

    cipType: 'full',

    date: new Date('2024-12-09T10:30:00'),

    duration: 45,

    temperature: 80,

    causticConcentration: 2.5,

    performedBy: 'ნიკა ზედგინიძე',

    result: 'success',

    notes: 'OK',

  },

  {

    id: '2',

    equipmentId: '1',

    equipmentName: 'FV-01',

    cipType: 'rinse',

    date: new Date('2024-12-02T14:00:00'),

    duration: 15,

    performedBy: 'გიორგი კაპანაძე',

    result: 'success',

  },

  {

    id: '3',

    equipmentId: '1',

    equipmentName: 'FV-01',

    cipType: 'full',

    date: new Date('2024-11-25T09:00:00'),

    duration: 50,

    temperature: 80,

    causticConcentration: 2.5,

    performedBy: 'ნიკა ზედგინიძე',

    result: 'success',

    notes: 'კაუსტიკის კონცენტრაცია ↑',

  },

  {

    id: '4',

    equipmentId: '1',

    equipmentName: 'FV-01',

    cipType: 'sanitizer_only',

    date: new Date('2024-11-18T11:00:00'),

    duration: 30,

    performedBy: 'მარიამ წერეთელი',

    result: 'success',

  },

]



export const mockProblemReports: ProblemReport[] = [

  {

    id: '1',

    equipmentId: '1',

    equipmentName: 'FV-01',

    problemType: 'სენსორის ცდომილება',

    severity: 'medium',

    description: 'ტემპერატურის სენსორი აჩვენებს 2°C-ით მეტს',

    reportedDate: new Date('2024-12-05'),

    reportedBy: 'ნიკა ზედგინიძე',

    status: 'resolved',

    resolvedDate: new Date('2024-12-06'),

    resolution: 'სენსორის კალიბრაცია',

  },

  {

    id: '2',

    equipmentId: '1',

    equipmentName: 'FV-01',

    problemType: 'გაჟონვა',

    severity: 'high',

    description: 'გაჟონვა ზედა manway gasket-ზე',

    reportedDate: new Date('2024-11-20'),

    reportedBy: 'გიორგი კაპანაძე',

    status: 'resolved',

    resolvedDate: new Date('2024-11-20'),

    resolution: 'Gasket-ის შეცვლა',

  },

  {

    id: '3',

    equipmentId: '1',

    equipmentName: 'FV-01',

    problemType: 'CIP პრობლემა',

    severity: 'medium',

    description: 'CIP spray ball დაბლოკილი',

    reportedDate: new Date('2024-09-15'),

    reportedBy: 'ნიკა ზედგინიძე',

    status: 'resolved',

    resolvedDate: new Date('2024-09-15'),

    resolution: 'გაწმენდა',

  },

]



export const mockSpareParts: SparePart[] = [

  { id: '1', name: 'Tri-clamp gasket 4"', category: 'სილიკონი', compatibleEquipment: ['1','2','3','4','5'], quantity: 8, minQuantity: 5, price: 15 },

  { id: '2', name: 'Tri-clamp gasket 2"', category: 'სილიკონი', compatibleEquipment: ['9','10'], quantity: 12, minQuantity: 5, price: 10 },

  { id: '3', name: 'თერმომეტრის probe', category: 'სენსორი', compatibleEquipment: ['1','2','3','4','5'], quantity: 2, minQuantity: 2, price: 120 },

  { id: '4', name: 'PRV valve 2 bar', category: 'უსაფრთხოება', compatibleEquipment: ['1','2','3'], quantity: 0, minQuantity: 1, price: 85 },

  { id: '5', name: 'Pump seal kit', category: 'ტუმბო', compatibleEquipment: ['9','10'], quantity: 1, minQuantity: 2, price: 150 },

  { id: '6', name: 'CIP spray ball', category: 'გაწმენდა', compatibleEquipment: ['1','2','3','4','5'], quantity: 3, minQuantity: 2, price: 95 },

  { id: '7', name: 'Sight glass gasket', category: 'სილიკონი', compatibleEquipment: ['1','2','3','4','5','6'], quantity: 6, minQuantity: 4, price: 25 },

  { id: '8', name: 'Butterfly valve seat', category: 'სარქველი', compatibleEquipment: ['1','2','3','4','5','6','7','8'], quantity: 0, minQuantity: 2, price: 45 },

]



export const equipmentTypeConfig = {

  fermenter: { name: 'ფერმენტატორი', icon: '🧪' },

  brite: { name: 'Brite Tank', icon: '🍺' },

  kettle: { name: 'სახარში ქვაბი', icon: '🔥' },

  mash_tun: { name: 'Mash Tun', icon: '🌾' },

  hlt: { name: 'HLT', icon: '♨️' },

  pump: { name: 'ტუმბო', icon: '💨' },

  chiller: { name: 'გამაცივებელი', icon: '❄️' },

  cip: { name: 'CIP სისტემა', icon: '🧹' },

  other: { name: 'სხვა', icon: '⚙️' },

}



export const maintenanceTypeConfig = {

  cip: { name: 'CIP გაწმენდა', icon: '🧹' },

  inspection: { name: 'ტექ. შემოწმება', icon: '🔧' },

  annual: { name: 'წლიური მოვლა', icon: '🛠️' },

  corrective: { name: 'კორექტირება', icon: '⚡' },

  other: { name: 'სხვა', icon: '📝' },

}



export const mockTesters = [

  { id: '1', name: 'ნიკა ზედგინიძე', role: 'მთავარი მეხარშე' },

  { id: '2', name: 'გიორგი კაპანაძე', role: 'QC მენეჯერი' },

  { id: '3', name: 'მარიამ წერეთელი', role: 'ლაბორანტი' },

]

