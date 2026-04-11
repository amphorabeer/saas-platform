import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, type RouteContext } from '@/lib/api-middleware'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg'])

// POST /api/tenant/logo — multipart field "logo"
export const POST = withPermission('settings:update', async (req: NextRequest, ctx: RouteContext) => {
  try {
    console.log('[POST /api/tenant/logo]', { tenantId: ctx.tenantId })

    const formData = await req.formData()
    const file = formData.get('logo')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing logo file' }, { status: 400 })
    }

    const mime = (file as File).type || ''
    if (!ALLOWED.has(mime)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use PNG or JPEG only.' },
        { status: 400 }
      )
    }

    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 2MB)' }, { status: 400 })
    }

    const base64 = buf.toString('base64')
    const dataUrl = `data:${mime};base64,${base64}`

    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: { logoUrl: dataUrl },
    })

    return NextResponse.json({ logoUrl: dataUrl })
  } catch (error) {
    console.error('[POST /api/tenant/logo]', error)
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
  }
})

// DELETE /api/tenant/logo
export const DELETE = withPermission('settings:update', async (_req: NextRequest, ctx: RouteContext) => {
  try {
    console.log('[DELETE /api/tenant/logo]', { tenantId: ctx.tenantId })

    await prisma.tenant.update({
      where: { id: ctx.tenantId },
      data: { logoUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/tenant/logo]', error)
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 })
  }
})
