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
import {
  deletePackingList,
  getFamilyPackingLists,
  getTravelDesktopPackingLists,
  isPackingListArchived,
} from '../services/packingListsService';
import { getFamilyMembers } from '../services/usersService';
import { getFamilyId } from '../utils/familyGroup';
import { resolveListStatus } from '../utils/listStatus';
import { getListSortTimestamp, sortCompletedListsByDate } from '../utils/groupCompletedLists';
import { saveRepeatDraft } from '../utils/repeatDraftStorage';
import { encodeListTypeForUrl } from '../utils/listTypes';
import { PACKING_ACCENT, SHOPPING_ACCENT } from '../utils/contextAccents';
import ListCard from '../components/home/ListCard';
import PackingListCard from '../components/packing/PackingListCard';
import CompletedListsSection from '../components/home/CompletedListsSection';
import RepeatListModal from '../components/home/RepeatListModal';
import PageHeader from '../components/layout/PageHeader';
import { HINT_TEXT, PAGE_SECTION_TITLE } from '../components/list/cardStyles';
import DeleteListConfirmModal from '../components/home/DeleteListConfirmModal';
import { useToast } from '../components/ui/ToastProvider';

const LIST_PAGE_SIZE = 10;

function LoadMoreButton({ onClick }) {
  return (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={onClick}
        className="flex h-9 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        Ещё
      </button>
    </div>
  );
}

function sortActiveLists(lists) {
  return [...lists].sort((a, b) => getListSortTimestamp(b) - getListSortTimestamp(a));
}

function sortByCreatedAt(lists) {
  return [...lists].sort((a, b) => {
    const aTime = a.createdAt?.toMillis?.() ?? a.archivedAt?.toMillis?.() ?? 0;
    const bTime = b.createdAt?.toMillis?.() ?? b.archivedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });
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

function ContextSectionHeader({ title, accentDotClass, count = null }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${accentDotClass}`} aria-hidden />
      <h2 className={PAGE_SECTION_TITLE}>
        {title}
        {count != null ? (
          <span className="ml-1.5 font-normal text-slate-400">({count})</span>
        ) : null}
      </h2>
    </div>
  );
}

function SubsectionTitle({ children }) {
  return (
    <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </h3>
  );
}

function ArchiveSectionDivider({ count }) {
  return (
    <div className="mt-8 flex items-center gap-3">
      <div className="h-px min-w-0 flex-1 bg-amber-200/80" />
      <span className="shrink-0 text-xs text-amber-700/80">
        — Архив ({count}) —
      </span>
      <div className="h-px min-w-0 flex-1 bg-amber-200/80" />
    </div>
  );
}

function PaginatedList({
  items,
  visibleCount,
  onLoadMore,
  emptyText,
  renderItem,
  listClassName = 'mt-3 space-y-2.5',
}) {
  if (items.length === 0) {
    return <p className={`mt-3 ${HINT_TEXT}`}>{emptyText}</p>;
  }

  const visible = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  return (
    <>
      <ul className={listClassName}>
        {visible.map((item) => (
          <li key={item.id}>{renderItem(item)}</li>
        ))}
      </ul>
      {hasMore && <LoadMoreButton onClick={onLoadMore} />}
    </>
  );
}

export default function AdminGroupListsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const { profile, familyId, isFamilyAdmin, isSuperAdmin } = useUserProfile(user);
  const { settings } = useAppSettings();
  const navigate = useNavigate();

  const [lists, setLists] = useState([]);
  const [packingLists, setPackingLists] = useState([]);
  const [authorsById, setAuthorsById] = useState({});
  const [listProgress, setListProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [repeatTarget, setRepeatTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [visibleShoppingActive, setVisibleShoppingActive] = useState(LIST_PAGE_SIZE);
  const [visibleShoppingReady, setVisibleShoppingReady] = useState(LIST_PAGE_SIZE);
  const [visibleShoppingArchived, setVisibleShoppingArchived] = useState(LIST_PAGE_SIZE);
  const [visiblePackingTrips, setVisiblePackingTrips] = useState(LIST_PAGE_SIZE);
  const [visiblePackingTemplates, setVisiblePackingTemplates] = useState(LIST_PAGE_SIZE);
  const [visiblePackingArchived, setVisiblePackingArchived] = useState(LIST_PAGE_SIZE);

  const resolvedFamilyId = familyId || getFamilyId(profile);

  const resetVisibility = () => {
    setVisibleShoppingActive(LIST_PAGE_SIZE);
    setVisibleShoppingReady(LIST_PAGE_SIZE);
    setVisibleShoppingArchived(LIST_PAGE_SIZE);
    setVisiblePackingTrips(LIST_PAGE_SIZE);
    setVisiblePackingTemplates(LIST_PAGE_SIZE);
    setVisiblePackingArchived(LIST_PAGE_SIZE);
  };

  useEffect(() => {
    setFilter('all');
    resetVisibility();
  }, [resolvedFamilyId]);

  useEffect(() => {
    resetVisibility();
  }, [filter]);

  const loadData = async () => {
    if (!user?.uid || !resolvedFamilyId) return;

    setLoading(true);
    setError('');

    try {
      const members = await getFamilyMembers(resolvedFamilyId);
      setAuthorsById(Object.fromEntries(members.map((member) => [member.id, member])));

      const [loadedLists, loadedPacking] = await Promise.all([
        isFamilyAdmin || isSuperAdmin
          ? getFamilyLists(resolvedFamilyId, { includeArchived: true })
          : getHomePageLists(user.uid, resolvedFamilyId, {
            isFamilyAdmin,
            includeArchived: true,
          }),
        isFamilyAdmin || isSuperAdmin
          ? getFamilyPackingLists(resolvedFamilyId)
          : getTravelDesktopPackingLists(user.uid, resolvedFamilyId, {
            isFamilyAdmin,
            includeArchived: true,
          }),
      ]);

      setLists(loadedLists);
      setPackingLists(loadedPacking);

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
      setPackingLists([]);
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
  }, [profile, resolvedFamilyId, user?.uid, isFamilyAdmin, isSuperAdmin]);

  const filteredShopping = useMemo(() => {
    if (filter === 'mine') return lists.filter((list) => list.createdBy === user?.uid);
    if (filter === 'others') return lists.filter((list) => list.createdBy !== user?.uid);
    return lists;
  }, [lists, filter, user?.uid]);

  const filteredPacking = useMemo(() => {
    if (filter === 'mine') return packingLists.filter((list) => list.createdBy === user?.uid);
    if (filter === 'others') return packingLists.filter((list) => list.createdBy !== user?.uid);
    return packingLists;
  }, [packingLists, filter, user?.uid]);

  const shoppingActive = useMemo(
    () =>
      sortActiveLists(
        filteredShopping.filter(
          (list) => resolveListStatus(list, listProgress[list.id]) === 'active',
        ),
      ),
    [filteredShopping, listProgress],
  );

  const shoppingReady = useMemo(
    () =>
      sortCompletedListsByDate(
        filteredShopping.filter(
          (list) => resolveListStatus(list, listProgress[list.id]) === 'completed',
        ),
      ),
    [filteredShopping, listProgress],
  );

  const shoppingArchived = useMemo(
    () =>
      sortCompletedListsByDate(
        filteredShopping.filter(
          (list) => resolveListStatus(list, listProgress[list.id]) === 'archived',
        ),
      ),
    [filteredShopping, listProgress],
  );

  const packingTrips = useMemo(
    () =>
      sortByCreatedAt(
        filteredPacking.filter((list) => !list.isTemplate && !isPackingListArchived(list)),
      ),
    [filteredPacking],
  );

  const packingTemplates = useMemo(
    () =>
      sortByCreatedAt(
        filteredPacking.filter((list) => list.isTemplate && !isPackingListArchived(list)),
      ),
    [filteredPacking],
  );

  const packingArchived = useMemo(
    () => sortByCreatedAt(filteredPacking.filter((list) => isPackingListArchived(list))),
    [filteredPacking],
  );

  const handleDeleteRequest = (listId, title, kind = 'shopping') => {
    setDeleteTarget({ listId, title, kind });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || busyId) return;

    const { listId, kind } = deleteTarget;
    setBusyId(listId);
    if (kind === 'packing') {
      setPackingLists((prev) => prev.filter((list) => list.id !== listId));
    } else {
      setLists((prev) => prev.filter((list) => list.id !== listId));
    }

    try {
      if (kind === 'packing') {
        await deletePackingList(listId);
      } else {
        await deleteList(listId);
      }
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

  const renderShoppingCard = (list, { dimmed = false, showCompletionDate = false, archived = false } = {}) => {
    const isArchived = archived || list.archived || list.status === 'archived';
    const isOwner = list.createdBy === user?.uid;

    return (
      <ListCard
        list={list}
        progress={listProgress[list.id]}
        authorsById={authorsById}
        archived={archived}
        dimmed={dimmed}
        showCompletionDate={showCompletionDate}
        creatorOnly={filter === 'all'}
        busy={busyId === list.id}
        onRepeat={isArchived && isOwner ? () => setRepeatTarget(list) : undefined}
        onDelete={
          isArchived && isOwner
            ? (id, title) => handleDeleteRequest(id, title, 'shopping')
            : undefined
        }
      />
    );
  };

  const renderPackingCard = (list, { archived = false } = {}) => {
    const isArchived = archived || list.archived || list.status === 'archived';
    const isOwner = list.createdBy === user?.uid;

    return (
      <PackingListCard
        list={list}
        currentUserId={user?.uid}
        authorsById={authorsById}
        viewerFamilyId={resolvedFamilyId}
        accentBarClassName={PACKING_ACCENT.barDone}
        archived={archived}
        busy={busyId === list.id}
        onDelete={
          (isArchived || list.isTemplate) && isOwner
            ? (id, title) => handleDeleteRequest(id, title, 'packing')
            : undefined
        }
      />
    );
  };

  const subtitle =
    filter === 'mine'
      ? 'Ваши списки покупок и сборов, включая завершённые и архивные'
      : filter === 'others'
        ? 'Списки других участников семьи'
        : 'Все списки семьи: покупки и сборы, включая архив';

  const shoppingTotal = filteredShopping.length;
  const packingTotal = filteredPacking.length;
  const hasAny = shoppingTotal > 0 || packingTotal > 0;

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title="Все списки семьи" backTo="/settings" />

      <div className="pt-4">
        <p className="text-xs leading-relaxed text-slate-500">
          <span aria-hidden className="mr-1">📋</span>
          {subtitle}
        </p>

        <div className="mb-4 mt-4">
          <ListFilterTabs value={filter} onChange={setFilter} />
        </div>

        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : (
          <>
            <section className="mt-6">
              <ContextSectionHeader
                title="Списки покупок"
                accentDotClass={SHOPPING_ACCENT.solid}
                count={shoppingTotal}
              />

              <SubsectionTitle>Актуальные</SubsectionTitle>
              <PaginatedList
                items={shoppingActive}
                visibleCount={visibleShoppingActive}
                onLoadMore={() => setVisibleShoppingActive((count) => count + LIST_PAGE_SIZE)}
                emptyText="Нет актуальных списков покупок"
                renderItem={(list) => renderShoppingCard(list)}
              />

              {shoppingReady.length > 0 && (
                <div className="mt-6">
                  <CompletedListsSection
                    lists={shoppingReady.slice(0, visibleShoppingReady)}
                    totalCount={shoppingReady.length}
                    groupByDate={settings.groupByDate && filter === 'all'}
                    renderListCard={(list) =>
                      renderShoppingCard(list, { dimmed: true, showCompletionDate: true })
                    }
                  />
                  {shoppingReady.length > visibleShoppingReady && (
                    <LoadMoreButton
                      onClick={() => setVisibleShoppingReady((count) => count + LIST_PAGE_SIZE)}
                    />
                  )}
                </div>
              )}

              {shoppingArchived.length > 0 && (
                <>
                  <ArchiveSectionDivider count={shoppingArchived.length} />
                  <PaginatedList
                    items={shoppingArchived}
                    visibleCount={visibleShoppingArchived}
                    onLoadMore={() => setVisibleShoppingArchived((count) => count + LIST_PAGE_SIZE)}
                    emptyText=""
                    listClassName="mt-3 space-y-2.5"
                    renderItem={(list) =>
                      renderShoppingCard(list, {
                        archived: true,
                        dimmed: true,
                        showCompletionDate: true,
                      })
                    }
                  />
                </>
              )}

              {shoppingTotal === 0 && (
                <p className={`mt-3 ${HINT_TEXT}`}>Списков покупок пока нет</p>
              )}
            </section>

            <section className="mt-10">
              <ContextSectionHeader
                title="Списки сборов"
                accentDotClass={PACKING_ACCENT.solid}
                count={packingTotal}
              />

              <SubsectionTitle>Поездки</SubsectionTitle>
              <PaginatedList
                items={packingTrips}
                visibleCount={visiblePackingTrips}
                onLoadMore={() => setVisiblePackingTrips((count) => count + LIST_PAGE_SIZE)}
                emptyText="Нет активных поездок"
                renderItem={(list) => renderPackingCard(list)}
              />

              {packingTemplates.length > 0 && (
                <>
                  <SubsectionTitle>Шаблоны</SubsectionTitle>
                  <PaginatedList
                    items={packingTemplates}
                    visibleCount={visiblePackingTemplates}
                    onLoadMore={() => setVisiblePackingTemplates((count) => count + LIST_PAGE_SIZE)}
                    emptyText=""
                    renderItem={(list) => renderPackingCard(list)}
                  />
                </>
              )}

              {packingArchived.length > 0 && (
                <>
                  <ArchiveSectionDivider count={packingArchived.length} />
                  <PaginatedList
                    items={packingArchived}
                    visibleCount={visiblePackingArchived}
                    onLoadMore={() => setVisiblePackingArchived((count) => count + LIST_PAGE_SIZE)}
                    emptyText=""
                    renderItem={(list) => renderPackingCard(list, { archived: true })}
                  />
                </>
              )}

              {packingTotal === 0 && (
                <p className={`mt-3 ${HINT_TEXT}`}>Списков сборов пока нет</p>
              )}
            </section>

            {!hasAny && (
              <p className={`mt-6 ${HINT_TEXT}`}>Списков пока нет</p>
            )}
          </>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
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
