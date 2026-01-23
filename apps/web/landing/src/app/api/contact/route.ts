import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, message, module } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required' },
        { status: 400 }
      )
    }

    // Super Admin API URL - localhost for dev, production URL for prod
    const superAdminUrl = process.env.SUPER_ADMIN_API_URL || 'http://localhost:3001'
    
    console.log(`[Contact] Sending to Super Admin: ${superAdminUrl}/api/contact-requests`)
    
    const response = await fetch(`${superAdminUrl}/api/contact-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        phone: phone || null,
        message,
        module: module || null,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`[Contact] Success! New request from ${email} for module: ${module || 'general'}`)
      return NextResponse.json({ success: true, data })
    } else {
      const errorText = await response.text()
      console.error('[Contact] Super Admin API error:', errorText)
      return NextResponse.json(
        { error: 'Failed to submit contact request', details: errorText },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Contact] Error:', error.message)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
