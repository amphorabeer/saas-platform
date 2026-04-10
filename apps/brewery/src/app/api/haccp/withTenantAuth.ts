/**
 * HACCP routes use JWT + tenant context without a specific RBAC permission.
 * Maps to `withTenant` in api-middleware (requested name: withTenantAuth).
 */
export { withTenant as withTenantAuth, type RouteContext } from '@/lib/api-middleware'
