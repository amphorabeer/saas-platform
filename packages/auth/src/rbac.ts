type UserRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'BREWER' | 'VIEWER'

/**
 * Permission definitions
 * Each permission maps to specific actions
 */
export const PERMISSIONS = {
  // Batch permissions
  'batch:create': ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'],
  'batch:read': ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  'batch:update': ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR'],
  'batch:delete': ['OWNER', 'ADMIN'],
  'batch:cancel': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Inventory permissions
  'inventory:read': ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  'inventory:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'inventory:update': ['OWNER', 'ADMIN', 'MANAGER'],
  'inventory:adjust': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Tank permissions
  'tank:read': ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  'tank:manage': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Recipe permissions
  'recipe:read': ['OWNER', 'ADMIN', 'MANAGER', 'OPERATOR', 'VIEWER'],
  'recipe:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'recipe:update': ['OWNER', 'ADMIN', 'MANAGER'],
  'recipe:delete': ['OWNER', 'ADMIN'],
  
  // Sales permissions
  'sales:read': ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'sales:create': ['OWNER', 'ADMIN', 'MANAGER'],
  'sales:update': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Reports permissions
  'reports:read': ['OWNER', 'ADMIN', 'MANAGER', 'VIEWER'],
  'reports:export': ['OWNER', 'ADMIN', 'MANAGER'],
  
  // Settings permissions
  'settings:read': ['OWNER', 'ADMIN'],
  'settings:create': ['OWNER', 'ADMIN'],
  'settings:update': ['OWNER', 'ADMIN'],
  'settings:delete': ['OWNER', 'ADMIN'],
  'users:manage': ['OWNER', 'ADMIN'],
  'tenant:manage': ['OWNER'],
} as const

export type Permission = keyof typeof PERMISSIONS

/**
 * Check if role has permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission]
  return (allowedRoles as readonly string[]).includes(role)
}

/**
 * Check if role has any of the permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

/**
 * Check if role has all permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return (Object.entries(PERMISSIONS) as [Permission, readonly UserRole[]][])
    .filter(([_, roles]) => roles.includes(role))
    .map(([permission]) => permission)
}

/**
 * Role hierarchy (for UI display)
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  OWNER: 100,
  ADMIN: 80,
  MANAGER: 60,
  BREWER: 40,
  VIEWER: 20,
}

/**
 * Role display names
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: 'მფლობელი',
  ADMIN: 'ადმინისტრატორი',
  MANAGER: 'მენეჯერი',
  BREWER: 'მეწარმე',
  VIEWER: 'მაყურებელი',
}



















