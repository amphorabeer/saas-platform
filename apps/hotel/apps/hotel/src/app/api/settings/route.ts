import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { getAuthOptions } from "@/lib/auth"

// GET - Fetch hotel settings
export async function GET(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = (session.user as any).organizationId
    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID not found" }, { status: 400 })
    }

    const settings = await prisma.hotelSettings.findUnique({
      where: { organizationId },
    })

    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error("[Settings GET] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Update hotel settings
export async function POST(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const organizationId = (session.user as any).organizationId
    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID required" }, { status: 400 })
    }

    const body = await request.json()
    
    const settings = await prisma.hotelSettings.upsert({
      where: { organizationId },
      update: {
        hotelName: body.hotelName || body.name,
        address: body.address,
        city: body.city,
        country: body.country,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logo: body.logo,
        taxId: body.taxId,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        currency: body.currency || "GEL",
        checkInTime: body.checkInTime,
        checkOutTime: body.checkOutTime,
        timezone: body.timezone,
        settingsData: body,
      },
      create: {
        organizationId,
        hotelName: body.hotelName || body.name,
        address: body.address,
        city: body.city,
        country: body.country,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logo: body.logo,
        taxId: body.taxId,
        bankName: body.bankName,
        bankAccount: body.bankAccount,
        currency: body.currency || "GEL",
        checkInTime: body.checkInTime,
        checkOutTime: body.checkOutTime,
        timezone: body.timezone,
        settingsData: body,
      },
    })

    return NextResponse.json({ success: true, settings })
  } catch (error: any) {
    console.error("[Settings POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
