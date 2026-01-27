import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const organizationId = (session.user as any).organizationId
    if (!organizationId) return NextResponse.json({ error: "Organization ID not found" }, { status: 400 })

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    const current = searchParams.get("current")

    if (current === "true") {
      const shift = await prisma.cashierShift.findFirst({
        where: { organizationId, status: "open" },
        orderBy: { openedAt: "desc" },
      })
      
      // Return shift data in format expected by frontend
      if (shift) {
        const shiftData = shift.shiftData as any
        return NextResponse.json({
          ...shiftData,
          id: shift.id, // Use database ID!
          dbId: shift.id,
          shiftNumber: shift.shiftNumber,
          status: shift.status,
          openedAt: shift.openedAt?.toISOString(),
          closedAt: shift.closedAt?.toISOString(),
          openingBalance: shift.openingBalance,
          closingBalance: shift.closingBalance,
        })
      }
      return NextResponse.json(null)
    }

    const shifts = await prisma.cashierShift.findMany({
      where: { organizationId },
      orderBy: { openedAt: "desc" },
      take: 50,
    })
    
    // Format shifts for frontend
    const formattedShifts = shifts.map(shift => {
      const shiftData = shift.shiftData as any
      return {
        ...shiftData,
        id: shift.id,
        dbId: shift.id,
        shiftNumber: shift.shiftNumber,
        status: shift.status,
        openedAt: shift.openedAt?.toISOString(),
        closedAt: shift.closedAt?.toISOString(),
        openingBalance: shift.openingBalance,
        closingBalance: shift.closingBalance,
      }
    })
    
    return NextResponse.json(formattedShifts)
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

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const body = await request.json()
    const { id, dbId, ...shiftData } = body
    
    // Use dbId if provided (database ID), otherwise try id
    const shiftId = dbId || id

    // If we have a valid database ID, try to update
    if (shiftId && typeof shiftId === 'string' && shiftId.length > 10) {
      // Check if shift exists
      const existingShift = await prisma.cashierShift.findFirst({
        where: { id: shiftId, organizationId }
      })
      
      if (existingShift) {
        const shift = await prisma.cashierShift.update({
          where: { id: shiftId },
          data: {
            status: shiftData.status || existingShift.status,
            closedAt: shiftData.closedAt ? new Date(shiftData.closedAt) : null,
            closingBalance: shiftData.closingBalance ?? existingShift.closingBalance,
            totalCashIn: shiftData.totalCashIn || 0,
            totalCashOut: shiftData.totalCashOut || 0,
            totalCard: shiftData.totalCard || 0,
            totalBank: shiftData.totalBank || 0,
            transactions: shiftData.transactions,
            shiftData: shiftData.shiftData || shiftData,
          },
        })
        
        console.log('[Cashier POST] Updated shift:', shift.id)
        
        return NextResponse.json({ 
          success: true, 
          shift: {
            ...shiftData,
            id: shift.id,
            dbId: shift.id,
            status: shift.status
          }
        })
      }
    }

    // Create new shift
    const shift = await prisma.cashierShift.create({
      data: {
        organizationId,
        shiftNumber: shiftData.shiftNumber || `SH-${Date.now()}`,
        cashierName: shiftData.cashierName || (session.user as any).name || "Cashier",
        cashierId: shiftData.cashierId || (session.user as any).id,
        openingBalance: shiftData.openingBalance || 0,
        shiftData: shiftData,
      },
    })
    
    console.log('[Cashier POST] Created new shift:', shift.id)
    
    // Return the database ID!
    return NextResponse.json({ 
      success: true, 
      shift: {
        ...shiftData,
        id: shift.id,
        dbId: shift.id,
        shiftNumber: shift.shiftNumber,
        status: shift.status,
        openedAt: shift.openedAt?.toISOString()
      }
    })
  } catch (error: any) {
    console.error("[Cashier POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}