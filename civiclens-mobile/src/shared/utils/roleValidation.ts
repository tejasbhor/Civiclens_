// Role validation utilities

export type UserRole = 
  | 'citizen' 
  | 'contributor' 
  | 'moderator' 
  | 'nodal_officer' 
  | 'auditor' 
  | 'admin' 
  | 'super_admin';

export type LoginRoute = 'citizen' | 'officer';

// Citizen route roles
const CITIZEN_ROLES: UserRole[] = [
  'citizen',
  'contributor',
  'moderator',
];

// Officer route roles
const OFFICER_ROLES: UserRole[] = [
  'nodal_officer',
  'auditor',
  'admin',
  'super_admin',
];

/**
 * Validate if a user role is allowed for the given login route
 */
export function validateRoleForRoute(userRole: UserRole, loginRoute: LoginRoute): {
  isValid: boolean;
  error?: string;
} {
  if (loginRoute === 'citizen') {
    if (CITIZEN_ROLES.includes(userRole)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: 'This account requires officer login. Please use the Nodal Officer option.',
    };
  }

  if (loginRoute === 'officer') {
    if (OFFICER_ROLES.includes(userRole)) {
      return { isValid: true };
    }
    return {
      isValid: false,
      error: 'This account requires citizen login. Please use the Citizen option.',
    };
  }

  return { isValid: false, error: 'Invalid login route' };
}

/**
 * Get user-friendly role name
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    citizen: 'Citizen',
    contributor: 'Contributor',
    moderator: 'Moderator',
    nodal_officer: 'Nodal Officer',
    auditor: 'Auditor',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
  };
  return roleNames[role] || role;
}

/**
 * Check if role is citizen-level
 */
export function isCitizenRole(role: UserRole): boolean {
  return CITIZEN_ROLES.includes(role);
}

/**
 * Check if role is officer-level
 */
export function isOfficerRole(role: UserRole): boolean {
  return OFFICER_ROLES.includes(role);
}
