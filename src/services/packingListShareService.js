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

function generateShareToken() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
}

function packingListRef(listId) {
  return doc(db, COLLECTIONS.PACKING_LISTS, listId);
}

export function getPackingListShareUrl(listId, token) {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = `${window.location.origin}${base.endsWith('/') ? base : `${base}/`}`;
  return `${prefix}#/packing/${listId}?share=${encodeURIComponent(token)}`;
}

export async function ensurePackingListShareInvite(
  listId,
  userId,
  { ownerFamilyName, ownerFamilyAvatarUrl } = {},
) {
  const listRef = packingListRef(listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) throw new Error('Список не найден');

  const data = snapshot.data();
  if (data.shareInviteToken) {
    return {
      token: data.shareInviteToken,
      url: getPackingListShareUrl(listId, data.shareInviteToken),
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
    url: getPackingListShareUrl(listId, token),
    created: true,
  };
}

export async function acceptPackingListShare({
  listId,
  token,
  userId,
  familyId,
  familyName,
  familyAvatarUrl,
}) {
  const listRef = packingListRef(listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) throw new Error('Список не найден');

  const data = snapshot.data();
  if (!data.shareInviteToken || data.shareInviteToken !== token) {
    throw new Error('Ссылка недействительна или устарела');
  }

  if (data.familyId === familyId) {
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

export async function revokePackingExternalFamilyAccess(listId, familyId) {
  if (!listId || !familyId) return;
  await updateDoc(packingListRef(listId), {
    sharedWithFamilyIds: arrayRemove(familyId),
    [`externalFamilies.${familyId}`]: deleteField(),
  });
}

/** Синхронизация снимка гостевой семьи на расшаренных packing_lists. */
export async function syncGuestFamilySnapshotOnPackingLists(
  familyId,
  { familyName, familyAvatarUrl } = {},
) {
  if (!familyId) return { updated: 0 };

  const snapshot = await getDocs(
    query(
      collection(db, COLLECTIONS.PACKING_LISTS),
      where('sharedWithFamilyIds', 'array-contains', familyId),
    ),
  );

  const nextName = familyName?.trim() || null;
  let updated = 0;

  await Promise.all(
    snapshot.docs.map(async (listDoc) => {
      const data = listDoc.data();
      if (data.familyId === familyId) return;

      const existing = data.externalFamilies?.[familyId];
      if (!existing) return;

      const nameToWrite = nextName || existing.familyName || 'Семья';
      const avatarToWrite = familyAvatarUrl !== undefined
        ? (familyAvatarUrl || null)
        : (existing.avatarUrl || null);

      if (existing.familyName === nameToWrite && (existing.avatarUrl || null) === avatarToWrite) {
        return;
      }

      await updateDoc(doc(db, COLLECTIONS.PACKING_LISTS, listDoc.id), {
        [`externalFamilies.${familyId}.familyName`]: nameToWrite,
        [`externalFamilies.${familyId}.avatarUrl`]: avatarToWrite,
      });
      updated += 1;
    }),
  );

  return { updated };
}
