import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { getAuthOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const organizationId = (session.user as any).organizationId
    if (!organizationId) return NextResponse.json({ error: "Organization ID not found" }, { status: 400 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const where: any = { organizationId }
    if (status) where.status = status

    const folios = await prisma.folio.findMany({ where, orderBy: { updatedAt: "desc" } })
    return NextResponse.json({ success: true, folios })
  } catch (error: any) {
    console.error("[Folios GET] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const organizationId = (session.user as any).organizationId
    if (!organizationId) return NextResponse.json({ error: "Organization ID required" }, { status: 400 })

    const body = await request.json()
    const { folioNumber, ...folioData } = body
    if (!folioNumber) return NextResponse.json({ error: "Folio number required" }, { status: 400 })

    const folio = await prisma.folio.upsert({
      where: { organizationId_folioNumber: { organizationId, folioNumber } },
      update: {
        guestName: folioData.guestName || folioData.guest || "Guest",
        roomNumber: folioData.roomNumber || folioData.room,
        status: folioData.status || "open",
        totalCharges: folioData.totalCharges || 0,
        totalPayments: folioData.totalPayments || 0,
        balance: folioData.balance || 0,
        charges: folioData.charges,
        payments: folioData.payments,
        folioData: folioData,
      },
      create: {
        organizationId, folioNumber,
        guestName: folioData.guestName || folioData.guest || "Guest",
        roomNumber: folioData.roomNumber || folioData.room,
        status: folioData.status || "open",
        totalCharges: folioData.totalCharges || 0,
        totalPayments: folioData.totalPayments || 0,
        balance: folioData.balance || 0,
        charges: folioData.charges,
        payments: folioData.payments,
        folioData: folioData,
      },
    })
    return NextResponse.json({ success: true, folio })
  } catch (error: any) {
    console.error("[Folios POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
