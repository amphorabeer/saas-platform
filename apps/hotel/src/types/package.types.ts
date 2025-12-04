export interface PackageDefinition {
  id: string
  code: string
  name: string
  type: 'RO' | 'BB' | 'HB' | 'FB' | 'AI' // Room Only, Bed&Breakfast, Half Board, Full Board, All Inclusive
  
  // Components
  components: PackageComponent[]
  
  // Pricing
  pricePerPerson: number
  pricePerChild: number
  childAgeLimit: number
  
  // Rules
  postingRules: PostingRule[]
  active: boolean
}

export interface PackageComponent {
  id: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'beverage' | 'spa' | 'extras'
  name: string
  
  // Value
  retailValue: number
  costValue: number
  
  // Posting
  postTime?: string // When to post (e.g., "07:00" for breakfast)
  department?: string // Revenue department
  taxRate: number
  
  // Rules
  mandatory: boolean
  allowSubstitution: boolean
  maxQuantity?: number
}

export interface PostingRule {
  component: string
  postingTime: 'night-audit' | 'consumption' | 'check-out'
  splitByNights: boolean
  accountCode: string
}

export interface ReservationPackage {
  reservationId: string
  packageId: string
  adults: number
  children: number
  startDate: string
  endDate: string
  
  // Tracking
  postedDates: string[] // Track which dates have been posted
  consumptions: PackageConsumption[]
}

export interface PackageConsumption {
  date: string
  component: string
  quantity: number
  posted: boolean
  postedAt?: string
  amount: number
}



