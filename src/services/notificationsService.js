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
  arrayRemove,
  orderBy,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { notifyAdminAnnouncementPush } from './pushNotification';
import {
  HINT_TYPE,
  SYSTEM_HINTS,
  getHintById,
  WELCOME_NOTIFICATION,
} from '../utils/onboardingContent';

export { HINT_TYPE, ONBOARDING_GUIDE_TYPE } from '../utils/onboardingContent';

function isBroadcastNotification(notification) {
  if (!notification) return false;
  if (notification.type === 'admin_announcement'
    && (Array.isArray(notification.receiverIds) || Boolean(notification.familyId))) {
    return true;
  }
  if (notification.type === HINT_TYPE && notification.familyId === 'global') {
    return true;
  }
  return false;
}

export async function createNotification({
  userId,
  type,
  title,
  body,
  link,
  hintId,
}) {
  if (!userId) return null;
  const payload = {
    userId,
    type,
    title: title || 'КупиДомой',
    body: body || '',
    link: link || '/',
    isRead: false,
    createdAt: serverTimestamp(),
  };
  if (hintId) payload.hintId = hintId;
  const ref = await addDoc(collection(db, COLLECTIONS.NOTIFICATIONS), payload);
  return ref.id;
}

export async function createNotificationsForUsers(userIds, payload) {
  const unique = [...new Set((userIds || []).filter(Boolean))];
  if (unique.length === 0) return;
  await Promise.all(unique.map((userId) => createNotification({ ...payload, userId })));
}

async function findUserHintNotification(userId, hintId, firestoreDb = db) {
  const snapshot = await getDocs(
    query(
      collection(firestoreDb, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('type', '==', HINT_TYPE),
      where('hintId', '==', hintId),
      limit(1),
    ),
  );
  return snapshot.docs[0] || null;
}

async function findLegacyWelcomeNotification(userId, firestoreDb = db) {
  const snapshot = await getDocs(
    query(
      collection(firestoreDb, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      limit(20),
    ),
  );
  return snapshot.docs.find((docSnap) => docSnap.data().type === 'onboarding_guide') || null;
}

async function findGlobalHintDoc(hintId, firestoreDb = db) {
  const snapshot = await getDocs(
    query(
      collection(firestoreDb, COLLECTIONS.NOTIFICATIONS),
      where('type', '==', HINT_TYPE),
      where('hintId', '==', hintId),
      where('familyId', '==', 'global'),
      limit(1),
    ),
  );
  return snapshot.docs[0] || null;
}

export async function createWelcomeHintForUser(userId, firestoreDb = db) {
  if (!userId) return null;

  const existing = await findUserHintNotification(userId, 'welcome', firestoreDb);
  if (existing) return existing.id;

  const legacy = await findLegacyWelcomeNotification(userId, firestoreDb);
  if (legacy) return legacy.id;

  const hint = getHintById('welcome');
  const ref = await addDoc(collection(firestoreDb, COLLECTIONS.NOTIFICATIONS), {
    userId,
    type: HINT_TYPE,
    hintId: 'welcome',
    title: hint?.title || WELCOME_NOTIFICATION.title,
    body: hint?.body || WELCOME_NOTIFICATION.body,
    link: '',
    isRead: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/** @deprecated Use createWelcomeHintForUser */
export async function createWelcomeOnboardingNotification(userId, firestoreDb = db) {
  return createWelcomeHintForUser(userId, firestoreDb);
}

export async function ensureWelcomeHintForUser(userId, firestoreDb = db) {
  return createWelcomeHintForUser(userId, firestoreDb);
}

/** @deprecated Use ensureWelcomeHintForUser */
export async function ensureWelcomeOnboardingNotification(userId, firestoreDb = db) {
  return ensureWelcomeHintForUser(userId, firestoreDb);
}

export async function ensureGlobalHintTemplates(senderId, firestoreDb = db) {
  if (!senderId) return [];

  const results = await Promise.all(SYSTEM_HINTS.map(async (hint) => {
    const existing = await findGlobalHintDoc(hint.hintId, firestoreDb);
    if (existing) return existing.id;

    const ref = await addDoc(collection(firestoreDb, COLLECTIONS.NOTIFICATIONS), {
      type: HINT_TYPE,
      hintId: hint.hintId,
      familyId: 'global',
      senderId,
      title: hint.title,
      body: hint.body,
      isActive: hint.hintId === 'welcome',
      readByUids: [],
      createdAt: serverTimestamp(),
    });
    return ref.id;
  }));

  return results;
}

async function upsertUserHintNotification(userId, hintId, hint, firestoreDb = db) {
  const existing = await findUserHintNotification(userId, hintId, firestoreDb);
  const payload = {
    type: HINT_TYPE,
    hintId,
    title: hint.title,
    body: hint.body,
    link: '',
    isRead: false,
    createdAt: serverTimestamp(),
  };

  if (existing) {
    await updateDoc(existing.ref, payload);
    return existing.id;
  }

  const ref = await addDoc(collection(firestoreDb, COLLECTIONS.NOTIFICATIONS), {
    userId,
    ...payload,
  });
  return ref.id;
}

async function upsertUserWelcomeHint(userId, hint, firestoreDb = db) {
  return upsertUserHintNotification(userId, 'welcome', hint, firestoreDb);
}

async function getAllActiveUsers(firestoreDb = db) {
  const snapshot = await getDocs(
    query(collection(firestoreDb, COLLECTIONS.USERS), orderBy('createdAt', 'desc')),
  );
  return snapshot.docs
    .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
    .filter((user) => !user.disabled);
}

export async function launchHintForAll(hintId, senderId, firestoreDb = db) {
  const hint = getHintById(hintId);
  if (!hint || !senderId) {
    throw new Error('Неизвестная подсказка');
  }

  const globalPayload = {
    type: HINT_TYPE,
    hintId,
    familyId: 'global',
    senderId,
    title: hint.title,
    body: hint.body,
    isActive: true,
    readByUids: [],
    createdAt: serverTimestamp(),
  };

  const globalDoc = await findGlobalHintDoc(hintId, firestoreDb);
  if (globalDoc) {
    await updateDoc(globalDoc.ref, globalPayload);
  } else {
    await addDoc(collection(firestoreDb, COLLECTIONS.NOTIFICATIONS), globalPayload);
  }

  const users = await getAllActiveUsers(firestoreDb);
  const activeUsers = users;

  if (hintId === 'welcome') {
    await Promise.all(
      activeUsers.map((user) => upsertUserWelcomeHint(user.id, hint, firestoreDb)),
    );
    return;
  }

  const BATCH_SIZE = 20;
  for (let i = 0; i < activeUsers.length; i += BATCH_SIZE) {
    const batch = activeUsers.slice(i, i + BATCH_SIZE);
    await Promise.all(
      batch.map((user) => updateDoc(doc(firestoreDb, COLLECTIONS.USERS, user.id), {
        unlockedHints: arrayUnion(hintId),
      })),
    );
  }
}

/** Активирует подсказку только для текущего пользователя (тест-драйв владельца). */
export async function runHintForMe(userId, hintId, firestoreDb = db) {
  const hint = getHintById(hintId);
  if (!hint || !userId) {
    throw new Error('Неизвестная подсказка');
  }

  await upsertUserHintNotification(userId, hintId, hint, firestoreDb);

  await updateDoc(doc(firestoreDb, COLLECTIONS.USERS, userId), {
    dismissedHints: arrayRemove(hintId),
  }).catch(() => {});
}

export function subscribeToGlobalHintTemplates(onChange) {
  const q = query(
    collection(db, COLLECTIONS.NOTIFICATIONS),
    where('type', '==', HINT_TYPE),
    where('familyId', '==', 'global'),
    limit(20),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      onChange(items);
    },
    () => onChange([]),
  );
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

export function isNotificationRead(notification, userId) {
  if (!notification || !userId) return true;
  if (isBroadcastNotification(notification)) {
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

  if (isBroadcastNotification(notification)) {
    await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
      readByUids: arrayUnion(userId),
    });
    return;
  }

  await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notificationId), {
    isRead: true,
  });
}
