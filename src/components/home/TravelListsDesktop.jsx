import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HINT_TEXT } from '../list/cardStyles';
import PackingListCard from '../packing/PackingListCard';
import RepeatPackingListModal from '../packing/RepeatPackingListModal';
import CompletedListsSection from './CompletedListsSection';
import ListFilterSegmentedControl from './ListFilterSegmentedControl';
import ListFilterEmptyState from './ListFilterEmptyState';
import {
  getTravelDesktopPackingLists,
  deletePackingList,
  repeatPackingList,
} from '../../services/packingListsService';
import { getUserProfile } from '../../services/usersService';
import { filterHomeLists, HOME_LIST_FILTER } from '../../utils/homeListFilter';
import {
  isCrossFamilySharedList,
  isExternalGuestList,
  isListOwnerFamily,
} from '../../utils/listShare';
import { isListOwner, isListSharedWithUser } from '../../utils/listPermissions';
import { getPackingListProgress } from '../../utils/packingLists';
import { getThemeAccent } from '../../utils/uiThemes';
import { useToast } from '../ui/ToastProvider';
import DeleteListConfirmModal from './DeleteListConfirmModal';

const EMPTY_LISTS_HINT = 'Пока нет списков — нажмите «+», чтобы создать';

function isPackingCompleted(list, userId) {
  const progress = getPackingListProgress(list, userId);
  return progress.total > 0 && progress.percent === 100;
}

export default function TravelListsDesktop({
  familyId,
  currentUserId,
  isFamilyAdmin = false,
  authorsById = {},
  familiesById = {},
  uiTheme = 'default',
  refreshKey = 0,
  groupByDate = false,
  onListsChanged = null,
}) {
  const navigate = useNavigate();
  const toast = useToast();
  const [lists, setLists] = useState([]);
  const [extraAuthorsById, setExtraAuthorsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listFilter, setListFilter] = useState(HOME_LIST_FILTER.ALL);
  const [repeatList, setRepeatList] = useState(null);
  const [repeatBusy, setRepeatBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const themeAccent = getThemeAccent(uiTheme);

  const mergedAuthorsById = useMemo(
    () => ({ ...authorsById, ...extraAuthorsById }),
    [authorsById, extraAuthorsById],
  );

  const loadLists = useCallback(async () => {
    if (!familyId || !currentUserId) {
      setLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await getTravelDesktopPackingLists(currentUserId, familyId, {
        isFamilyAdmin,
      });
      setLists(next);

      const knownIds = new Set(Object.keys(authorsById));
      const missingIds = [...new Set(
        next.flatMap((list) => (Array.isArray(list.members) ? list.members : [list.createdBy])),
      )].filter((id) => id && !knownIds.has(id));

      if (missingIds.length === 0) {
        setExtraAuthorsById({});
      } else {
        const entries = await Promise.all(
          missingIds.map(async (id) => {
            try {
              const profile = await getUserProfile(id);
              return profile ? [id, { id, ...profile }] : null;
            } catch {
              return null;
            }
          }),
        );
        setExtraAuthorsById(Object.fromEntries(entries.filter(Boolean)));
      }
    } catch (err) {
      setError(err?.message || 'Не удалось загрузить списки сборов');
      setLists([]);
      setExtraAuthorsById({});
    } finally {
      setLoading(false);
    }
  }, [familyId, currentUserId, isFamilyAdmin, authorsById]);

  useEffect(() => {
    loadLists();
  }, [loadLists, refreshKey]);

  const trips = useMemo(
    () => lists.filter((list) => !list.isTemplate),
    [lists],
  );

  const activeTrips = useMemo(
    () => trips.filter((list) => !isPackingCompleted(list, currentUserId)),
    [trips, currentUserId],
  );

  const completedTrips = useMemo(
    () => trips.filter((list) => isPackingCompleted(list, currentUserId)),
    [trips, currentUserId],
  );

  const myActiveTrips = useMemo(
    () => activeTrips.filter((list) => {
      if (isListOwnerFamily(list, familyId)) return true;
      if (isCrossFamilySharedList(list)) return false;
      return isListOwner(list, currentUserId);
    }),
    [activeTrips, familyId, currentUserId],
  );

  const sharedActiveTrips = useMemo(
    () => activeTrips.filter((list) => {
      if (isListOwnerFamily(list, familyId)) return false;
      if (isCrossFamilySharedList(list) && isExternalGuestList(list, familyId)) return true;
      if (isListOwner(list, currentUserId)) return false;
      if (isListSharedWithUser(list, currentUserId)) return true;
      const members = Array.isArray(list.members) ? list.members : [];
      return Boolean(currentUserId && members.includes(currentUserId) && list.createdBy !== currentUserId);
    }),
    [activeTrips, familyId, currentUserId],
  );

  const filteredMyActiveTrips = useMemo(
    () => filterHomeLists(myActiveTrips, listFilter, familyId),
    [myActiveTrips, listFilter, familyId],
  );
  const filteredSharedActiveTrips = useMemo(
    () => filterHomeLists(sharedActiveTrips, listFilter, familyId),
    [sharedActiveTrips, listFilter, familyId],
  );
  const filteredCompletedTrips = useMemo(
    () => filterHomeLists(completedTrips, listFilter, familyId),
    [completedTrips, listFilter, familyId],
  );
  const templates = useMemo(
    () => filterHomeLists(lists.filter((list) => list.isTemplate), listFilter, familyId),
    [lists, listFilter, familyId],
  );

  const hasAnyTrips = trips.length > 0;
  const hasFilteredActiveTrips = filteredMyActiveTrips.length > 0 || filteredSharedActiveTrips.length > 0;
  const showFilterEmpty = listFilter !== HOME_LIST_FILTER.ALL
    && !hasFilteredActiveTrips
    && filteredCompletedTrips.length === 0
    && hasAnyTrips;

  const renderCard = (list, { dimmed = false, showRepeat = false, showDelete = false } = {}) => {
    const isOwner = list.createdBy === currentUserId;
    return (
      <PackingListCard
        list={list}
        currentUserId={currentUserId}
        authorsById={mergedAuthorsById}
        familiesById={familiesById}
        viewerFamilyId={familyId}
        accentBarClassName={themeAccent.solidClassName}
        dimmed={dimmed}
        onRepeat={showRepeat ? setRepeatList : null}
        onDelete={
          showDelete && isOwner
            ? (id, title) => setDeleteTarget({ id, title })
            : null
        }
        busy={repeatBusy || deleting}
      />
    );
  };

  const renderSection = (
    title,
    sectionLists,
    emptyText,
    { isFirst = false, showDelete = false } = {},
  ) => {
    if (sectionLists.length === 0 && !emptyText) return null;
    return (
      <div className={`mt-4 ${isFirst ? 'first:mt-2' : ''}`}>
        <h3 className="mb-2 pl-1 text-xs font-medium text-slate-500">{title}</h3>
        {sectionLists.length === 0 ? (
          <p className={`pl-1 ${HINT_TEXT}`}>{emptyText}</p>
        ) : (
          <ul className="space-y-2.5">
            {sectionLists.map((list) => (
              <li key={list.id}>{renderCard(list, { showDelete })}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const handleRepeatConfirm = async ({ title, travelDate }) => {
    if (!repeatList?.id || !currentUserId || !familyId || repeatBusy) return;
    setRepeatBusy(true);
    try {
      const id = await repeatPackingList(repeatList.id, {
        createdBy: currentUserId,
        familyId,
        title,
        travelDate,
        familyMemberIds: Object.keys(mergedAuthorsById),
      });
      setRepeatList(null);
      onListsChanged?.();
      await loadLists();
      navigate(`/packing/${id}`, { state: { fromTravelDesktop: true } });
    } catch (err) {
      toast.error(err?.message || 'Не удалось повторить список');
    } finally {
      setRepeatBusy(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id || deleting) return;
    setDeleting(true);
    try {
      await deletePackingList(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Список удалён');
      onListsChanged?.();
      await loadLists();
    } catch (err) {
      toast.error(err?.message || 'Не удалось удалить список');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="mt-2 min-h-full" aria-labelledby="travel-desktop-title">
      <div className="flex items-center justify-between gap-2 pl-1">
        <h2 id="travel-desktop-title" className="text-sm font-semibold text-slate-800">
          Список сборов
        </h2>
        <ListFilterSegmentedControl value={listFilter} onChange={setListFilter} />
      </div>

      {error && <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{error}</p>}

      {loading ? (
        <div className="mt-6 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : showFilterEmpty ? (
        <ListFilterEmptyState
          filterLabel={listFilter !== HOME_LIST_FILTER.ALL ? 'Все' : null}
        />
      ) : (
        <>
          {!hasAnyTrips ? (
            <p className={`mt-4 pl-1 ${HINT_TEXT}`}>{EMPTY_LISTS_HINT}</p>
          ) : (
            <>
              {hasFilteredActiveTrips ? (
                <>
                  {renderSection(
                    'Мои актуальные',
                    filteredMyActiveTrips,
                    null,
                    { isFirst: true },
                  )}
                  {renderSection(
                    'Доступные актуальные',
                    filteredSharedActiveTrips,
                    null,
                    { isFirst: filteredMyActiveTrips.length === 0 },
                  )}
                </>
              ) : filteredCompletedTrips.length === 0 ? (
                <div className="mt-4">
                  <h3 className="mb-3 pl-1 text-xs font-medium text-slate-500">Мои актуальные</h3>
                  <ListFilterEmptyState
                    filterLabel={listFilter !== HOME_LIST_FILTER.ALL ? 'Все' : null}
                  />
                </div>
              ) : null}

              {filteredCompletedTrips.length > 0 && (
                <CompletedListsSection
                  lists={filteredCompletedTrips}
                  groupByDate={groupByDate}
                  renderListCard={(list) => renderCard(list, {
                    dimmed: true,
                    showRepeat: true,
                    showDelete: true,
                  })}
                />
              )}
            </>
          )}
          {listFilter === HOME_LIST_FILTER.ALL && renderSection(
            'Мои шаблоны',
            templates,
            'Сохраните поездку как шаблон в настройках списка, чтобы быстро собирать вещи в следующий раз',
            { showDelete: true },
          )}
        </>
      )}

      <RepeatPackingListModal
        list={repeatList}
        open={Boolean(repeatList)}
        loading={repeatBusy}
        onClose={() => !repeatBusy && setRepeatList(null)}
        onConfirm={handleRepeatConfirm}
      />

      <DeleteListConfirmModal
        open={Boolean(deleteTarget)}
        listTitle={deleteTarget?.title}
        deleting={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </section>
  );
}
