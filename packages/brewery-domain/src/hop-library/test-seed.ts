/**
 * Test script for Hop Library
 * Run with: tsx packages/brewery-domain/src/hop-library/test-seed.ts
 */

import { 
  loadHopLibraryFromFile, 
  findHops, 
  groupByType, 
  getLibraryStats,
  getHopsByProducer,
  getHopsByCountry,
  getHopsByType,
  getHopsByAlphaAcid
} from './index'

const libraryPath = './src/hop-library/hops.seed.json'

try {
  console.log('🌿 Loading Hop Library...\n')
  const library = loadHopLibraryFromFile(libraryPath)
  
  console.log('✅ Library loaded successfully!\n')
  
  // Statistics
  const stats = getLibraryStats(library)
  console.log('📊 Library Statistics:')
  console.log(`   Total hops: ${stats.total}`)
  console.log(`   By type:`)
  console.log(`     - Aroma: ${stats.byType.aroma}`)
  console.log(`     - Bittering: ${stats.byType.bittering}`)
  console.log(`     - Dual: ${stats.byType.dual}`)
  console.log(`   Producers: ${stats.producers}`)
  console.log(`   Countries: ${stats.countries}`)
  console.log(`   Avg Alpha Acid: ${stats.avgAlphaAcid.toFixed(2)}%\n`)
  
  // Sample items
  console.log('📋 First 3 hops:')
  library.items.slice(0, 3).forEach((hop, idx) => {
    console.log(`\n   ${idx + 1}. ${hop.name}`)
    console.log(`      ID: ${hop.id}`)
    console.log(`      Type: ${hop.type}`)
    console.log(`      Producer: ${hop.producer || 'N/A'}`)
    console.log(`      Country: ${hop.country || 'N/A'}`)
    console.log(`      Alpha Acid: ${hop.alphaAcidPercent.min}-${hop.alphaAcidPercent.max}%`)
    if (hop.alphaAcidPercent.typical) {
      console.log(`      (Typical: ${hop.alphaAcidPercent.typical}%)`)
    }
    console.log(`      Aroma: ${hop.aromaNotes?.join(', ') || 'N/A'}`)
    console.log(`      Forms: ${hop.forms?.join(', ') || 'N/A'}`)
  })
  
  // Group by type
  console.log('\n📦 Grouped by Type:')
  const grouped = groupByType(library)
  Object.entries(grouped).forEach(([type, hops]) => {
    console.log(`   ${type}: ${hops.length} hops`)
  })
  
  // Search examples
  console.log('\n🔍 Search Examples:')
  const citrusHops = findHops(library, 'citrus')
  console.log(`   "citrus": ${citrusHops.length} results`)
  
  const tropicalHops = findHops(library, 'tropical')
  console.log(`   "tropical": ${tropicalHops.length} results`)
  
  const nobleHops = findHops(library, 'noble')
  console.log(`   "noble": ${nobleHops.length} results`)
  
  // Filter by producer
  console.log('\n🏭 By Producer:')
  const yakimaHops = getHopsByProducer(library, 'Yakima Chief Hops')
  console.log(`   Yakima Chief Hops: ${yakimaHops.length} hops`)
  
  // Filter by country
  console.log('\n🌍 By Country:')
  const usHops = getHopsByCountry(library, 'US')
  console.log(`   US: ${usHops.length} hops`)
  const deHops = getHopsByCountry(library, 'DE')
  console.log(`   DE: ${deHops.length} hops`)
  
  // Filter by alpha acid
  console.log('\n💪 High Alpha Acid Hops (≥15%):')
  const highAlpha = getHopsByAlphaAcid(library, 15)
  console.log(`   ${highAlpha.length} hops`)
  highAlpha.slice(0, 3).forEach(hop => {
    console.log(`     - ${hop.name}: ${hop.alphaAcidPercent.min}-${hop.alphaAcidPercent.max}%`)
  })
  
  console.log('\n✅ All tests passed!\n')
} catch (error) {
  console.error('❌ Error:', error)
  process.exit(1)
}



















