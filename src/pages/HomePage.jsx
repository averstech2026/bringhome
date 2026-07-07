import { useCallback, useEffect, useState } from 'react';
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
import RequestCustomTypeModal from '../components/home/RequestCustomTypeModal';
import { HINT_TEXT, PAGE_SECTION_TITLE } from '../components/list/cardStyles';
import { resolveListStatus } from '../utils/listStatus';
import { clearRepeatDraft } from '../utils/repeatDraftStorage';
import { encodeListTypeForUrl } from '../utils/listTypes';

export default function HomePage() {
  const { user } = useAuth();
  const { settings } = useAppSettings();
  const { isAdmin } = useUserProfile(user);
  const [lists, setLists] = useState([]);
  const [authorsById, setAuthorsById] = useState({});
  const [listProgress, setListProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [requestCustomOpen, setRequestCustomOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const canManageList = useCallback(
    (list) => isAdmin || list.createdBy === user?.uid,
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
      const progress = await getItemsProgressByListIds(active.map((l) => l.id));
      setListProgress(progress);

      const members = await getFamilyMembers();
      setAuthorsById(Object.fromEntries(members.map((member) => [member.id, member])));

      for (const list of active) {
        const resolved = resolveListStatus(list, progress[list.id]);
        if (list.status !== resolved && resolved !== 'archived') {
          updateList(list.id, { status: resolved }).catch(() => {});
          list.status = resolved;
        }
      }
    } catch (err) {
      setLoadError(err?.message || 'Не удалось загрузить списки');
      setLists([]);
      setListProgress({});
      setAuthorsById({});
    } finally {
      setLoading(false);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    loadLists();
  }, [loadLists, location.key]);

  const handleCreate = (type) => {
    clearRepeatDraft();
    navigate(`/list/new?type=${encodeListTypeForUrl(type)}`);
  };

  const handleCreateCustom = (name) => {
    clearRepeatDraft();
    navigate(`/list/new?type=${encodeListTypeForUrl(name)}`);
  };

  const handleArchive = async (listId, title) => {
    if (!window.confirm(`Отправить «${title}» в архив?`)) return;

    setBusyId(listId);
    setLists((prev) => prev.filter((list) => list.id !== listId));
    setListProgress((prev) => {
      const next = { ...prev };
      delete next[listId];
      return next;
    });

    try {
      await archiveList(listId, user.uid);
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

  const renderListCard = (list, { dimmed = false } = {}) => {
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
        onArchive={manageable ? handleArchive : undefined}
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

        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : lists.length === 0 ? (
          <p className={`mt-4 ${HINT_TEXT}`}>
            Пока нет списков — создайте первый
          </p>
        ) : (
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
                renderListCard={(list) => renderListCard(list, { dimmed: true })}
              />
            )}
          </>
        )}
      </section>

      <RequestCustomTypeModal
        open={requestCustomOpen}
        onClose={() => setRequestCustomOpen(false)}
      />
    </div>
  );
}
