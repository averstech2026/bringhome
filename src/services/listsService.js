import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../firebase';
import { findItemByName, normalizeItemName } from '../utils/mergeItems';
import { addQuantities, resetBaseQuantity } from '../utils/quantity';
import { computeListStatusFromItems } from '../utils/listStatus';
import {
  LIST_TYPE_LABELS,
  formatListTitle,
  normalizeListTypeForCreate,
} from '../utils/listTypes';

export { LIST_TYPE_LABELS, formatListTitle, normalizeListTypeForCreate as normalizeListType };
export { decodeListTypeFromUrl, encodeListTypeForUrl, getListTypeLabel } from '../utils/listTypes';

export async function createList({ type = 'home', createdBy, isPublic = false }) {
  const resolvedType = normalizeListTypeForCreate(type);
  const ref = await addDoc(collection(db, COLLECTIONS.LISTS), {
    title: formatListTitle(resolvedType),
    type: resolvedType,
    isPublic,
    createdBy,
    allowedUsers: [createdBy],
    status: 'active',
    archived: false,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateList(listId, data) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), data);
}

export async function toggleListPublic(listId, isPublic) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), { isPublic });
}

export async function addUserToList(listId, userId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) return false;

  const data = snapshot.data();
  if (data.allowedUsers?.includes(userId)) return true;

  await updateDoc(listRef, {
    allowedUsers: arrayUnion(userId),
  });
  return true;
}

export async function removeUserFromList(listId, userId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const snapshot = await getDoc(listRef);
  if (!snapshot.exists()) return false;

  const data = snapshot.data();
  if (data.createdBy === userId) return false;

  await updateDoc(listRef, {
    allowedUsers: arrayRemove(userId),
  });
  return true;
}

export async function toggleUserListAccess(listId, userId, hasAccess) {
  if (hasAccess) {
    return removeUserFromList(listId, userId);
  }
  return addUserToList(listId, userId);
}

export async function ensureListAccess(listId, userId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);

  let snapshot;
  try {
    snapshot = await getDoc(listRef);
  } catch (err) {
    if (err?.code !== 'permission-denied') throw err;
    snapshot = null;
  }

  if (!snapshot?.exists()) {
    try {
      await updateDoc(listRef, { allowedUsers: arrayUnion(userId) });
      snapshot = await getDoc(listRef);
    } catch {
      return { allowed: false, reason: 'no_access' };
    }
  }

  if (!snapshot?.exists()) return { allowed: false, reason: 'not_found' };

  const data = snapshot.data();
  if (data.archived || data.status === 'archived') {
    return { allowed: false, reason: 'archived' };
  }
  if (data.isPublic) return { allowed: true, list: { id: snapshot.id, ...data } };
  if (data.createdBy === userId) return { allowed: true, list: { id: snapshot.id, ...data } };
  if (data.allowedUsers?.includes(userId)) {
    return { allowed: true, list: { id: snapshot.id, ...data } };
  }

  try {
    await updateDoc(listRef, { allowedUsers: arrayUnion(userId) });
  } catch {
    return { allowed: false, reason: 'no_access' };
  }

  return { allowed: true, list: { id: snapshot.id, ...data }, joined: true };
}

export async function ensureArchivedListAccess(listId) {
  try {
    const snapshot = await getDoc(doc(db, COLLECTIONS.LISTS, listId));
    if (!snapshot.exists()) return { allowed: false, reason: 'not_found' };

    const data = snapshot.data();
    if (!isListArchived(data)) return { allowed: false, reason: 'not_archived' };

    return {
      allowed: true,
      list: { id: snapshot.id, ...data },
      readOnly: true,
    };
  } catch {
    return { allowed: false, reason: 'no_access' };
  }
}

function isListArchived(list) {
  return Boolean(list.archived || list.status === 'archived');
}

export async function getUserLists(userId, { includeArchived = false } = {}) {
  const q = query(
    collection(db, COLLECTIONS.LISTS),
    where('allowedUsers', 'array-contains', userId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => includeArchived || !isListArchived(list))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getAllLists({ includeArchived = false } = {}) {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LISTS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => includeArchived || !isListArchived(list))
    .sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getArchivedLists() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.LISTS));
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => isListArchived(list))
    .sort((a, b) => {
      const ta = a.archivedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const tb = b.archivedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function getUserArchivedLists(userId) {
  const q = query(
    collection(db, COLLECTIONS.LISTS),
    where('allowedUsers', 'array-contains', userId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((list) => isListArchived(list))
    .sort((a, b) => {
      const ta = a.archivedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const tb = b.archivedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });
}

export async function archiveList(listId, userId) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), {
    status: 'archived',
    archived: true,
    archivedAt: serverTimestamp(),
    archivedBy: userId,
  });
}

export async function restoreList(listId) {
  await updateDoc(doc(db, COLLECTIONS.LISTS, listId), {
    archived: false,
    archivedAt: null,
    archivedBy: null,
  });
  await syncListStatus(listId);
}

export async function deleteList(listId) {
  const itemsQuery = query(
    collection(db, COLLECTIONS.ITEMS),
    where('listId', '==', listId),
  );
  const itemsSnapshot = await getDocs(itemsQuery);

  const batch = writeBatch(db);
  itemsSnapshot.docs.forEach((itemDoc) => batch.delete(itemDoc.ref));
  batch.delete(doc(db, COLLECTIONS.LISTS, listId));
  await batch.commit();
}

export async function getListItems(listId) {
  const q = query(
    collection(db, COLLECTIONS.ITEMS),
    where('listId', '==', listId),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function prepareItemsForRepeat(items) {
  return items.map((item) => ({
    name: item.name,
    quantity: resetBaseQuantity(item.quantity),
    category: item.category || 'Прочее',
    comment: item.comment?.trim() || null,
  }));
}

export async function getListItemsForRepeat(listId) {
  const items = await getListItems(listId);
  return prepareItemsForRepeat(items);
}

/** Прогресс по спискам: { [listId]: { total, checked, percent } } */
export async function getItemsProgressByListIds(listIds) {
  const progress = Object.fromEntries(
    listIds.map((id) => [id, { total: 0, checked: 0, percent: 0 }]),
  );

  if (listIds.length === 0) return progress;

  const chunkSize = 10;
  for (let i = 0; i < listIds.length; i += chunkSize) {
    const chunk = listIds.slice(i, i + chunkSize);
    const q = query(
      collection(db, COLLECTIONS.ITEMS),
      where('listId', 'in', chunk),
    );
    const snapshot = await getDocs(q);

    snapshot.docs.forEach((d) => {
      const { listId, checked } = d.data();
      if (!progress[listId]) {
        progress[listId] = { total: 0, checked: 0, percent: 0 };
      }
      progress[listId].total += 1;
      if (checked) progress[listId].checked += 1;
    });
  }

  listIds.forEach((id) => {
    const { total, checked } = progress[id];
    progress[id].percent = total === 0 ? 0 : Math.round((checked / total) * 100);
  });

  return progress;
}

export async function addItem(
  listId,
  { name, quantity = '1 шт', category = 'Прочее', comment = '' },
) {
  const trimmedName = name.trim();
  const existingItems = await getListItems(listId);
  const existing = findItemByName(existingItems, trimmedName);

  if (existing) {
    const update = {
      quantity: addQuantities(existing.quantity, quantity),
    };
    if (comment && !existing.comment) update.comment = comment.trim();
    await updateDoc(doc(db, COLLECTIONS.ITEMS, existing.id), update);
  } else {
    await addDoc(collection(db, COLLECTIONS.ITEMS), {
      listId,
      name: trimmedName,
      quantity,
      category,
      comment: comment.trim() || null,
      checked: false,
      checkedBy: null,
      checkedAt: null,
    });
  }

  await syncListStatus(listId);

  return existing?.id;
}

export async function updateItemQuantity(itemId, quantity) {
  await updateDoc(doc(db, COLLECTIONS.ITEMS, itemId), { quantity });
}

export async function deleteItem(itemId) {
  const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
  const itemSnap = await getDoc(itemRef);
  const listId = itemSnap.data()?.listId;

  await deleteDoc(itemRef);

  if (listId) await syncListStatus(listId);
}

export async function createActualList({ type, createdBy, items = [] }) {
  const listId = await createList({ type: normalizeListTypeForCreate(type), createdBy });
  if (items.length > 0) {
    await addItemsBatch(listId, items);
  } else {
    await syncListStatus(listId);
  }
  return listId;
}

export async function addItemsBatch(listId, items) {
  const existingItems = await getListItems(listId);
  const merged = new Map();

  for (const item of existingItems) {
    merged.set(normalizeItemName(item.name), { ...item, _source: 'existing' });
  }

  for (const incoming of items) {
    const key = normalizeItemName(incoming.name);
    const found = merged.get(key);

    if (found) {
      found.quantity = addQuantities(found.quantity, incoming.quantity || '1 шт');
      if (incoming.comment && !found.comment) found.comment = incoming.comment.trim();
      found._dirty = true;
    } else {
      merged.set(key, {
        name: incoming.name.trim(),
        quantity: incoming.quantity || '1 шт',
        category: incoming.category || 'Прочее',
        comment: incoming.comment?.trim() || null,
        checked: Boolean(incoming.checked),
        checkedBy: incoming.checked ? incoming.checkedBy : null,
        _source: 'new',
        _dirty: true,
      });
    }
  }

  const batch = writeBatch(db);

  for (const item of merged.values()) {
    if (!item._dirty) continue;

    if (item._source === 'existing') {
      const update = { quantity: item.quantity };
      if (item.comment) update.comment = item.comment;
      batch.update(doc(db, COLLECTIONS.ITEMS, item.id), update);
    } else {
      const ref = doc(collection(db, COLLECTIONS.ITEMS));
      batch.set(ref, {
        listId,
        name: item.name,
        quantity: item.quantity,
        category: item.category,
        comment: item.comment,
        checked: item.checked,
        checkedBy: item.checkedBy,
        checkedAt: item.checked ? serverTimestamp() : null,
      });
    }
  }

  await batch.commit();
  await syncListStatus(listId);
}

export async function syncListStatus(listId) {
  const listRef = doc(db, COLLECTIONS.LISTS, listId);
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists()) return;

  const listData = listSnap.data();
  if (listData.archived || listData.status === 'archived') return;

  const items = await getListItems(listId);
  const status = computeListStatusFromItems(items);

  if (listData.status !== status) {
    await updateDoc(listRef, { status });
  }
}

export async function toggleItem(itemId, { checked, checkedBy }) {
  const itemRef = doc(db, COLLECTIONS.ITEMS, itemId);
  const itemSnap = await getDoc(itemRef);
  const listId = itemSnap.data()?.listId;

  await updateDoc(itemRef, {
    checked,
    checkedBy: checked ? checkedBy : null,
    checkedAt: checked ? serverTimestamp() : null,
  });

  if (listId) await syncListStatus(listId);
}

export async function searchProductHistory(userId, searchText) {
  if (!searchText.trim()) return [];

  const q = query(
    collection(db, COLLECTIONS.PRODUCT_HISTORY),
    where('userId', '==', userId),
  );
  const snapshot = await getDocs(q);
  const lower = searchText.toLowerCase();

  return snapshot.docs
    .map((d) => d.data().name)
    .filter((name, index, arr) => arr.indexOf(name) === index)
    .filter((name) => name.toLowerCase().includes(lower))
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .slice(0, 8);
}

export async function saveToProductHistory(userId, name) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const q = query(
    collection(db, COLLECTIONS.PRODUCT_HISTORY),
    where('userId', '==', userId),
    where('name', '==', trimmed),
  );
  const existing = await getDocs(q);
  if (!existing.empty) return;

  await addDoc(collection(db, COLLECTIONS.PRODUCT_HISTORY), {
    userId,
    name: trimmed,
  });
}
