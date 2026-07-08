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
import { applyPendingItemEdits, listItemsHaveChanges } from '../utils/listItemChanges';
import { decodeListTypeFromUrl, encodeListTypeForUrl, formatListTitle } from '../services/listsService';
import {
  notifyListCreated,
  notifyListUpdated,
  notifyUserAddedToList,
} from '../services/pushNotification';
import { getFamilyGroupId } from '../utils/familyGroup';
import ListDescriptionModal, { ListDescriptionButton } from '../components/list/ListDescriptionModal';
import ScreenTopPanel, { ScreenTopBar } from '../components/layout/ScreenTopPanel';
import { ensureListAccess, ensureArchivedListAccess, saveToProductHistory, getListItemsForRepeat, syncListStatus, clearAllListItems, updateList, markListViewed, updateItemsBookingBatch, addItemsBatch, toggleItem, updateItemQuantity, updateItemCategory, updateItemComment, updateItemBooking, deleteItem } from '../services/listsService';
import { groupItemsByCategory, getListProgress } from '../utils/groupByCategory';
import StatusBar from '../components/list/StatusBar';
import CategoryGroup from '../components/list/CategoryGroup';
import AddItemForm from '../components/list/AddItemForm';
import AiInput from '../components/list/AiInput';
import ShareControls from '../components/list/ShareControls';
import CreateListAccess from '../components/list/CreateListAccess';
import { getFamilyMembers } from '../services/usersService';
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
import { useToast } from '../components/ui/ToastProvider';

export default function ListPage() {
  const { listId } = useParams();
  const toast = useToast();
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
  const [notifyOnSave, setNotifyOnSave] = useState(false);
  // Доступ к списку выбираем ещё на экране создания, чтобы участники получили пуш сразу.
  const [familyMembers, setFamilyMembers] = useState([]);
  // По умолчанию список общий для всей семьи (тумблер включён) — чтобы состояние
  // не выглядело противоречиво (все выделены при выключенном тумблере).
  const [draftIsPublic, setDraftIsPublic] = useState(true);
  const [draftSharedWith, setDraftSharedWith] = useState([]);
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
    if (!canLoadList || !user?.uid || isArchivedView) return;
    markListViewed(listId, user.uid).catch(() => {});
  }, [canLoadList, listId, user?.uid, isArchivedView]);

  useEffect(() => {
    resetPendingItems();
    resetPendingAccess();
    // Сбрасываем выбор доступа, чтобы следующий черновик начинался с чистого листа.
    setDraftSharedWith([]);
    setDraftIsPublic(true);
  }, [listId, resetPendingItems, resetPendingAccess]);

  // Черновик: подтягиваем членов семьи. По умолчанию тумблер «Для всей семьи»
  // включён (список общий), поэтому индивидуальный выбор не предзаполняем —
  // иначе при выключенном тумблере все выглядели бы выбранными.
  useEffect(() => {
    if (!isDraft || !user) return undefined;

    let cancelled = false;
    getFamilyMembers()
      .then((members) => {
        if (!cancelled) setFamilyMembers(members);
      })
      .catch(() => {
        if (!cancelled) setFamilyMembers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [isDraft, user]);

  const handleDraftTogglePublic = useCallback((value) => {
    setDraftIsPublic(value);
  }, []);

  const handleDraftToggleMember = useCallback(
    (userId, hasAccess) => {
      if (!user || userId === user.uid) return; // автор всегда с доступом
      setDraftSharedWith((prev) =>
        hasAccess
          ? prev.filter((id) => id !== userId)
          : prev.includes(userId)
            ? prev
            : [...prev, userId],
      );
    },
    [user],
  );

  const deferAdds = !isDraft && !isArchivedView;
  const isEditMode = deferAdds;

  const activeList = isDraft ? draftList : list;
  const effectiveAccess = getEffectiveAccess(list);
  const displayList = list
    ? { ...list, isPublic: effectiveAccess.isPublic, allowedUsers: effectiveAccess.allowedUsers }
    : list;
  const displayItems = useMemo(() => {
    if (isDraft) return draftItems;
    if (deferAdds) {
      const editedLiveItems = applyPendingItemEdits(liveItems, pendingEdits);
      return mergeItemsBatch(editedLiveItems, pendingItems);
    }
    return liveItems;
  }, [isDraft, deferAdds, draftItems, liveItems, pendingItems, pendingEdits]);

  const items = displayItems;
  const loading = isDraft ? false : !accessChecked || listLoading || itemsLoading;

  const isDirty = isDraft
    ? draftItems.length > 0
    : isEditMode && (
        pendingItems.length > 0
        || isAccessDirty(list)
        || listItemsHaveChanges(liveItems, applyPendingItemEdits(liveItems, pendingEdits))
      );

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
    updatePendingLiveItemQuantity(itemId, quantity);
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
      toast.error(err?.message || 'Не удалось очистить список');
    } finally {
      setClearing(false);
    }
  };

  const handleCreateList = async () => {
    const groupId = getFamilyGroupId(profile);
    // Доступ выбран на экране создания: при «для всей семьи» открываем всем,
    // иначе — только отмеченным участникам. Автора добавит сам сервис.
    const allowedUsers = draftIsPublic
      ? [...new Set([user.uid, ...familyMembers.map((member) => member.id)])]
      : [...new Set([user.uid, ...draftSharedWith])];

    const newListId = await persistWithItems(user.uid, draftItems, {
      groupId,
      isPublic: draftIsPublic,
      allowedUsers,
    });

    if (newListId) {
      // Сценарий А: уведомляем участников с доступом к списку, кроме автора.
      // Не блокируем UI и глушим ошибки — создание списка важнее доставки пуша.
      notifyListCreated({
        list: {
          id: newListId,
          title: formatListTitle(listType),
          isPublic: draftIsPublic,
          allowedUsers,
          groupId,
        },
        author: { uid: user.uid, name: profile?.displayName || displayName, photoUrl: userPhotoUrl },
      }).catch((err) => console.warn('[push] Не удалось отправить уведомление', err));
    }
  };

  const handleSaveChanges = async () => {
    if (!listId || !list) return;

    const hasNewItems = pendingItems.length > 0;
    const hasAccess = isAccessDirty(list);
    const pendingEditEntries = Object.entries(pendingEdits);
    const hasItemEdits = pendingEditEntries.length > 0;
    if (!hasNewItems && !hasAccess && !hasItemEdits) return;

    const previousAllowed = Array.isArray(list.allowedUsers) ? list.allowedUsers : [];
    let updatedAllowed = previousAllowed;
    let updatedIsPublic = list.isPublic === true;

    setSavingChanges(true);
    try {
      if (hasNewItems) {
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
      }

      if (hasItemEdits) {
        await Promise.all(
          pendingEditEntries.map(([itemId, edits]) => {
            if (edits.quantity === undefined) return Promise.resolve();
            return updateItemQuantity(itemId, edits.quantity);
          }),
        );
      }

      if (hasNewItems || hasItemEdits) {
        resetPendingItems();
      }

      if (hasAccess && pendingAccess) {
        updatedAllowed = [...new Set([...pendingAccess.allowedUsers, list.createdBy])];
        updatedIsPublic = pendingAccess.isPublic;
        await updateList(listId, {
          isPublic: updatedIsPublic,
          allowedUsers: updatedAllowed,
        });
        resetPendingAccess();
      }

      // Уведомления после успешной записи (не блокируем UI, глушим ошибки доставки).
      const author = { uid: user.uid, name: profile?.displayName || displayName, photoUrl: userPhotoUrl };
      const updatedList = {
        id: listId,
        title: list.title,
        isPublic: updatedIsPublic,
        allowedUsers: updatedAllowed,
        groupId: list.groupId,
      };
      const newMembers = updatedAllowed.filter(
        (uid) => uid !== author.uid && !previousAllowed.includes(uid),
      );

      // Сценарий В: персональный пуш каждому только что добавленному участнику.
      newMembers.forEach((uid) => {
        notifyUserAddedToList({ list: updatedList, author, newUid: uid }).catch((err) =>
          console.warn('[push] Не удалось уведомить нового участника', err),
        );
      });

      // Сценарий Б: пуш об изменениях остальным участникам — только если включён чекбокс.
      if (notifyOnSave) {
        notifyListUpdated({ list: updatedList, author, excludeUids: newMembers }).catch((err) =>
          console.warn('[push] Не удалось отправить уведомление об изменениях', err),
        );
      }

      setNotifyOnSave(false);
      navigate(-1);
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить изменения');
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
      toast.error(err?.message || 'Не удалось загрузить товары списка');
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
      toast.error(err?.message || 'Не удалось сохранить заметку');
    }
  };

  const listDescription = isDraft ? draftDescription : list?.description || '';

  const showFooter = isDraft || isArchivedView || isEditMode;
  const saveBusy = persisting || savingChanges;
  const saveLabel = isDraft
    ? (persisting ? 'Создаём…' : 'Создать список')
    : (savingChanges ? 'Сохранение...' : 'Сохранить изменения');

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

            {isDraft && draftItems.length > 0 && familyMembers.length > 1 && (
              <div className="animate-access-reveal">
                <CreateListAccess
                  members={familyMembers}
                  authorId={user.uid}
                  currentUserAvatarUrl={userPhotoUrl}
                  isPublic={draftIsPublic}
                  selectedIds={draftSharedWith}
                  onTogglePublic={handleDraftTogglePublic}
                  onToggleMember={handleDraftToggleMember}
                  disabled={persisting}
                />
              </div>
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
            <>
              {isEditMode && isDirty && (
                <label className="mb-3 flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-white/70 px-4 py-2.5 ring-1 ring-black/[0.04]">
                  <span className="text-sm text-slate-700">Уведомить участников об изменениях</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifyOnSave}
                    onClick={() => setNotifyOnSave((value) => !value)}
                    disabled={saveBusy}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
                      notifyOnSave ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        notifyOnSave ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
              )}
              <button
                type="button"
                onClick={handleSave}
                className={`${PRIMARY_BTN} disabled:cursor-not-allowed`}
                disabled={saveBusy || !isDirty}
              >
                {saveLabel}
              </button>
            </>
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
