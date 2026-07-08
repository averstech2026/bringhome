import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

export async function createNotification({ userId, type, title, body, link }) {
  if (!userId) return null;
  const ref = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    userId,
    type,
    title: title || 'КупиДомой',
    body: body || '',
    link: link || '/',
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function createNotificationsForUsers(userIds, payload) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (unique.length === 0) return;
  await Promise.all(unique.map((userId) => createNotification({ ...payload, userId })));
}

export function subscribeToNotifications(userId, onChange) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    limit(100),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toMillis?.() ?? 0;
          const bTime = b.createdAt?.toMillis?.() ?? 0;
          return bTime - aTime;
        });
      onChange(items);
    },
    () => onChange([]),
  );
}

export async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
  });
}
