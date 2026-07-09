import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  limit,
  arrayUnion,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { notifyAdminAnnouncementPush } from './pushNotification';
import { ONBOARDING_GUIDE_TYPE, WELCOME_NOTIFICATION } from '../utils/onboardingContent';

export { ONBOARDING_GUIDE_TYPE };

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

export async function createWelcomeOnboardingNotification(userId, firestoreDb = db) {
  if (!userId) return null;
  const ref = await addDoc(collection(firestoreDb, COLLECTIONS.NOTIFICATIONS), {
    userId,
    type: WELCOME_NOTIFICATION.type,
    title: WELCOME_NOTIFICATION.title,
    body: WELCOME_NOTIFICATION.body,
    link: '',
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function ensureWelcomeOnboardingNotification(userId, firestoreDb = db) {
  if (!userId) return null;

  const snapshot = await getDocs(
    query(
      collection(firestoreDb, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      limit(50),
    ),
  );

  const existing = snapshot.docs.find(
    (docSnap) => docSnap.data().type === WELCOME_NOTIFICATION.type,
  );
  if (existing) return existing.id;

  return createWelcomeOnboardingNotification(userId, firestoreDb);
}

export async function createAdminAnnouncement({
  senderId,
  senderDisplayName,
  familyId,
  familyName,
  title,
  body,
  sendAsPush = true,
}) {
  const trimmedBody = body?.trim();
  const trimmedTitle = title?.trim();
  const resolvedFamilyId = familyId?.trim();

  if (!senderId || !resolvedFamilyId || !trimmedBody || !trimmedTitle) {
    throw new Error('Заполните получателей, заголовок и текст сообщения');
  }

  const ref = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), {
    senderId,
    senderDisplayName: senderDisplayName || '',
    familyId: resolvedFamilyId,
    familyName: familyName || '',
    type: 'admin_announcement',
    title: trimmedTitle,
    body: trimmedBody,
    link: '/settings/notifications',
    sendAsPush: sendAsPush === true,
    readByUids: [],
    createdAt: serverTimestamp(),
  });

  if (sendAsPush) {
    notifyAdminAnnouncementPush({
      familyId: resolvedFamilyId,
      title: trimmedTitle,
      body: trimmedBody,
      excludeUid: senderId,
    }).catch((err) => console.warn('[notifications] Не удалось отправить push', err));
  }

  return ref.id;
}

function isBroadcastAnnouncement(notification) {
  return notification?.type === 'admin_announcement'
    && (Array.isArray(notification.receiverIds) || Boolean(notification.familyId));
}

export function isNotificationRead(notification, userId) {
  if (!notification || !userId) return true;
  if (isBroadcastAnnouncement(notification)) {
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

export function subscribeToNotifications(userId, userFamilyId, onChange) {
  if (!userId) {
    onChange([]);
    return () => {};
  }

  let legacyItems = [];
  let legacyBroadcastItems = [];
  let globalItems = [];
  let familyItems = [];
  const unsubscribers = [];

  const emit = () => onChange(
    mergeNotificationSnapshots(legacyItems, legacyBroadcastItems, globalItems, familyItems),
  );

  const legacyQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('userId', '==', userId),
    limit(100),
  );

  const legacyBroadcastQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('receiverIds', 'array-contains', userId),
    limit(100),
  );

  const globalQuery = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('familyId', '==', 'global'),
    limit(100),
  );

  unsubscribers.push(onSnapshot(
    legacyQuery,
    (snapshot) => {
      legacyItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      emit();
    },
    () => {
      legacyItems = [];
      emit();
    },
  ));

  unsubscribers.push(onSnapshot(
    legacyBroadcastQuery,
    (snapshot) => {
      legacyBroadcastItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      emit();
    },
    () => {
      legacyBroadcastItems = [];
      emit();
    },
  ));

  unsubscribers.push(onSnapshot(
    globalQuery,
    (snapshot) => {
      globalItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      emit();
    },
    () => {
      globalItems = [];
      emit();
    },
  ));

  if (userFamilyId) {
    const familyQuery = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('familyId', '==', userFamilyId),
      limit(100),
    );

    unsubscribers.push(onSnapshot(
      familyQuery,
      (snapshot) => {
        familyItems = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        emit();
      },
      () => {
        familyItems = [];
        emit();
      },
    ));
  }

  return () => {
    unsubscribers.forEach((unsub) => unsub());
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

  if (isBroadcastAnnouncement(notification)) {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
      readByUids: arrayUnion(userId),
    });
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
  });
}
