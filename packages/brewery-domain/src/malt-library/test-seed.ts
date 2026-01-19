/**
 * Test script to validate and display malt library
 * Run with: tsx packages/brewery-domain/src/malt-library/test-seed.ts
 */

import { 
  loadMaltLibraryFromFile, 
  findMalts, 
  groupByType, 
  getLibraryStats,
  getMaltById 
} from './index'
import * as path from 'path'

const libraryPath = path.join(__dirname, 'malts.seed.json')

try {
  console.log('📚 Loading Malt Library...\n')
  
  const library = loadMaltLibraryFromFile(libraryPath)
  
  // Statistics
  const stats = getLibraryStats(library)
  console.log('📊 Library Statistics:')
  console.log(`   Total items: ${stats.total}`)
  console.log(`   By type:`)
  console.log(`     Base: ${stats.byType.base}`)
  console.log(`     Caramel: ${stats.byType.caramel}`)
  console.log(`     Roasted: ${stats.byType.roasted}`)
  console.log(`     Specialty: ${stats.byType.specialty}`)
  console.log(`     Adjunct: ${stats.byType.adjunct}`)
  console.log(`   Producers: ${stats.producers}`)
  console.log(`   Countries: ${stats.countries}`)
  
  // First 3 sample items
  console.log('\n📦 First 3 Sample Items:')
  library.items.slice(0, 3).forEach((malt, idx) => {
    console.log(`\n   ${idx + 1}. ${malt.name} (${malt.producer || 'N/A'})`)
    console.log(`      Type: ${malt.type}`)
    console.log(`      EBC: ${malt.color.ebc.typical}`)
    console.log(`      Extract: ${malt.extract?.fgdbPercent || 'N/A'}%`)
    console.log(`      Max Usage: ${malt.maxUsagePercent || 'N/A'}%`)
    if (malt.flavorNotes && malt.flavorNotes.length > 0) {
      console.log(`      Notes: ${malt.flavorNotes.slice(0, 3).join(', ')}`)
    }
  })
  
  // Test search
  console.log('\n🔍 Search Test ("pilsner"):')
  const searchResults = findMalts(library, 'pilsner')
  console.log(`   Found ${searchResults.length} results`)
  searchResults.slice(0, 3).forEach(malt => {
    console.log(`     - ${malt.name} (${malt.producer})`)
  })
  
  // Test grouping
  console.log('\n📂 Grouping by Type:')
  const groups = groupByType(library)
  Object.entries(groups).forEach(([type, malts]) => {
    console.log(`   ${type}: ${malts.length} items`)
  })
  
  console.log('\n✅ Library validation and loading successful!')
  
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}



















