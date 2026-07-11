import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  deleteField,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { getListFamilyId } from '../utils/familyGroup';

function generateShareToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

export function getListShareUrl(listId, token) {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = `${window.location.origin}${base.endsWith('/') ? base : `${base}/`}`;
  return `${prefix}#/list/${listId}?share=${encodeURIComponent(token)}`;
}

export async function ensureListShareInvite(listId, userId, { ownerFamilyName, ownerFamilyAvatarUrl } = {}) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) throw new Error('Список не найден');

  const data = snapshot.data();
  if (data.shareInviteToken) {
    return {
      token: data.shareInviteToken,
      url: getListShareUrl(listId, data.shareInviteToken),
      created: false,
    };
  }

  const token = generateShareToken();
  const patch = {
    shareInviteToken: token,
    shareInviteCreatedAt: serverTimestamp(),
    shareInviteCreatedBy: userId,
  };

  if (ownerFamilyName) {
    patch.ownerFamilyName = ownerFamilyName;
    patch.ownerFamilyAvatarUrl = ownerFamilyAvatarUrl || null;
  }

  await updateDoc(listRef, patch);

  return {
    token,
    url: getListShareUrl(listId, token),
    created: true,
  };
}

export async function acceptListShare({
  listId,
  token,
  userId,
  familyId,
  familyName,
  familyAvatarUrl,
}) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) throw new Error('Список не найден');

  const data = snapshot.data();
  if (!data.shareInviteToken || data.shareInviteToken !== token) {
    throw new Error('Ссылка недействительна или устарела');
  }

  const ownerFamilyId = getListFamilyId(data);
  if (ownerFamilyId === familyId) {
    throw new Error('Этот список уже принадлежит вашей семье');
  }

  if (data.sharedWithFamilyIds?.includes(familyId)) {
    return { joined: false, alreadyJoined: true, list: { id: snapshot.id, ...data } };
  }

  await updateDoc(listRef, {
    sharedWithFamilyIds: arrayUnion(familyId),
    [`externalFamilies.${familyId}`]: {
      familyName: familyName?.trim() || 'Семья',
      avatarUrl: familyAvatarUrl || null,
      joinedAt: serverTimestamp(),
      joinedBy: userId,
    },
  });

  const refreshed = await getDoc(listRef);
  return {
    joined: true,
    alreadyJoined: false,
    list: refreshed.exists() ? { id: refreshed.id, ...refreshed.data() } : null,
  };
}

export async function revokeExternalFamilyAccess(listId, familyId) {
  if (!listId || !familyId) return;
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), {
    sharedWithFamilyIds: arrayRemove(familyId),
    [`externalFamilies.${familyId}`]: deleteField(),
  });
}

/** Обновляет снимок name/avatar гостевой семьи на всех расшаренных списках (владелец не читает families/{id}) */
export async function syncGuestFamilySnapshotOnLists(familyId, { familyName, familyAvatarUrl } = {}) {
  if (!familyId) return { updated: 0 };

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.LISTS),
      where('sharedWithFamilyIds', 'array-contains', familyId),
    ),
  );

  const nextName = familyName?.trim() || null;
  let updated = 0;

  await Promise.all(
    snapshot.docs.map(async (listDoc) => {
      const data = listDoc.data();
      if (getListFamilyId(data) === familyId) return;

      const existing = data.externalFamilies?.[familyId];
      if (!existing) return;

      const nameToWrite = nextName || existing.familyName || 'Семья';
      const avatarToWrite = familyAvatarUrl !== undefined ? (familyAvatarUrl || null) : (existing.avatarUrl || null);

      if (existing.familyName === nameToWrite && (existing.avatarUrl || null) === avatarToWrite) return;

      await updateDoc(doc(db, COLLECTIONS.LISTS, listDoc.id), {
        [`externalFamilies.${familyId}.familyName`]: nameToWrite,
        [`externalFamilies.${familyId}.avatarUrl`]: avatarToWrite,
      });
      updated += 1;
    }),
  );

  return { updated };
}

function isListArchived(list) {
  return Boolean(list.archived || list.status === 'archived');
}

export async function getExternalSharedLists(familyId, { includeArchived = false } = {}) {
  if (!familyId) return [];

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.LISTS),
      where('sharedWithFamilyIds', 'array-contains', familyId),
    ),
  );

  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => includeArchived || !isListArchived(list))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}
