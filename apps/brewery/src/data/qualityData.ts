export type TestType = 'gravity' | 'ph' | 'abv' | 'ibu' | 'color' | 'sensory' | 'microbiology'

export type TestStatus = 'pending' | 'in_progress' | 'passed' | 'warning' | 'failed'

export type Priority = 'low' | 'medium' | 'high'



export interface QCTest {

  id: string

  batchId: string

  batchNumber: string

  recipeName: string

  testType: TestType

  testName: string

  scheduledDate: Date

  completedDate?: Date

  result?: number | string

  unit: string

  minValue: number

  maxValue: number

  status: TestStatus

  priority: Priority

  performedBy?: string

  notes?: string

}



export interface SensoryTest {

  id: string

  batchId: string

  batchNumber: string

  recipeName: string

  aroma: number

  taste: number

  body: number

  bitterness: number

  finish: number

  appearance: number

  averageScore: number

  defects: string[]

  performedBy: string

  completedDate: Date

  notes?: string

}



export interface BatchQCStatus {

  batchId: string

  batchNumber: string

  recipeName: string

  batchStatus: string

  tankName: string

  totalTests: number

  completedTests: number

  passedTests: number

  warningTests: number

  failedTests: number

  tests: QCTest[]

}



export const mockQCTests: QCTest[] = [

  // მოლოდინში

  {

    id: '1',

    batchId: '1',

    batchNumber: 'BRW-2024-0156',

    recipeName: 'Georgian Amber Lager',

    testType: 'ph',

    testName: 'pH ტესტი',

    scheduledDate: new Date('2024-12-12T14:00:00'),

    unit: '',

    minValue: 4.0,

    maxValue: 4.5,

    status: 'pending',

    priority: 'high',

  },

  {

    id: '2',

    batchId: '1',

    batchNumber: 'BRW-2024-0156',

    recipeName: 'Georgian Amber Lager',

    testType: 'gravity',

    testName: 'გრავიტაცია',

    scheduledDate: new Date('2024-12-12T14:00:00'),

    unit: 'SG',

    minValue: 1.010,

    maxValue: 1.014,

    status: 'pending',

    priority: 'high',

  },

  {

    id: '3',

    batchId: '2',

    batchNumber: 'BRW-2024-0155',

    recipeName: 'Tbilisi IPA',

    testType: 'sensory',

    testName: 'სენსორული შეფასება',

    scheduledDate: new Date('2024-12-13T10:00:00'),

    unit: 'ქულა',

    minValue: 7,

    maxValue: 10,

    status: 'pending',

    priority: 'medium',

  },

  {

    id: '4',

    batchId: '2',

    batchNumber: 'BRW-2024-0155',

    recipeName: 'Tbilisi IPA',

    testType: 'abv',

    testName: 'ABV',

    scheduledDate: new Date('2024-12-11T15:00:00'),

    completedDate: new Date('2024-12-11T15:30:00'),

    result: 6.5,

    unit: '%',

    minValue: 6.0,

    maxValue: 7.0,

    status: 'passed',

    priority: 'medium',

    performedBy: 'ნიკა ზედგინიძე',

  },

  {

    id: '5',

    batchId: '2',

    batchNumber: 'BRW-2024-0155',

    recipeName: 'Tbilisi IPA',

    testType: 'ph',

    testName: 'pH',

    scheduledDate: new Date('2024-12-11T14:00:00'),

    completedDate: new Date('2024-12-11T14:20:00'),

    result: 4.2,

    unit: '',

    minValue: 4.0,

    maxValue: 4.5,

    status: 'passed',

    priority: 'medium',

    performedBy: 'ნიკა ზედგინიძე',

  },

  {

    id: '6',

    batchId: '3',

    batchNumber: 'BRW-2024-0154',

    recipeName: 'Kolkheti Wheat',

    testType: 'ibu',

    testName: 'IBU',

    scheduledDate: new Date('2024-12-10T11:00:00'),

    completedDate: new Date('2024-12-10T11:20:00'),

    result: 45,

    unit: 'IBU',

    minValue: 35,

    maxValue: 50,

    status: 'passed',

    priority: 'low',

    performedBy: 'გიორგი კაპანაძე',

  },

  // გაფრთხილება

  {

    id: '7',

    batchId: '3',

    batchNumber: 'BRW-2024-0154',

    recipeName: 'Kolkheti Wheat',

    testType: 'color',

    testName: 'ფერი (SRM)',

    scheduledDate: new Date('2024-12-10T11:00:00'),

    completedDate: new Date('2024-12-10T11:10:00'),

    result: 12,

    unit: 'SRM',

    minValue: 8,

    maxValue: 10,

    status: 'warning',

    priority: 'low',

    performedBy: 'გიორგი კაპანაძე',

    notes: 'ოდნავ მუქი ვიდრე მოსალოდნელი',

  },

  // ჩაჭრილი

  {

    id: '8',

    batchId: '4',

    batchNumber: 'BRW-2024-0153',

    recipeName: 'Caucasus Stout',

    testType: 'microbiology',

    testName: 'მიკრობიოლოგია',

    scheduledDate: new Date('2024-12-09T16:00:00'),

    completedDate: new Date('2024-12-09T16:45:00'),

    result: 25,

    unit: 'CFU/mL',

    minValue: 0,

    maxValue: 10,

    status: 'failed',

    priority: 'high',

    performedBy: 'ნიკა ზედგინიძე',

    notes: 'საჭიროა ხელახალი შემოწმება და სანიტარიზაცია',

  },

]



export const mockSensoryTests: SensoryTest[] = [

  {

    id: 's1',

    batchId: '3',

    batchNumber: 'BRW-2024-0154',

    recipeName: 'Kolkheti Wheat',

    aroma: 8,

    taste: 8,

    body: 7,

    bitterness: 6,

    finish: 7,

    appearance: 9,

    averageScore: 7.5,

    defects: [],

    performedBy: 'ნიკა ზედგინიძე',

    completedDate: new Date('2024-12-10T12:00:00'),

    notes: 'კარგი ბალანსი, ტიპიური wheat beer არომატი',

  },

]



export const mockTesters = [

  { id: '1', name: 'ნიკა ზედგინიძე', role: 'მთავარი ტექნოლოგი' },

  { id: '2', name: 'გიორგი კაპანაძე', role: 'QC მენეჯერი' },

  { id: '3', name: 'მარიამ წერეთელი', role: 'ლაბორანტი' },

]



export const testTypeConfig = {

  gravity: { name: 'გრავიტაცია', icon: '🔬', unit: 'SG', defaultMin: 1.008, defaultMax: 1.020 },

  ph: { name: 'pH', icon: '🧪', unit: '', defaultMin: 4.0, defaultMax: 4.5 },

  abv: { name: 'ABV', icon: '🍺', unit: '%', defaultMin: 4.0, defaultMax: 8.0 },

  ibu: { name: 'IBU', icon: '🌿', unit: 'IBU', defaultMin: 15, defaultMax: 70 },

  color: { name: 'ფერი', icon: '🎨', unit: 'SRM', defaultMin: 2, defaultMax: 40 },

  sensory: { name: 'სენსორული', icon: '👅', unit: 'ქულა', defaultMin: 7, defaultMax: 10 },

  microbiology: { name: 'მიკრობიოლოგია', icon: '🦠', unit: 'CFU/mL', defaultMin: 0, defaultMax: 10 },

}



export const getTestStatus = (result: number, min: number, max: number): TestStatus => {

  if (result >= min && result <= max) return 'passed'

  

  const range = max - min

  const tolerance = range * 0.1 // 10% tolerance

  

  if (result >= min - tolerance && result <= max + tolerance) return 'warning'

  

  return 'failed'

}

