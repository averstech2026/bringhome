import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  getUserLists,
  getAllLists,
  getItemsProgressByListIds,
  archiveList,
  updateList,
} from '../services/listsService';
import { getFamilyMembers } from '../services/usersService';
import QuickCreateButtons from '../components/home/QuickCreateButtons';
import AppHeader from '../components/layout/AppHeader';
import ScreenTopPanel from '../components/layout/ScreenTopPanel';
import ListCard from '../components/home/ListCard';
import CompletedListsSection from '../components/home/CompletedListsSection';
import ArchiveListConfirmModal from '../components/home/ArchiveListConfirmModal';
import RequestCustomTypeModal from '../components/home/RequestCustomTypeModal';
import ThemeToast from '../components/ui/ThemeToast';
import { HINT_TEXT, PAGE_SECTION_TITLE } from '../components/list/cardStyles';
import { resolveListStatus } from '../utils/listStatus';
import { canArchiveList } from '../utils/listPermissions';
import { clearRepeatDraft } from '../utils/repeatDraftStorage';
import { encodeListTypeForUrl } from '../utils/listTypes';
import { getAiInputTheme, resolveUiTheme } from '../utils/uiThemes';

const ARCHIVE_DENIED_TOAST =
  'Чтобы поместить список в архив, обратитесь к владельцу списка.';

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const { isAdmin, profile, loading: profileLoading } = useUserProfile(user);
  const [lists, setLists] = useState([]);
  const [authorsById, setAuthorsById] = useState({});
  const [listProgress, setListProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [requestCustomOpen, setRequestCustomOpen] = useState(false);
  const [archiveConfirmTarget, setArchiveConfirmTarget] = useState(null);
  const [archiveDeniedToast, setArchiveDeniedToast] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const archiveConfirmClassName = useMemo(
    () => getAiInputTheme(resolveUiTheme(profile)).buttonClass,
    [profile],
  );

  const canManageList = useCallback(
    (list) => canArchiveList(list, user?.uid, isAdmin),
    [isAdmin, user?.uid],
  );

  const loadLists = useCallback(async () => {
    if (!user?.uid) return;

    setLoading(true);
    setLoadError('');
    try {
      const active = isAdmin
        ? await getAllLists()
        : await getUserLists(user.uid);

      setLists(active);

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
        const members = await getFamilyMembers();
        setAuthorsById(Object.fromEntries(members.map((member) => [member.id, member])));
      } catch {
        setAuthorsById({});
      }
    } catch (err) {
      setLoadError(err?.message || 'Не удалось загрузить списки');
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    if (!user?.uid || profileLoading) return;
    loadLists();
  }, [loadLists, location.key, user?.uid, profileLoading]);

  const handleCreate = (type) => {
    clearRepeatDraft();
    navigate(`/list/new?type=${encodeListTypeForUrl(type)}`);
  };

  const handleCreateCustom = (name) => {
    clearRepeatDraft();
    navigate(`/list/new?type=${encodeListTypeForUrl(name)}`);
  };

  const handleArchiveRequest = (list) => {
    if (!user?.uid || !list) return;

    if (!canArchiveList(list, user.uid, isAdmin)) {
      setArchiveDeniedToast(ARCHIVE_DENIED_TOAST);
      return;
    }

    setArchiveConfirmTarget(list);
  };

  const handleConfirmArchive = async () => {
    const list = archiveConfirmTarget;
    if (!list?.id || !user?.uid || busyId) return;

    if (!canArchiveList(list, user.uid, isAdmin)) {
      setArchiveConfirmTarget(null);
      setArchiveDeniedToast(ARCHIVE_DENIED_TOAST);
      return;
    }

    const listId = list.id;
    setBusyId(listId);
    setLists((prev) => prev.filter((item) => item.id !== listId));
    setListProgress((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });

    try {
      await archiveList(listId, user.uid);
      setArchiveConfirmTarget(null);
    } catch (err) {
      window.alert(err?.message || 'Не удалось отправить список в архив');
      await loadLists();
    } finally {
      setBusyId(null);
    }
  };

  const activeLists = lists.filter(
    (list) => resolveListStatus(list, listProgress[list.id]) === 'active',
  );
  const completedLists = lists.filter(
    (list) => resolveListStatus(list, listProgress[list.id]) === 'completed',
  );

  const renderListCard = (list, { dimmed = false, showCompletionDate = false } = {}) => {
    const manageable = canManageList(list);
    const listWithAuthor = {
      ...list,
      author: authorsById[list.createdBy],
    };

    return (
      <ListCard
        list={listWithAuthor}
        progress={listProgress[list.id]}
        authorsById={authorsById}
        busy={busyId === list.id}
        dimmed={dimmed}
        showCompletionDate={showCompletionDate}
        canArchive={manageable}
        onArchive={handleArchiveRequest}
        onArchiveDenied={handleArchiveRequest}
      />
    );
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <ScreenTopPanel>
        <AppHeader variant="embedded" />
      </ScreenTopPanel>

      <QuickCreateButtons
        variant="toolbar"
        onCreate={handleCreate}
        onCreateCustom={handleCreateCustom}
        canCreateCustom={isAdmin}
        onRequestCustom={() => setRequestCustomOpen(true)}
      />

      <section className="mt-6">
        <h2 className={PAGE_SECTION_TITLE}>Актуальные</h2>

        {loadError && (
          <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{loadError}</p>
        )}

        {loading || profileLoading ? (
          <div className="mt-6 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : lists.length === 0 && !loadError ? (
          <p className={`mt-4 ${HINT_TEXT}`}>
            Пока нет списков — создайте первый
          </p>
        ) : lists.length > 0 ? (
          <>
            {activeLists.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {activeLists.map((list) => (
                  <li key={list.id}>{renderListCard(list)}</li>
                ))}
              </ul>
            )}

            {completedLists.length > 0 && (
              <CompletedListsSection
                key={location.key}
                lists={completedLists}
                groupByDate={settings.groupByDate}
                renderListCard={(list) => renderListCard(list, { dimmed: true, showCompletionDate: true })}
              />
            )}
          </>
        ) : null}
      </section>

      <RequestCustomTypeModal
        open={requestCustomOpen}
        onClose={() => setRequestCustomOpen(false)}
      />

      <ArchiveListConfirmModal
        open={Boolean(archiveConfirmTarget)}
        listTitle={archiveConfirmTarget?.title}
        archiving={Boolean(archiveConfirmTarget && busyId === archiveConfirmTarget.id)}
        confirmClassName={archiveConfirmClassName}
        onConfirm={handleConfirmArchive}
        onCancel={() => !busyId && setArchiveConfirmTarget(null)}
      />

      <ThemeToast message={archiveDeniedToast} onClose={() => setArchiveDeniedToast('')} />
    </div>
  );
}
