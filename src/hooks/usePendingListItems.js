import { useCallback, useState } from 'react';
import { mergeItemsBatch } from '../utils/mergeItems';

export function isPendingListItem(itemId) {
  return String(itemId || '').startsWith('draft-');
}

export function usePendingListItems() {
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingEdits, setPendingEdits] = useState({});

  const resetPendingItems = useCallback(() => {
    setPendingItems([]);
    setPendingEdits({});
  }, []);

  const mergePendingItems = useCallback((additionalItems = []) => {
    setPendingItems((prev) => mergeItemsBatch(prev, additionalItems));
  }, []);

  const togglePendingItem = useCallback((itemId, displayName) => {
    setPendingItems((prev) =>
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

  const updatePendingItemQuantity = useCallback((itemId, quantity) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  }, []);

  const updatePendingLiveItemQuantity = useCallback((itemId, quantity) => {
    setPendingEdits((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], quantity },
    }));
  }, []);

  const removePendingItem = useCallback((itemId) => {
    setPendingItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updatePendingItemCategory = useCallback((itemId, category) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, category } : item)),
    );
  }, []);

  const updatePendingItemComment = useCallback((itemId, comment) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, comment } : item)),
    );
  }, []);

  const updatePendingItemBooking = useCallback((itemId, bookedBy) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, bookedBy } : item)),
    );
  }, []);

  const updatePendingCategoryBooking = useCallback((category, bookedBy, displayName) => {
    setPendingItems((prev) =>
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

  return {
    pendingItems,
    pendingEdits,
    resetPendingItems,
    mergePendingItems,
    togglePendingItem,
    updatePendingItemQuantity,
    updatePendingLiveItemQuantity,
    removePendingItem,
    updatePendingItemCategory,
    updatePendingItemComment,
    updatePendingItemBooking,
    updatePendingCategoryBooking,
  };
}
