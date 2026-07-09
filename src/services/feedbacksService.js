import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { isFeedbackUnread, isFeedbackStatusUnseen, resolveFeedbackStatus } from '../utils/feedbackStatus';

export { FEEDBACK_STATUSES, getFeedbackStatusMeta, resolveFeedbackStatus } from '../utils/feedbackStatus';

export const FEEDBACK_CATEGORIES = {
  error: { value: 'error', label: 'Ошибка', emoji: '🚨' },
  idea: { value: 'idea', label: 'Идея', emoji: '💡' },
};

export async function createFeedback({ fromUser, fromFamily, fromUserName, fromFamilyName, category, text }) {
  const trimmedText = text?.trim();
  if (!fromUser || !fromFamily || !trimmedText) {
    throw new Error('Заполните сообщение');
  }
  if (!FEEDBACK_CATEGORIES[category]) {
    throw new Error('Выберите категорию');
  }

  const ref = await addDoc(collection(db, COLLECTIONS.FEEDBACKS), {
    type: 'feedback',
    fromUser,
    fromFamily,
    fromUserName: fromUserName || '',
    fromFamilyName: fromFamilyName || '',
    category,
    text: trimmedText,
    status: 'new',
    isRead: false,
    statusSeenByAuthor: true,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export function subscribeToUnreadFeedbacks(callback) {
  const q = query(
    collection(db, COLLECTIONS.FEEDBACKS),
    where('isRead', '==', false),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    () => callback([]),
  );
}

export function subscribeToAllFeedbacks(callback) {
  const q = query(
    collection(db, COLLECTIONS.FEEDBACKS),
    orderBy('createdAt', 'desc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    () => callback([]),
  );
}

function sortFeedbacksByCreatedAtDesc(items) {
  return [...items].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
}

export function subscribeToUnseenUserFeedbackStatuses(userId, callback) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTIONS.FEEDBACKS),
    where('fromUser', '==', userId),
    where('statusSeenByAuthor', '==', false),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    },
    () => callback([]),
  );
}

export async function markUserFeedbackStatusesSeen(userId) {
  if (!userId) return;

  const q = query(
    collection(db, COLLECTIONS.FEEDBACKS),
    where('fromUser', '==', userId),
    where('statusSeenByAuthor', '==', false),
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return;

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, { statusSeenByAuthor: true });
  });
  await batch.commit();
}

export function subscribeToUserFeedbacks(userId, callback, onError) {
  if (!userId) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(db, COLLECTIONS.FEEDBACKS),
    where('fromUser', '==', userId),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      callback(sortFeedbacksByCreatedAtDesc(
        snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
      ));
    },
    (error) => {
      console.error('subscribeToUserFeedbacks failed:', error);
      onError?.(error);
      callback([]);
    },
  );
}

export async function updateFeedbackStatus(feedbackId, status) {
  if (!feedbackId || !status) return;

  const payload = {
    status,
    isRead: status !== 'new',
    statusSeenByAuthor: false,
  };

  await updateDoc(doc(db, COLLECTIONS.FEEDBACKS, feedbackId), payload);
}

export async function markFeedbackRead(feedbackId) {
  await updateFeedbackStatus(feedbackId, 'read');
}

export async function markFeedbackReadIfNew(feedback) {
  if (!feedback?.id) return;
  if (resolveFeedbackStatus(feedback) !== 'new') return;
  await markFeedbackRead(feedback.id);
}

export function countUnreadFeedbacks(feedbacks) {
  return feedbacks.filter(isFeedbackUnread).length;
}

export function countUnseenFeedbackStatuses(feedbacks) {
  return feedbacks.filter(isFeedbackStatusUnseen).length;
}
