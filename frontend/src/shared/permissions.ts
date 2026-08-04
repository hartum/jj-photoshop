export type RoleCode =
  | 'SUPERUSUARIO'
  | 'ADMIN'
  | 'GERENTE'
  | 'SUPERVISOR'
  | 'FOTOGRAFO'
  | 'CONTABLE'

export interface RoleConfig {
  allowedNavRoutes: string[]
  visibleTargetRoles: RoleCode[]
  assignableTargetRoles: RoleCode[]
  canCreateUsers: boolean
  scopeType: 'GLOBAL' | 'AREAS' | 'HOTELS' | 'NONE'
}

export const PERMISSION_MATRIX: Record<RoleCode, RoleConfig> = {
  SUPERUSUARIO: {
    allowedNavRoutes: ['/inicio', '/agenda', '/configuracion', '/usuarios', '/hoteles'],
    visibleTargetRoles: ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'CONTABLE'],
    assignableTargetRoles: ['SUPERUSUARIO', 'ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'CONTABLE'],
    canCreateUsers: true,
    scopeType: 'GLOBAL',
  },
  ADMIN: {
    allowedNavRoutes: ['/inicio', '/agenda', '/configuracion', '/usuarios', '/hoteles'],
    visibleTargetRoles: ['ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'CONTABLE'],
    assignableTargetRoles: ['ADMIN', 'GERENTE', 'SUPERVISOR', 'FOTOGRAFO', 'CONTABLE'],
    canCreateUsers: true,
    scopeType: 'GLOBAL',
  },
  GERENTE: {
    allowedNavRoutes: ['/inicio', '/agenda', '/usuarios'],
    visibleTargetRoles: ['GERENTE', 'SUPERVISOR', 'FOTOGRAFO'],
    assignableTargetRoles: ['SUPERVISOR', 'FOTOGRAFO'],
    canCreateUsers: true,
    scopeType: 'AREAS',
  },
  SUPERVISOR: {
    allowedNavRoutes: ['/inicio', '/agenda', '/usuarios'],
    visibleTargetRoles: ['SUPERVISOR', 'FOTOGRAFO'],
    assignableTargetRoles: ['FOTOGRAFO'],
    canCreateUsers: true,
    scopeType: 'HOTELS',
  },
  FOTOGRAFO: {
    allowedNavRoutes: ['/inicio', '/agenda'],
    visibleTargetRoles: [],
    assignableTargetRoles: [],
    canCreateUsers: false,
    scopeType: 'HOTELS',
  },
  CONTABLE: {
    allowedNavRoutes: ['/inicio', '/agenda', '/configuracion'],
    visibleTargetRoles: [],
    assignableTargetRoles: [],
    canCreateUsers: false,
    scopeType: 'GLOBAL',
  },
}

export function getRolePermissions(roleCode?: string): RoleConfig {
  const code = (roleCode?.toUpperCase() as RoleCode) || 'FOTOGRAFO'
  return PERMISSION_MATRIX[code] || PERMISSION_MATRIX.FOTOGRAFO
}

export function canAccessRoute(roleCode: string | undefined, path: string): boolean {
  const perm = getRolePermissions(roleCode)
  // Allow sub-routes like /usuarios/nuevo or /usuarios/:id/editar if /usuarios is allowed
  return perm.allowedNavRoutes.some((route) => path === route || path.startsWith(`${route}/`))
}

export function canEditUser(
  executorRoleCode: string | undefined,
  targetUserRoleCode: string | undefined,
  executorId: string | undefined,
  targetUserId: string | undefined,
): boolean {
  const execCode = executorRoleCode?.toUpperCase() as RoleCode
  const targetCode = targetUserRoleCode?.toUpperCase() as RoleCode
  const isSelf = executorId === targetUserId

  if (execCode === 'SUPERUSUARIO') return true
  if (execCode === 'ADMIN') return targetCode !== 'SUPERUSUARIO'
  if (execCode === 'GERENTE') {
    if (isSelf && targetCode === 'GERENTE') return true
    return targetCode === 'SUPERVISOR' || targetCode === 'FOTOGRAFO'
  }
  if (execCode === 'SUPERVISOR') {
    if (isSelf && targetCode === 'SUPERVISOR') return true
    return targetCode === 'FOTOGRAFO'
  }
  return false
}

export function canDeleteUser(
  executorRoleCode: string | undefined,
  targetUserRoleCode: string | undefined,
  executorId: string | undefined,
  targetUserId: string | undefined,
): boolean {
  if (executorId === targetUserId) return false // Cannot delete self
  return canEditUser(executorRoleCode, targetUserRoleCode, executorId, targetUserId)
}
