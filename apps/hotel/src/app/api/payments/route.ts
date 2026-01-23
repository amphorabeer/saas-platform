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

    const transactions = await prisma.paymentTransaction.findMany({
      where: { organizationId },
      orderBy: { transactionDate: "desc" },
      take: 100,
    })
    return NextResponse.json({ success: true, transactions })
  } catch (error: any) {
    console.error("[Payments GET] Error:", error)
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
    const transaction = await prisma.paymentTransaction.create({
      data: {
        organizationId,
        transactionNumber: body.transactionNumber || `TRX-${Date.now()}`,
        folioId: body.folioId,
        folioNumber: body.folioNumber,
        type: body.type || "payment",
        method: body.method || "cash",
        amount: body.amount || 0,
        guestName: body.guestName,
        roomNumber: body.roomNumber,
        description: body.description,
        cashierName: body.cashierName || (session.user as any).name,
        transactionData: body,
      },
    })
    return NextResponse.json({ success: true, transaction })
  } catch (error: any) {
    console.error("[Payments POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
