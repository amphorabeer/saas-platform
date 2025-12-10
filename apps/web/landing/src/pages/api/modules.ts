import type { NextApiRequest, NextApiResponse } from 'next'

// Static fallback data (used if database fails)
const staticModules = [
  {
    id: 'hotel',
    moduleType: 'HOTEL',
    name: 'სასტუმროს მართვა',
    description: 'სრულყოფილი სისტემა სასტუმროებისთვის',
    icon: '🏨',
    color: '#3b82f6',
    isEnabled: true
  },
  {
    id: 'restaurant',
    moduleType: 'RESTAURANT',
    name: 'რესტორნის მართვა',
    description: 'რესტორნის სრული მართვის სისტემა',
    icon: '🍽️',
    color: '#10b981',
    isEnabled: true
  },
  {
    id: 'beauty',
    moduleType: 'BEAUTY',
    name: 'სილამაზის სალონი',
    description: 'სალონის მართვის სისტემა',
    icon: '💅',
    color: '#ec4899',
    isEnabled: true
  },
  {
    id: 'shop',
    moduleType: 'SHOP',
    name: 'მაღაზია',
    description: 'მაღაზიის მართვის სისტემა',
    icon: '🛍️',
    color: '#8b5cf6',
    isEnabled: true
  },
  {
    id: 'brewery',
    moduleType: 'BREWERY',
    name: 'ლუდსახარში',
    description: 'ლუდის წარმოების მართვა',
    icon: '🍺',
    color: '#f59e0b',
    isEnabled: true
  },
  {
    id: 'winery',
    moduleType: 'WINERY',
    name: 'ღვინის მარანი',
    description: 'ღვინის წარმოების მართვა',
    icon: '🍷',
    color: '#dc2626',
    isEnabled: true
  },
  {
    id: 'distillery',
    moduleType: 'DISTILLERY',
    name: 'დისტილერია',
    description: 'არყის წარმოების მართვა',
    icon: '🥃',
    color: '#0891b2',
    isEnabled: true
  }
]

// In-memory storage for updates (when database fails)
let inMemoryModules = [...staticModules]

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3001')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method === 'GET') {
    try {
      // Try to fetch from database first
      const { prisma } = await import('../../lib/prisma')
      const dbModules = await prisma.moduleConfig.findMany({
        where: { isEnabled: true },
        orderBy: { displayOrder: 'asc' }
      })

      if (dbModules && dbModules.length > 0) {
        // Transform database format to frontend format
        const transformedModules = dbModules.map(module => ({
          id: module.moduleType.toLowerCase(),
          moduleType: module.moduleType,
          name: module.name,
          description: module.description,
          enabled: module.isEnabled,
          isEnabled: module.isEnabled,
          icon: module.icon,
          color: module.color,
          // Include pricing data
          pricing: {
            starter: {
              price: module.starterPrice?.toString() || '0',
              duration: module.starterDuration || '15 დღე',
              features: module.starterFeatures || []
            },
            professional: {
              price: module.professionalPrice?.toString() || '99',
              duration: module.professionalDuration || 'თვეში',
              features: module.professionalFeatures || []
            },
            enterprise: {
              price: module.enterprisePrice?.toString() || '299',
              duration: module.enterpriseDuration || 'თვეში',
              features: module.enterpriseFeatures || []
            }
          }
        }))

        return res.status(200).json({ modules: transformedModules })
      }
    } catch (error: any) {
      console.warn('⚠️ Database fetch failed, using in-memory data:', error.message)
    }

    // Fallback to in-memory or static data
    const modulesToReturn = inMemoryModules.length > 0 ? inMemoryModules : staticModules
    return res.status(200).json({ modules: modulesToReturn })
  }

  if (req.method === 'POST') {
    try {
      const data = req.body
      
      if (!data.modules || !Array.isArray(data.modules)) {
        return res.status(400).json({ error: 'Invalid data format' })
      }

      // Normalize enabled/isEnabled field
      const normalizedModules = data.modules.map((m: any) => ({
        ...m,
        isEnabled: m.isEnabled !== undefined ? m.isEnabled : (m.enabled !== false),
        enabled: m.enabled !== undefined ? m.enabled : (m.isEnabled !== false)
      }))

      // Try to update database first
      try {
        const { prisma } = await import('../../lib/prisma')
        for (const module of normalizedModules) {
          const moduleType = (module.moduleType || module.id || '').toUpperCase()
          
          if (!moduleType) {
            console.warn('⚠️ Skipping module without type:', module)
            continue
          }

          await prisma.moduleConfig.update({
            where: { moduleType: moduleType as any },
            data: {
              name: module.name,
              description: module.description,
              isEnabled: module.isEnabled,
              color: module.color,
              icon: module.icon,
              // Update pricing if provided
              ...(module.pricing?.starter && {
                starterPrice: parseFloat(module.pricing.starter.price) || 0,
                starterDuration: module.pricing.starter.duration,
                starterFeatures: module.pricing.starter.features || []
              }),
              ...(module.pricing?.professional && {
                professionalPrice: parseFloat(module.pricing.professional.price) || 99,
                professionalDuration: module.pricing.professional.duration,
                professionalFeatures: module.pricing.professional.features || []
              }),
              ...(module.pricing?.enterprise && {
                enterprisePrice: parseFloat(module.pricing.enterprise.price) || 299,
                enterpriseDuration: module.pricing.enterprise.duration,
                enterpriseFeatures: module.pricing.enterprise.features || []
              })
            }
          })
        }

        console.log('✅ Successfully updated modules in database')
        return res.status(200).json({ success: true })
      } catch (dbError: any) {
        console.warn('⚠️ Database update failed, using in-memory storage:', dbError.message)
        
        // Fallback to in-memory storage
        inMemoryModules = normalizedModules
        
        console.log('✅ Modules updated in memory:', inMemoryModules.map((m: any) => ({
          name: m.name,
          enabled: m.isEnabled
        })))
        
        return res.status(200).json({ success: true, note: 'Saved to memory (database unavailable)' })
      }
    } catch (error: any) {
      console.error('❌ Error updating modules:', error)
      return res.status(500).json({ 
        error: 'Failed to update modules', 
        details: error.message 
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

