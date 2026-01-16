import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withTenant, RouteContext } from '@/lib/api-middleware'

// GET /api/products - Finished goods with accurate keg counts from Keg table
export const GET = withTenant(async (req: NextRequest, ctx: RouteContext) => {
  try {
    const { searchParams } = new URL(req.url)
    const packageType = searchParams.get('packageType')
    const availableOnly = searchParams.get('availableOnly') === 'true'

    const where: any = { tenantId: ctx.tenantId }
    if (packageType && packageType !== 'all') {
      where.packageType = packageType.toUpperCase()
    }

    // ═══════════════════════════════════════════════════════════
    // 1. Get KEG products from Keg table (real physical kegs)
    // ═══════════════════════════════════════════════════════════
    const filledKegs = await (prisma as any).keg.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'FILLED',
        productName: { not: null },
      },
      select: {
        productName: true,
        size: true,
      },
    })

    // Group kegs by productName + size
    const kegProductMap = new Map<string, { productName: string; size: number; count: number }>()
    for (const keg of filledKegs) {
      if (!keg.productName) continue
      const key = `${keg.productName}_KEG_${keg.size}`
      if (!kegProductMap.has(key)) {
        kegProductMap.set(key, { productName: keg.productName, size: keg.size, count: 0 })
      }
      kegProductMap.get(key)!.count++
    }

    // Get kegs that are WITH_CUSTOMER (sold but not returned)
    const soldKegs = await (prisma as any).keg.findMany({
      where: {
        tenantId: ctx.tenantId,
        status: 'WITH_CUSTOMER',
        productName: { not: null },
      },
      select: {
        productName: true,
        size: true,
      },
    })

    const soldKegMap = new Map<string, number>()
    for (const keg of soldKegs) {
      if (!keg.productName) continue
      const key = `${keg.productName}_KEG_${keg.size}`
      soldKegMap.set(key, (soldKegMap.get(key) || 0) + 1)
    }

    // ═══════════════════════════════════════════════════════════
    // 2. Get BOTTLE/CAN products from PackagingRun
    // ═══════════════════════════════════════════════════════════
    const packagingRuns = await prisma.packagingRun.findMany({
      where: {
        tenantId: ctx.tenantId,
        packageType: { notIn: ['KEG_50', 'KEG_30', 'KEG_20'] }, // Exclude kegs
      },
      include: {
        batch: {
          select: {
            recipe: {
              select: { name: true, style: true, abv: true },
            },
          },
        },
      },
    })

    // Get sold quantities from orders (for bottles/cans)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          tenantId: ctx.tenantId,
          status: { not: 'CANCELLED' },
        },
        packageType: { notIn: ['KEG_50', 'KEG_30', 'KEG_20'] },
      },
      select: {
        productName: true,
        packageType: true,
        quantity: true,
      },
    })

    const soldBottleMap = new Map<string, number>()
    for (const item of orderItems) {
      const key = `${item.productName}_${item.packageType}`
      soldBottleMap.set(key, (soldBottleMap.get(key) || 0) + item.quantity)
    }

    // Group bottle/can runs
    const bottleProductMap = new Map<string, any>()
    for (const run of packagingRuns) {
      const recipe = run.batch?.recipe
      if (!recipe) continue

      const key = `${recipe.name}_${run.packageType}`
      if (!bottleProductMap.has(key)) {
        bottleProductMap.set(key, {
          name: recipe.name,
          style: recipe.style || '',
          abv: recipe.abv ? Number(recipe.abv) : null,
          packageType: run.packageType,
          totalProduced: 0,
        })
      }
      bottleProductMap.get(key)!.totalProduced += run.quantity
    }

    // ═══════════════════════════════════════════════════════════
    // 3. Fetch all recipes in one query (optimize N+1)
    // ═══════════════════════════════════════════════════════════
    const uniqueProductNames = Array.from(new Set(Array.from(kegProductMap.values()).map(k => k.productName)))
    const recipes = await prisma.recipe.findMany({
      where: {
        tenantId: ctx.tenantId,
        name: { in: uniqueProductNames },
      },
      select: {
        name: true,
        style: true,
        abv: true,
      },
    })

    const recipeMap = new Map<string, { style: string | null; abv: number | null }>()
    for (const recipe of recipes) {
      recipeMap.set(recipe.name, {
        style: recipe.style || null,
        abv: recipe.abv ? Number(recipe.abv) : null,
      })
    }

    // ═══════════════════════════════════════════════════════════
    // 4. Build final products array
    // ═══════════════════════════════════════════════════════════
    const products: any[] = []

    // Add keg products (from Keg table)
    for (const [key, data] of kegProductMap) {
      const packageType = `KEG_${data.size}`
      const soldCount = soldKegMap.get(key) || 0
      const availableQuantity = data.count // FILLED kegs are available

      // Get recipe info from map (no additional queries)
      const recipeInfo = recipeMap.get(data.productName)

      products.push({
        id: key,
        name: data.productName,
        style: recipeInfo?.style || '',
        abv: recipeInfo?.abv || null,
        packageType,
        packageTypeName: getPackageTypeName(packageType),
        totalProduced: data.count + soldCount, // filled + with customer
        soldQuantity: soldCount,
        availableQuantity,
        pricePerUnit: getDefaultPrice(packageType),
      })
    }

    // Add bottle/can products (from PackagingRun)
    for (const [key, data] of bottleProductMap) {
      const soldQuantity = soldBottleMap.get(key) || 0
      const availableQuantity = Math.max(0, data.totalProduced - soldQuantity)

      products.push({
        id: key,
        name: data.name,
        style: data.style,
        abv: data.abv,
        packageType: data.packageType,
        packageTypeName: getPackageTypeName(data.packageType),
        totalProduced: data.totalProduced,
        soldQuantity,
        availableQuantity,
        pricePerUnit: getDefaultPrice(data.packageType),
      })
    }

    // Apply packageType filter if specified
    let filteredProducts = products
    if (packageType && packageType !== 'all') {
      filteredProducts = products.filter(p => p.packageType === packageType.toUpperCase())
    }

    // Filter by available only if requested
    if (availableOnly) {
      filteredProducts = filteredProducts.filter(p => p.availableQuantity > 0)
    }

    // Sort by available quantity (highest first)
    filteredProducts.sort((a, b) => b.availableQuantity - a.availableQuantity)

    // Stats
    const stats = {
      totalProducts: filteredProducts.length,
      totalProduced: filteredProducts.reduce((s, p) => s + p.totalProduced, 0),
      totalSold: filteredProducts.reduce((s, p) => s + p.soldQuantity, 0),
      totalAvailable: filteredProducts.reduce((s, p) => s + p.availableQuantity, 0),
      kegs: filteredProducts.filter(p => p.packageType.startsWith('KEG')).reduce((s, p) => s + p.availableQuantity, 0),
      bottles: filteredProducts.filter(p => p.packageType.startsWith('BOTTLE')).reduce((s, p) => s + p.availableQuantity, 0),
      cans: filteredProducts.filter(p => p.packageType.startsWith('CAN')).reduce((s, p) => s + p.availableQuantity, 0),
    }

    return NextResponse.json({ products: filteredProducts, stats })
  } catch (error) {
    console.error('[PRODUCTS API] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
  }
})

function getPackageTypeName(t: string): string {
  const names: Record<string, string> = {
    KEG_50: 'კეგი 50L',
    KEG_30: 'კეგი 30L',
    KEG_20: 'კეგი 20L',
    BOTTLE_750: 'ბოთლი 750ml',
    BOTTLE_500: 'ბოთლი 500ml',
    BOTTLE_330: 'ბოთლი 330ml',
    CAN_500: 'ქილა 500ml',
    CAN_330: 'ქილა 330ml',
  }
  return names[t] || t
}

function getDefaultPrice(t: string): number {
  const prices: Record<string, number> = {
    KEG_50: 400,
    KEG_30: 250,
    KEG_20: 150,
    BOTTLE_750: 18,
    BOTTLE_500: 12,
    BOTTLE_330: 8,
    CAN_500: 10,
    CAN_330: 7,
  }
  return prices[t] || 0
}