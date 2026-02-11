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

// GET - Public menu endpoint (no auth required)
export async function GET(request: NextRequest) {
  try {
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    
    // Get tenant by subdomain or use default
    const tenantSlug = searchParams.get('tenant') || 'brewery-house'
    
    // Find tenant
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: tenantSlug },
          { subdomain: tenantSlug }
        ]
      }
    })

    if (!tenant) {
      return NextResponse.json(
        { error: 'Restaurant not found' }, 
        { status: 404, headers: corsHeaders }
      )
    }

    // Get categories
    const categories = await prisma.menuCategory.findMany({
      where: { 
        tenantId: tenant.id,
        isActive: true 
      },
      orderBy: { sortOrder: 'asc' }
    })

    // Get active menu items with categories
    const items = await prisma.menuItem.findMany({
      where: { 
        tenantId: tenant.id,
        isActive: true,
        isAvailable: true
      },
      include: {
        category: true
      },
      orderBy: [
        { category: { sortOrder: 'asc' } },
        { name: 'asc' }
      ]
    })

    // Get restaurant settings
    const settings = await prisma.restaurantSettings.findFirst({
      where: { tenantId: tenant.id }
    })

    // Format response
    const response = {
      restaurant: {
        name: settings?.name || tenant.name,
        description: settings?.description || '',
        phone: settings?.phone || '',
        address: settings?.address || '',
        currency: settings?.currency || '₾',
        logo: settings?.logo || null
      },
      categories: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        nameEn: cat.nameEn || cat.name,
        icon: cat.icon || '🍽️',
        sortOrder: cat.sortOrder
      })),
      items: items.map(item => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn || item.name,
        description: item.description || '',
        descriptionEn: item.descriptionEn || item.description || '',
        price: Number(item.price),
        category: item.category?.name || 'Other',
        categoryId: item.categoryId,
        categoryIcon: item.category?.icon || '🍽️',
        image: item.imageUrl || null,
        available: item.isAvailable,
        preparationTime: item.preparationTime || 15,
        allergens: item.allergens || []
      }))
    }

    return NextResponse.json(response, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error fetching public menu:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menu', details: error.message }, 
      { status: 500, headers: corsHeaders }
    )
  }
}
