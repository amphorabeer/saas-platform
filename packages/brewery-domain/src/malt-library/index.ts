/**
 * Malt Library - Main Export
 * Framework-agnostic malt specification system
 */

import * as fs from 'fs'
import * as path from 'path'
import { MaltLibrary, MaltSpec, MaltType } from './types'
import { validateMaltLibrary, validateAndParseMaltLibrary } from './validate'

export * from './types'
export * from './validate'
export * from './normalizeManufacturer'

/**
 * Load malt library from JSON file
 */
export function loadMaltLibraryFromFile(filePath: string): MaltLibrary {
  const fullPath = path.resolve(filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const data = JSON.parse(content)
  
  const result = validateAndParseMaltLibrary(data)
  if (!result.ok || !result.data) {
    throw new Error(`Invalid malt library: ${result.errors?.join(', ')}`)
  }
  
  return result.data
}

/**
 * Search malts by query (name, producer, tags, keywords)
 */
export function findMalts(
  library: MaltLibrary,
  query: string
): MaltSpec[] {
  const lowerQuery = query.toLowerCase()
  
  return library.items.filter(malt => {
    // Search in name
    if (malt.name.toLowerCase().includes(lowerQuery)) return true
    
    // Search in producer
    if (malt.producer?.toLowerCase().includes(lowerQuery)) return true
    
    // Search in tags
    if (malt.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true
    
    // Search in keywords
    if (malt.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))) return true
    
    // Search in styles
    if (malt.styles?.some(style => style.toLowerCase().includes(lowerQuery))) return true
    
    return false
  })
}

/**
 * Group malts by type
 */
export function groupByType(library: MaltLibrary): Record<MaltType, MaltSpec[]> {
  const groups: Record<MaltType, MaltSpec[]> = {
    base: [],
    caramel: [],
    roasted: [],
    specialty: [],
    adjunct: [],
  }
  
  library.items.forEach(malt => {
    groups[malt.type].push(malt)
  })
  
  return groups
}

/**
 * Get malt by ID
 */
export function getMaltById(library: MaltLibrary, id: string): MaltSpec | undefined {
  return library.items.find(malt => malt.id === id)
}

/**
 * Get malts by producer
 */
export function getMaltsByProducer(library: MaltLibrary, producer: string): MaltSpec[] {
  return library.items.filter(malt => 
    malt.producer?.toLowerCase() === producer.toLowerCase()
  )
}

/**
 * Get malts by country
 */
export function getMaltsByCountry(library: MaltLibrary, country: string): MaltSpec[] {
  return library.items.filter(malt => 
    malt.country?.toUpperCase() === country.toUpperCase()
  )
}

/**
 * Get malts by type
 */
export function getMaltsByType(library: MaltLibrary, type: MaltType): MaltSpec[] {
  return library.items.filter(malt => malt.type === type)
}

/**
 * Get statistics about the library
 */
export function getLibraryStats(library: MaltLibrary) {
  const byType = groupByType(library)
  
  return {
    total: library.items.length,
    byType: {
      base: byType.base.length,
      caramel: byType.caramel.length,
      roasted: byType.roasted.length,
      specialty: byType.specialty.length,
      adjunct: byType.adjunct.length,
    },
    producers: new Set(library.items.map(m => m.producer).filter(Boolean)).size,
    countries: new Set(library.items.map(m => m.country).filter(Boolean)).size,
  }
}



















