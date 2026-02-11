export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// CORS headers for public access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { 
    status: 200,
    headers: corsHeaders 
  })
}

// GET - Public data endpoint (spa services, menu, settings)
export async function GET(request: NextRequest) {
  try {
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') // 'spa' | 'menu' | 'all'
    
    // Find organization
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { name: { contains: 'Brewery' } },
          { name: { contains: 'brewery' } }
        ]
      }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Not found' }, 
        { status: 404, headers: corsHeaders }
      )
    }

    const tenantId = organization.tenantId
    const response: Record<string, unknown> = {}

    // Get Spa Services
    if (dataType === 'spa' || dataType === 'all' || !dataType) {
      const spaServices = await prisma.spaService.findMany({
        where: { 
          tenantId,
          isActive: true 
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
      })

      const spaSettings = await prisma.spaSettings.findUnique({
        where: { tenantId }
      })

      response.spa = {
        settings: spaSettings ? {
          name: spaSettings.name,
          openTime: spaSettings.openTime,
          closeTime: spaSettings.closeTime,
          slotDuration: spaSettings.slotDuration
        } : {
          name: 'ლუდის სპა',
          openTime: '10:00',
          closeTime: '22:00',
          slotDuration: 60
        },
        services: spaServices.map(s => ({
          id: s.id,
          name: s.name,
          nameEn: s.nameEn || s.name,
          price: Number(s.price),
          duration: s.duration || 60,
          description: s.description || '',
          category: s.category || 'general'
        }))
      }
    }

    // Get Restaurant Menu
    if (dataType === 'menu' || dataType === 'all' || !dataType) {
      const categories = await prisma.menuCategory.findMany({
        where: { 
          tenantId,
          isActive: true 
        },
        orderBy: { sortOrder: 'asc' }
      })

      const menuItems = await prisma.menuItem.findMany({
        where: { 
          tenantId,
          isActive: true,
          isAvailable: true
        },
        include: { category: true },
        orderBy: [
          { category: { sortOrder: 'asc' } },
          { name: 'asc' }
        ]
      })

      const restaurantSettings = await prisma.restaurantSettings.findFirst({
        where: { tenantId }
      })

      response.restaurant = {
        settings: {
          name: restaurantSettings?.name || 'Brewery House Restaurant',
          phone: restaurantSettings?.phone || '+995 599 50 05 05',
          address: restaurantSettings?.address || 'ასპინძა, საქართველო',
          currency: restaurantSettings?.currency || '₾'
        },
        categories: categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          nameEn: cat.nameEn || cat.name,
          icon: cat.icon || '🍽️',
          sortOrder: cat.sortOrder
        })),
        items: menuItems.map(item => ({
          id: item.id,
          name: item.name,
          nameEn: item.nameEn || item.name,
          description: item.description || '',
          descriptionEn: item.descriptionEn || item.description || '',
          price: Number(item.price),
          categoryId: item.categoryId,
          categoryName: item.category?.name || 'Other',
          categoryIcon: item.category?.icon || '🍽️',
          image: item.imageUrl || null,
          preparationTime: item.preparationTime || 15
        }))
      }
    }

    return NextResponse.json(response, { headers: corsHeaders })

  } catch (error) {
    console.error('[Public Data] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' }, 
      { status: 500, headers: corsHeaders }
    )
  }
}
