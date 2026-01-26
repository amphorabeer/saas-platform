export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

// POST - Sync multiple folios (bulk upsert)
export async function POST(request: NextRequest) {
  try {
    const { getOrganizationId, unauthorizedResponse } = await import('@/lib/tenant')
    const organizationId = await getOrganizationId()
    
    if (!organizationId) {
      return unauthorizedResponse()
    }
    
    const { getPrismaClient } = await import('@/lib/prisma')
    const prisma = getPrismaClient()
    const { folios } = await request.json()
    
    if (!Array.isArray(folios)) {
      return NextResponse.json({ error: 'folios array required' }, { status: 400 })
    }
    
    console.log(`📥 POST /api/hotel/folios/sync - Syncing ${folios.length} folios`)
    
    const results = {
      created: 0,
      updated: 0,
      errors: [] as string[]
    }
    
    for (const folio of folios) {
      try {
        // Check if exists
        const existing = await prisma.folio.findFirst({
          where: { 
            organizationId,
            OR: [
              { folioNumber: folio.folioNumber },
              { id: folio.id }
            ]
          }
        })
        
        const data = mapFolioToDatabase(folio, organizationId)
        
        if (existing) {
          await prisma.folio.update({
            where: { id: existing.id },
            data
          })
          results.updated++
        } else {
          await prisma.folio.create({ data })
          results.created++
        }
      } catch (e: any) {
        results.errors.push(`${folio.folioNumber}: ${e.message}`)
      }
    }
    
    console.log(`✅ Sync complete: ${results.created} created, ${results.updated} updated, ${results.errors.length} errors`)
    
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error syncing folios:', error)
    return NextResponse.json({ error: 'Failed to sync folios', details: error.message }, { status: 500 })
  }
}

// Helper: Map frontend folio to database format
function mapFolioToDatabase(data: any, organizationId: string) {
  const transactions = data.transactions || []
  const charges = transactions.filter((t: any) => 
    t.type === 'charge' || t.type === 'adjustment' || t.debit > 0
  )
  const payments = transactions.filter((t: any) => 
    t.type === 'payment' || t.credit > 0
  )
  
  const totalCharges = charges.reduce((sum: number, t: any) => sum + (t.debit || 0), 0)
  const totalPayments = payments.reduce((sum: number, t: any) => sum + (t.credit || 0), 0)
  
  return {
    organizationId,
    folioNumber: data.folioNumber,
    guestName: data.guestName,
    roomNumber: data.roomNumber || null,
    reservationId: data.reservationId || null,
    status: data.status || 'open',
    folioType: data.folioType || 'guest',
    totalCharges,
    totalPayments,
    balance: data.balance ?? (totalCharges - totalPayments),
    checkIn: data.checkIn ? new Date(data.checkIn) : null,
    checkOut: data.checkOut ? new Date(data.checkOut) : null,
    closedAt: data.status === 'closed' && data.closeDate ? new Date(data.closeDate) : null,
    charges,
    payments,
    folioData: {
      creditLimit: data.creditLimit,
      paymentMethod: data.paymentMethod,
      openDate: data.openDate,
      closeDate: data.closeDate,
      routingInstructions: data.routingInstructions,
      masterFolioId: data.masterFolioId,
      companyId: data.companyId
    }
  }
}