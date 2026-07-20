import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Briefcase, ChevronDown, ClipboardList, Plus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import PackingCategoryGroup from '../components/packing/PackingCategoryGroup';
import PackingListSettingsModal from '../components/packing/PackingListSettingsModal';
import PackingItemDetailsModal from '../components/packing/PackingItemDetailsModal';
import AiInput from '../components/list/AiInput';
import CreateListAccess from '../components/list/CreateListAccess';
import ListHeaderProgress from '../components/list/ListHeaderProgress';
import ListHeaderOwnerAvatar from '../components/list/ListHeaderOwnerAvatar';
import {
  APP_BACKGROUND,
  CARD_SHADOW,
  CARD_SURFACE,
  EXIT_BTN_NEUTRAL,
  HINT_TEXT,
  PAGE_X,
  PRIMARY_BTN,
  SCREEN_TOP_INNER,
} from '../components/list/cardStyles';
import { useToast } from '../components/ui/ToastProvider';
import { getFamilyMembers } from '../services/usersService';
import { getFamily } from '../services/familiesService';
import { AI_PARSE_MODE } from '../services/aiService';
import {
  canAccessPackingList,
  createPackingEditableSnapshot,
  createPackingItemId,
  filterCommonPackingItems,
  filterPersonalPackingItems,
  getPackingCategoryIcon,
  getPersonalPackingProgress,
  getPackingListProgress,
  groupPackingItemsByActivity,
  listPackingActivityOptions,
  normalizePackingItem,
  packingItemMatchesActivity,
  PACKING_ACTIVITY_MAIN,
  PACKING_ITEM_TYPE,
  PACKING_SCOPE,
  packingEditableSnapshotsEqual,
  packingMembersToSelectedIds,
  packingTripAxesToPayload,
  resolvePackingMembers,
} from '../utils/packingLists';
import {
  lookupPopularPackingItem,
  mergePackingAutocompleteSuggestions,
} from '../utils/packingAutocomplete';
import { mergePackingItemsBatch } from '../utils/mergePackingItems';
import { PACKING_ACCENT, getPackingTypeAccent } from '../utils/contextAccents';
import { getUserPhotoUrl } from '../utils/userPhoto';
import {
  getNeutralExitLabel,
  getPackingAiPlaceholder,
  resolveUiTheme,
} from '../utils/uiThemes';
import { HOME_DESKTOP } from '../utils/homeDesktops';
import {
  archivePackingList,
  deletePackingList,
  getPackingList,
  replacePackingListItems,
  repeatPackingList,
  savePackingListAsTemplate,
  togglePackingItemChecked,
  updatePackingList,
} from '../services/packingListsService';
import { acceptPackingListShare } from '../services/packingListShareService';
import { notifyPackingListCreated } from '../services/pushNotification';
import RepeatPackingListModal from '../components/packing/RepeatPackingListModal';

const TAB_COMMON = 'common';
const TAB_PERSONAL = 'personal';

const TABS = [
  { id: TAB_COMMON, label: 'Общие вещи и дела', emoji: '🌍' },
  { id: TAB_PERSONAL, label: 'Мой рюкзак', emoji: '👤' },
];

const PACKING_FIXED_HEADER =
  `fixed left-1/2 top-0 z-50 w-full max-w-lg -translate-x-1/2 rounded-b-2xl border border-t-0 border-gray-50/80 bg-white pt-[env(safe-area-inset-top,0px)] ${CARD_SHADOW}`;

const PACKING_HEADER_SPACER = 'h-[calc(env(safe-area-inset-top,0px)+4.25rem)] shrink-0';

export default function PackingListPage() {
  const { listId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const {
    profile,
    familyId,
    isFamilyAdmin,
    loading: profileLoading,
  } = useUserProfile(user);

  const uiTheme = resolveUiTheme(profile, user?.uid);
  const packingAiPlaceholder = getPackingAiPlaceholder(uiTheme);
  const userPhotoUrl = getUserPhotoUrl(user, profile);
  const displayName = profile?.displayName || user?.displayName || '';
  const shareToken = searchParams.get('share');
  const packingAccent = PACKING_ACCENT;
  const itemTypeAccent = getPackingTypeAccent(PACKING_ITEM_TYPE.ITEM);
  const todoTypeAccent = getPackingTypeAccent(PACKING_ITEM_TYPE.TODO);

  const [list, setList] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [membersById, setMembersById] = useState({});
  const [currentFamily, setCurrentFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(TAB_COMMON);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsArchiving, setSettingsArchiving] = useState(false);
  const [detailsItem, setDetailsItem] = useState(null);
  const [busyItemId, setBusyItemId] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftType, setDraftType] = useState(PACKING_ITEM_TYPE.ITEM);
  const [draftCategory, setDraftCategory] = useState('');
  const [draftCategoryIcon, setDraftCategoryIcon] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const draftTypeAccent = getPackingTypeAccent(draftType);
  const [adding, setAdding] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [syncingCount, setSyncingCount] = useState(0);
  const [sessionTouched, setSessionTouched] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [repeatBusy, setRepeatBusy] = useState(false);
  const [accessIsPublic, setAccessIsPublic] = useState(true);
  const [accessSelectedIds, setAccessSelectedIds] = useState([]);
  const [baselineSnapshot, setBaselineSnapshot] = useState(null);
  const shareHandledRef = useRef(null);

  const applyLoadedList = useCallback((next) => {
    const nextIsPublic = next.isPublic !== false;
    const nextSelectedIds = packingMembersToSelectedIds(next.members, next.createdBy || user?.uid);
    setList(next);
    setAccessIsPublic(nextIsPublic);
    setAccessSelectedIds(nextSelectedIds);
    setSessionTouched(false);
    setBaselineSnapshot(createPackingEditableSnapshot(next, {
      isPublic: nextIsPublic,
      selectedIds: nextSelectedIds,
      authorId: next.createdBy || user?.uid,
    }));
  }, [user?.uid]);

  const loadList = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    setError('');
    try {
      const next = await getPackingList(listId);
      if (!next) {
        setList(null);
        setBaselineSnapshot(null);
        setError('Список не найден');
        return;
      }
      if (
        user?.uid
        && !canAccessPackingList(next, user.uid, {
          isFamilyAdmin,
          familyId,
          shareToken,
        })
      ) {
        setList(null);
        setBaselineSnapshot(null);
        setError('Нет доступа к этому списку');
        return;
      }
      applyLoadedList(next);
    } catch (err) {
      setError(err?.message || 'Не удалось загрузить список');
      setList(null);
      setBaselineSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [listId, familyId, user?.uid, isFamilyAdmin, applyLoadedList, shareToken]);

  useEffect(() => {
    if (profileLoading) return;
    loadList();
  }, [loadList, profileLoading]);

  useEffect(() => {
    if (!familyId || !shareToken || !listId || !user?.uid) return;
    const handleKey = `${listId}:${shareToken}`;
    if (shareHandledRef.current === handleKey) return;
    shareHandledRef.current = handleKey;

    let cancelled = false;
    (async () => {
      try {
        const family = await getFamily(familyId);
        const { joined, alreadyJoined } = await acceptPackingListShare({
          listId,
          token: shareToken,
          userId: user.uid,
          familyId,
          familyName: family?.name || profile?.displayName || 'Семья',
          familyAvatarUrl: family?.avatarUrl || null,
        });
        if (cancelled) return;
        if (joined) {
          toast.success('Вы присоединились к списку сборов');
        } else if (alreadyJoined) {
          toast.success('Список уже доступен вашей семье');
        }
        navigate(`/packing/${listId}`, { replace: true });
        await loadList();
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.message || 'Не удалось принять приглашение');
          navigate(`/packing/${listId}`, { replace: true });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [familyId, shareToken, listId, user?.uid, profile?.displayName, toast, navigate, loadList]);

  useEffect(() => {
    if (!familyId) {
      setCurrentFamily(null);
      return undefined;
    }
    let cancelled = false;
    getFamily(familyId)
      .then((family) => {
        if (!cancelled) setCurrentFamily(family);
      })
      .catch(() => {
        if (!cancelled) setCurrentFamily(null);
      });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    let cancelled = false;
    (async () => {
      try {
        const members = await getFamilyMembers(familyId);
        if (cancelled) return;
        setFamilyMembers(members);
        setMembersById(Object.fromEntries(members.map((member) => [member.id, member])));
      } catch {
        if (!cancelled) {
          setFamilyMembers([]);
          setMembersById({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const commonItems = useMemo(
    () => filterCommonPackingItems(list?.items),
    [list?.items],
  );
  const personalItems = useMemo(
    () => filterPersonalPackingItems(list?.items, user?.uid),
    [list?.items, user?.uid],
  );
  const visibleItems = tab === TAB_PERSONAL ? personalItems : commonItems;
  const visibleActivityGroups = useMemo(
    () => groupPackingItemsByActivity(visibleItems),
    [visibleItems],
  );
  const activityOptions = useMemo(
    () => listPackingActivityOptions(visibleItems),
    [visibleItems],
  );
  const backpackProgress = useMemo(
    () => getPersonalPackingProgress(list?.items, user?.uid),
    [list?.items, user?.uid],
  );
  const headerProgress = useMemo(
    () => getPackingListProgress(list, user?.uid),
    [list, user?.uid],
  );
  const headerProgressItems = useMemo(() => {
    const common = filterCommonPackingItems(list?.items);
    const personal = filterPersonalPackingItems(list?.items, user?.uid);
    return [...common, ...personal].map((item) => ({ checked: Boolean(item.checked) }));
  }, [list?.items, user?.uid]);

  const resolvedMembers = useMemo(() => resolvePackingMembers({
    isPublic: accessIsPublic,
    selectedIds: accessSelectedIds,
    authorId: list?.createdBy || user?.uid,
    familyMemberIds: familyMembers.map((member) => member.id),
  }), [accessIsPublic, accessSelectedIds, list?.createdBy, user?.uid, familyMembers]);

  const currentSnapshot = useMemo(() => {
    if (!list) return null;
    return createPackingEditableSnapshot(list, {
      isPublic: accessIsPublic,
      selectedIds: accessSelectedIds,
      authorId: list.createdBy || user?.uid,
    });
  }, [list, accessIsPublic, accessSelectedIds, user?.uid]);

  const isDirty = Boolean(
    baselineSnapshot
    && currentSnapshot
    && !packingEditableSnapshotsEqual(baselineSnapshot, currentSnapshot),
  );
  const isListEmpty = !list?.items?.length;
  // Пустой список «отменить создание» можно только автору: иначе delete → permission-denied.
  const isNewEmptyList = Boolean(
    isListEmpty
    && (baselineSnapshot?.items?.length ?? 0) === 0
    && list?.createdBy
    && user?.uid
    && list.createdBy === user.uid,
  );
  const isArchivedList = Boolean(list?.archived || list?.status === 'archived');
  const showAccessControls = Boolean(
    list
    && !list.isTemplate
    && user?.uid
    && familyMembers.length > 1,
  );

  const isCloudSyncing = syncingCount > 0;
  const footerLabel = isCloudSyncing
    ? 'Сохраняю в облако...'
    : isNewEmptyList
      ? '← Ничего не добавлено, выйти'
      : isDirty
        ? 'Сохранить и выйти'
        : sessionTouched
          ? 'Готово, выйти! 👍'
          : getNeutralExitLabel(uiTheme);
  const footerClassName = isCloudSyncing
    ? (isDirty || sessionTouched ? PACKING_ACCENT.primaryBtn : EXIT_BTN_NEUTRAL)
    : isNewEmptyList || (!isDirty && !sessionTouched)
      ? EXIT_BTN_NEUTRAL
      : PACKING_ACCENT.primaryBtn;
  const showNeutralExitIcon = !isDirty
    && !sessionTouched
    && !isNewEmptyList
    && !exiting
    && !isCloudSyncing;
  const canCloudSyncChecks = Boolean(
    list?.id && !isArchivedList && !list.isTemplate,
  );
  const persistedItemIds = useMemo(
    () => new Set((baselineSnapshot?.items || []).map((entry) => entry.id)),
    [baselineSnapshot],
  );

  const handleItemSyncStateChange = useCallback(({ syncing }) => {
    setSyncingCount((count) => (syncing ? count + 1 : Math.max(0, count - 1)));
  }, []);

  const handleClearList = async () => {
    if (!list?.id || clearing || isArchivedList || list.isTemplate) return;
    setClearing(true);
    try {
      await replacePackingListItems(list.id, []);
      setList((prev) => (prev ? { ...prev, items: [] } : prev));
      setBaselineSnapshot((prev) => (prev ? { ...prev, items: [] } : prev));
      setSessionTouched(true);
      toast.success('Список очищен');
    } catch (err) {
      toast.error(err?.message || 'Не удалось очистить список');
    } finally {
      setClearing(false);
    }
  };

  const handleRepeatConfirm = async ({ title, travelDate }) => {
    if (!list?.id || !user?.uid || !familyId || repeatBusy) return;
    setRepeatBusy(true);
    try {
      const id = await repeatPackingList(list.id, {
        createdBy: user.uid,
        familyId,
        title,
        travelDate,
        familyMemberIds: familyMembers.map((member) => member.id),
      });
      setRepeatOpen(false);
      navigate(`/packing/${id}`, { replace: true, state: { fromTravelDesktop: true } });
    } catch (err) {
      toast.error(err?.message || 'Не удалось повторить список');
    } finally {
      setRepeatBusy(false);
    }
  };

  const handleTogglePublic = useCallback((value) => {
    setAccessIsPublic(value);
  }, []);

  const handleToggleMember = useCallback((userId, hasAccess) => {
    if (!user || userId === user.uid) return;
    const nextSelected = hasAccess
      ? accessSelectedIds.filter((id) => id !== userId)
      : accessSelectedIds.includes(userId)
        ? accessSelectedIds
        : [...accessSelectedIds, userId];
    setAccessIsPublic(false);
    setAccessSelectedIds(nextSelected);
  }, [user, accessSelectedIds]);

  const handleBack = () => {
    navigate('/', { state: { homeDesktop: HOME_DESKTOP.TRAVEL } });
  };

  const isExternalGuest = Boolean(
    list
    && familyId
    && list.familyId
    && list.familyId !== familyId,
  );
  const canEditSettings = Boolean(list && user?.uid && list.createdBy === user.uid);

  const handleArchiveList = async () => {
    if (!list?.id || !user?.uid || settingsArchiving || settingsSaving) return;
    if (list.createdBy !== user.uid) {
      toast.error('Архивировать поездку может только автор');
      return;
    }
    setSettingsArchiving(true);
    try {
      if (isDirty) {
        await replacePackingListItems(list.id, list.items || []);
        await updatePackingList(list.id, {
          isPublic: accessIsPublic,
          members: resolvedMembers,
        });
      }
      await archivePackingList(list.id, user.uid);
      toast.success('Поездка отправлена в архив');
      setSettingsOpen(false);
      navigate('/', { replace: true, state: { homeDesktop: HOME_DESKTOP.TRAVEL } });
    } catch (err) {
      toast.error(err?.message || 'Не удалось отправить список в архив');
    } finally {
      setSettingsArchiving(false);
    }
  };

  const handleSaveSettings = async ({
    tripTransport,
    tripPurpose,
    travelDate,
    tripStartDate,
    tripEndDate,
    description,
    groupByCategory = false,
    saveAsTemplate = false,
  }) => {
    if (!list?.id || settingsSaving) return;
    setSettingsSaving(true);
    try {
      const nextTravelDate = travelDate || tripStartDate || null;
      if (isDirty) {
        await replacePackingListItems(list.id, list.items || []);
        await updatePackingList(list.id, {
          isPublic: accessIsPublic,
          members: resolvedMembers,
        });
        setBaselineSnapshot(currentSnapshot);
      }
      await updatePackingList(list.id, {
        ...packingTripAxesToPayload({ tripTransport, tripPurpose }),
        travelDate: nextTravelDate,
        tripStartDate: tripStartDate || nextTravelDate,
        tripEndDate: tripEndDate || nextTravelDate,
        description: description || '',
        groupByCategory: Boolean(groupByCategory),
      });
      setList((prev) => (prev ? {
        ...prev,
        ...packingTripAxesToPayload({ tripTransport, tripPurpose }),
        travelDate: nextTravelDate,
        tripStartDate: tripStartDate || nextTravelDate,
        tripEndDate: tripEndDate || nextTravelDate,
        description: description || '',
        groupByCategory: Boolean(groupByCategory),
      } : prev));

      if (saveAsTemplate && !list.isTemplate) {
        await savePackingListAsTemplate(list.id);
        toast.success('Настройки сохранены, шаблон создан');
      } else {
        toast.success('Настройки сохранены');
      }
      setSettingsOpen(false);
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить настройки');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSaveAndExit = async () => {
    if (!list?.id || !user?.uid || exiting) return;

    setExiting(true);
    try {
      await replacePackingListItems(list.id, list.items || []);

      const patch = {
        isPublic: accessIsPublic,
        members: resolvedMembers,
      };

      if (!list.isTemplate && !list.creationNotifiedAt) {
        patch.creationNotifiedAt = new Date().toISOString();
      }

      await updatePackingList(list.id, patch);

      if (!list.isTemplate && !list.creationNotifiedAt) {
        notifyPackingListCreated({
          list: {
            id: list.id,
            title: list.title,
            isPublic: accessIsPublic,
            members: resolvedMembers,
            familyId: list.familyId,
          },
          author: {
            uid: user.uid,
            name: displayName,
            photoUrl: userPhotoUrl,
          },
        }).catch((err) => console.warn('[push] Не удалось отправить уведомление', err));
      }

      handleBack();
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить список');
      setExiting(false);
    }
  };

  const handleFooterExit = async () => {
    if (exiting || syncingCount > 0) return;

    // Новый пустой список автора — отмена без сохранения (delete только createdBy).
    if (isNewEmptyList) {
      setExiting(true);
      try {
        if (list?.id && list.createdBy === user?.uid) {
          await deletePackingList(list.id);
        }
        handleBack();
      } catch (err) {
        toast.error(err?.message || 'Не удалось выйти');
        setExiting(false);
      }
      return;
    }

    if (!isDirty) {
      handleBack();
      return;
    }

    await handleSaveAndExit();
  };

  const handleToggle = async (item, nextChecked) => {
    if (!list?.id || !item?.id) return;

    const previous = {
      checked: Boolean(item.checked),
      checkedBy: item.checkedBy || null,
      checkedByUid: item.checkedByUid || null,
      checkedByPhotoUrl: item.checkedByPhotoUrl || null,
    };
    const nextMeta = {
      checked: nextChecked,
      checkedBy: nextChecked ? (displayName || 'Участник') : null,
      checkedByUid: nextChecked ? (user?.uid || null) : null,
      checkedByPhotoUrl: nextChecked ? (userPhotoUrl || null) : null,
    };

    setSessionTouched(true);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((entry) => (
          entry.id === item.id ? { ...entry, ...nextMeta } : entry
        )),
      };
    });

    const isPersisted = Boolean(
      baselineSnapshot?.items?.some((entry) => entry.id === item.id),
    );
    if (!canCloudSyncChecks || !isPersisted) return;

    try {
      await togglePackingItemChecked(list.id, item.id, {
        ...nextMeta,
        requireOwnerId: item.scope === PACKING_SCOPE.PERSONAL ? user?.uid : null,
      });
    } catch (err) {
      setList((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((entry) => (
            entry.id === item.id ? { ...entry, ...previous } : entry
          )),
        };
      });
      toast.error(err?.message || 'Не удалось сохранить отметку');
      throw err;
    }
  };

  const handleAssign = (item, userId) => {
    if (!list?.id || !item?.id) return;
    setSessionTouched(true);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((entry) => (
          entry.id === item.id
            ? { ...entry, assignedTo: userId || null }
            : entry
        )),
      };
    });
  };

  const handleRemoveItem = (item) => {
    if (!list?.id || !item?.id) return;
    setSessionTouched(true);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: (prev.items || []).filter((entry) => entry.id !== item.id),
      };
    });
  };

  const handleRenameActivity = (fromActivity, next) => {
    const nextActivity = next?.activity || PACKING_ACTIVITY_MAIN;
    const nextIcon = String(next?.activityIcon || '').trim();

    setSessionTouched(true);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: (prev.items || []).map((entry) => {
          if (!packingItemMatchesActivity(entry, fromActivity)) return entry;
          return normalizePackingItem({
            ...entry,
            activity: nextActivity,
            activityIcon: nextActivity === PACKING_ACTIVITY_MAIN ? '' : nextIcon,
          });
        }),
      };
    });
  };

  const handleCopyToPersonal = (item) => {
    if (!list?.id || !item?.id || !user?.uid) return;

    const nameKey = String(item.name || '').trim().toLowerCase();
    const alreadyInBackpack = (list.items || []).some((entry) => (
      entry.scope === PACKING_SCOPE.PERSONAL
      && entry.ownerId === user.uid
      && String(entry.name || '').trim().toLowerCase() === nameKey
    ));
    if (alreadyInBackpack) {
      toast.success('Такой пункт уже есть в вашем рюкзаке');
      return;
    }

    const copy = normalizePackingItem({
      id: createPackingItemId(),
      name: item.name,
      scope: PACKING_SCOPE.PERSONAL,
      type: item.type || PACKING_ITEM_TYPE.ITEM,
      activity: item.activity || PACKING_ACTIVITY_MAIN,
      activityIcon: item.activityIcon || '',
      category: item.category || '',
      categoryIcon: item.categoryIcon || '',
      ownerId: user.uid,
      assignedTo: null,
      checked: false,
      statusMap: {},
      bookingUrl: item.bookingUrl || '',
      note: item.note || '',
      quantity: item.quantity || '',
      dueDate: item.dueDate || '',
    });
    if (!copy.name) return;

    setSessionTouched(true);
    setList((prev) => (prev ? { ...prev, items: [...(prev.items || []), copy] } : prev));
    toast.success('Скопировано в мой рюкзак');
  };

  const handleMoveToCommon = (item) => {
    if (!list?.id || !item?.id || !user?.uid) return;
    if (item.scope !== PACKING_SCOPE.PERSONAL) return;

    setSessionTouched(true);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: (prev.items || []).map((entry) => {
          if (entry.id !== item.id) return entry;
          return normalizePackingItem({
            ...entry,
            scope: PACKING_SCOPE.COMMON,
            ownerId: null,
            assignedTo: user.uid,
          });
        }),
      };
    });
    toast.success('Перенесено в общие');
  };

  const handleSaveItemDetails = ({
    category,
    categoryIcon,
    activity,
    activityIcon,
    assignedTo,
    quantity,
    note,
    bookingUrl,
    dueDate,
  }) => {
    if (!detailsItem?.id) return;
    setSessionTouched(true);
    setList((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((entry) => (
          entry.id === detailsItem.id
            ? normalizePackingItem({
              ...entry,
              category: category || '',
              categoryIcon: categoryIcon || '',
              activity: activity || PACKING_ACTIVITY_MAIN,
              activityIcon: activity === PACKING_ACTIVITY_MAIN ? '' : (activityIcon || ''),
              assignedTo: entry.scope === PACKING_SCOPE.PERSONAL
                ? entry.assignedTo
                : (assignedTo || null),
              quantity: quantity || '',
              note: note || '',
              bookingUrl: bookingUrl || '',
              dueDate: dueDate || '',
            })
            : entry
        )),
      };
    });
    setDetailsItem(null);
  };

  const resetDraftForm = () => {
    setDraftName('');
    setDraftCategory('');
    setDraftCategoryIcon('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const applyDraftSuggestionMeta = (entry) => {
    if (!entry) return;
    if (entry.type === PACKING_ITEM_TYPE.ITEM || entry.type === PACKING_ITEM_TYPE.TODO) {
      setDraftType(entry.type);
    }
    const category = String(entry.category || '').trim();
    setDraftCategory(category);
    setDraftCategoryIcon(getPackingCategoryIcon(category, entry.categoryIcon));
  };

  const handleDraftNameChange = (value) => {
    setDraftName(value);

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const history = (list?.items || []).map((item) => ({
      name: item.name,
      type: item.type,
      category: item.category,
      categoryIcon: item.categoryIcon,
    }));
    const merged = mergePackingAutocompleteSuggestions(value, history);
    setSuggestions(merged);
    setShowSuggestions(merged.length > 0);

    const exact = lookupPopularPackingItem(value);
    if (exact) {
      applyDraftSuggestionMeta(exact);
    } else {
      setDraftCategory('');
      setDraftCategoryIcon('');
    }
  };

  const selectDraftSuggestion = (suggestion) => {
    setDraftName(suggestion.name);
    applyDraftSuggestionMeta(suggestion);
    setShowSuggestions(false);
  };

  const handleAddItem = (event) => {
    event.preventDefault();
    if (!list?.id || adding || !draftName.trim()) return;

    const scope = tab === TAB_PERSONAL ? PACKING_SCOPE.PERSONAL : PACKING_SCOPE.COMMON;
    const dictHit = lookupPopularPackingItem(draftName);
    const category = draftCategory || dictHit?.category || '';
    const categoryIcon = getPackingCategoryIcon(
      category,
      draftCategoryIcon || dictHit?.categoryIcon || '',
    );
    const type = draftType
      || dictHit?.type
      || PACKING_ITEM_TYPE.ITEM;

    const item = normalizePackingItem({
      id: createPackingItemId(),
      name: draftName.trim(),
      scope,
      type,
      activity: PACKING_ACTIVITY_MAIN,
      activityIcon: '',
      category,
      categoryIcon,
      assignedTo: scope === PACKING_SCOPE.COMMON ? user?.uid || null : null,
      ownerId: scope === PACKING_SCOPE.PERSONAL ? user?.uid || null : null,
      checked: false,
      statusMap: {},
    });
    if (!item.name) return;

    setAdding(true);
    setSessionTouched(true);
    setList((prev) => (prev
      ? { ...prev, items: mergePackingItemsBatch(prev.items || [], [item]) }
      : prev));
    resetDraftForm();
    setAdding(false);
  };

  const handleAiDraftAdd = async (entries) => {
    if (!list?.id || !Array.isArray(entries) || entries.length === 0) return;

    const scopeFallback = tab === TAB_PERSONAL ? PACKING_SCOPE.PERSONAL : PACKING_SCOPE.COMMON;
    const additions = entries
      .map((entry) => {
        const scope = entry?.scope || scopeFallback;
        const dictHit = lookupPopularPackingItem(entry?.name);
        const category = String(entry?.category || dictHit?.category || '').trim();
        return normalizePackingItem({
          id: createPackingItemId(),
          name: entry?.name,
          scope,
          type: entry?.type || dictHit?.type || PACKING_ITEM_TYPE.ITEM,
          activity: entry?.activity ?? PACKING_ACTIVITY_MAIN,
          activityIcon: entry?.activityIcon || '',
          category,
          categoryIcon: getPackingCategoryIcon(category, entry?.categoryIcon || dictHit?.categoryIcon),
          assignedTo: scope === PACKING_SCOPE.COMMON ? user?.uid || null : null,
          ownerId: scope === PACKING_SCOPE.PERSONAL ? user?.uid || null : null,
          checked: false,
          statusMap: {},
        });
      })
      .filter((item) => item.name);

    if (additions.length === 0) return;
    setSessionTouched(true);
    setList((prev) => (prev
      ? { ...prev, items: mergePackingItemsBatch(prev.items || [], additions) }
      : prev));
  };

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
      <header className={PACKING_FIXED_HEADER}>
        <div className={SCREEN_TOP_INNER}>{content}</div>
      </header>
      <div aria-hidden className={PACKING_HEADER_SPACER} />
    </>
  );

  const renderHeaderTitleRow = () => (
    <div className="flex min-h-10 items-center gap-2">
      {renderBackButton()}

      <div className="flex min-w-0 flex-1 items-center gap-2">
        {list ? (
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            disabled={settingsSaving || exiting}
            className="flex min-w-0 max-w-[46%] shrink-0 touch-manipulation items-center gap-0.5 rounded-lg py-1 pr-1 transition hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50 sm:max-w-[52%]"
            aria-label="Настройки списка"
          >
            <span className="truncate text-lg font-bold leading-none tracking-tight text-slate-900">
              {list.title || 'Список сборов'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
          </button>
        ) : (
          <h1 className="min-w-0 max-w-[46%] shrink-0 truncate text-lg font-bold leading-none tracking-tight text-slate-900 sm:max-w-[52%]">
            Список сборов
          </h1>
        )}

        {list && (
          <ListHeaderProgress
            inline
            tone="packing"
            items={headerProgressItems}
            ariaLabel={`Собрано ${headerProgress.checked} из ${headerProgress.total}`}
            onClear={
              !isArchivedList && !list.isTemplate && canEditSettings
                ? handleClearList
                : null
            }
            clearing={clearing}
            clearMessage="Вы уверены? Все пункты будут удалены."
          />
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-1.5">
        {list && (
          <ListHeaderOwnerAvatar
            list={list}
            currentFamily={currentFamily}
            viewerFamilyId={familyId}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={`flex min-h-full flex-col ${APP_BACKGROUND} ${PAGE_X} pb-28 pt-0`}>
      {renderFixedHeader(renderHeaderTitleRow())}

      {loading || profileLoading ? (
        <div className="mt-10 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : error ? (
        <div className="mt-8 text-center">
          <p className={`${HINT_TEXT} text-red-500`}>{error}</p>
          <button type="button" onClick={handleBack} className={`mt-4 ${PRIMARY_BTN}`}>
            На главную
          </button>
        </div>
      ) : (
        <>
          {list?.isTemplate && (
            <p className="mt-3 rounded-2xl bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
              Это шаблон. Изменения сохраняются в шаблоне; для поездки создайте список из шаблона на главной.
            </p>
          )}

          <div
            className="mt-4 flex gap-1 rounded-2xl bg-slate-100/80 p-1"
            role="tablist"
            aria-label="Разделы списка сборов"
          >
            {TABS.map((entry) => {
              const active = tab === entry.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(entry.id)}
                  className={`flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                    active
                      ? `text-white shadow-sm ${packingAccent.solid}`
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="mr-1" aria-hidden>{entry.emoji}</span>
                  {entry.label}
                </button>
              );
            })}
          </div>

          {tab === TAB_PERSONAL && backpackProgress.total > 0 && (
            <div className={`mt-4 px-4 py-3 ${CARD_SURFACE}`}>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-slate-700">
                  {backpackProgress.percent >= 100
                    ? 'Рюкзак собран! К поездке готов 🚀'
                    : `Собрано: ${backpackProgress.checked} из ${backpackProgress.total} вещей`}
                </p>
                <span className="shrink-0 text-xs font-semibold text-slate-400">
                  {backpackProgress.percent}%
                </span>
              </div>
              <div
                className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={backpackProgress.percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Прогресс рюкзака"
              >
                <div
                  className={`h-full rounded-full transition-all duration-300 ease-out ${packingAccent.solid}`}
                  style={{ width: `${backpackProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          <section className={`mt-4 overflow-hidden ${CARD_SURFACE}`}>
            {visibleItems.length === 0 ? (
              <p className={`px-4 py-6 ${HINT_TEXT}`}>
                {isArchivedList
                  ? 'В списке нет пунктов'
                  : tab === TAB_PERSONAL
                    ? 'Ваш личный рюкзак пока пуст — эти пункты видите только вы'
                    : 'Общих пунктов пока нет — добавьте вещи или дела ниже'}
              </p>
            ) : (
              <div>
                {visibleActivityGroups.map((group, index) => (
                  <PackingCategoryGroup
                    key={group.activity || '__main'}
                    activity={group.activity}
                    activityIcon={group.activityIcon}
                    items={group.items}
                    groupByCategory={Boolean(list?.groupByCategory)}
                    defaultOpen
                    isFirst={index === 0}
                    mode={tab === TAB_PERSONAL ? 'personal' : 'common'}
                    currentUserId={user?.uid}
                    currentUserName={displayName}
                    currentUserPhotoUrl={userPhotoUrl}
                    membersById={membersById}
                    members={familyMembers}
                    busyItemId={busyItemId}
                    cloudSync={canCloudSyncChecks}
                    persistedItemIds={persistedItemIds}
                    onToggle={handleToggle}
                    onAssign={handleAssign}
                    onOpenDetails={(entry) => setDetailsItem(entry)}
                    onRemove={handleRemoveItem}
                    onSyncStateChange={handleItemSyncStateChange}
                    onRenameActivity={handleRenameActivity}
                  />
                ))}
              </div>
            )}
          </section>

          <form onSubmit={handleAddItem} className={`mt-4 ${CARD_SURFACE} p-3`}>
            <p className="px-1 text-xs font-medium text-slate-500">
              Добавить в {tab === TAB_PERSONAL ? 'мой рюкзак' : 'общие'}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDraftType(PACKING_ITEM_TYPE.ITEM)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  draftType === PACKING_ITEM_TYPE.ITEM
                    ? `border-transparent text-white ${itemTypeAccent.solid}`
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <Briefcase
                  className={`h-3 w-3 ${
                    draftType === PACKING_ITEM_TYPE.ITEM ? '' : itemTypeAccent.icon
                  }`}
                  aria-hidden
                />
                Вещь
              </button>
              <button
                type="button"
                onClick={() => setDraftType(PACKING_ITEM_TYPE.TODO)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  draftType === PACKING_ITEM_TYPE.TODO
                    ? `border-transparent text-white ${todoTypeAccent.solid}`
                    : 'border-slate-200 bg-white text-slate-500'
                }`}
              >
                <ClipboardList
                  className={`h-3 w-3 ${
                    draftType === PACKING_ITEM_TYPE.TODO ? '' : todoTypeAccent.icon
                  }`}
                  aria-hidden
                />
                Дело
              </button>
              {draftCategory ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {draftCategoryIcon ? `${draftCategoryIcon} ` : ''}{draftCategory}
                </span>
              ) : null}
            </div>
            <div className="relative mt-2 flex gap-2">
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => handleDraftNameChange(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => {
                    // Даём клику по подсказке сработать до скрытия
                    window.setTimeout(() => setShowSuggestions(false), 120);
                  }}
                  placeholder={draftType === PACKING_ITEM_TYPE.TODO ? 'Например: купить билеты' : 'Например: паспорт'}
                  autoComplete="off"
                  className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:bg-white ${
                    draftType === PACKING_ITEM_TYPE.TODO
                      ? 'focus:border-teal-300'
                      : 'focus:border-indigo-300'
                  }`}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/[0.04]">
                    {suggestions.map((suggestion) => (
                      <li key={suggestion.name}>
                        <button
                          type="button"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => selectDraftSuggestion(suggestion)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
                        >
                          <span className="min-w-0 truncate">{suggestion.name}</span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {suggestion.type === PACKING_ITEM_TYPE.TODO ? 'Дело' : 'Вещь'}
                            {suggestion.category
                              ? ` · ${suggestion.categoryIcon || ''} ${suggestion.category}`.replace(/\s+/g, ' ').trim()
                              : ''}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button
                type="submit"
                disabled={adding || !draftName.trim()}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  draftName.trim()
                    ? `${draftTypeAccent.solid} ${draftTypeAccent.solidHover} ${draftTypeAccent.shadow}`
                    : draftTypeAccent.soft
                }`}
                aria-label="Добавить"
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </form>

          <div className="mt-4">
            <AiInput
              listId={null}
              isDraft
              mode={AI_PARSE_MODE.PACKING}
              listItems={list?.items || []}
              userId={user?.uid}
              footerReservePx={88}
              placeholder={packingAiPlaceholder}
              onDraftAdd={handleAiDraftAdd}
              disabled={adding || exiting}
            />
          </div>

          {showAccessControls && (
            <div className="mt-4">
              <CreateListAccess
                members={familyMembers}
                authorId={user.uid}
                currentUserAvatarUrl={userPhotoUrl}
                isPublic={accessIsPublic}
                selectedIds={accessSelectedIds}
                onTogglePublic={handleTogglePublic}
                onToggleMember={handleToggleMember}
                disabled={exiting}
              />
            </div>
          )}
        </>
      )}

      {!loading && !profileLoading && !error && list && (
        <footer
          className="fixed bottom-0 left-1/2 z-30 w-full max-w-lg -translate-x-1/2 border-t border-gray-200/60 bg-[#f5f5f7]/95 px-4 pt-4 backdrop-blur-md"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
        >
          {isArchivedList ? (
            <button
              type="button"
              onClick={() => setRepeatOpen(true)}
              disabled={repeatBusy}
              className={PACKING_ACCENT.primaryBtn}
            >
              Повторить список
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFooterExit}
              disabled={exiting || isCloudSyncing}
              className={footerClassName}
            >
              {exiting ? (
                <span>
                  {isDirty && !isNewEmptyList
                    ? 'Сохранение...'
                    : footerLabel}
                </span>
              ) : (
                <>
                  {showNeutralExitIcon && (
                    <ArrowLeft className="h-4 w-4 shrink-0 opacity-80" strokeWidth={2.25} aria-hidden />
                  )}
                  <span className={showNeutralExitIcon ? 'leading-tight' : undefined}>
                    {footerLabel}
                  </span>
                </>
              )}
            </button>
          )}
        </footer>
      )}

      <RepeatPackingListModal
        list={list}
        open={repeatOpen}
        loading={repeatBusy}
        onClose={() => !repeatBusy && setRepeatOpen(false)}
        onConfirm={handleRepeatConfirm}
      />

      <PackingListSettingsModal
        open={settingsOpen}
        onClose={() => !settingsSaving && !settingsArchiving && setSettingsOpen(false)}
        onSave={handleSaveSettings}
        onArchive={handleArchiveList}
        list={list}
        listId={list?.id}
        currentUserId={user?.uid}
        ownerFamilyName={currentFamily?.name || ''}
        ownerFamilyAvatarUrl={currentFamily?.avatarUrl || null}
        onExternalShareChanged={loadList}
        saving={settingsSaving}
        archiving={settingsArchiving}
        readOnly={!canEditSettings || isExternalGuest}
      />

      <PackingItemDetailsModal
        open={Boolean(detailsItem)}
        item={detailsItem}
        members={familyMembers}
        currentUserId={user?.uid}
        activityOptions={activityOptions}
        tripStartDate={list?.tripStartDate || list?.travelDate || null}
        canAssign={tab === TAB_COMMON}
        canCopyToPersonal={tab === TAB_COMMON && !isArchivedList}
        canMoveToCommon={tab === TAB_PERSONAL && !isArchivedList}
        onCopyToPersonal={handleCopyToPersonal}
        onMoveToCommon={handleMoveToCommon}
        onClose={() => setDetailsItem(null)}
        onSave={handleSaveItemDetails}
        readOnly={isArchivedList}
      />
    </div>
  );
}
