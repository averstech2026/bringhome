import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { getFamilyMembers, isOwnerEmail } from '../../services/usersService';
import { getFamily } from '../../services/familiesService';
import { AiStatsUserCard } from './AiStatsUserCard';
import { normalizeAiUsage, resolveAiLimits } from '../../utils/aiLimits';

const MIN_REFRESH_SPIN_MS = 750;

function enrichUserProfile(user, family) {
  return {
    ...user,
    resolvedLimits: resolveAiLimits(user, family),
    resolvedUsage: normalizeAiUsage(user.aiUsage),
    family,
  };
}

function sortUsersForStats(users) {
  return [...users].sort((a, b) => {
    if (isOwnerEmail(a.email)) return -1;
    if (isOwnerEmail(b.email)) return 1;
    if (a.role === 'family_admin' && b.role !== 'family_admin') return -1;
    if (b.role === 'family_admin' && a.role !== 'family_admin') return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'ru');
  });
}

export default function FamilyAiStatsPanel({ familyId }) {
  const [users, setUsers] = useState([]);
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStatistics = useCallback(async ({ manual = false } = {}) => {
    if (!familyId) {
      setUsers([]);
      setFamily(null);
      setLoading(false);
      return;
    }

    if (manual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const loadData = async () => {
        const [members, familyData] = await Promise.all([
          getFamilyMembers(familyId, {
            includeDisabled: true,
            includeLegacy: false,
          }),
          getFamily(familyId),
        ]);
        return {
          familyData,
          members: members.filter((user) => user.familyId === familyId),
        };
      };

      const result = manual
        ? (await Promise.all([
            loadData(),
            new Promise((resolve) => { setTimeout(resolve, MIN_REFRESH_SPIN_MS); }),
          ]))[0]
        : await loadData();

      setFamily(result.familyData);
      setUsers(sortUsersForStats(result.members.map((user) => enrichUserProfile(user, result.familyData))));
    } catch (err) {
      setError(err?.message || 'Не удалось загрузить статистику');
    } finally {
      if (manual) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [familyId]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleRefresh = () => {
    if (loading || isRefreshing) return;
    fetchStatistics({ manual: true });
  };

  const totalRequests = useMemo(
    () => users.reduce((sum, user) => sum + (user.resolvedUsage?.monthly?.count || 0), 0),
    [users],
  );

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Статистика ИИ участников</h2>
          <p className="mt-1 text-sm text-slate-500">
            Использование распознавания списков в этой семье
          </p>
          {!loading && (
            <p className="mt-1 text-xs text-slate-400">
              Запросов в этом месяце: {totalRequests}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          aria-busy={isRefreshing || undefined}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-black/[0.04] active:bg-black/[0.06] disabled:opacity-40 ${isRefreshing ? 'pointer-events-none' : ''}`}
          aria-label="Обновить статистику"
        >
          <RotateCw
            className={`h-5 w-5 origin-center ${isRefreshing ? 'animate-[spin_0.75s_linear_infinite]' : ''}`}
            strokeWidth={2}
            aria-hidden
          />
        </button>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Нет участников</p>
        ) : (
          <ul className="space-y-2.5">
            {users.map((user) => (
              <AiStatsUserCard key={user.id} user={user} />
            ))}
          </ul>
        )}

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
    </section>
  );
}
