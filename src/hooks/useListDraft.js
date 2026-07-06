import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActualList, formatListTitle } from '../services/listsService';
import { mergeItemsBatch } from '../utils/mergeItems';
import { peekRepeatDraft, clearRepeatDraft } from '../utils/repeatDraftStorage';

function createDraftId() {
  if (globalThis.crypto?.randomUUID) {
    return `draft-${globalThis.crypto.randomUUID()}`;
  }
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toDraftItem(item) {
  return {
    id: createDraftId(),
    name: item.name,
    quantity: item.quantity || '1 шт',
    category: item.category || 'Прочее',
    comment: item.comment?.trim() || null,
    checked: false,
    checkedBy: null,
    bookedBy: item.bookedBy || null,
  };
}

export function useListDraft(listType) {
  const navigate = useNavigate();
  const [draftItems, setDraftItems] = useState(() => {
    const stored = peekRepeatDraft();
    if (stored?.repeatItems?.length) {
      return stored.repeatItems.map((item) => toDraftItem(item));
    }
    return [];
  });
  const [draftDescription, setDraftDescription] = useState('');
  const [persisting, setPersisting] = useState(false);
  const persistingRef = useRef(false);
  const draftItemsRef = useRef(draftItems);
  draftItemsRef.current = draftItems;

  const draftList = useMemo(
    () => ({
      title: formatListTitle(listType),
      type: listType,
      isPublic: false,
    }),
    [listType],
  );

  const persistWithItems = useCallback(
    async (userId, itemsToSave) => {
      if (persistingRef.current) return null;

      persistingRef.current = true;
      setPersisting(true);
      try {
        const payload = itemsToSave.map(
          ({ name, quantity, category, comment, checked, checkedBy, bookedBy }) => ({
            name,
            quantity,
            category,
            comment,
            checked,
            checkedBy,
            bookedBy: bookedBy || null,
          }),
        );

        const newListId = await createActualList({
          type: listType,
          createdBy: userId,
          items: payload,
          description: draftDescription,
        });

        clearRepeatDraft();
        navigate(`/list/${newListId}`, { replace: true });
        return newListId;
      } finally {
        persistingRef.current = false;
        setPersisting(false);
      }
    },
    [listType, navigate, draftDescription],
  );

  const persistDraft = useCallback(
    (userId, additionalItems = []) => {
      const normalized = additionalItems.map((item) =>
        item.id ? item : toDraftItem(item),
      );
      const merged = mergeItemsBatch(draftItemsRef.current, normalized);
      setDraftItems(merged);
      draftItemsRef.current = merged;
      return persistWithItems(userId, merged);
    },
    [persistWithItems],
  );

  const toggleDraftItem = useCallback((itemId, displayName) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const checked = !item.checked;
        return {
          ...item,
          checked,
          checkedBy: checked ? displayName : null,
          bookedBy: checked ? null : item.bookedBy,
        };
      }),
    );
  }, []);

  const updateDraftItemQuantity = useCallback((itemId, quantity) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  }, []);

  const removeDraftItem = useCallback((itemId) => {
    setDraftItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const mergeDraftItems = useCallback((additionalItems = []) => {
    const normalized = additionalItems.map((item) => (item.id ? item : toDraftItem(item)));
    setDraftItems((prev) => mergeItemsBatch(prev, normalized));
  }, []);

  const updateDraftItemCategory = useCallback((itemId, category) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, category } : item)),
    );
  }, []);

  const updateDraftItemComment = useCallback((itemId, comment) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, comment } : item)),
    );
  }, []);

  const updateDraftItemBooking = useCallback((itemId, bookedBy) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, bookedBy } : item)),
    );
  }, []);

  const updateDraftCategoryBooking = useCallback((category, bookedBy, displayName) => {
    setDraftItems((prev) =>
      prev.map((item) => {
        if (item.category !== category || item.checked) return item;

        if (bookedBy) {
          if (item.bookedBy && item.bookedBy !== displayName) return item;
          return { ...item, bookedBy };
        }

        if (item.bookedBy === displayName) {
          return { ...item, bookedBy: null };
        }

        return item;
      }),
    );
  }, []);

  const clearDraftItems = useCallback(() => {
    setDraftItems([]);
  }, []);

  return {
    draftList,
    draftItems,
    draftDescription,
    setDraftDescription,
    persisting,
    toggleDraftItem,
    updateDraftItemQuantity,
    removeDraftItem,
    mergeDraftItems,
    updateDraftItemCategory,
    updateDraftItemComment,
    updateDraftItemBooking,
    updateDraftCategoryBooking,
    clearDraftItems,
    persistDraft,
    persistWithItems,
  };
}

export { formatListTitle } from '../utils/listTypes';
