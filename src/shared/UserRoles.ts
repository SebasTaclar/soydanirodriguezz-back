/**
 * Constantes para roles de usuario en el sistema
 */
export const USER_ROLES = {
  ADMIN: 'admin',
  TEAM: 'team',
  USER: 'user',
} as const;

/**
 * Tipo para los roles válidos
 */
export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * Valida si un rol es válido
 * @param role - El rol a validar
 * @returns true si es válido, false si no
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

/**
 * Obtiene una descripción amigable del rol
 * @param role - El rol
 * @returns Descripción del rol
 */
export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case USER_ROLES.ADMIN:
      return 'Administrator';
    case USER_ROLES.TEAM:
      return 'Team Manager';
    case USER_ROLES.USER:
      return 'Regular User';
    default:
      return 'Unknown Role';
  }
}
