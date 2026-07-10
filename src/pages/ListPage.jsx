import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
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
import { decodeListTypeFromUrl, encodeListTypeForUrl, formatListTitle, buildListSchedulePatch } from '../services/listsService';
import {
  notifyListCreated,
  notifyListUpdated,
  notifyUserAddedToList,
} from '../services/pushNotification';
import { getFamilyId } from '../utils/familyGroup';
import ListHeaderProgress from '../components/list/ListHeaderProgress';
import { ensureListAccess, ensureArchivedListAccess, saveToProductHistory, getListItemsForRepeat, clearAllListItems, updateList, markListViewed, updateItemsBookingBatch, addItemsBatch, toggleItem, updateItemQuantity, updateItemCategory, updateItemComment, updateItemBooking, deleteItem } from '../services/listsService';
import { groupItemsByCategory, getListProgress } from '../utils/groupByCategory';
import CategoryGroup from '../components/list/CategoryGroup';
import AddItemForm from '../components/list/AddItemForm';
import AiInput from '../components/list/AiInput';
import ShareControls from '../components/list/ShareControls';
import CreateListAccess from '../components/list/CreateListAccess';
import { getFamilyMembers } from '../services/usersService';
import ListAccessIcon from '../components/home/ListAccessIcon';
import CreateListSheet from '../components/home/CreateListSheet';
import RepeatListModal from '../components/home/RepeatListModal';
import { saveRepeatDraft } from '../utils/repeatDraftStorage';
import {
  CARD_SURFACE,
  CARD_PAD_V,
  CARD_SHADOW,
  HINT_TEXT,
  APP_BACKGROUND,
  PAGE_X,
  PRIMARY_BTN,
  SCREEN_TOP_INNER,
} from '../components/list/cardStyles';
import { useToast } from '../components/ui/ToastProvider';
import { parseDateParam, formatDateParam, parseListScheduledFor, resolveSchedulePreset, startOfDay } from '../utils/listSchedule';
import { normalizeListTypeForCreate } from '../utils/listTypes';
import { useVisualViewportFixedTop } from '../hooks/useVisualViewportFixedTop';
import {
  scheduleListReminder,
  cancelListReminder,
} from '../services/scheduledNotifications';

const LIST_FIXED_HEADER =
  `fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 rounded-b-2xl border border-t-0 border-gray-50/80 bg-white pt-[env(safe-area-inset-top,0px)] ${CARD_SHADOW}`;

const LIST_HEADER_SPACER = 'h-[calc(env(safe-area-inset-top,0px)+4.25rem)] shrink-0';

export default function ListPage() {
  const { listId } = useParams();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, displayName } = useAuth();
  const { profile, isSuperAdmin } = useUserProfile(user);
  const userPhotoUrl = getUserPhotoUrl(user, profile);

  const listHeaderRef = useVisualViewportFixedTop();
  const isDraft = listId === 'new';
  const isArchivedView = searchParams.get('archived') === '1';
  const isAdminView = searchParams.get('adminView') === '1' && isSuperAdmin;
  const isReadOnlyView = isArchivedView || isAdminView;
  const adminBackTo = location.state?.backTo || '/admin/dashboard?tab=families';
  const backTarget = isAdminView ? adminBackTo : isArchivedView ? '/settings' : '/';
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
    draftScheduledFor,
    setDraftScheduledFor,
    draftRemindOnDay,
    setDraftRemindOnDay,
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
  const [clearing, setClearing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const shareLinkRef = useRef(null);
  const aiInputRef = useRef(null);
  const prevListIdRef = useRef(listId);
  const shareHighlightPendingRef = useRef(location.state?.highlightShareLink === true);
  const [showCreationDone, setShowCreationDone] = useState(
    () => location.state?.highlightShareLink === true,
  );

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
      : ensureListAccess(listId, user.uid, { isAdmin: isSuperAdmin });

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
  }, [listId, user, isDraft, isArchivedView, isAdminView, isSuperAdmin]);

  useEffect(() => {
    if (!canLoadList || !user?.uid || isReadOnlyView) return;
    markListViewed(listId, user.uid).catch(() => {});
  }, [canLoadList, listId, user?.uid, isReadOnlyView]);

  useEffect(() => {
    resetPendingItems();
    resetPendingAccess();
    // Сбрасываем выбор доступа, чтобы следующий черновик начинался с чистого листа.
    setDraftSharedWith([]);
    setDraftIsPublic(true);
  }, [listId, resetPendingItems, resetPendingAccess]);

  useEffect(() => {
    if (!isDraft) return;

    const dateParam = searchParams.get('date');
    if (dateParam) {
      const parsed = parseDateParam(dateParam);
      setDraftScheduledFor(parsed);
    } else {
      const preset = searchParams.get('schedule') || 'today';
      setDraftScheduledFor(resolveSchedulePreset(preset));
    }

    if (typeof location.state?.description === 'string') {
      setDraftDescription(location.state.description);
    }
  }, [isDraft, listId, searchParams, setDraftScheduledFor, setDraftDescription, location.state?.description]);

  // Черновик: подтягиваем членов семьи. По умолчанию тумблер «Для всей семьи»
  // включён (список общий), поэтому индивидуальный выбор не предзаполняем —
  // иначе при выключенном тумблере все выглядели бы выбранными.
  useEffect(() => {
    if (!isDraft || !user) return undefined;

    let cancelled = false;
    getFamilyMembers(getFamilyId(profile))
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

  const deferAdds = !isDraft && !isReadOnlyView;
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
    if (!isDraft) return undefined;

    const scrollTimer = setTimeout(() => {
      aiInputRef.current?.reveal();
    }, 350);

    return () => clearTimeout(scrollTimer);
  }, [isDraft]);

  useEffect(() => {
    if (location.state?.highlightShareLink) {
      shareHighlightPendingRef.current = true;
      setShowCreationDone(true);
    } else if (listId !== prevListIdRef.current) {
      setShowCreationDone(false);
    }
    prevListIdRef.current = listId;
  }, [listId, location.state?.highlightShareLink]);

  const grouped = groupItemsByCategory(items);
  const { total } = getListProgress(items);

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
    const familyId = getFamilyId(profile);
    // Доступ выбран на экране создания: при «для всей семьи» открываем всем,
    // иначе — только отмеченным участникам. Автора добавит сам сервис.
    const allowedUsers = draftIsPublic
      ? [...new Set([user.uid, ...familyMembers.map((member) => member.id)])]
      : [...new Set([user.uid, ...draftSharedWith])];

    const newListId = await persistWithItems(user.uid, draftItems, {
      groupId: familyId,
      familyId,
      isPublic: draftIsPublic,
      allowedUsers,
    });

    if (newListId) {
      if (draftRemindOnDay && draftScheduledFor) {
        scheduleListReminder({
          listId: newListId,
          listTitle: formatListTitle(listType, draftScheduledFor),
          scheduledFor: draftScheduledFor,
          remindOnDay: true,
        }).catch((err) => console.warn('[reminder] Не удалось запланировать напоминание', err));
      }

      notifyListCreated({
        list: {
          id: newListId,
          title: formatListTitle(listType, draftScheduledFor || new Date()),
          isPublic: draftIsPublic,
          allowedUsers,
          familyId,
          groupId: familyId,
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
        groupId: list.groupId || list.familyId,
        familyId: list.familyId || list.groupId,
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
    if (isEditMode && !isDirty && showCreationDone) {
      setShowCreationDone(false);
      navigate('/');
      return;
    }
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

  const handleSaveSettings = async ({ type, scheduledFor, description }) => {
    setSettingsOpen(false);

    if (isDraft) {
      setDraftDescription(description);
      setDraftScheduledFor(scheduledFor);

      const encodedType = encodeListTypeForUrl(type);
      const nextDateParam = scheduledFor ? `&date=${formatDateParam(scheduledFor)}` : '';
      const currentDateParam = draftScheduledFor ? `&date=${formatDateParam(draftScheduledFor)}` : '';
      const nextPath = `/list/new?type=${encodedType}${nextDateParam}`;
      const currentPath = `/list/new?type=${encodeListTypeForUrl(listType)}${currentDateParam}`;

      if (nextPath !== currentPath) {
        navigate(nextPath, { replace: true });
      }
      return;
    }

    if (!listId || !list || isReadOnlyView) return;

    const resolvedType = normalizeListTypeForCreate(type);
    const scheduledDate = scheduledFor ? startOfDay(scheduledFor) : null;
    const trimmedDescription = description.trim();
    const nextTitle = formatListTitle(resolvedType, scheduledDate || new Date());
    const remindOnDay = Boolean(scheduledDate && list.remindOnDay);

    const unchanged = resolvedType === (list.type || 'home')
      && trimmedDescription === (list.description || '').trim()
      && (scheduledDate?.getTime() || null) === (parseListScheduledFor(list)?.getTime() || null);

    if (unchanged) return;

    try {
      await updateList(listId, {
        type: resolvedType,
        title: nextTitle,
        description: trimmedDescription,
        ...buildListSchedulePatch({ scheduledFor: scheduledDate, remindOnDay }),
      });

      if (scheduledDate && remindOnDay) {
        scheduleListReminder({
          listId,
          listTitle: nextTitle,
          scheduledFor: scheduledDate,
          remindOnDay: true,
        }).catch((err) => console.warn('[reminder] Не удалось запланировать напоминание', err));
      } else {
        cancelListReminder(listId).catch(() => {});
      }
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить настройки списка');
    }
  };

  const listDescription = isDraft ? draftDescription : list?.description || '';
  const listScheduledFor = isDraft ? draftScheduledFor : parseListScheduledFor(list);
  const settingsListType = isDraft ? listType : list?.type || 'home';

  const showFooter = !isAdminView && (isDraft || isArchivedView || isEditMode);
  const showDoneButton = isEditMode && !isDirty && showCreationDone;
  const saveBusy = persisting || savingChanges;
  const saveLabel = isDraft
    ? (persisting ? 'Создаём…' : 'Создать список')
    : savingChanges
      ? 'Сохранение...'
      : showDoneButton
        ? 'Готово!'
        : 'Сохранить изменения';
  const saveDisabled = saveBusy || (!showDoneButton && !isDirty);

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

  const handleBack = () => navigate(backTarget);

  const renderBackButton = () => (
    <button
      type="button"
      onClick={handleBack}
      className="relative z-20 flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-full text-slate-800 transition hover:bg-black/[0.04] active:bg-black/[0.06]"
      aria-label="Назад"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
  );

  const renderFixedHeader = (content) => (
    <>
      <header ref={listHeaderRef} className={LIST_FIXED_HEADER}>
        <div className={SCREEN_TOP_INNER}>{content}</div>
      </header>
      <div aria-hidden className={LIST_HEADER_SPACER} />
    </>
  );

  const renderHeaderTitleRow = () => (
    <div className="flex min-h-10 items-center gap-2">
      {renderBackButton()}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {!isReadOnlyView ? (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            disabled={persisting || savingChanges}
            className="flex min-w-0 max-w-[46%] shrink-0 touch-manipulation items-center gap-0.5 rounded-lg py-1 pr-1 transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 sm:max-w-[52%]"
            aria-label="Настройки списка"
          >
            <span className="truncate text-lg font-bold leading-none tracking-tight text-slate-900">
              {activeList.title}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          </button>
        ) : (
          <h1 className="min-w-0 max-w-[46%] shrink-0 truncate text-lg font-bold leading-none tracking-tight text-slate-900 sm:max-w-[52%]">
            {activeList.title}
          </h1>
        )}

        {!isReadOnlyView && (
          <ListHeaderProgress
            inline
            items={items}
            onClear={handleClearList}
            clearing={clearing || persisting || savingChanges}
          />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {!isDraft && !isReadOnlyView && <ListAccessIcon list={displayList || activeList} />}

        {isAdminView && (
          <span className="inline-flex shrink-0 items-center rounded-md bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
            Просмотр
          </span>
        )}

        {isArchivedView && !isAdminView && (
          <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            В архиве
          </span>
        )}

        {isArchivedView && isAdminView && (
          <span className="inline-flex shrink-0 items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            Архив
          </span>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className={`flex min-h-full flex-col ${APP_BACKGROUND} ${PAGE_X} pt-0`}>
        {renderFixedHeader(
          <div className="flex min-h-10 items-center gap-2">
            {renderBackButton()}
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold leading-none tracking-tight text-slate-900">
              {activeList?.title || 'Загрузка…'}
            </h1>
          </div>,
        )}
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      </div>
    );
  }

  if (!isDraft && (accessError || listError || itemsError || !list)) {
    return (
      <div className={`flex min-h-full flex-col ${APP_BACKGROUND} ${PAGE_X} pt-0`}>
        {renderFixedHeader(
          <div className="flex min-h-10 items-center gap-2">
            {renderBackButton()}
            <h1 className="min-w-0 flex-1 truncate text-lg font-bold leading-none tracking-tight text-slate-900">
              Список
            </h1>
          </div>,
        )}
        <div className="flex flex-1 flex-col items-center justify-center">
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
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-full flex-col ${APP_BACKGROUND} ${PAGE_X} pt-0`}>
      {renderFixedHeader(renderHeaderTitleRow())}

      <main className={`flex flex-1 flex-col gap-3 pt-3 ${showFooter ? 'pb-28' : 'pb-10'}`}>
        <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
          {grouped.length === 0 ? (
            <p className={HINT_TEXT}>
              {isDraft
                ? 'Список пуст — добавьте продукты ниже'
                : isReadOnlyView
                  ? 'В списке нет товаров'
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
                  readOnly={isReadOnlyView}
                  onToggle={itemHandlers.onToggle}
                  onQuantityChange={itemHandlers.onQuantityChange}
                  onRemove={itemHandlers.onRemove}
                  onCategoryChange={itemHandlers.onCategoryChange}
                  onCommentChange={itemHandlers.onCommentChange}
                  onBookingToggle={itemHandlers.onBookingToggle}
                  onCategoryBooking={!isReadOnlyView ? handleCategoryBooking : undefined}
                  disabled={persisting || savingChanges}
                />
              ))}
            </div>
          )}
        </div>

        {!isReadOnlyView && (
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
              ref={aiInputRef}
              listId={isDraft || deferAdds ? null : listId}
              isDraft={isDraft || deferAdds}
              onDraftAdd={isDraft ? handleDraftAiAdd : handlePendingAiAdd}
              disabled={persisting || savingChanges}
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
                disabled={saveDisabled}
              >
                {saveLabel}
              </button>
            </>
          )}
        </footer>
      )}

      {isArchivedView && !isAdminView && list && (
        <RepeatListModal
          list={list}
          open={repeatOpen}
          loading={repeatBusy}
          onClose={() => !repeatBusy && setRepeatOpen(false)}
          onConfirm={handleRepeatConfirm}
        />
      )}

      <CreateListSheet
        open={settingsOpen}
        mode="settings"
        onClose={() => setSettingsOpen(false)}
        onConfirm={handleSaveSettings}
        canCreateCustom={isSuperAdmin}
        initialType={settingsListType}
        initialScheduledFor={listScheduledFor}
        initialDescription={listDescription}
        readOnly={isReadOnlyView}
      />
    </div>
  );
}
