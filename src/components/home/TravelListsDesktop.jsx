import { useCallback, useEffect, useMemo, useState } from 'react';
import { HINT_TEXT } from '../list/cardStyles';
import PackingListCard from '../packing/PackingListCard';
import ListFilterSegmentedControl from './ListFilterSegmentedControl';
import ListFilterEmptyState from './ListFilterEmptyState';
import { getTravelDesktopPackingLists } from '../../services/packingListsService';
import { getUserProfile } from '../../services/usersService';
import { filterHomeLists, HOME_LIST_FILTER } from '../../utils/homeListFilter';
import { getThemeAccent } from '../../utils/uiThemes';

export default function TravelListsDesktop({
  familyId,
  currentUserId,
  isFamilyAdmin = false,
  authorsById = {},
  familiesById = {},
  uiTheme = 'default',
  refreshKey = 0,
}) {
  const [lists, setLists] = useState([]);
  const [extraAuthorsById, setExtraAuthorsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [listFilter, setListFilter] = useState(HOME_LIST_FILTER.ALL);
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

  const filteredLists = useMemo(
    () => filterHomeLists(lists, listFilter, familyId),
    [lists, listFilter, familyId],
  );

  const trips = filteredLists.filter((list) => !list.isTemplate);
  const templates = filteredLists.filter((list) => list.isTemplate);
  const hasAnyTrips = lists.some((list) => !list.isTemplate);
  const showFilterEmpty = listFilter !== HOME_LIST_FILTER.ALL && trips.length === 0 && hasAnyTrips;

  const renderSection = (title, sectionLists, emptyText) => (
    <div className="mt-4 first:mt-2">
      <h3 className="mb-2 pl-1 text-xs font-medium text-slate-500">{title}</h3>
      {sectionLists.length === 0 ? (
        <p className={`pl-1 ${HINT_TEXT}`}>{emptyText}</p>
      ) : (
        <ul className="space-y-2.5">
          {sectionLists.map((list) => (
            <li key={list.id}>
              <PackingListCard
                list={list}
                currentUserId={currentUserId}
                authorsById={mergedAuthorsById}
                familiesById={familiesById}
                viewerFamilyId={familyId}
                accentBarClassName={themeAccent.solidClassName}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

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
          {renderSection(
            'Активные поездки',
            trips,
            'Пока нет поездок — нажмите «+», чтобы создать',
          )}
          {listFilter === HOME_LIST_FILTER.ALL && renderSection(
            'Мои шаблоны',
            templates,
            'Сохраните поездку как шаблон в настройках списка, чтобы быстро собирать вещи в следующий раз',
          )}
        </>
      )}
    </section>
  );
}
