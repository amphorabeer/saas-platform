import { NextRequest, NextResponse } from 'next/server'
import { withPermission, RouteContext } from '@/lib/api-middleware'
import * as fs from 'fs'
import * as path from 'path'

// GET /api/ingredients/catalog-detail?id=malt_pilsner_weyermann
// Returns detailed malt/hop data from library JSON files
export const GET = withPermission('inventory:read', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const catalogId = searchParams.get('id')

    if (!catalogId) {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 })
    }

    // Try to load from malt library
    if (catalogId.startsWith('malt_')) {
      try {
        // Resolve workspace root - handle different execution contexts
        let workspaceRoot: string
        const cwd = process.cwd()
        
        if (cwd.endsWith('apps/brewery')) {
          workspaceRoot = path.resolve(cwd, '../..')
        } else if (cwd.endsWith('saas-platform')) {
          workspaceRoot = cwd
        } else {
          // Try to find workspace root by going up until we find packages/brewery-domain
          let current = cwd
          while (current !== path.dirname(current)) {
            if (fs.existsSync(path.join(current, 'packages/brewery-domain'))) {
              workspaceRoot = current
              break
            }
            current = path.dirname(current)
          }
          if (!workspaceRoot!) {
            workspaceRoot = path.resolve(cwd, '../..')
          }
        }
        
        const maltLibraryPath = path.join(
          workspaceRoot,
          'packages/brewery-domain/src/malt-library/malts.seed.json'
        )

        console.log('Looking for malt library at:', maltLibraryPath)
        console.log('File exists:', fs.existsSync(maltLibraryPath))

        if (fs.existsSync(maltLibraryPath)) {
          const maltLibrary = JSON.parse(fs.readFileSync(maltLibraryPath, 'utf-8'))
          console.log('Malt library loaded, searching for:', catalogId)
          
          // Try exact match first
          let malt = maltLibrary.items.find((m: any) => m.id === catalogId)
          
          // If not found, try ID variations (e.g., malt_pils_bestmalz -> malt_pilsner_bestmalz)
          if (!malt) {
            // Try expanding shortened names: malt_pils -> malt_pilsner, malt_pale -> malt_pale_ale
            const idVariations = [
              catalogId.replace(/_pils_/, '_pilsner_'),
              catalogId.replace(/_pale_/, '_pale_ale_'),
              catalogId.replace(/_munich_/, '_munich_malt_'),
              catalogId.replace(/_vienna_/, '_vienna_malt_'),
              catalogId.replace(/_wheat_/, '_wheat_malt_'),
            ]
            
            for (const variantId of idVariations) {
              malt = maltLibrary.items.find((m: any) => m.id === variantId)
              if (malt) {
                console.log('Found malt with variant ID:', variantId)
                break
              }
            }
          }
          
          // If still not found, try matching by name and supplier
          if (!malt) {
            // Extract name and supplier from catalogId (e.g., malt_pils_bestmalz -> name: "Pilsner", supplier: "BestMalz")
            const parts = catalogId.split('_')
            if (parts.length >= 3) {
              const supplierPart = parts[parts.length - 1] // Last part is usually supplier
              const nameParts = parts.slice(1, -1) // Middle parts are name
              
              // Try to find by matching name and supplier
              malt = maltLibrary.items.find((m: any) => {
                const nameMatch = m.name.toLowerCase().includes(nameParts.join(' ').toLowerCase()) ||
                                  nameParts.some(p => m.name.toLowerCase().includes(p))
                const supplierMatch = (m.supplier || m.producer || '').toLowerCase().includes(supplierPart.toLowerCase()) ||
                                     supplierPart.toLowerCase().includes((m.supplier || m.producer || '').toLowerCase())
                return nameMatch && supplierMatch
              })
              
              if (malt) {
                console.log('Found malt by name and supplier match:', malt.name, malt.supplier || malt.producer)
              }
            }
          }

          if (malt) {
            console.log('Malt found:', malt.name)
            return NextResponse.json({
              catalogId,
              maltData: {
                name: malt.name,
                type: malt.type,
                producer: malt.producer,
                supplier: malt.supplier || malt.producer,
                country: malt.country,
                color: malt.color,
                extract: malt.extract,
                yield: malt.yield,
                diastaticPower: malt.diastaticPower,
                maxUsagePercent: malt.maxUsagePercent,
                flavorNotes: malt.flavorNotes,
                styles: malt.styles,
              },
            })
          } else {
            console.log('Malt not found in library. Catalog ID:', catalogId)
            console.log('Sample available IDs:', maltLibrary.items.slice(0, 10).map((m: any) => m.id))
            
            // Return generic/default data based on catalog ID pattern
            // This allows the form to still work even if detailed data isn't available
            const parts = catalogId.split('_')
            if (parts.length >= 2) {
              const maltType = parts[1] // e.g., "pils", "pale", "munich"
              
              // Provide default values based on malt type
              const defaultData: Record<string, { color: number; extract: number; type: string }> = {
                'pils': { color: 3.5, extract: 81.5, type: 'base' },
                'pilsner': { color: 3.5, extract: 81.5, type: 'base' },
                'pale': { color: 5.5, extract: 81.0, type: 'base' },
                'munich': { color: 15, extract: 80.0, type: 'base' },
                'vienna': { color: 7.5, extract: 81.0, type: 'base' },
                'wheat': { color: 4.0, extract: 82.0, type: 'base' },
                'cara': { color: 60, extract: 74.0, type: 'caramel' },
                'crystal': { color: 40, extract: 74.5, type: 'caramel' },
                'chocolate': { color: 900, extract: 70.0, type: 'roasted' },
                'black': { color: 1300, extract: 68.0, type: 'roasted' },
              }
              
              const defaults = defaultData[maltType] || defaultData['pils']
              
              console.log('Returning default data for:', maltType, defaults)
              return NextResponse.json({
                catalogId,
                maltData: {
                  name: catalogId.split('_').slice(1, -1).join(' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) + ' Malt',
                  type: defaults.type,
                  producer: null,
                  supplier: null,
                  country: null,
                  color: { ebc: { typical: defaults.color } },
                  extract: { fgdbPercent: defaults.extract },
                  yield: null,
                  diastaticPower: null,
                  maxUsagePercent: null,
                  flavorNotes: null,
                  styles: null,
                },
              })
            }
          }
        } else {
          console.error('Malt library file not found at:', maltLibraryPath)
        }
      } catch (error) {
        console.error('Error loading malt library:', error)
      }
    }

    // Try to load from hop library
    if (catalogId.startsWith('hop_')) {
      try {
        const workspaceRoot = process.cwd().endsWith('apps/brewery') 
          ? path.resolve(process.cwd(), '../..')
          : process.cwd()
        
        const hopLibraryPath = path.join(
          workspaceRoot,
          'packages/brewery-domain/src/hop-library/hops.seed.json'
        )

        if (fs.existsSync(hopLibraryPath)) {
          const hopLibrary = JSON.parse(fs.readFileSync(hopLibraryPath, 'utf-8'))
          const hop = hopLibrary.items.find((h: any) => h.id === catalogId)

          if (hop) {
            return NextResponse.json({
              catalogId,
              hopData: {
                name: hop.name,
                type: hop.type,
                producer: hop.producer,
                supplier: hop.supplier || hop.producer,
                country: hop.country,
                alphaAcidPercent: hop.alphaAcidPercent,
                betaAcidPercent: hop.betaAcidPercent,
                aromaNotes: hop.aromaNotes,
                forms: hop.forms,
              },
            })
          }
        }
      } catch (error) {
        console.error('Error loading hop library:', error)
      }
    }

    // Not found in libraries
    return NextResponse.json({ catalogId, maltData: null, hopData: null })
  } catch (error) {
    console.error('Catalog detail GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})








