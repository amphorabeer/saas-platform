import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@saas-platform/database'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg'])

function sessionTenantId(session: { user?: unknown }): string | null {
  const u = session.user as { tenantId?: string } | undefined
  return u?.tenantId ?? null
}

function sessionRole(session: { user?: unknown }): string | null {
  const u = session.user as { role?: string } | undefined
  return u?.role ?? null
}

// POST /api/tenant/logo — multipart field "logo"
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = sessionTenantId(session)
    const role = sessionRole(session)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }
    if (!['OWNER', 'ADMIN'].includes(role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

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
      where: { id: tenantId },
      data: { logoUrl: dataUrl },
    })

    return NextResponse.json({ logoUrl: dataUrl })
  } catch (error) {
    console.error('[POST /api/tenant/logo]', error)
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
  }
}

// DELETE /api/tenant/logo
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = sessionTenantId(session)
    const role = sessionRole(session)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }
    if (!['OWNER', 'ADMIN'].includes(role || '')) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl: null },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/tenant/logo]', error)
    return NextResponse.json({ error: 'Failed to remove logo' }, { status: 500 })
  }
}
