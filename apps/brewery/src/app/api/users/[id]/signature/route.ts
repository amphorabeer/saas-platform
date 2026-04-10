import { NextRequest, NextResponse } from 'next/server'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'
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

async function removeSignatureFiles(userId: string, baseDir: string) {
  for (const ext of ['png', 'jpg', 'jpeg']) {
    try {
      await unlink(path.join(baseDir, `${userId}.${ext}`))
    } catch {
      // ignore missing
    }
  }
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

    const ext = mime === 'image/png' ? 'png' : 'jpg'
    const signaturesDir = path.join(process.cwd(), 'public', 'signatures')
    await mkdir(signaturesDir, { recursive: true })

    await removeSignatureFiles(userId, signaturesDir)

    const filename = `${userId}.${ext}`
    const absolutePath = path.join(signaturesDir, filename)
    await writeFile(absolutePath, buf)

    const signatureUrl = `/signatures/${filename}`
    await prisma.user.update({
      where: { id: userId },
      data: { signatureUrl },
    })

    return NextResponse.json({ signatureUrl })
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

    const signaturesDir = path.join(process.cwd(), 'public', 'signatures')
    await removeSignatureFiles(userId, signaturesDir)

    await prisma.user.update({
      where: { id: userId },
      data: { signatureUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/users/[id]/signature]', error)
    return NextResponse.json({ error: 'Failed to remove signature' }, { status: 500 })
  }
})
