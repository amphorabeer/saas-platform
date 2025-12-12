// =====================================================
// Store Types
// =====================================================

export type BatchStatus = 'planned' | 'brewing' | 'fermenting' | 'conditioning' | 'ready' | 'packaged' | 'completed' | 'cancelled'
export type TankStatus = 'available' | 'in_use' | 'cleaning' | 'maintenance'
export type TankType = 'fermenter' | 'brite' | 'kettle' | 'mash_tun' | 'hlt'
export type EventType = 'brew_day' | 'fermentation' | 'packaging' | 'delivery' | 'maintenance' | 'other'
export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'

export interface GravityReading {
  id: string
  date: Date
  gravity: number
  temperature: number
  notes?: string
  recordedBy: string
}

export interface Tank {
  id: string
  name: string
  type: TankType
  capacity: number
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
  gravityReadings?: GravityReading[]
}

export interface CalendarEvent {
  id: string
  type: EventType
  title: string
  description?: string
  startDate: Date
  endDate: Date
  status: EventStatus
  batchId?: string
  tankId?: string
  color?: string
  notes?: string
}

export interface Recipe {
  id: string
  name: string
  style: string
  abv: number
  ibu: number
  og: number
  fg: number
  batchSize: number
}
