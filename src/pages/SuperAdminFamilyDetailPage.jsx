import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getFamily, getFamilyUsageStats, resolveFamilyAiLimitMonth, updateFamilyLimits } from '../services/familiesService';
import { getFamilyMembers, getPlatformAdminUid, resetOnboardingForUser } from '../services/usersService';
import { getFamilyLists, getItemsProgressByListIds } from '../services/listsService';
import { resolveListStatus } from '../utils/listStatus';
import { getListSortTimestamp, sortCompletedListsByDate } from '../utils/groupCompletedLists';
import PageHeader from '../components/layout/PageHeader';
import { PAGE_SECTION_TITLE, HINT_TEXT } from '../components/list/cardStyles';
import ListCard from '../components/home/ListCard';
import CompletedListsSection from '../components/home/CompletedListsSection';
import FamilyAiStatsPanel from '../components/admin/FamilyAiStatsPanel';
import { AdminUserCard } from '../components/admin/AdminUserCard';
import FamilyLimitsModal from '../components/admin/FamilyLimitsModal';
import { useToast } from '../components/ui/ToastProvider';

const VALID_TABS = ['overview', 'lists', 'ai-stats'];

function FamilyDetailTabs({ value, onChange }) {
  const tabs = [
    { id: 'overview', label: 'Обзор' },
    { id: 'lists', label: 'Списки покупок' },
    { id: 'ai-stats', label: 'Статистика ИИ' },
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
            className={`flex h-full items-center justify-center rounded-full px-3 text-sm font-medium transition-colors ${
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

function sortActiveLists(lists) {
  return [...lists].sort((a, b) => getListSortTimestamp(b) - getListSortTimestamp(a));
}

function getAdminListHref(list) {
  const isArchived = list.archived || list.status === 'archived';
  return isArchived
    ? `/list/${list.id}?archived=1&adminView=1`
    : `/list/${list.id}?adminView=1`;
}

function reloadFamilyData(familyId, setters) {
  const {
    setFamily,
    setMembers,
    setStats,
    setLists,
    setAuthorsById,
    setListProgress,
    setPlatformAdminUid,
    setError,
  } = setters;

  return Promise.all([
    getFamily(familyId),
    getFamilyMembers(familyId, { includeDisabled: true, includeLegacy: false }),
    getFamilyUsageStats(familyId),
    getFamilyLists(familyId, { includeArchived: true }),
    getPlatformAdminUid(),
  ]).then(async ([familyData, memberList, usageStats, familyLists, adminUid]) => {
    if (!familyData) {
      setError('Семья не найдена');
      setFamily(null);
      return;
    }

    setFamily(familyData);
    setMembers(memberList.filter((member) => member.familyId === familyId));
    setStats(usageStats);
    setLists(familyLists);
    setPlatformAdminUid(adminUid);
    setAuthorsById(Object.fromEntries(memberList.map((member) => [member.id, member])));

    try {
      const progress = await getItemsProgressByListIds(familyLists.map((list) => list.id));
      setListProgress(progress);
    } catch {
      setListProgress(
        Object.fromEntries(
          familyLists.map((list) => [list.id, { total: 0, checked: 0, percent: 0 }]),
        ),
      );
    }
  });
}
export default function SuperAdminFamilyDetailPage() {
  const { familyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = VALID_TABS.includes(tabParam) ? tabParam : 'overview';
  const { user } = useAuth();

  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [lists, setLists] = useState([]);
  const [authorsById, setAuthorsById] = useState({});
  const [listProgress, setListProgress] = useState({});
  const [platformAdminUid, setPlatformAdminUid] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limitsModalOpen, setLimitsModalOpen] = useState(false);
  const [savingLimits, setSavingLimits] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const toast = useToast();

  const backTo = '/admin/dashboard?tab=families';
  const familyName = family?.name?.trim() || 'Без названия';
  const listBackState = {
    backTo: `/admin/dashboard/families/${familyId}${tab === 'overview' ? '' : `?tab=${tab}`}`,
  };

  const handleTabChange = (nextTab) => {
    setSearchParams(nextTab === 'overview' ? {} : { tab: nextTab }, { replace: true });
  };

  useEffect(() => {
    if (!familyId) return undefined;

    let active = true;
    setLoading(true);
    setError('');

    reloadFamilyData(familyId, {
      setFamily,
      setMembers,
      setStats,
      setLists,
      setAuthorsById,
      setListProgress,
      setPlatformAdminUid,
      setError,
    })
      .catch((err) => {
        if (active) setError(err?.message || 'Не удалось загрузить данные семьи');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [familyId]);

  const handleSaveLimits = async (nextLimits) => {
    if (!familyId || savingLimits) return;

    setSavingLimits(true);
    try {
      const normalized = await updateFamilyLimits(familyId, nextLimits);
      setFamily((current) => (
        current ? { ...current, limits: normalized, aiLimitMonth: normalized.aiLimitMonth } : current
      ));

      const [memberList, usageStats] = await Promise.all([
        getFamilyMembers(familyId, { includeDisabled: true, includeLegacy: false }),
        getFamilyUsageStats(familyId),
      ]);
      setMembers(memberList.filter((member) => member.familyId === familyId));
      setStats(usageStats);
      setAuthorsById(Object.fromEntries(memberList.map((member) => [member.id, member])));

      setLimitsModalOpen(false);
      toast.success('Лимиты семьи обновлены');
    } finally {
      setSavingLimits(false);
    }
  };

  const handleResetOnboarding = async (userId) => {
    setBusyUserId(userId);
    try {
      await resetOnboardingForUser(userId);
      const memberList = await getFamilyMembers(familyId, { includeDisabled: true, includeLegacy: false });
      setMembers(memberList.filter((member) => member.familyId === familyId));
      setAuthorsById(Object.fromEntries(memberList.map((member) => [member.id, member])));
    } catch (err) {
      toast.error(err?.message || 'Не удалось сбросить знакомство');
    } finally {
      setBusyUserId(null);
    }
  };

  const activeLists = useMemo(
    () =>
      sortActiveLists(
        lists.filter((list) => resolveListStatus(list, listProgress[list.id]) === 'active'),
      ),
    [lists, listProgress],
  );

  const readyLists = useMemo(
    () =>
      sortCompletedListsByDate(
        lists.filter((list) => {
          const status = resolveListStatus(list, listProgress[list.id]);
          return status === 'completed' || status === 'archived';
        }),
      ),
    [lists, listProgress],
  );

  const limits = family?.limits || {};
  const familyAiLimitMonth = family ? resolveFamilyAiLimitMonth(family) : null;

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title={`Семья «${familyName}»`} backTo={backTo} />

      <div className="pt-4">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500">{error}</p>
        ) : (
          <>
            <FamilyDetailTabs value={tab} onChange={handleTabChange} />

            {tab === 'ai-stats' && (
              <div className="mt-6">
                <FamilyAiStatsPanel familyId={familyId} />
              </div>
            )}

            {tab === 'overview' && (
              <>
                {stats && (
                  <div className="mt-6 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      Списки: {stats.listsCount ?? 0}/{limits.maxLists ?? '—'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      Юзеры: {stats.usersCount ?? 0}/{limits.maxUsers ?? '—'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      ИИ/мес.: {stats.aiUsed ?? 0}/{familyAiLimitMonth ?? '—'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLimitsModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                    >
                      <Pencil className="h-3 w-3" strokeWidth={2} aria-hidden />
                      Редактировать лимиты
                    </button>
                  </div>
                )}

                <section className="mt-6">
                  <h2 className={PAGE_SECTION_TITLE}>Участники</h2>
                  {members.length === 0 ? (
                    <p className={`mt-3 ${HINT_TEXT}`}>Участников нет</p>
                  ) : (
                    <ul className="mt-3 space-y-2.5">
                      {members.map((member) => (
                        <AdminUserCard
                          key={member.id}
                          user={member}
                          family={family}
                          platformAdminUid={platformAdminUid}
                          busy={busyUserId === member.id}
                          showOnboardingStatus
                          onResetOnboarding={handleResetOnboarding}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              </>
            )}

            {tab === 'lists' && (
              <section className="mt-6">
                <h2 className={PAGE_SECTION_TITLE}>Списки покупок семьи</h2>

                {lists.length === 0 ? (
                  <p className={`mt-3 ${HINT_TEXT}`}>Списков пока нет</p>
                ) : (
                  <>
                    {activeLists.length > 0 ? (
                      <ul className="mt-3 space-y-2.5">
                        {activeLists.map((list) => (
                          <li key={list.id}>
                            <ListCard
                              list={list}
                              progress={listProgress[list.id]}
                              authorsById={authorsById}
                              currentUserId={user?.uid}
                              to={getAdminListHref(list)}
                              linkState={listBackState}
                              creatorOnly
                            />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={`mt-3 ${HINT_TEXT}`}>Нет актуальных списков</p>
                    )}

                    {readyLists.length > 0 && (
                      <div className="mt-6">
                        <CompletedListsSection
                          lists={readyLists}
                          groupByDate={false}
                          renderListCard={(list) => (
                            <ListCard
                              list={list}
                              progress={listProgress[list.id]}
                              authorsById={authorsById}
                              currentUserId={user?.uid}
                              to={getAdminListHref(list)}
                              linkState={listBackState}
                              dimmed
                              showCompletionDate
                              creatorOnly
                            />
                          )}
                        />
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <FamilyLimitsModal
        open={limitsModalOpen}
        limits={limits}
        saving={savingLimits}
        onClose={() => !savingLimits && setLimitsModalOpen(false)}
        onSave={handleSaveLimits}
      />
    </div>
  );
}
