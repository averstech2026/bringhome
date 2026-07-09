/** Роли multi-tenant платформы */
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  FAMILY_ADMIN: 'family_admin',
  MEMBER: 'member',
};

/** @deprecated legacy */
const LEGACY_ADMIN = 'admin';
/** @deprecated legacy */
const LEGACY_USER = 'user';

export const PLATFORM_OWNER_EMAIL = 'inert@mail.ru';

function isPlatformOwnerEmail(email) {
  return email === PLATFORM_OWNER_EMAIL;
}

/** Нормализует роль для прав доступа (без учёта владельца платформы) */
export function normalizeRole(role) {
  if (role === ROLES.SUPER_ADMIN) return ROLES.SUPER_ADMIN;
  if (role === ROLES.FAMILY_ADMIN || role === LEGACY_ADMIN) return ROLES.FAMILY_ADMIN;
  if (role === ROLES.MEMBER || role === LEGACY_USER) return ROLES.MEMBER;
  return ROLES.MEMBER;
}

/**
 * Владелец платформы: super_admin, email владельца или bootstrap adminUid из config/setup.
 * Legacy role `admin` — это админ семьи, не владелец (кроме adminUid).
 */
export function isSuperAdmin(profile, platformAdminUid = null) {
  if (!profile || profile.disabled) return false;
  if (profile.role === ROLES.SUPER_ADMIN) return true;
  if (profile.email && isPlatformOwnerEmail(profile.email)) return true;
  if (platformAdminUid && profile.id === platformAdminUid) return true;
  return false;
}

export function isFamilyAdmin(profile, platformAdminUid = null) {
  if (!profile || profile.disabled) return false;
  if (isSuperAdmin(profile, platformAdminUid)) return false;
  return normalizeRole(profile.role) === ROLES.FAMILY_ADMIN;
}

export function isMember(profile, platformAdminUid = null) {
  if (!profile || profile.disabled) return false;
  return !isSuperAdmin(profile, platformAdminUid) && !isFamilyAdmin(profile, platformAdminUid);
}

/** Любой админ: владелец платформы или админ семьи */
export function isAnyAdmin(profile, platformAdminUid = null) {
  return isSuperAdmin(profile, platformAdminUid) || isFamilyAdmin(profile, platformAdminUid);
}

/** @deprecated используйте isSuperAdmin */
export function isPlatformAdmin(profile, platformAdminUid = null) {
  return isSuperAdmin(profile, platformAdminUid);
}

export function getRoleLabel(profileOrRole, platformAdminUid = null) {
  const profile = typeof profileOrRole === 'string'
    ? { role: profileOrRole }
    : profileOrRole;

  if (isSuperAdmin(profile, platformAdminUid)) {
    return 'Владелец';
  }

  switch (normalizeRole(profile?.role)) {
    case ROLES.FAMILY_ADMIN:
      return 'Админ семьи';
    case ROLES.MEMBER:
      return profile?.isChild ? 'Участник (ребёнок)' : 'Участник';
    default:
      return 'Участник';
  }
}
