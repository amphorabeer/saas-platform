import type { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '../../../lib/prisma'
import { Pool } from 'pg'

const VALID_STATUS = ['TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED'] as const
function getPlanPrice(plan: string): number {
  switch (plan) {
    case 'STARTER': return 0
    case 'PROFESSIONAL': return 99
    case 'ENTERPRISE': return 299
    default: return 0
  }
}

// Hotel database pool for syncing
function getHotelPool() {
  const hotelDbUrl = process.env.HOTEL_DATABASE_URL
  if (!hotelDbUrl) return null
  return new Pool({ connectionString: hotelDbUrl, ssl: { rejectUnauthorized: false } })
}

// Brewery database pool for syncing
function getBreweryPool() {
  const breweryDbUrl = process.env.BREWERY_DATABASE_URL
  if (!breweryDbUrl) return null
  return new Pool({ connectionString: breweryDbUrl, ssl: { rejectUnauthorized: false } })
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Organization ID is required' })
  }

  if (req.method === 'GET') {
    try {
      const organization = await prisma.organization.findUnique({
        where: { id },
        include: {
          subscription: true,
          modules: true,
          _count: { select: { users: true } }
        }
      })

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' })
      }

      return res.status(200).json({
        id: organization.id,
        name: organization.name,
        email: organization.email,
        slug: organization.slug,
        hotelCode: organization.hotelCode || '',
        status: organization.subscription?.status?.toLowerCase() || 'trial',
        plan: organization.subscription?.plan || 'STARTER',
        users: organization._count.users,
        modules: organization.modules.map(m => m.moduleType),
        createdAt: organization.createdAt.toISOString().split('T')[0]
      })
    } catch (error: any) {
      console.error('Failed to fetch organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = req.body
      const { name, email, slug, plan, status, modules } = body
      console.log('[Organizations API] PUT /api/organizations/' + id, { body, status, plan })

      // Get tenantCode for syncing to Hotel database
      const orgForSync = await prisma.organization.findUnique({
        where: { id },
        select: { hotelCode: true, tenantCode: true }
      })
      // Extract hotel code from tenantCode (HOTEL-2099 -> 2099)
      const hotelCodeForSync = orgForSync?.tenantCode?.startsWith('HOTEL-') 
        ? orgForSync.tenantCode.replace('HOTEL-', '') 
        : null

      let organization: Awaited<ReturnType<typeof prisma.organization.update>> | null = null
      
      // Prepare status and plan values
      const rawStatus = status != null ? String(status).trim().toUpperCase() : ''
      const validStatus = rawStatus && VALID_STATUS.includes(rawStatus as any) ? rawStatus : null
      const rawPlan = plan != null ? String(plan).trim().toUpperCase() : ''
      const newPlan = rawPlan && ['STARTER', 'PROFESSIONAL', 'ENTERPRISE'].includes(rawPlan) ? rawPlan : null

      await prisma.$transaction(async (tx) => {
        // 1. Update organization
        organization = await tx.organization.update({
          where: { id },
          data: { name, email, slug }
        })

        // 2. Update or create SUBSCRIPTION
        if (validStatus != null || newPlan != null) {
          const existingSubscription = await tx.subscription.findFirst({
            where: { organizationId: id }
          })

          if (existingSubscription) {
            const updateData: { plan?: string; status?: string } = {}
            if (newPlan) updateData.plan = newPlan
            if (validStatus) updateData.status = validStatus
            if (Object.keys(updateData).length > 0) {
              await tx.subscription.update({
                where: { id: existingSubscription.id },
                data: updateData as any
              })
              console.log(`[Organizations API] Subscription.update id=${existingSubscription.id}`, updateData)
            }
          } else {
            const now = new Date()
            const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
            const subPlan = newPlan || 'STARTER'
            const subStatus = validStatus || 'TRIAL'
            await tx.subscription.create({
              data: {
                organizationId: id,
                plan: subPlan as any,
                status: subStatus as any,
                price: getPlanPrice(subPlan),
                currentPeriodStart: now,
                currentPeriodEnd: trialEnd,
                trialStart: now,
                trialEnd: trialEnd
              }
            })
            console.log(`[Organizations API] Subscription.create for org ${id}`, { plan: subPlan, status: subStatus })
          }
        }

        // 3. Update modules
        if (modules && Array.isArray(modules)) {
          await tx.moduleAccess.deleteMany({
            where: { organizationId: id }
          })
          for (const moduleType of modules) {
            await tx.moduleAccess.create({
              data: {
                organizationId: id,
                moduleType,
                isActive: true
              }
            })
          }
        }
      })

      // 4. SYNC to Hotel database if this is a hotel organization
      if (hotelCodeForSync && (validStatus || newPlan)) {
        const pool = getHotelPool()
        if (pool) {
          try {
            // Find organization in Hotel DB by hotelCode
            const orgResult = await pool.query(
              'SELECT id FROM "Organization" WHERE "hotelCode" = $1',
              [hotelCodeForSync]
            )
            
            if (orgResult.rows.length > 0) {
              const hotelOrgId = orgResult.rows[0].id
              
              // Check if subscription exists
              const subResult = await pool.query(
                'SELECT id FROM "Subscription" WHERE "organizationId" = $1',
                [hotelOrgId]
              )
              
              if (subResult.rows.length > 0) {
                // Update existing subscription
                const updates: string[] = []
                const values: any[] = []
                let paramIndex = 1
                
                if (newPlan) {
                  updates.push(`"plan" = $${paramIndex++}`)
                  values.push(newPlan)
                }
                if (validStatus) {
                  updates.push(`"status" = $${paramIndex++}`)
                  values.push(validStatus)
                }
                
                if (updates.length > 0) {
                  values.push(subResult.rows[0].id)
                  await pool.query(
                    `UPDATE "Subscription" SET ${updates.join(', ')}, "updatedAt" = NOW() WHERE id = $${paramIndex}`,
                    values
                  )
                  console.log(`[Hotel DB Sync] Updated subscription for hotelCode=${hotelCodeForSync}`, { plan: newPlan, status: validStatus })
                }
              } else {
                // Create subscription
                const now = new Date()
                const trialEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
                await pool.query(
                  `INSERT INTO "Subscription" (id, "organizationId", plan, status, price, "currentPeriodStart", "currentPeriodEnd", "trialStart", "trialEnd", "createdAt", "updatedAt")
                   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
                  [
                    `sub_${Date.now()}`,
                    hotelOrgId,
                    newPlan || 'STARTER',
                    validStatus || 'TRIAL',
                    getPlanPrice(newPlan || 'STARTER'),
                    now,
                    trialEnd,
                    now,
                    trialEnd
                  ]
                )
                console.log(`[Hotel DB Sync] Created subscription for hotelCode=${hotelCodeForSync}`)
              }
            } else {
              console.log(`[Hotel DB Sync] Organization not found for hotelCode=${hotelCodeForSync}`)
            }
          } catch (syncError) {
            console.error('[Hotel DB Sync] Error:', syncError)
          } finally {
            await pool.end()
          }
        }
      }

      // 5. SYNC to Brewery database if this is a brewery organization
      const isBreweryOrg = modules?.includes('BREWERY') || orgForSync?.tenantCode?.startsWith('BREWERY-')
      const breweryTenantId = orgForSync?.tenantCode?.startsWith('BREWERY-') 
        ? orgForSync.tenantCode.replace('BREWERY-', '') 
        : null
      
      if (isBreweryOrg && breweryTenantId && (validStatus || newPlan)) {
        const breweryPool = getBreweryPool()
        if (breweryPool) {
          try {
            // Find tenant in Brewery DB by id
            const tenantResult = await breweryPool.query(
              'SELECT id FROM "Tenant" WHERE id = $1',
              [breweryTenantId]
            )
            
            if (tenantResult.rows.length > 0) {
              // Update tenant's plan and isActive status
              const updates: string[] = []
              const values: any[] = []
              let paramIndex = 1
              
              if (newPlan) {
                updates.push(`"plan" = $${paramIndex++}`)
                values.push(newPlan)
              }
              if (validStatus) {
                // Convert status to isActive boolean
                const isActive = validStatus === 'ACTIVE'
                updates.push(`"isActive" = $${paramIndex++}`)
                values.push(isActive)
              }
              
              if (updates.length > 0) {
                values.push(breweryTenantId)
                await breweryPool.query(
                  `UPDATE "Tenant" SET ${updates.join(', ')}, "updatedAt" = NOW() WHERE id = $${paramIndex}`,
                  values
                )
                console.log(`[Brewery DB Sync] Updated tenant for tenantId=${breweryTenantId}`, { plan: newPlan, status: validStatus })
              }
            } else {
              console.log(`[Brewery DB Sync] Tenant not found for tenantId=${breweryTenantId}`)
            }
          } catch (syncError) {
            console.error('[Brewery DB Sync] Error:', syncError)
          } finally {
            await breweryPool.end()
          }
        }
      }

      // Refetch and return
      const updated = await prisma.organization.findUnique({
        where: { id },
        include: { subscription: true }
      })
      const resOrg = updated
        ? {
            ...updated,
            status: updated.subscription?.status?.toLowerCase() ?? 'trial',
            plan: updated.subscription?.plan ?? 'STARTER'
          }
        : organization!
      return res.status(200).json({ success: true, organization: resOrg })
    } catch (error: any) {
      console.error('Failed to update organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // First delete all users belonging to this organization
      await prisma.user.deleteMany({
        where: { organizationId: id }
      })

      await prisma.moduleAccess.deleteMany({
        where: { organizationId: id }
      })

      await prisma.subscription.deleteMany({
        where: { organizationId: id }
      })

      await prisma.organization.delete({
        where: { id }
      })

      return res.status(200).json({ success: true })
    } catch (error: any) {
      console.error('Failed to delete organization:', error)
      return res.status(500).json({ error: error.message })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}