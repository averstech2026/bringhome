import { isOwnerEmail } from '../services/usersService';

/**
 * Дополнительные UID с правом рассылки (помимо role === 'admin' и email владельца).
 * Для теста можно добавить свой Firebase UID.
 */
export const NOTIFICATION_ADMIN_UIDS = new Set([
  'yVSBfuevYhgcI4kHYnQfZGEbNNw2',
]);

export function canManageNotifications({ profile, uid }) {
  if (!uid) return false;
  if (NOTIFICATION_ADMIN_UIDS.has(uid)) return true;
  if (profile?.role === 'admin' && !profile?.disabled) return true;
  if (profile?.email && isOwnerEmail(profile.email)) return true;
  return false;
}
