import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import { useAppSettings } from '../hooks/useAppSettings';
import {
  getFamilyLists,
  getHomePageLists,
  getItemsProgressByListIds,
  deleteList,
  getListItemsForRepeat,
} from '../services/listsService';
import { getFamilyMembers } from '../services/usersService';
import { getFamilyId } from '../utils/familyGroup';
import { resolveListStatus } from '../utils/listStatus';
import { getListSortTimestamp, sortCompletedListsByDate } from '../utils/groupCompletedLists';
import { saveRepeatDraft } from '../utils/repeatDraftStorage';
import { encodeListTypeForUrl } from '../utils/listTypes';
import ListCard from '../components/home/ListCard';
import CompletedListsSection from '../components/home/CompletedListsSection';
import RepeatListModal from '../components/home/RepeatListModal';
import PageHeader from '../components/layout/PageHeader';
import { HINT_TEXT, PAGE_SECTION_TITLE } from '../components/list/cardStyles';
import DeleteListConfirmModal from '../components/home/DeleteListConfirmModal';
import { useToast } from '../components/ui/ToastProvider';

function sortActiveLists(lists) {
  return [...lists].sort((a, b) => getListSortTimestamp(b) - getListSortTimestamp(a));
}


function ListFilterTabs({ value, onChange }) {
  const tabs = [
    { id: 'all', label: 'Все' },
    { id: 'mine', label: 'Мои' },
    { id: 'others', label: 'Чужие' },
  ];

  return (
    <div className="inline-flex h-9 items-center rounded-full bg-slate-100/80 p-1">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex h-full items-center justify-center rounded-full px-3 text-sm transition-colors ${
              active
                ? 'bg-white font-semibold text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

export default function AdminGroupListsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { profile, familyId, isFamilyAdmin, isSuperAdmin } = useUserProfile(user);
  const { settings } = useAppSettings();
  const navigate = useNavigate();

  const [lists, setLists] = useState([]);
  const [authorsById, setAuthorsById] = useState({});
  const [listProgress, setListProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [repeatTarget, setRepeatTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const resolvedFamilyId = familyId || getFamilyId(profile);

  useEffect(() => {
    setFilter('all');
  }, [resolvedFamilyId]);

  const loadData = async () => {
    if (!user?.uid || !resolvedFamilyId) return;

    setLoading(true);
    setError('');

    try {
      const members = await getFamilyMembers(resolvedFamilyId);
      setAuthorsById(Object.fromEntries(members.map((member) => [member.id, member])));

      const loadedLists = isFamilyAdmin || isSuperAdmin
        ? await getFamilyLists(resolvedFamilyId, { includeArchived: true })
        : await getHomePageLists(user.uid, resolvedFamilyId, { includeArchived: true });

      setLists(loadedLists);

      try {
        const progress = await getItemsProgressByListIds(loadedLists.map((list) => list.id));
        setListProgress(progress);
      } catch {
        setListProgress(
          Object.fromEntries(
            loadedLists.map((list) => [list.id, { total: 0, checked: 0, percent: 0 }]),
          ),
        );
      }
    } catch (err) {
      setLists([]);
      setAuthorsById({});
      setListProgress({});
      setError(err?.message || 'Не удалось загрузить списки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile || !user?.uid) return;
    loadData();
  }, [profile, resolvedFamilyId, user?.uid]);

  const filteredLists = useMemo(() => {
    if (filter === 'mine') {
      return lists.filter((list) => list.createdBy === user?.uid);
    }
    if (filter === 'others') {
      return lists.filter((list) => list.createdBy !== user?.uid);
    }
    return lists;
  }, [lists, filter, user?.uid]);

  const activeLists = useMemo(
    () =>
      sortActiveLists(
        filteredLists.filter(
          (list) => resolveListStatus(list, listProgress[list.id]) === 'active',
        ),
      ),
    [filteredLists, listProgress],
  );

  const readyLists = useMemo(
    () =>
      sortCompletedListsByDate(
        filteredLists.filter((list) => {
          const status = resolveListStatus(list, listProgress[list.id]);
          return status === 'completed' || status === 'archived';
        }),
      ),
    [filteredLists, listProgress],
  );

  const handleDeleteRequest = (listId, title) => {
    setDeleteTarget({ listId, title });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || busyId) return;

    const { listId } = deleteTarget;
    setBusyId(listId);
    setLists((prev) => prev.filter((list) => list.id !== listId));

    try {
      await deleteList(listId);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Не удалось удалить список');
      await loadData();
    } finally {
      setBusyId(null);
    }
  };

  const handleRepeatConfirm = async (type) => {
    if (!repeatTarget) return;

    setBusyId(repeatTarget.id);
    try {
      const repeatItems = await getListItemsForRepeat(repeatTarget.id);
      saveRepeatDraft({ repeatItems, repeatFrom: repeatTarget.id, type });
      navigate(`/list/new?type=${encodeListTypeForUrl(type)}`);
      setRepeatTarget(null);
    } catch (err) {
      toast.error(err?.message || 'Не удалось загрузить товары списка');
    } finally {
      setBusyId(null);
    }
  };

  const renderListCard = (list, { dimmed = false, showCompletionDate = false } = {}) => {
    const isArchived = list.archived || list.status === 'archived';
    const isOwner = list.createdBy === user?.uid;

    return (
      <ListCard
        list={list}
        progress={listProgress[list.id]}
        authorsById={authorsById}
        dimmed={dimmed}
        showCompletionDate={showCompletionDate}
        creatorOnly={filter === 'all'}
        busy={busyId === list.id}
        onRepeat={isArchived && isOwner ? () => setRepeatTarget(list) : undefined}
        onDelete={isArchived && isOwner ? handleDeleteRequest : undefined}
      />
    );
  };

  const subtitle =
    filter === 'mine'
      ? 'Ваши списки, включая завершённые и архивные'
      : filter === 'others'
        ? 'Списки других участников семьи'
        : 'Все списки семьи, включая те, куда вас не пригласили напрямую';

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title="Все списки семьи" backTo="/settings" />

      <div className="pt-4">
        <p className="text-sm text-slate-500">{subtitle}</p>

        <div className="mt-4">
          <ListFilterTabs value={filter} onChange={setFilter} />
        </div>

        <section className="mt-6">
          <h2 className={PAGE_SECTION_TITLE}>Актуальные</h2>

          {loading ? (
            <div className="mt-6 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : (
            <>
              {activeLists.length > 0 ? (
                <ul className="mt-4 space-y-2.5">
                  {activeLists.map((list) => (
                    <li key={list.id}>{renderListCard(list)}</li>
                  ))}
                </ul>
              ) : (
                <p className={`mt-4 ${HINT_TEXT}`}>
                  {filter === 'mine'
                    ? 'Нет ваших актуальных списков'
                    : filter === 'others'
                      ? 'Нет чужих актуальных списков'
                      : 'Нет актуальных списков'}
                </p>
              )}

              {readyLists.length > 0 && (
                <div className="mt-8">
                  <CompletedListsSection
                    lists={readyLists}
                    groupByDate={settings.groupByDate && filter === 'all'}
                    renderListCard={(list) =>
                      renderListCard(list, { dimmed: true, showCompletionDate: true })
                    }
                  />
                </div>
              )}

              {filteredLists.length === 0 && (
                <p className={`mt-4 ${HINT_TEXT}`}>Списков пока нет</p>
              )}
            </>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
      </div>

      <RepeatListModal
        list={repeatTarget}
        open={Boolean(repeatTarget)}
        loading={Boolean(repeatTarget && busyId === repeatTarget.id)}
        onClose={() => !busyId && setRepeatTarget(null)}
        onConfirm={handleRepeatConfirm}
      />

      <DeleteListConfirmModal
        open={Boolean(deleteTarget)}
        listTitle={deleteTarget?.title}
        deleting={Boolean(deleteTarget && busyId === deleteTarget.listId)}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !busyId && setDeleteTarget(null)}
      />
    </div>
  );
}
