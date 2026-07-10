import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';

function sortByCreatedAt(announcements) {
  return [...announcements].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? 0;
    return aTime - bTime;
  });
}

export async function getActiveAnnouncements() {
  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.ANNOUNCEMENTS),
      where('active', '==', true),
    ),
  );

  return sortByCreatedAt(
    snapshot.docs.map((docSnap) => ({
      id: docSnap.data().id || docSnap.id,
      ...docSnap.data(),
    })),
  );
}

export function getUnreadAnnouncements(announcements, profile) {
  const readIds = new Set(profile?.readAnnouncements || []);
  return (announcements || []).filter((announcement) => !readIds.has(announcement.id));
}

export async function getAllAnnouncements() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));

  return sortByCreatedAt(
    snapshot.docs.map((docSnap) => ({
      id: docSnap.data().id || docSnap.id,
      docId: docSnap.id,
      ...docSnap.data(),
    })),
  ).reverse();
}

export async function createFeatureAnnouncement({ title, content, hint, active = true }) {
  const trimmedTitle = title?.trim();
  const trimmedContent = content?.trim();
  const trimmedHint = hint?.trim() || '';

  if (!trimmedTitle) {
    throw new Error('Введите заголовок');
  }
  if (!trimmedContent) {
    throw new Error('Введите текст слайда');
  }

  const ref = doc(collection(db, COLLECTIONS.ANNOUNCEMENTS));
  await setDoc(ref, {
    id: ref.id,
    title: trimmedTitle,
    content: trimmedContent,
    hint: trimmedHint,
    active: active === true,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}
