import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { getAuthOptions } from "@/lib/auth"

// Manual transactions are stored in CashierShift.shiftData.manualTransactions
// This API provides direct access to add/get manual transactions for current shift

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
    const shiftId = searchParams.get("shiftId")
    const date = searchParams.get("date")

    // If shiftId provided, get transactions for that shift
    if (shiftId) {
      const shift = await prisma.cashierShift.findFirst({
        where: { id: shiftId, organizationId }
      })
      
      if (!shift) {
        return NextResponse.json({ transactions: [] })
      }
      
      const shiftData = shift.shiftData as any
      return NextResponse.json({ 
        transactions: shiftData?.manualTransactions || [] 
      })
    }

    // If date provided, get all transactions for that date from all shifts
    if (date) {
      const shifts = await prisma.cashierShift.findMany({
        where: { organizationId }
      })
      
      const transactions: any[] = []
      shifts.forEach((shift: any) => {
        const shiftData = shift.shiftData as any
        const manualTx = shiftData?.manualTransactions || []
        manualTx.forEach((tx: any) => {
          if (tx.date === date) {
            transactions.push({ ...tx, shiftId: shift.id })
          }
        })
      })
      
      return NextResponse.json({ transactions })
    }

    // Get current open shift's transactions
    const currentShift = await prisma.cashierShift.findFirst({
      where: { organizationId, status: "open" },
      orderBy: { openedAt: "desc" }
    })

    if (!currentShift) {
      return NextResponse.json({ transactions: [] })
    }

    const shiftData = currentShift.shiftData as any
    return NextResponse.json({ 
      transactions: shiftData?.manualTransactions || [],
      shiftId: currentShift.id
    })

  } catch (error: any) {
    console.error("[Cashier Transactions GET] Error:", error)
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
    const { shiftId, transaction } = body

    if (!transaction) {
      return NextResponse.json({ error: "Transaction data required" }, { status: 400 })
    }

    // Find the shift (either by ID or current open shift)
    let shift
    if (shiftId) {
      shift = await prisma.cashierShift.findFirst({
        where: { id: shiftId, organizationId }
      })
    } else {
      shift = await prisma.cashierShift.findFirst({
        where: { organizationId, status: "open" },
        orderBy: { openedAt: "desc" }
      })
    }

    if (!shift) {
      return NextResponse.json({ error: "No open shift found" }, { status: 404 })
    }

    // Add transaction to shiftData.manualTransactions
    const shiftData = (shift.shiftData as any) || {}
    const manualTransactions = shiftData.manualTransactions || []
    
    const newTransaction = {
      ...transaction,
      id: transaction.id || `MANUAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      shiftId: shift.id,
      createdAt: new Date().toISOString()
    }
    
    manualTransactions.push(newTransaction)
    shiftData.manualTransactions = manualTransactions

    // Update shift
    const updatedShift = await prisma.cashierShift.update({
      where: { id: shift.id },
      data: { shiftData }
    })

    console.log('[Cashier Transactions] Added manual transaction:', newTransaction.id)
    
    return NextResponse.json({ 
      success: true, 
      transaction: newTransaction,
      shiftId: shift.id
    })

  } catch (error: any) {
    console.error("[Cashier Transactions POST] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authOptions = await getAuthOptions()
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const organizationId = (session.user as any).organizationId
    if (!organizationId) return NextResponse.json({ error: "Organization ID required" }, { status: 400 })

    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()

    const { searchParams } = new URL(request.url)
    const transactionId = searchParams.get("transactionId")
    const shiftId = searchParams.get("shiftId")

    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID required" }, { status: 400 })
    }

    // Find the shift
    let shift
    if (shiftId) {
      shift = await prisma.cashierShift.findFirst({
        where: { id: shiftId, organizationId }
      })
    } else {
      shift = await prisma.cashierShift.findFirst({
        where: { organizationId, status: "open" },
        orderBy: { openedAt: "desc" }
      })
    }

    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    // Remove transaction from shiftData.manualTransactions
    const shiftData = (shift.shiftData as any) || {}
    const manualTransactions = shiftData.manualTransactions || []
    
    shiftData.manualTransactions = manualTransactions.filter(
      (tx: any) => tx.id !== transactionId
    )

    // Update shift
    await prisma.cashierShift.update({
      where: { id: shift.id },
      data: { shiftData }
    })

    console.log('[Cashier Transactions] Deleted transaction:', transactionId)
    
    return NextResponse.json({ success: true, deleted: transactionId })

  } catch (error: any) {
    console.error("[Cashier Transactions DELETE] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}