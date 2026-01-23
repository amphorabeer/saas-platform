import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import prisma from "@/lib/prisma"
import { authOptions } from "@/pages/api/auth/[...nextauth]"

// GET - Fetch all night audits for organization
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const audits = await prisma.nightAudit.findMany({
      where: { organizationId: session.user.organizationId },
      orderBy: { date: "desc" },
    })

    return NextResponse.json({ success: true, audits })
  } catch (error: any) {
    console.error("[NightAudit GET] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Create or update night audit
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { date, ...auditData } = body

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    // Upsert - create or update
    const audit = await prisma.nightAudit.upsert({
      where: {
        organizationId_date: {
          organizationId: session.user.organizationId,
          date: date,
        },
      },
      update: {
        status: auditData.status || "completed",
        completedAt: auditData.completedAt ? new Date(auditData.completedAt) : new Date(),
        closedAt: auditData.closedAt ? new Date(auditData.closedAt) : new Date(),
        closedBy: auditData.closedBy || session.user.name,
        user: auditData.user || session.user.name,
        checkIns: auditData.checkIns || 0,
        checkOuts: auditData.checkOuts || 0,
        noShows: auditData.noShows || 0,
        totalRooms: auditData.totalRooms || 0,
        occupiedRooms: auditData.occupiedRooms || 0,
        occupancy: auditData.occupancy || 0,
        revenue: auditData.revenue || 0,
        roomChargesPosted: auditData.roomChargesPosted || 0,
        roomChargeTotal: auditData.roomChargeTotal || 0,
        packagesPosted: auditData.packagesPosted || 0,
        packageTotal: auditData.packageTotal || 0,
        foliosClosed: auditData.foliosClosed || 0,
        paymentsTotal: auditData.paymentsTotal || auditData.financialSummary?.payments || 0,
        taxesTotal: auditData.taxesTotal || auditData.financialSummary?.taxes || 0,
        outstanding: auditData.outstanding || auditData.financialSummary?.outstanding || 0,
        auditData: auditData,
      },
      create: {
        organizationId: session.user.organizationId,
        date: date,
        status: auditData.status || "completed",
        completedAt: auditData.completedAt ? new Date(auditData.completedAt) : new Date(),
        closedAt: auditData.closedAt ? new Date(auditData.closedAt) : new Date(),
        closedBy: auditData.closedBy || session.user.name,
        user: auditData.user || session.user.name,
        checkIns: auditData.checkIns || 0,
        checkOuts: auditData.checkOuts || 0,
        noShows: auditData.noShows || 0,
        totalRooms: auditData.totalRooms || 0,
        occupiedRooms: auditData.occupiedRooms || 0,
        occupancy: auditData.occupancy || 0,
        revenue: auditData.revenue || 0,
        roomChargesPosted: auditData.roomChargesPosted || 0,
        roomChargeTotal: auditData.roomChargeTotal || 0,
        packagesPosted: auditData.packagesPosted || 0,
        packageTotal: auditData.packageTotal || 0,
        foliosClosed: auditData.foliosClosed || 0,
        paymentsTotal: auditData.paymentsTotal || auditData.financialSummary?.payments || 0,
        taxesTotal: auditData.taxesTotal || auditData.financialSummary?.taxes || 0,
        outstanding: auditData.outstanding || auditData.financialSummary?.outstanding || 0,
        auditData: auditData,
      },
    })

    return NextResponse.json({ success: true, audit })
  } catch (error: any) {
    console.error("[NightAudit POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Reverse/delete a night audit
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    // Update status to reversed instead of deleting
    const audit = await prisma.nightAudit.update({
      where: {
        organizationId_date: {
          organizationId: session.user.organizationId,
          date: date,
        },
      },
      data: {
        status: "reversed",
      },
    })

    return NextResponse.json({ success: true, audit })
  } catch (error: any) {
    console.error("[NightAudit DELETE] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
