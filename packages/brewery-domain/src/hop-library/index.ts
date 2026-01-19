/**
 * Hop Library - Main Export
 * Framework-agnostic hop specification system
 */

import * as fs from 'fs'
import * as path from 'path'
import { HopLibrary, HopSpec, HopType } from './types'
import { validateHopLibrary, validateAndParseHopLibrary } from './validate'

export * from './types'
export * from './validate'

/**
 * Load hop library from JSON file
 */
export function loadHopLibraryFromFile(filePath: string): HopLibrary {
  const fullPath = path.resolve(filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')
  const data = JSON.parse(content)
  
  const result = validateAndParseHopLibrary(data)
  if (!result.ok || !result.data) {
    throw new Error(`Invalid hop library: ${result.errors?.join(', ')}`)
  }
  
  return result.data
}

/**
 * Search hops by query (name, producer, tags, keywords, styles)
 */
export function findHops(
  library: HopLibrary,
  query: string
): HopSpec[] {
  const lowerQuery = query.toLowerCase()
  
  return library.items.filter(hop => {
    // Search in name
    if (hop.name.toLowerCase().includes(lowerQuery)) return true
    
    // Search in producer
    if (hop.producer?.toLowerCase().includes(lowerQuery)) return true
    
    // Search in tags
    if (hop.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) return true
    
    // Search in keywords
    if (hop.keywords?.some(keyword => keyword.toLowerCase().includes(lowerQuery))) return true
    
    // Search in styles
    if (hop.styles?.some(style => style.toLowerCase().includes(lowerQuery))) return true
    
    // Search in aroma notes
    if (hop.aromaNotes?.some(note => note.toLowerCase().includes(lowerQuery))) return true
    
    return false
  })
}

/**
 * Group hops by type
 */
export function groupByType(library: HopLibrary): Record<HopType, HopSpec[]> {
  const groups: Record<HopType, HopSpec[]> = {
    aroma: [],
    bittering: [],
    dual: [],
  }
  
  library.items.forEach(hop => {
    groups[hop.type].push(hop)
  })
  
  return groups
}

/**
 * Get hop by ID
 */
export function getHopById(library: HopLibrary, id: string): HopSpec | undefined {
  return library.items.find(hop => hop.id === id)
}

/**
 * Get hops by producer
 */
export function getHopsByProducer(library: HopLibrary, producer: string): HopSpec[] {
  return library.items.filter(hop => 
    hop.producer?.toLowerCase() === producer.toLowerCase()
  )
}

/**
 * Get hops by country
 */
export function getHopsByCountry(library: HopLibrary, country: string): HopSpec[] {
  return library.items.filter(hop => 
    hop.country?.toUpperCase() === country.toUpperCase()
  )
}

/**
 * Get hops by type
 */
export function getHopsByType(library: HopLibrary, type: HopType): HopSpec[] {
  return library.items.filter(hop => hop.type === type)
}

/**
 * Get hops by alpha acid range
 */
export function getHopsByAlphaAcid(
  library: HopLibrary,
  min?: number,
  max?: number
): HopSpec[] {
  return library.items.filter(hop => {
    if (min !== undefined && hop.alphaAcidPercent.max < min) return false
    if (max !== undefined && hop.alphaAcidPercent.min > max) return false
    return true
  })
}

/**
 * Get statistics about the library
 */
export function getLibraryStats(library: HopLibrary) {
  const byType = groupByType(library)
  
  return {
    total: library.items.length,
    byType: {
      aroma: byType.aroma.length,
      bittering: byType.bittering.length,
      dual: byType.dual.length,
    },
    producers: new Set(library.items.map(h => h.producer).filter(Boolean)).size,
    countries: new Set(library.items.map(h => h.country).filter(Boolean)).size,
    avgAlphaAcid: library.items.reduce((sum, hop) => {
      const typical = hop.alphaAcidPercent.typical ?? 
        (hop.alphaAcidPercent.min + hop.alphaAcidPercent.max) / 2
      return sum + typical
    }, 0) / library.items.length,
  }
}



















