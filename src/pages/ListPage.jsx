import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { getUserPhotoUrl } from '../utils/userPhoto';
import { useList } from '../hooks/useList';
import { useItems } from '../hooks/useItems';
import { useListDraft, toDraftItem } from '../hooks/useListDraft';
import { usePendingListItems, isPendingListItem } from '../hooks/usePendingListItems';
import { usePendingListAccess } from '../hooks/usePendingListAccess';
import { mergeItemsBatch } from '../utils/mergeItems';
import { decodeListTypeFromUrl, encodeListTypeForUrl } from '../services/listsService';
import { getFamilyGroupId } from '../utils/familyGroup';
import ListDescriptionModal, { ListDescriptionButton } from '../components/list/ListDescriptionModal';
import ScreenTopPanel, { ScreenTopBar } from '../components/layout/ScreenTopPanel';
import { ensureListAccess, ensureArchivedListAccess, saveToProductHistory, getListItemsForRepeat, syncListStatus, clearAllListItems, updateList, updateItemsBookingBatch, addItemsBatch, toggleItem, updateItemQuantity, updateItemCategory, updateItemComment, updateItemBooking, deleteItem } from '../services/listsService';
import { groupItemsByCategory, getListProgress } from '../utils/groupByCategory';
import StatusBar from '../components/list/StatusBar';
import CategoryGroup from '../components/list/CategoryGroup';
import AddItemForm from '../components/list/AddItemForm';
import AiInput from '../components/list/AiInput';
import ShareControls from '../components/list/ShareControls';
import ListTypeBadge from '../components/list/ListTypeBadge';
import ListAccessIcon from '../components/home/ListAccessIcon';
import RepeatListModal from '../components/home/RepeatListModal';
import { saveRepeatDraft } from '../utils/repeatDraftStorage';
import {
  CARD_SURFACE,
  CARD_PAD_V,
  HINT_TEXT,
  APP_BACKGROUND,
  PAGE_X,
  PRIMARY_BTN,
} from '../components/list/cardStyles';

export default function ListPage() {
  const { listId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, displayName } = useAuth();
  const { profile, isAdmin } = useUserProfile(user);
  const userPhotoUrl = getUserPhotoUrl(user, profile);

  const isDraft = listId === 'new';
  const isArchivedView = searchParams.get('archived') === '1';
  const listType = decodeListTypeFromUrl(searchParams.get('type'));

  const {
    draftList,
    draftItems,
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
    draftDescription,
    setDraftDescription,
    persistDraft,
    persistWithItems,
  } = useListDraft(listType);

  const {
    pendingItems,
    resetPendingItems,
    mergePendingItems,
    togglePendingItem,
    updatePendingItemQuantity,
    removePendingItem,
    updatePendingItemCategory,
    updatePendingItemComment,
    updatePendingItemBooking,
    updatePendingCategoryBooking,
  } = usePendingListItems();

  const {
    pendingAccess,
    resetPendingAccess,
    getEffectiveAccess,
    isAccessDirty,
    togglePendingPublic,
    togglePendingMember,
  } = usePendingListAccess();

  const [savingChanges, setSavingChanges] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [accessChecked, setAccessChecked] = useState(false);
  const [accessForListId, setAccessForListId] = useState(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatBusy, setRepeatBusy] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const shareLinkRef = useRef(null);
  const shareHighlightPendingRef = useRef(location.state?.highlightShareLink === true);
  const suppressAiEntryGlowRef = useRef(location.state?.highlightShareLink === true);

  const canLoadList = !isDraft && accessChecked && accessForListId === listId && !accessError;

  const { list, loading: listLoading, error: listError } = useList(canLoadList ? listId : null);
  const { items: liveItems, loading: itemsLoading, error: itemsError } = useItems(canLoadList ? listId : null);

  useEffect(() => {
    if (isDraft || !listId || !user) return undefined;

    let cancelled = false;
    setAccessChecked(false);
    setAccessForListId(null);
    setAccessError(null);

    const checkAccess = isArchivedView
      ? ensureArchivedListAccess(listId)
      : ensureListAccess(listId, user.uid, { isAdmin });

    checkAccess
      .then(({ allowed, reason }) => {
        if (cancelled) return;
        if (!allowed) {
          setAccessError(
            reason === 'not_found'
              ? 'Список не найден'
              : reason === 'archived'
                ? 'archived'
                : reason === 'not_archived'
                  ? 'not_archived'
                  : reason === 'no_access'
                    ? 'Нет доступа'
                    : 'Нет доступа',
          );
        } else {
          setAccessError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setAccessError('Ошибка доступа');
      })
      .finally(() => {
        if (cancelled) return;
        setAccessChecked(true);
        setAccessForListId(listId);
      });

    return () => {
      cancelled = true;
    };
  }, [listId, user, isDraft, isArchivedView, isAdmin]);

  useEffect(() => {
    resetPendingItems();
    resetPendingAccess();
  }, [listId, resetPendingItems, resetPendingAccess]);

  const deferAdds = !isDraft && !isArchivedView;
  const isEditMode = deferAdds;

  const activeList = isDraft ? draftList : list;
  const effectiveAccess = getEffectiveAccess(list);
  const displayList = list
    ? { ...list, isPublic: effectiveAccess.isPublic, allowedUsers: effectiveAccess.allowedUsers }
    : list;
  const displayItems = useMemo(() => {
    if (isDraft) return draftItems;
    if (deferAdds) return mergeItemsBatch(liveItems, pendingItems);
    return liveItems;
  }, [isDraft, deferAdds, draftItems, liveItems, pendingItems]);

  const items = displayItems;
  const loading = isDraft ? false : !accessChecked || listLoading || itemsLoading;

  const isDirty = isDraft
    ? draftItems.length > 0
    : isEditMode && (pendingItems.length > 0 || isAccessDirty(list));

  const scrollToShareAndHighlight = useCallback(() => {
    window.setTimeout(() => {
      shareLinkRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsHighlighting(true);
    }, 200);
  }, []);

  useEffect(() => {
    if (location.state?.highlightShareLink) {
      shareHighlightPendingRef.current = true;
      suppressAiEntryGlowRef.current = true;
    }
  }, [location.state?.highlightShareLink]);

  const grouped = groupItemsByCategory(items);
  const { allDone, total } = getListProgress(items);

  useEffect(() => {
    if (isDraft || loading || !list || !shareHighlightPendingRef.current) return undefined;

    const scrollTimer = setTimeout(() => {
      scrollToShareAndHighlight();
      shareHighlightPendingRef.current = false;
      if (location.state?.highlightShareLink) {
        navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
      }
    }, 200);

    return () => clearTimeout(scrollTimer);
  }, [isDraft, loading, list, location.pathname, location.search, location.state, navigate, scrollToShareAndHighlight]);

  useEffect(() => {
    if (!isHighlighting) return undefined;
    const timer = setTimeout(() => setIsHighlighting(false), 3600);
    return () => clearTimeout(timer);
  }, [isHighlighting]);

  const handlePendingManualAdd = async (itemData) => {
    try {
      await saveToProductHistory(user.uid, itemData.name, itemData.quantity);
    } catch {
      // История продуктов — вспомогательная, не блокирует добавление
    }
    mergePendingItems([toDraftItem(itemData)]);
  };

  const handlePendingAiAdd = async (products) => {
    mergePendingItems(products.map((product) => toDraftItem(product)));
  };

  const handleDraftManualAdd = async (itemData) => {
    try {
      await saveToProductHistory(user.uid, itemData.name, itemData.quantity);
    } catch {
      // История продуктов — вспомогательная, не блокирует добавление
    }
    const newItem = toDraftItem(itemData);
    mergeDraftItems([newItem]);
  };

  const handleCategoryBooking = async (category, itemIds, bookedBy) => {
    if (isDraft) {
      updateDraftCategoryBooking(category, bookedBy, displayName);
      return;
    }

    if (deferAdds) {
      const pendingIds = itemIds.filter(isPendingListItem);
      const liveIds = itemIds.filter((id) => !isPendingListItem(id));

      if (pendingIds.length > 0) {
        updatePendingCategoryBooking(category, bookedBy, displayName);
      }

      if (liveIds.length > 0) {
        await updateItemsBookingBatch(liveIds.map((itemId) => ({ itemId, bookedBy })));
      }
      return;
    }

    await updateItemsBookingBatch(
      itemIds.map((itemId) => ({ itemId, bookedBy })),
    );
  };

  const handleDeferredToggle = async (itemId, name) => {
    if (isPendingListItem(itemId)) {
      togglePendingItem(itemId, name);
      return;
    }

    const item = items.find((entry) => entry.id === itemId);
    if (!item) return;

    await toggleItem(itemId, {
      checked: !item.checked,
      checkedBy: name,
    });
  };

  const handleDeferredQuantityChange = async (itemId, quantity) => {
    if (isPendingListItem(itemId)) {
      updatePendingItemQuantity(itemId, quantity);
      return;
    }
    await updateItemQuantity(itemId, quantity);
  };

  const handleDeferredRemove = async (itemId) => {
    if (isPendingListItem(itemId)) {
      removePendingItem(itemId);
      return;
    }
    await deleteItem(itemId);
  };

  const handleDeferredCategoryChange = async (itemId, category) => {
    if (isPendingListItem(itemId)) {
      updatePendingItemCategory(itemId, category);
      return;
    }
    await updateItemCategory(itemId, category);
  };

  const handleDeferredCommentChange = async (itemId, comment) => {
    if (isPendingListItem(itemId)) {
      updatePendingItemComment(itemId, comment);
      return;
    }
    await updateItemComment(itemId, comment);
  };

  const handleDeferredBookingToggle = async (itemId, bookedBy) => {
    if (isPendingListItem(itemId)) {
      updatePendingItemBooking(itemId, bookedBy);
      return;
    }
    await updateItemBooking(itemId, bookedBy);
  };

  const handleDraftAiAdd = async (products) => {
    const newItems = products.map((p) => toDraftItem(p));
    mergeDraftItems(newItems);
  };

  const handleClearList = async () => {
    setClearing(true);
    try {
      if (isDraft) {
        clearDraftItems();
      } else {
        if (deferAdds) {
          resetPendingItems();
        }
        await clearAllListItems(listId);
      }
    } catch (err) {
      window.alert(err?.message || 'Не удалось очистить список');
    } finally {
      setClearing(false);
    }
  };

  const handleCreateList = async () => {
    await persistWithItems(user.uid, draftItems, { groupId: getFamilyGroupId(profile) });
  };

  const handleSaveChanges = async () => {
    if (!listId || !list) return;

    const hasItems = pendingItems.length > 0;
    const hasAccess = isAccessDirty(list);
    if (!hasItems && !hasAccess) return;

    setSavingChanges(true);
    try {
      if (hasItems) {
        await addItemsBatch(
          listId,
          pendingItems.map(({ name, quantity, category, comment, checked, checkedBy, bookedBy }) => ({
            name,
            quantity,
            category,
            comment,
            checked,
            checkedBy,
            bookedBy,
          })),
        );
        resetPendingItems();
      }

      if (hasAccess && pendingAccess) {
        const allowedUsers = [...new Set([...pendingAccess.allowedUsers, list.createdBy])];
        await updateList(listId, {
          isPublic: pendingAccess.isPublic,
          allowedUsers,
        });
        resetPendingAccess();
      }

      scrollToShareAndHighlight();
    } catch (err) {
      window.alert(err?.message || 'Не удалось сохранить изменения');
    } finally {
      setSavingChanges(false);
    }
  };

  const handleSave = async () => {
    if (isDraft) {
      await handleCreateList();
      return;
    }
    await handleSaveChanges();
  };

  const handleRepeatConfirm = async (type) => {
    if (!list) return;

    setRepeatBusy(true);
    try {
      const repeatItems = await getListItemsForRepeat(list.id);
      saveRepeatDraft({ repeatItems, repeatFrom: list.id, type });
      navigate(`/list/new?type=${encodeListTypeForUrl(type)}`);
    } catch (err) {
      window.alert(err?.message || 'Не удалось загрузить товары списка');
    } finally {
      setRepeatBusy(false);
      setRepeatOpen(false);
    }
  };

  const handleComplete = async () => {
    if (!listId || isDraft || isArchivedView || !allDone || total === 0) return;

    setCompleting(true);
    try {
      await syncListStatus(listId);
      navigate('/');
    } catch {
      navigate('/');
    } finally {
      setCompleting(false);
    }
  };

  const handleSaveDescription = async (description) => {
    if (isDraft) {
      setDraftDescription(description);
      return;
    }
    if (!listId) return;
    const trimmed = description.trim();
    if (trimmed === (list?.description || '').trim()) return;
    try {
      await updateList(listId, { description: trimmed });
    } catch (err) {
      window.alert(err?.message || 'Не удалось сохранить заметку');
    }
  };

  const listDescription = isDraft ? draftDescription : list?.description || '';

  const showFooter = isDraft || isArchivedView || isEditMode;
  const saveBusy = persisting || savingChanges;
  const saveLabel = isDraft
    ? (persisting ? 'Создаём…' : 'Создать список')
    : (savingChanges ? 'Сохраняем…' : 'Сохранить изменения');

  const itemHandlers = isDraft
    ? {
        onToggle: toggleDraftItem,
        onQuantityChange: updateDraftItemQuantity,
        onRemove: removeDraftItem,
        onCategoryChange: updateDraftItemCategory,
        onCommentChange: updateDraftItemComment,
        onBookingToggle: updateDraftItemBooking,
      }
    : deferAdds
      ? {
          onToggle: handleDeferredToggle,
          onQuantityChange: handleDeferredQuantityChange,
          onRemove: handleDeferredRemove,
          onCategoryChange: handleDeferredCategoryChange,
          onCommentChange: handleDeferredCommentChange,
          onBookingToggle: handleDeferredBookingToggle,
        }
      : {};

  if (loading) {
    return (
      <div className={`flex min-h-full items-center justify-center ${APP_BACKGROUND}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (!isDraft && (accessError || listError || itemsError || !list)) {
    return (
      <div className={`flex min-h-full flex-col items-center justify-center ${APP_BACKGROUND} ${PAGE_X}`}>
        <p className="text-center text-slate-500">
          {accessError === 'archived'
            ? 'Список в архиве'
            : accessError === 'not_archived'
              ? 'Список не в архиве'
            : accessError || listError || itemsError || 'Список не найден'}
        </p>
        {(listError || itemsError || '')?.toLowerCase().includes('permission') && (
          <p className="mt-2 max-w-xs text-center text-xs text-slate-400">
            Задеплойте правила Firestore: firebase deploy --only firestore:rules
          </p>
        )}
        <Link to={isArchivedView ? '/settings' : '/'} className="mt-4 text-sm font-medium text-slate-700">
          {isArchivedView ? 'В профиль' : 'На главную'}
        </Link>
      </div>
    );
  }

  return (
    <div className={`flex min-h-full flex-col ${APP_BACKGROUND} ${PAGE_X} pt-0`}>
      <ScreenTopPanel>
        <ScreenTopBar>
            <button
              type="button"
              onClick={() => navigate(isArchivedView ? '/settings' : '/')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-800 transition hover:bg-black/[0.04] active:bg-black/[0.06]"
              aria-label="Назад"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="flex min-w-0 shrink items-center gap-2">
                <h1 className="min-w-0 truncate text-lg font-bold leading-none tracking-tight text-slate-900">
                  {activeList.title}
                </h1>
                <ListDescriptionButton
                  hasDescription={Boolean(listDescription?.trim())}
                  onClick={() => setDescriptionOpen(true)}
                  disabled={persisting}
                />
              </div>

              <div className="ml-auto flex shrink-0 items-center gap-2">
                {!isDraft && !isArchivedView && <ListAccessIcon list={displayList || activeList} />}
                <ListTypeBadge type={activeList.type} />

                {isArchivedView && (
                  <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                    В архиве
                  </span>
                )}

                {!isDraft && !isArchivedView && allDone && total > 0 && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={completing}
                    className="shrink-0 rounded-full bg-emerald-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60"
                  >
                    {completing ? '…' : 'Готово!'}
                  </button>
                )}
              </div>
            </div>
          </ScreenTopBar>
        </ScreenTopPanel>

      {listDescription?.trim() && (
        <p className="mt-1 truncate text-xs text-slate-400">{listDescription}</p>
      )}

      <main className={`flex flex-1 flex-col gap-3 pt-3 ${showFooter ? 'pb-28' : 'pb-10'}`}>
        <StatusBar
          items={items}
          onClear={!isArchivedView ? handleClearList : undefined}
          clearing={clearing || persisting || savingChanges}
        />

        <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
          {grouped.length === 0 ? (
            <p className={HINT_TEXT}>
              {isDraft
                ? 'Список пуст — добавьте продукты ниже'
                : isArchivedView
                  ? 'В архивном списке нет товаров'
                  : 'Список пуст — добавьте продукты ниже'}
            </p>
          ) : (
            <div className="space-y-1">
              {grouped.map(([category, categoryItems], index) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  items={categoryItems}
                  displayName={displayName}
                  userPhotoUrl={userPhotoUrl}
                  isFirst={index === 0}
                  readOnly={isArchivedView}
                  onToggle={itemHandlers.onToggle}
                  onQuantityChange={itemHandlers.onQuantityChange}
                  onRemove={itemHandlers.onRemove}
                  onCategoryChange={itemHandlers.onCategoryChange}
                  onCommentChange={itemHandlers.onCommentChange}
                  onBookingToggle={itemHandlers.onBookingToggle}
                  onCategoryBooking={!isArchivedView ? handleCategoryBooking : undefined}
                  disabled={persisting || savingChanges}
                />
              ))}
            </div>
          )}
        </div>

        {!isArchivedView && (
          <>
            <AddItemForm
              listId={isDraft || deferAdds ? null : listId}
              userId={user.uid}
              listItems={items}
              isDraft={isDraft || deferAdds}
              onDraftAdd={isDraft ? handleDraftManualAdd : handlePendingManualAdd}
              disabled={persisting || savingChanges}
            />

            <AiInput
              listId={isDraft || deferAdds ? null : listId}
              isDraft={isDraft || deferAdds}
              onDraftAdd={isDraft ? handleDraftAiAdd : handlePendingAiAdd}
              disabled={persisting || savingChanges}
              showEntryGlow={!suppressAiEntryGlowRef.current}
            />

            {!isDraft && (
              <ShareControls
                list={list}
                listId={listId}
                currentUserId={user.uid}
                currentUserAvatarUrl={userPhotoUrl}
                shareLinkRef={shareLinkRef}
                highlightShareLink={isHighlighting}
                isPublic={effectiveAccess.isPublic}
                allowedUsers={effectiveAccess.allowedUsers}
                onTogglePublic={(value) => togglePendingPublic(list, value)}
                onToggleMember={(userId, hasAccess) => togglePendingMember(list, userId, hasAccess)}
                disabled={savingChanges}
              />
            )}
          </>
        )}
      </main>

      {showFooter && (
        <footer className={`fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 border-t border-gray-200/60 bg-[#f5f5f7]/95 backdrop-blur-md ${PAGE_X} py-4`}>
          {isArchivedView ? (
            <button
              type="button"
              onClick={() => setRepeatOpen(true)}
              className={PRIMARY_BTN}
              disabled={repeatBusy}
            >
              Повторить список
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className={`${PRIMARY_BTN} disabled:cursor-not-allowed`}
              disabled={saveBusy || !isDirty}
            >
              {saveLabel}
            </button>
          )}
        </footer>
      )}

      {isArchivedView && list && (
        <RepeatListModal
          list={list}
          open={repeatOpen}
          loading={repeatBusy}
          onClose={() => !repeatBusy && setRepeatOpen(false)}
          onConfirm={handleRepeatConfirm}
        />
      )}

      <ListDescriptionModal
        open={descriptionOpen}
        listTitle={activeList.title}
        value={listDescription}
        readOnly={isArchivedView}
        disabled={persisting}
        onClose={() => setDescriptionOpen(false)}
        onSave={handleSaveDescription}
      />
    </div>
  );
}
