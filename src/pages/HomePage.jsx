import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  getHomePageLists,
  getItemsProgressByListIds,
  updateList,
} from '../services/listsService';
import { getFamilyMembers, setOnboardingCompleted, markAnnouncementsAsRead } from '../services/usersService';
import {
  getActiveAnnouncements,
  getUnreadAnnouncements,
} from '../services/announcementsService';
import CreateListFab from '../components/home/CreateListFab';
import CreateListSheet from '../components/home/CreateListSheet';
import RequestCustomTypeModal from '../components/home/RequestCustomTypeModal';
import HomeDesktopPager from '../components/home/HomeDesktopPager';
import TravelListsDesktop from '../components/home/TravelListsDesktop';
import CreatePackingListSheet from '../components/packing/CreatePackingListSheet';
import AppHeader from '../components/layout/AppHeader';
import ScreenTopPanel from '../components/layout/ScreenTopPanel';
import ListFilterSegmentedControl from '../components/home/ListFilterSegmentedControl';
import ListFilterEmptyState from '../components/home/ListFilterEmptyState';
import ListCard from '../components/home/ListCard';
import CompletedListsSection from '../components/home/CompletedListsSection';
import OnboardingModal from '../components/onboarding/OnboardingModal';
import FeatureAnnouncementModal from '../components/announcements/FeatureAnnouncementModal';
import { useToast } from '../components/ui/ToastProvider';
import { HINT_TEXT } from '../components/list/cardStyles';
import { resolveListStatus } from '../utils/listStatus';
import { sortActiveListsBySchedule } from '../utils/listSchedule';
import {
  syncRemindersForLists,
  syncStoredRemindersWithServiceWorker,
  pruneExpiredStoredReminders,
} from '../services/scheduledNotifications';
import { isListOwner, isListSharedWithUser } from '../utils/listPermissions';
import { isCrossFamilySharedList, isExternalGuestList, isListOwnerFamily } from '../utils/listShare';
import { getListFamilyId } from '../utils/familyGroup';
import { getFamily } from '../services/familiesService';
import { syncGuestFamilySnapshotOnLists } from '../services/listShareService';
import { syncGuestFamilySnapshotOnPackingLists } from '../services/packingListShareService';
import { clearRepeatDraft } from '../utils/repeatDraftStorage';
import {
  clearOnboardingSkippedThisSession,
  isOnboardingCompleted,
  isOnboardingSkippedThisSession,
  markOnboardingSkippedThisSession,
} from '../utils/onboardingContent';
import { formatDateParam } from '../utils/listSchedule';
import { filterHomeLists, HOME_LIST_FILTER } from '../utils/homeListFilter';
import { HOME_DESKTOP, homeDesktopToIndex } from '../utils/homeDesktops';
import { resolveUiTheme } from '../utils/uiThemes';
import {
  createPackingList,
  getTravelDesktopPackingLists,
  isPackingListArchived,
} from '../services/packingListsService';

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const { isSuperAdmin, isFamilyAdmin, loading: profileLoading, familyId, profile, reload } = useUserProfile(user);
  const toast = useToast();
  const [lists, setLists] = useState([]);
  const [authorsById, setAuthorsById] = useState({});
  const [familiesById, setFamiliesById] = useState({});
  const [listProgress, setListProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [requestCustomOpen, setRequestCustomOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [unreadAnnouncements, setUnreadAnnouncements] = useState([]);
  const [listFilter, setListFilter] = useState(HOME_LIST_FILTER.ALL);
  const [desktopIndex, setDesktopIndex] = useState(() =>
    homeDesktopToIndex(settings.defaultHomeDesktop),
  );
  const [createPackingOpen, setCreatePackingOpen] = useState(false);
  const [packingBusy, setPackingBusy] = useState(false);
  const [packingTemplates, setPackingTemplates] = useState([]);
  const [packingRefreshKey, setPackingRefreshKey] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  const uiTheme = resolveUiTheme(profile, user?.uid);
  const initialDesktopIndex = useMemo(() => {
    if (location.state?.homeDesktop) {
      return homeDesktopToIndex(location.state.homeDesktop);
    }
    return homeDesktopToIndex(settings.defaultHomeDesktop);
  }, [settings.defaultHomeDesktop, location.state?.homeDesktop]);

  const loadLists = useCallback(async () => {
    if (!user?.uid || !familyId) return;

    setLoading(true);
    setLoadError('');
    try {
      const familyLists = await getHomePageLists(user.uid, familyId, { isFamilyAdmin });
      const active = familyLists.filter((list) => {
        if (list.sharedWithFamilyIds?.includes(familyId)) return true;
        if (getListFamilyId(list) === familyId) return true;
        if (list.isPublic) return true;
        if (list.createdBy === user.uid) return true;
        return list.allowedUsers?.includes(user.uid);
      });

      setLists(active);

      pruneExpiredStoredReminders();
      syncStoredRemindersWithServiceWorker().catch(() => {});
      syncRemindersForLists(active, user.uid).catch(() => {});

      try {
        const progress = await getItemsProgressByListIds(active.map((l) => l.id));
        setListProgress(progress);

        for (const list of active) {
          const resolved = resolveListStatus(list, progress[list.id]);
          if (list.status !== resolved && resolved !== 'archived') {
            updateList(list.id, { status: resolved }).catch(() => {});
            list.status = resolved;
          }
        }
      } catch (err) {
        setListProgress(
          Object.fromEntries(
            active.map((list) => [list.id, { total: 0, checked: 0, percent: 0 }]),
          ),
        );
        setLoadError(err?.message || 'Не удалось загрузить прогресс списков');
      }

      try {
        const members = await getFamilyMembers(familyId);
        setAuthorsById(Object.fromEntries(members.map((member) => [member.id, member])));

        const familyIds = new Set([familyId]);
        for (const list of active) {
          familyIds.add(getListFamilyId(list));
          (list.sharedWithFamilyIds || []).forEach((id) => familyIds.add(id));
        }

        const familiesEntries = await Promise.all(
          [...familyIds].map(async (id) => {
            try {
              const family = await getFamily(id);
              return family ? [id, family] : null;
            } catch {
              return null;
            }
          }),
        );
        const familiesMap = Object.fromEntries(familiesEntries.filter(Boolean));

        for (const list of active) {
          if (getListFamilyId(list) !== familyId || list.ownerFamilyName) continue;
          const ownFamily = familiesMap[familyId];
          if (!ownFamily?.name) continue;

          const patch = {
            ownerFamilyName: ownFamily.name,
            ownerFamilyAvatarUrl: ownFamily.avatarUrl || null,
          };
          updateList(list.id, patch).catch(() => {});
          Object.assign(list, patch);
        }

        const ownFamily = familiesMap[familyId];
        if (ownFamily) {
          syncGuestFamilySnapshotOnLists(familyId, {
            familyName: ownFamily.name,
            familyAvatarUrl: ownFamily.avatarUrl || null,
          }).catch(() => {});
          syncGuestFamilySnapshotOnPackingLists(familyId, {
            familyName: ownFamily.name,
            familyAvatarUrl: ownFamily.avatarUrl || null,
          }).catch(() => {});
        }

        setFamiliesById(familiesMap);
      } catch {
        setAuthorsById({});
        setFamiliesById({});
      }
    } catch (err) {
      setLoadError(err?.message || 'Не удалось загрузить списки');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, familyId, isFamilyAdmin]);

  useEffect(() => {
    if (!user?.uid || profileLoading) return;
    loadLists();
  }, [loadLists, location.key, user?.uid, profileLoading]);

  useEffect(() => {
    if (profileLoading || !profile || !user?.uid) return;
    if (!isOnboardingCompleted(profile) && !isOnboardingSkippedThisSession(user.uid)) {
      setOnboardingOpen(true);
    }
  }, [profile, profileLoading, location.key, user?.uid]);

  useEffect(() => () => {
    setOnboardingOpen(false);
    setAnnouncementsOpen(false);
  }, []);

  useEffect(() => {
    if (profileLoading || !profile || !user?.uid) return;
    if (!isOnboardingCompleted(profile) || onboardingOpen) return;

    let cancelled = false;

    (async () => {
      try {
        const activeAnnouncements = await getActiveAnnouncements();
        const unread = getUnreadAnnouncements(activeAnnouncements, profile);
        if (cancelled) return;
        setUnreadAnnouncements(unread);
        setAnnouncementsOpen(unread.length > 0);
      } catch {
        if (!cancelled) {
          setUnreadAnnouncements([]);
          setAnnouncementsOpen(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, profileLoading, location.key, user?.uid, onboardingOpen]);

  const handleOnboardingPermanentDismiss = async () => {
    if (!user?.uid) return;
    try {
      await setOnboardingCompleted(user.uid, true);
      clearOnboardingSkippedThisSession(user.uid);
      reload();
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить настройку');
      throw err;
    }
  };

  const handleOnboardingSessionDismiss = async () => {
    if (!user?.uid) return;
    try {
      await setOnboardingCompleted(user.uid, false);
      markOnboardingSkippedThisSession(user.uid);
      reload();
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить настройку');
      throw err;
    }
  };

  const handleOnboardingClose = () => {
    if (user?.uid && !isOnboardingCompleted(profile)) {
      markOnboardingSkippedThisSession(user.uid);
    }
    setOnboardingOpen(false);
  };

  const handleAnnouncementsComplete = async (announcementIds) => {
    if (user?.uid && announcementIds?.length) {
      try {
        await markAnnouncementsAsRead(user.uid, announcementIds);
        reload();
      } catch (err) {
        toast.error(err?.message || 'Не удалось сохранить прогресс');
      }
    }
    setAnnouncementsOpen(false);
  };

  const handleOpenCreateSheet = () => {
    setCreateSheetOpen(true);
  };

  const handleOpenCreatePacking = async () => {
    setCreatePackingOpen(true);
    if (!familyId || !user?.uid) return;
    try {
      const all = await getTravelDesktopPackingLists(user.uid, familyId, {
        isFamilyAdmin: isFamilyAdmin || isSuperAdmin,
      });
      setPackingTemplates(all.filter((list) => list.isTemplate && !isPackingListArchived(list)));
    } catch {
      setPackingTemplates([]);
    }
  };

  const handleCreatePackingConfirm = async ({ title, templateId, travelDate }) => {
    if (!user?.uid || !familyId || packingBusy) return;
    setPackingBusy(true);
    try {
      let familyMemberIds = [];
      try {
        const familyMembers = await getFamilyMembers(familyId);
        familyMemberIds = familyMembers.map((member) => member.id);
      } catch {
        familyMemberIds = [user.uid];
      }

      const id = await createPackingList({
        title,
        familyId,
        createdBy: user.uid,
        isTemplate: false,
        templateId,
        isPublic: true,
        familyMemberIds,
        travelDate,
      });
      setCreatePackingOpen(false);
      setPackingRefreshKey((key) => key + 1);
      navigate(`/packing/${id}`, { state: { fromTravelDesktop: true } });
    } catch (err) {
      toast.error(err?.message || 'Не удалось создать список сборов');
    } finally {
      setPackingBusy(false);
    }
  };

  const handleCreateListConfirm = ({ type, scheduledFor, description = '' }) => {
    clearRepeatDraft();
    setCreateSheetOpen(false);

    const params = new URLSearchParams();
    params.set('type', type);
    if (scheduledFor) {
      params.set('date', formatDateParam(scheduledFor));
    }
    navigate(`/list/new?${params.toString()}`, {
      state: description.trim() ? { description: description.trim() } : undefined,
    });
  };

  const activeLists = sortActiveListsBySchedule(
    lists.filter(
      (list) => resolveListStatus(list, listProgress[list.id]) === 'active',
    ),
  );
  const myActiveLists = activeLists.filter((list) => {
    if (isListOwnerFamily(list, familyId)) return true;
    if (isCrossFamilySharedList(list)) return false;
    return isListOwner(list, user?.uid);
  });
  const sharedActiveLists = activeLists.filter((list) => {
    if (isListOwnerFamily(list, familyId)) return false;
    if (isCrossFamilySharedList(list) && isExternalGuestList(list, familyId)) return true;
    if (isListOwner(list, user?.uid)) return false;
    if (isListSharedWithUser(list, user?.uid)) return true;
    return isSuperAdmin;
  });
  const completedLists = lists.filter(
    (list) => resolveListStatus(list, listProgress[list.id]) === 'completed',
  );

  const filteredMyActiveLists = filterHomeLists(myActiveLists, listFilter, familyId);
  const filteredSharedActiveLists = filterHomeLists(sharedActiveLists, listFilter, familyId);
  const filteredCompletedLists = filterHomeLists(completedLists, listFilter, familyId);
  const hasFilteredActiveLists = filteredMyActiveLists.length > 0 || filteredSharedActiveLists.length > 0;
  const showListFilter = !loading && !profileLoading && lists.length > 0;

  const renderDesktopTitle = () => (
    <div className="flex items-center justify-between gap-2 pl-1">
      <h2 id="shopping-desktop-title" className="text-sm font-semibold text-slate-800">
        Списки покупок и запасов
      </h2>
      {showListFilter && (
        <ListFilterSegmentedControl value={listFilter} onChange={setListFilter} />
      )}
    </div>
  );

  const renderActiveSectionHeader = (title, { className = 'mb-2' } = {}) => (
    <h3 className={`pl-1 text-xs font-medium text-slate-500 ${className}`}>{title}</h3>
  );

  const renderActiveListGroup = (groupLists, subtitle, { isFirst = false } = {}) => {
    if (groupLists.length === 0) return null;

    return (
      <div className={isFirst ? 'mt-4' : 'mt-5'}>
        {renderActiveSectionHeader(subtitle)}
        <ul className="space-y-2.5">
          {groupLists.map((list) => (
            <li key={list.id}>{renderListCard(list)}</li>
          ))}
        </ul>
      </div>
    );
  };

  const renderListCard = (list, { dimmed = false, showCompletionDate = false } = {}) => {
    const listWithAuthor = {
      ...list,
      author: authorsById[list.createdBy],
    };

    return (
      <ListCard
        list={listWithAuthor}
        progress={listProgress[list.id]}
        authorsById={authorsById}
        familiesById={familiesById}
        viewerFamilyId={familyId}
        currentUserId={user?.uid}
        dimmed={dimmed}
        showCompletionDate={showCompletionDate}
      />
    );
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-24 pt-0">
      <ScreenTopPanel>
        <AppHeader variant="embedded" />
      </ScreenTopPanel>

      <HomeDesktopPager
        initialIndex={initialDesktopIndex}
        onIndexChange={setDesktopIndex}
      >
        <section className="mt-2 min-h-full" aria-labelledby="shopping-desktop-title">
          {renderDesktopTitle()}

          {loadError && (
            <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{loadError}</p>
          )}

          {loading || profileLoading ? (
            <div className="mt-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : lists.length === 0 && !loadError ? (
            <p className={`mt-4 pl-1 ${HINT_TEXT}`}>
              Пока нет списков — создайте первый
            </p>
          ) : lists.length > 0 ? (
            <>
              {hasFilteredActiveLists ? (
                <>
                  {renderActiveListGroup(filteredMyActiveLists, 'Мои актуальные', {
                    isFirst: true,
                  })}
                  {renderActiveListGroup(filteredSharedActiveLists, 'Доступные актуальные', {
                    isFirst: filteredMyActiveLists.length === 0,
                  })}
                </>
              ) : filteredCompletedLists.length === 0 ? (
                <div className="mt-4">
                  {renderActiveSectionHeader('Мои актуальные', { className: 'mb-3' })}
                  <ListFilterEmptyState
                    filterLabel={listFilter !== HOME_LIST_FILTER.ALL ? 'Все' : null}
                  />
                </div>
              ) : null}

              {filteredCompletedLists.length > 0 && (
                <CompletedListsSection
                  key={location.key}
                  lists={filteredCompletedLists}
                  groupByDate={settings.groupByDate}
                  renderListCard={(list) => renderListCard(list, { dimmed: true, showCompletionDate: true })}
                />
              )}
            </>
          ) : null}
        </section>

        <TravelListsDesktop
          familyId={familyId}
          currentUserId={user?.uid}
          isFamilyAdmin={isFamilyAdmin}
          authorsById={authorsById}
          familiesById={familiesById}
          uiTheme={uiTheme}
          refreshKey={packingRefreshKey}
        />
      </HomeDesktopPager>

      {desktopIndex === 0 && (
        <CreateListFab onClick={handleOpenCreateSheet} disabled={loading || profileLoading} />
      )}
      {desktopIndex === 1 && (
        <CreateListFab
          onClick={handleOpenCreatePacking}
          disabled={profileLoading || !familyId}
          label="Создать список сборов"
          tone="packing"
        />
      )}

      <CreateListSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onConfirm={handleCreateListConfirm}
        canCreateCustom={isSuperAdmin}
        onRequestCustom={() => {
          setCreateSheetOpen(false);
          setRequestCustomOpen(true);
        }}
      />

      <CreatePackingListSheet
        open={createPackingOpen}
        onClose={() => !packingBusy && setCreatePackingOpen(false)}
        onConfirm={handleCreatePackingConfirm}
        templates={packingTemplates}
        accentClassName="bg-indigo-600"
        busy={packingBusy}
      />

      <RequestCustomTypeModal
        open={requestCustomOpen}
        onClose={() => setRequestCustomOpen(false)}
      />

      <OnboardingModal
        open={onboardingOpen}
        onClose={handleOnboardingClose}
        onComplete={handleOnboardingPermanentDismiss}
        onSessionDismiss={handleOnboardingSessionDismiss}
        mode="home"
      />

      <FeatureAnnouncementModal
        open={announcementsOpen}
        announcements={unreadAnnouncements}
        onClose={() => setAnnouncementsOpen(false)}
        onComplete={handleAnnouncementsComplete}
      />
    </div>
  );
}
