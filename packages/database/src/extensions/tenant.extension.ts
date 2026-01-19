import { Prisma, PrismaClient } from '@prisma/client'

// Models that require tenant scoping
const TENANT_SCOPED_MODELS = [
  'User',
  'Recipe',
  'RecipeIngredient',
  'InventoryItem',
  'InventoryLedger',
  'Batch',
  'BatchIngredient',
  'GravityReading',
  'BatchTimeline',
  'Tank',
  'TankOccupation',
  'PackagingRun',
  'Customer',
  'SalesOrder',
  'OrderItem',
  'AuditLog',
  'IdempotencyKey',
] as const

type TenantScopedModel = typeof TENANT_SCOPED_MODELS[number]

/**
 * Create Prisma client with automatic tenant scoping
 * 
 * Usage:
 * const tenantPrisma = createTenantClient(tenantId)
 * const batches = await tenantPrisma.batch.findMany() // Auto-scoped
 */
export function createTenantClient(tenantId: string) {
  const prisma = new PrismaClient()
  
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async findFirst({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async findUnique({ model, args, query }) {
          // For findUnique, add tenantId check after query
          const result = await query(args)
          if (result && TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            if ((result as any).tenantId !== tenantId) {
              return null // Hide cross-tenant data
            }
          }
          return result
        },
        async create({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.data = { ...args.data, tenantId }
          }
          return query(args)
        },
        async createMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            if (Array.isArray(args.data)) {
              args.data = args.data.map(d => ({ ...d, tenantId }))
            } else {
              args.data = { ...args.data, tenantId }
            }
          }
          return query(args)
        },
        async update({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async updateMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async delete({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async deleteMany({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async count({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
        async aggregate({ model, args, query }) {
          if (TENANT_SCOPED_MODELS.includes(model as TenantScopedModel)) {
            args.where = { ...args.where, tenantId }
          }
          return query(args)
        },
      },
    },
  })
}

export type TenantPrismaClient = ReturnType<typeof createTenantClient>



















