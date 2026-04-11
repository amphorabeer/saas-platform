import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@saas-platform/database'
import { withPermission, RouteContext } from '@/lib/api-middleware'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg'])

function userIdFromSignatureRoute(url: string): string | null {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  const i = parts.indexOf('users')
  if (i < 0 || !parts[i + 1] || parts[i + 2] !== 'signature') return null
  return parts[i + 1]
}

// POST /api/users/[id]/signature — multipart field "signature"
export const POST = withPermission('settings:update', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const userId = userIdFromSignatureRoute(req.url)
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: ctx.tenantId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('signature')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing signature file' }, { status: 400 })
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

    const updated = await prisma.user.updateMany({
      where: { id: userId, tenantId: ctx.tenantId },
      data: { signatureUrl: dataUrl },
    })
    if (updated.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ signatureUrl: dataUrl })
  } catch (error) {
    console.error('[POST /api/users/[id]/signature]', error)
    return NextResponse.json({ error: 'Failed to upload signature' }, { status: 500 })
  }
})

// DELETE /api/users/[id]/signature
export const DELETE = withPermission('settings:update', async (req: NextRequest, ctx: RouteContext) => {
  try {
    const userId = userIdFromSignatureRoute(req.url)
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: ctx.tenantId },
      select: { id: true },
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const updated = await prisma.user.updateMany({
      where: { id: userId, tenantId: ctx.tenantId },
      data: { signatureUrl: null },
    })
    if (updated.count === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/users/[id]/signature]', error)
    return NextResponse.json({ error: 'Failed to remove signature' }, { status: 500 })
  }
})
