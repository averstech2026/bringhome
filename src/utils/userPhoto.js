/** Актуальное фото: Firestore-профиль приоритетнее Auth (обновляется сразу после загрузки). */
export function getUserPhotoUrl(user, profile) {
  return profile?.avatarUrl || user?.photoURL || null;
}
