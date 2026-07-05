import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createActualList, formatListTitle } from '../services/listsService';
import { mergeItemsBatch } from '../utils/mergeItems';
import { peekRepeatDraft, clearRepeatDraft } from '../utils/repeatDraftStorage';

export function toDraftItem(item) {
  return {
    id: `draft-${crypto.randomUUID()}`,
    name: item.name,
    quantity: item.quantity || '1 шт',
    category: item.category || 'Прочее',
    comment: item.comment?.trim() || null,
    checked: false,
    checkedBy: null,
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
          ({ name, quantity, category, comment, checked, checkedBy }) => ({
            name,
            quantity,
            category,
            comment,
            checked,
            checkedBy,
          }),
        );

        const newListId = await createActualList({
          type: listType,
          createdBy: userId,
          items: payload,
        });

        clearRepeatDraft();
        navigate(`/list/${newListId}`, { replace: true });
        return newListId;
      } finally {
        persistingRef.current = false;
        setPersisting(false);
      }
    },
    [listType, navigate],
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

  return {
    draftList,
    draftItems,
    persisting,
    toggleDraftItem,
    updateDraftItemQuantity,
    removeDraftItem,
    persistDraft,
    persistWithItems,
  };
}

export { formatListTitle } from '../utils/listTypes';
