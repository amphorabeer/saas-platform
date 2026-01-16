import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fixed date format to avoid hydration mismatch
const MONTHS_KA = ['იან', 'თებ', 'მარ', 'აპრ', 'მაი', 'ივნ', 'ივლ', 'აგვ', 'სექ', 'ოქტ', 'ნოე', 'დეკ']

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  const hours = d.getHours().toString().padStart(2, '0')
  const minutes = d.getMinutes().toString().padStart(2, '0')
  return `${day}.${month}.${year} ${hours}:${minutes}`
}

// Legacy format with Georgian month names (kept for backward compatibility)
export function formatDateGeorgian(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate()
  const month = MONTHS_KA[d.getMonth()]
  const year = d.getFullYear()
  return `${day} ${month}. ${year}`
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'ახლახანს'
  if (diffMins < 60) return `${diffMins} წუთის წინ`
  if (diffHours < 24) return `${diffHours} საათის წინ`
  if (diffDays < 7) return `${diffDays} დღის წინ`
  return formatDate(date)
}

export function generateBatchNumber(): string {
  const year = new Date().getFullYear()
  const num = Math.floor(Math.random() * 9000) + 1000
  return `BRW-${year}-${num}`
}

export function calculateABV(og: number, fg: number): number {
  return Number(((og - fg) * 131.25).toFixed(1))
}

// Gravity unit conversion functions
// More accurate SG to Plato conversion formula (kept for backward compatibility, but using exported version below)

export function platoToSg(plato: number): number {
  // More accurate Plato to SG conversion formula
  // Formula: SG = 1 + (°P / (258.6 - ((°P / 258.2) * 227.1)))
  return 1 + (plato / (258.6 - ((plato / 258.2) * 227.1)))
}

export function brixToSg(brix: number): number {
  return 1.000019 + (0.003865613 * brix) + (0.00001296425 * brix * brix) + (0.000000006937 * brix * brix * brix)
}

export function sgToPlato(sg: number): number {
  // Formula: °P = (-616.868) + (1111.14 * SG) - (630.272 * SG²) + (135.997 * SG³)
  return (-616.868) + (1111.14 * sg) - (630.272 * sg * sg) + (135.997 * sg * sg * sg)
}

export function sgToBrix(sg: number): number {
  return (((182.4601 * sg - 775.6821) * sg + 1262.7794) * sg - 669.5622)
}

export function getGravityUnit(): 'SG' | 'Plato' | 'Brix' {
  if (typeof window === 'undefined') return 'SG'
  try {
    const stored = localStorage.getItem('brewery-settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.state?.productionSettings?.gravityUnit) {
        return parsed.state.productionSettings.gravityUnit
      }
    }
  } catch (e) {
    console.error('Error reading gravity unit from store:', e)
  }
  return 'SG'
}

// Get current volume unit from store (defaults to L if store not available)
function getVolumeUnit(): 'L' | 'gal' | 'bbl' {
  if (typeof window === 'undefined') return 'L'
  try {
    const stored = localStorage.getItem('brewery-settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.state?.productionSettings?.volumeUnit) {
        return parsed.state.productionSettings.volumeUnit
      }
    }
  } catch (e) {
    console.error('Error reading volume unit from store:', e)
  }
  return 'L'
}

export function formatGravity(gravity: number): string {
  const unit = getGravityUnit()
  
  if (unit === 'SG') {
    return gravity.toFixed(3)
  } else if (unit === 'Plato') {
    const plato = sgToPlato(gravity)
    return `${plato.toFixed(1)}°P`
  } else if (unit === 'Brix') {
    const brix = sgToBrix(gravity)
    return `${brix.toFixed(1)}°Bx`
  }
  
  return gravity.toFixed(3)
}

export function formatVolume(liters: number): string {
  const unit = getVolumeUnit()
  
  if (unit === 'L') {
    if (liters >= 1000) {
      return `${(liters / 1000).toFixed(1)}k L`
    }
    return `${liters.toFixed(1)} L`
  } else if (unit === 'gal') {
    const gallons = liters / 3.78541
    if (gallons >= 1000) {
      return `${(gallons / 1000).toFixed(1)}k gal`
    }
    return `${gallons.toFixed(1)} gal`
  } else if (unit === 'bbl') {
    const barrels = liters / 117.34777 // 1 US beer barrel = 117.34777 liters
    return `${barrels.toFixed(2)} bbl`
  }
  
  return `${liters.toFixed(1)} L`
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function getProgress(current: number, target: number): number {
  if (target === 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

// Get batch prefix from settings (defaults to 'BRW-' if store not available)
export function getBatchPrefix(): string {
  if (typeof window === 'undefined') return 'BRW-'
  try {
    const stored = localStorage.getItem('brewery-settings')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.state?.productionSettings?.batchPrefix) {
        return parsed.state.productionSettings.batchPrefix
      }
    }
  } catch (e) {
    console.error('Error reading batch prefix from store:', e)
  }
  return 'BRW-'
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
