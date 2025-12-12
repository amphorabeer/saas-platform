// ტანკები - გამოიყენება: /fermentation, /calendar

export const mockTanks = [

  { 

    id: '1', 

    name: 'FV-01', 

    type: 'fermenter' as const, 

    capacity: 2000, 

    currentTemp: 18.5, 

    status: 'in_use' as const,

    currentBatchId: '1'

  },

  { 

    id: '2', 

    name: 'FV-02', 

    type: 'fermenter' as const, 

    capacity: 2000, 

    currentTemp: 12, 

    status: 'in_use' as const,

    currentBatchId: '2'

  },

  { 

    id: '3', 

    name: 'FV-03', 

    type: 'fermenter' as const, 

    capacity: 1500, 

    status: 'available' as const 

  },

  { 

    id: '4', 

    name: 'BBT-01', 

    type: 'brite' as const, 

    capacity: 2000, 

    currentTemp: 4, 

    status: 'in_use' as const,

    currentBatchId: '3'

  },

  { 

    id: '5', 

    name: 'BBT-02', 

    type: 'brite' as const, 

    capacity: 1000, 

    status: 'available' as const 

  },

  { 

    id: '6', 

    name: 'Kettle', 

    type: 'kettle' as const, 

    capacity: 500, 

    status: 'available' as const 

  },

]



// პარტიები - გამოიყენება: /production, /fermentation, /calendar

export const mockBatches = [

  {

    id: '1',

    batchNumber: 'BRW-2024-0156',

    recipeId: '1',

    recipeName: 'Georgian Amber Lager',

    style: 'Amber Lager',

    status: 'fermenting' as const,

    tankId: '1',

    tankName: 'FV-01',

    startDate: new Date('2024-12-10'),

    estimatedEndDate: new Date('2024-12-24'),

    volume: 1850,

    og: 1.052,

    currentGravity: 1.024,

    targetFg: 1.012,

    temperature: 18.5,

    progress: 65

  },

  {

    id: '2',

    batchNumber: 'BRW-2024-0155',

    recipeId: '2',

    recipeName: 'Tbilisi IPA',

    style: 'IPA',

    status: 'fermenting' as const,

    tankId: '2',

    tankName: 'FV-02',

    startDate: new Date('2024-12-05'),

    estimatedEndDate: new Date('2024-12-19'),

    volume: 2000,

    og: 1.065,

    currentGravity: 1.018,

    targetFg: 1.014,

    temperature: 12,

    progress: 90

  },

  {

    id: '3',

    batchNumber: 'BRW-2024-0154',

    recipeId: '3',

    recipeName: 'Kolkheti Wheat',

    style: 'Wheat Beer',

    status: 'conditioning' as const,

    tankId: '4',

    tankName: 'BBT-01',

    startDate: new Date('2024-12-08'),

    estimatedEndDate: new Date('2024-12-15'),

    volume: 1500,

    temperature: 4,

    progress: 70

  },

]



// კალენდრის ივენთები - გენერირდება პარტიებიდან + manual ივენთები

export const mockCalendarEvents = [

  // ფერმენტაციის ივენთები (პარტიებიდან)

  {

    id: 'evt-1',

    type: 'fermentation' as const,

    title: 'BRW-0156 ფერმენტაცია',

    batchId: '1',

    batchNumber: 'BRW-2024-0156',

    recipe: 'Georgian Amber Lager',

    tankId: '1',

    tankName: 'FV-01',

    startDate: new Date('2024-12-10'),

    endDate: new Date('2024-12-24'),

    status: 'active' as const,

    progress: 65,

    temperature: 18.5,

    notes: 'Dry hop დღე 10-ზე'

  },

  {

    id: 'evt-2',

    type: 'fermentation' as const,

    title: 'BRW-0155 ფერმენტაცია',

    batchId: '2',

    batchNumber: 'BRW-2024-0155',

    recipe: 'Tbilisi IPA',

    tankId: '2',

    tankName: 'FV-02',

    startDate: new Date('2024-12-05'),

    endDate: new Date('2024-12-19'),

    status: 'active' as const,

    progress: 90,

    temperature: 12

  },

  {

    id: 'evt-3',

    type: 'conditioning' as const,

    title: 'BRW-0154 კონდიციონირება',

    batchId: '3',

    batchNumber: 'BRW-2024-0154',

    recipe: 'Kolkheti Wheat',

    tankId: '4',

    tankName: 'BBT-01',

    startDate: new Date('2024-12-08'),

    endDate: new Date('2024-12-15'),

    status: 'active' as const,

    progress: 70,

    temperature: 4

  },

  // დაგეგმილი ხარშვები

  {

    id: 'evt-4',

    type: 'brewing' as const,

    title: 'BRW-0157 ხარშვა',

    batchNumber: 'BRW-2024-0157',

    recipe: 'Georgian Amber Lager',

    tankId: '6',

    tankName: 'Kettle',

    startDate: new Date('2024-12-16'),

    endDate: new Date('2024-12-16'),

    status: 'scheduled' as const,

    targetTank: 'FV-03'

  },

  {

    id: 'evt-5',

    type: 'brewing' as const,

    title: 'BRW-0158 ხარშვა',

    batchNumber: 'BRW-2024-0158',

    recipe: 'Svaneti Pilsner',

    tankId: '6',

    tankName: 'Kettle',

    startDate: new Date('2024-12-18'),

    endDate: new Date('2024-12-18'),

    status: 'scheduled' as const,

    targetTank: 'FV-03'

  },

  // მოვლის ივენთი

  {

    id: 'evt-6',

    type: 'maintenance' as const,

    title: 'FV-02 CIP გაწმენდა',

    tankId: '2',

    tankName: 'FV-02',

    startDate: new Date('2024-12-20'),

    endDate: new Date('2024-12-20'),

    status: 'scheduled' as const,

    notes: 'ფერმენტაციის შემდეგ'

  },

]

