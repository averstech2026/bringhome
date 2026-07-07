import { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCw } from 'lucide-react';
import { getAllUsers, isOwnerEmail } from '../services/usersService';
import { AiStatsUserCard } from '../components/admin/AiStatsUserCard';
import PageHeader from '../components/layout/PageHeader';
import { normalizeAiUsage, resolveAiLimits } from '../utils/aiLimits';

function enrichUserProfile(user) {
  return {
    ...user,
    resolvedLimits: resolveAiLimits(user),
    resolvedUsage: normalizeAiUsage(user.aiUsage),
  };
}

function sortUsersForStats(users) {
  return [...users].sort((a, b) => {
    if (isOwnerEmail(a.email)) return -1;
    if (isOwnerEmail(b.email)) return 1;
    if (a.role === 'admin' && b.role !== 'admin') return -1;
    if (b.role === 'admin' && a.role !== 'admin') return 1;
    return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'ru');
  });
}

export default function AdminAiStatsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchStatistics = useCallback(async ({ manual = false } = {}) => {
    if (manual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const list = await getAllUsers();
      setUsers(sortUsersForStats(list.map(enrichUserProfile)));
    } catch (err) {
      setError(err?.message || 'Не удалось загрузить статистику');
    } finally {
      if (manual) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  const handleRefresh = () => {
    if (loading || isRefreshing) return;
    fetchStatistics({ manual: true });
  };

  const totalRequests = useMemo(
    () => users.reduce((sum, user) => sum + (user.resolvedUsage?.total || 0), 0),
    [users],
  );

  return (
    <div className="flex min-h-full flex-col px-4 pb-8 pt-0">
      <PageHeader
        title="Статистика ИИ"
        backTo="/settings"
        rightAction={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-900 transition hover:bg-black/[0.04] active:bg-black/[0.06] disabled:opacity-40"
            aria-label="Обновить статистику"
          >
            <RotateCw
              className={`h-5 w-5 ${isRefreshing ? 'animate-spin' : ''}`}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        }
      />

      <div className="pt-4">
        <p className="text-sm text-slate-500">
          Использование распознавания списков участниками семьи
        </p>
        {!loading && (
          <p className="mt-1 text-xs text-slate-400">
            Всего запросов: {totalRequests}
          </p>
        )}

        <section className="mt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Нет пользователей</p>
          ) : (
            <ul className="space-y-2.5">
              {users.map((user) => (
                <AiStatsUserCard key={user.id} user={user} />
              ))}
            </ul>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
      </div>
    </div>
  );
}
