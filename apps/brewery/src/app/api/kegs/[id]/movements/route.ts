import { NextRequest, NextResponse } from 'next/server'
import { withTenant, RouteContext } from '@/lib/api-middleware'
import { prisma } from '@saas-platform/database'

// GET - კეგის მოძრაობის ისტორია
export const GET = withTenant(async (
  req: NextRequest,
  ctx: RouteContext
) => {
  try {
    // Extract id from URL: /api/kegs/[id]/movements
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const idIndex = pathParts.indexOf('kegs') + 1
    const id = pathParts[idIndex]
    
    if (!id) {
      return NextResponse.json({ error: 'კეგის ID სავალდებულოა' }, { status: 400 })
    }

    // შევამოწმოთ რომ keg არსებობს და ეკუთვნის tenant-ს
    const keg = await (prisma as any).keg.findUnique({
      where: { id },
      select: { id: true, tenantId: true },
    })

    if (!keg || keg.tenantId !== ctx.tenantId) {
      return NextResponse.json({ error: 'კეგი ვერ მოიძებნა' }, { status: 404 })
    }

    const movements = await (prisma as any).kegMovement.findMany({
      where: { 
        tenantId: ctx.tenantId,
        kegId: id,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ movements })
  } catch (error) {
    console.error('[Kegs Movements API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch movements' }, { status: 500 })
  }
})

