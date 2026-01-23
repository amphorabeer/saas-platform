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
    const current = searchParams.get("current")

    if (current === "true") {
      const shift = await prisma.cashierShift.findFirst({
        where: { organizationId, status: "open" },
        orderBy: { openedAt: "desc" },
      })
      return NextResponse.json({ success: true, shift })
    }

    const shifts = await prisma.cashierShift.findMany({
      where: { organizationId },
      orderBy: { openedAt: "desc" },
      take: 50,
    })
    return NextResponse.json({ success: true, shifts })
  } catch (error: any) {
    console.error("[Cashier GET] Error:", error)
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
    const { id, ...shiftData } = body

    if (id) {
      const shift = await prisma.cashierShift.update({
        where: { id },
        data: {
          status: shiftData.status,
          closedAt: shiftData.closedAt ? new Date(shiftData.closedAt) : null,
          closingBalance: shiftData.closingBalance,
          totalCashIn: shiftData.totalCashIn || 0,
          totalCashOut: shiftData.totalCashOut || 0,
          totalCard: shiftData.totalCard || 0,
          totalBank: shiftData.totalBank || 0,
          transactions: shiftData.transactions,
          shiftData: shiftData,
        },
      })
      return NextResponse.json({ success: true, shift })
    }

    const shift = await prisma.cashierShift.create({
      data: {
        organizationId,
        shiftNumber: `SH-${Date.now()}`,
        cashierName: shiftData.cashierName || (session.user as any).name || "Cashier",
        openingBalance: shiftData.openingBalance || 0,
        shiftData: shiftData,
      },
    })
    return NextResponse.json({ success: true, shift })
  } catch (error: any) {
    console.error("[Cashier POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
