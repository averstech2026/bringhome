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
  arrayUnion,
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

export async function createAdminAnnouncement({
  senderId,
  senderDisplayName,
  receiverIds,
  body,
  sendAsPush = true,
}) {
  const unique = [...new Set((receiverIds || []).filter(Boolean))];
  const trimmedBody = body?.trim();
  if (!senderId || unique.length === 0 || !trimmedBody) {
    throw new Error('Заполните получателей и текст сообщения');
  }

  const ref = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    senderId,
    senderDisplayName: senderDisplayName || '',
    receiverIds: unique,
    type: 'admin_announcement',
    title: 'КупиДомой',
    body: trimmedBody,
    link: '/settings/notifications',
    sendAsPush: sendAsPush === true,
    readByUids: [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function isNotificationRead(notification, userId) {
  if (!notification || !userId) return true;
  if (Array.isArray(notification.receiverIds)) {
    return (notification.readByUids || []).includes(userId);
  }
  return notification.isRead === true;
}

function sortNotifications(items) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

function mergeNotificationSnapshots(...groups) {
  const byId = new Map();
  for (const group of groups) {
    for (const item of group) {
      byId.set(item.id, item);
    }
  }
  return sortNotifications([...byId.values()]);
}

export function subscribeToNotifications(userId, onChange) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  let legacyItems = [];
  let broadcastItems = [];
  const emit = () => onChange(mergeNotificationSnapshots(legacyItems, broadcastItems));

  const legacyQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    limit(100),
  );

  const broadcastQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('receiverIds', 'array-contains', userId),
    limit(100),
  );

  const unsubLegacy = onSnapshot(
    legacyQuery,
    (snapshot) => {
      legacyItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      emit();
    },
    () => {
      legacyItems = [];
      emit();
    },
  );

  const unsubBroadcast = onSnapshot(
    broadcastQuery,
    (snapshot) => {
      broadcastItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      emit();
    },
    () => {
      broadcastItems = [];
      emit();
    },
  );

  return () => {
    unsubLegacy();
    unsubBroadcast();
  };
}

export function subscribeToSentNotifications(senderId, onChange) {
  if (!senderId) {
    onChange([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('senderId', '==', senderId),
    limit(100),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = sortNotifications(
        snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
      );
      onChange(items);
    },
    () => onChange([]),
  );
}

export async function markNotificationRead(notificationId, { userId, notification } = {}) {
  if (!notificationId || !userId) return;

  if (Array.isArray(notification?.receiverIds)) {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
      readByUids: arrayUnion(userId),
    });
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
  });
}
