import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, Copy, LayoutTemplate, Megaphone, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { createInvite, getAllInvites, getInviteRegisterUrl, revokeInvite } from '../services/invitesService';
import { getAllFamilies, getFamilyUsageStats, resolveFamilyAiLimitMonth } from '../services/familiesService';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNotifications } from '../hooks/useNotifications';
import CreateAnnouncementModal from '../components/profile/CreateAnnouncementModal';
import { getAllAnnouncements } from '../services/announcementsService';
import {
  subscribeToAllFeedbacks,
  subscribeToUnreadFeedbacks,
  markFeedbackReadIfNew,
  updateFeedbackStatus,
  FEEDBACK_CATEGORIES,
} from '../services/feedbacksService';
import {
  ADMIN_STATUS_OPTIONS,
  FEEDBACK_STATUSES,
  getFeedbackStatusMeta,
  resolveFeedbackStatus,
} from '../utils/feedbackStatus';
import PageHeader from '../components/layout/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import { PAGE_SECTION_TITLE, PRIMARY_BTN } from '../components/list/cardStyles';
import { useToast } from '../components/ui/ToastProvider';

const VALID_TABS = ['invites', 'families', 'notifications', 'feedbacks'];

function DashboardTabs({ value, onChange, unreadFeedbacks = 0 }) {
  const tabs = [
    { id: 'invites', label: 'Инвайты' },
    { id: 'families', label: 'Семьи' },
    { id: 'notifications', label: 'Уведомления' },
    { id: 'feedbacks', label: 'Фидбеки', badge: unreadFeedbacks },
  ];

  return (
    <div className="inline-flex h-10 items-center rounded-full bg-slate-100/80 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`flex h-full items-center rounded-full px-4 text-sm transition-colors ${
            value === tab.id
              ? 'bg-white font-semibold text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {tab.label}
          {tab.badge > 0 && (
            <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold leading-none text-white">
              {tab.badge > 9 ? '9+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function CreateInviteForm({ onCreated }) {
  const [maxUsers, setMaxUsers] = useState(5);
  const [maxLists, setMaxLists] = useState(20);
  const [aiRequests, setAiRequests] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { token } = await createInvite({
        familyLimits: { maxUsers, maxLists, aiRequests },
        createdBy: user?.uid,
      });
      const url = getInviteRegisterUrl(token);
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success('Инвайт создан, ссылка скопирована');
      onCreated();
    } catch (err) {
      setError(err?.message || 'Не удалось создать инвайт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <Plus className="h-4 w-4" />
        Новый инвайт
      </h3>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Участники</span>
          <input
            type="number"
            min={1}
            value={maxUsers}
            onChange={(e) => setMaxUsers(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          <span>Списки</span>
          <input
            type="number"
            min={1}
            value={maxLists}
            onChange={(e) => setMaxLists(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500">
          <span title="Лимит ИИ-запросов в месяц">ИИ/мес.</span>
          <input
            type="number"
            min={0}
            value={aiRequests}
            onChange={(e) => setAiRequests(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            aria-label="Лимит ИИ-запросов в месяц"
          />
        </label>
      </div>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      <button type="submit" disabled={loading} className={`mt-3 w-full ${PRIMARY_BTN} !py-2.5 text-sm`}>
        {loading ? 'Создаём…' : 'Сгенерировать ссылку'}
      </button>
    </form>
  );
}

function InvitesTab() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revoking, setRevoking] = useState(false);
  const toast = useToast();

  const load = () => {
    setLoading(true);
    getAllInvites()
      .then(setInvites)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const copyLink = async (token) => {
    const url = getInviteRegisterUrl(token);
    await navigator.clipboard.writeText(url);
    toast.success('Ссылка скопирована');
  };

  const handleRevoke = async () => {
    if (!revokeTarget || revoking) return;

    setRevoking(true);
    try {
      await revokeInvite(revokeTarget);
      toast.success('Инвайт отозван');
      setRevokeTarget(null);
      load();
    } catch (err) {
      toast.error(err?.message || 'Не удалось отозвать инвайт');
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="space-y-4">
      <CreateInviteForm onCreated={load} />

      <h3 className={PAGE_SECTION_TITLE}>Все инвайты</h3>
      {loading ? (
        <div className="flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : invites.length === 0 ? (
        <p className="text-sm text-slate-400">Инвайтов пока нет</p>
      ) : (
        <ul className="space-y-2">
          {invites.map((invite) => (
            <li
              key={invite.id}
              className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {invite.isUsed ? (
                      <span className="text-slate-500">Использована</span>
                    ) : (
                      <span className="text-emerald-600">Активна</span>
                    )}
                  </p>
                  {invite.isUsed && invite.usedByEmail && (
                    <p className="mt-0.5 text-xs text-slate-500">{invite.usedByEmail}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    Лимиты: {invite.familyLimits?.maxUsers} уч.,{' '}
                    {invite.familyLimits?.maxLists} сп., {invite.familyLimits?.aiRequests} ИИ/мес.
                  </p>
                </div>
                {!invite.isUsed && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => copyLink(invite.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                      title="Копировать ссылку"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(invite.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Отозвать"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={Boolean(revokeTarget)}
        title="Отозвать инвайт?"
        titleId="revoke-invite-title"
        message="Ссылка перестанет работать, и по ней нельзя будет зарегистрировать новую семью."
        confirmLabel="Отозвать"
        confirming={revoking}
        confirmingLabel="Отзываем…"
        onConfirm={handleRevoke}
        onCancel={() => !revoking && setRevokeTarget(null)}
        destructive
      />
    </div>
  );
}

function FamiliesTab() {
  const { user } = useAuth();
  const { familyId: myFamilyId } = useUserProfile(user);
  const [families, setFamilies] = useState([]);
  const [statsById, setStatsById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllFamilies()
      .then(async (list) => {
        setFamilies(list);
        const stats = {};
        await Promise.all(
          list.map(async (family) => {
            stats[family.id] = await getFamilyUsageStats(family.id);
          }),
        );
        setStatsById(stats);
      })
      .finally(() => setLoading(false));
  }, []);

  const sortedFamilies = useMemo(() => {
    if (!myFamilyId) return families;
    const mine = families.find((family) => family.id === myFamilyId);
    const others = families.filter((family) => family.id !== myFamilyId);
    return mine ? [mine, ...others] : families;
  }, [families, myFamilyId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (sortedFamilies.length === 0) {
    return <p className="text-sm text-slate-400">Семей пока нет</p>;
  }

  return (
    <ul className="space-y-2.5">
      {sortedFamilies.map((family) => {
        const stats = statsById[family.id] || {};
        const limits = family.limits || {};
        const familyAiLimitMonth = resolveFamilyAiLimitMonth(family);
        const familyName = family.name?.trim() || 'Без названия';
        const isMyFamily = family.id === myFamilyId;

        return (
          <li key={family.id}>
            <Link
              to={`/admin/dashboard/families/${family.id}`}
              className={`block rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-slate-50/80 active:bg-slate-50 ${
                isMyFamily ? 'border-violet-100 ring-1 ring-violet-50' : 'border-slate-100'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <h3 className="truncate text-lg font-bold text-slate-900">{familyName}</h3>
                  {isMyFamily && (
                    <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                      Моя семья
                    </span>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" strokeWidth={2} aria-hidden />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Глава: {stats.owner?.displayName || stats.owner?.email || '—'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  Списки: {stats.listsCount ?? 0}/{limits.maxLists ?? '—'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  Юзеры: {stats.usersCount ?? 0}/{limits.maxUsers ?? '—'}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  ИИ/мес.: {stats.aiUsed ?? 0}/{familyAiLimitMonth ?? '—'}
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function formatNotificationTime(createdAt) {
  if (!createdAt?.toDate) return '';
  const date = createdAt.toDate();
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function NotificationsTab() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const [createOpen, setCreateOpen] = useState(false);
  const [featureAnnouncements, setFeatureAnnouncements] = useState([]);
  const [featureLoading, setFeatureLoading] = useState(true);
  const { notifications, loading } = useNotifications(user?.uid, { mode: 'outgoing' });
  const senderDisplayName = profile?.displayName || user?.displayName || 'Администратор';

  const loadFeatureAnnouncements = () => {
    setFeatureLoading(true);
    getAllAnnouncements()
      .then(setFeatureAnnouncements)
      .catch(() => setFeatureAnnouncements([]))
      .finally(() => setFeatureLoading(false));
  };

  useEffect(() => {
    loadFeatureAnnouncements();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className={PAGE_SECTION_TITLE}>Глобальные анонсы</h3>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            Создать
          </button>
        </div>

        {featureLoading ? (
          <div className="mt-4 flex justify-center py-6">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          </div>
        ) : featureAnnouncements.length === 0 ? (
          <p className="mt-4 text-sm text-slate-400">
            Активных слайдов на главном экране пока нет — нажмите «Создать» и включите «Глобальный анонс»
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {featureAnnouncements.map((announcement) => (
              <li
                key={announcement.id}
                className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100">
                    <LayoutTemplate className="h-4 w-4 text-violet-600" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{announcement.title}</p>
                    <p className="mt-1 text-sm leading-snug text-slate-800">{announcement.content}</p>
                    {announcement.hint?.trim() && (
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{announcement.hint}</p>
                    )}
                    <p className="mt-1.5 text-xs text-slate-400">
                      {formatNotificationTime(announcement.createdAt)}
                      {' · '}
                      Главный экран
                      {' · '}
                      {announcement.active === false ? 'Выключен' : 'Активен'}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className={PAGE_SECTION_TITLE}>Отправленные уведомления</h3>

      {loading ? (
        <div className="mt-4 flex justify-center py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : notifications.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Исходящих уведомлений пока нет</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {notifications.map((notification) => {
            const recipientLabel = notification.familyId === 'global'
              ? 'Всем пользователям'
              : (notification.familyName?.trim() || 'Семья');

            return (
              <li
                key={notification.id}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Megaphone className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    {notification.title && (
                      <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    )}
                    <p className={`text-sm leading-snug text-slate-800 ${notification.title ? 'mt-1' : ''}`}>
                      {notification.body}
                    </p>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {formatNotificationTime(notification.createdAt)}
                      {' · '}
                      {recipientLabel}
                      {notification.sendAsPush && ' · Push'}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      </div>

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        senderId={user?.uid}
        senderDisplayName={senderDisplayName}
        onCreated={({ type }) => {
          if (type === 'feature') {
            loadFeatureAnnouncements();
          }
        }}
      />
    </div>
  );
}

function formatFeedbackDate(timestamp) {
  if (!timestamp?.toDate) return '';
  return timestamp.toDate().toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function FeedbacksTab() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    setLoading(true);
    return subscribeToAllFeedbacks((items) => {
      setFeedbacks(items);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (feedback) => {
    const nextExpanded = expandedId === feedback.id ? null : feedback.id;
    setExpandedId(nextExpanded);

    if (nextExpanded && resolveFeedbackStatus(feedback) === 'new') {
      try {
        await markFeedbackReadIfNew(feedback);
      } catch (err) {
        toast.error(err?.message || 'Не удалось обновить статус');
      }
    }
  };

  const handleStatusChange = async (feedbackId, status) => {
    if (!feedbackId || busyId) return;

    setBusyId(feedbackId);
    try {
      await updateFeedbackStatus(feedbackId, status);
      toast.success('Статус обновлён');
    } catch (err) {
      toast.error(err?.message || 'Не удалось обновить статус');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (feedbacks.length === 0) {
    return <p className="text-sm text-slate-400">Фидбеков пока нет</p>;
  }

  return (
    <ul className="space-y-3">
      {feedbacks.map((feedback) => {
        const category = FEEDBACK_CATEGORIES[feedback.category] || {
          label: feedback.category,
          emoji: '💬',
        };
        const statusMeta = getFeedbackStatusMeta(feedback);
        const isUnread = resolveFeedbackStatus(feedback) === 'new';
        const isExpanded = expandedId === feedback.id;
        const isBusy = busyId === feedback.id;

        return (
          <li key={feedback.id}>
            <button
              type="button"
              onClick={() => handleToggle(feedback)}
              className={`w-full rounded-2xl border p-4 text-left shadow-sm transition ${
                isUnread
                  ? 'border-violet-100 bg-white'
                  : 'border-slate-100 bg-slate-50/80'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">
                      <span aria-hidden className="mr-1.5">{category.emoji}</span>
                      {category.label}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${statusMeta.badgeClass}`}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                  <p
                    className={`mt-2 text-sm leading-relaxed text-slate-700 ${
                      isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'
                    }`}
                  >
                    {feedback.text}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {feedback.fromUserName || 'Участник'}
                    {feedback.fromFamilyName ? ` · ${feedback.fromFamilyName}` : ''}
                  </p>
                  {feedback.createdAt && (
                    <p className="mt-1 text-xs text-slate-400">
                      {formatFeedbackDate(feedback.createdAt)}
                    </p>
                  )}
                </div>
                <ChevronRight
                  className={`mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition-transform ${
                    isExpanded ? 'rotate-90' : ''
                  }`}
                  strokeWidth={2}
                  aria-hidden
                />
              </div>

              {isExpanded && (
                <div
                  className="mt-4 border-t border-slate-100 pt-4"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                  role="presentation"
                >
                  <p className="text-xs font-semibold text-slate-400">Изменить статус</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {ADMIN_STATUS_OPTIONS.map((statusKey) => {
                      const option = FEEDBACK_STATUSES[statusKey];
                      const active = resolveFeedbackStatus(feedback) === statusKey;
                      return (
                        <button
                          key={statusKey}
                          type="button"
                          disabled={isBusy || active}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStatusChange(feedback.id, statusKey);
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition disabled:opacity-50 ${
                            active
                              ? option.badgeClass
                              : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function SuperAdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = VALID_TABS.includes(tabParam) ? tabParam : 'invites';
  const [unreadFeedbacks, setUnreadFeedbacks] = useState(0);

  useEffect(() => {
    return subscribeToUnreadFeedbacks((items) => {
      setUnreadFeedbacks(items.length);
    });
  }, []);

  const handleTabChange = (nextTab) => {
    setSearchParams(nextTab === 'invites' ? {} : { tab: nextTab }, { replace: true });
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title="Панель владельца" backTo="/settings" />

      <div className="pt-4">
        <DashboardTabs value={tab} onChange={handleTabChange} unreadFeedbacks={unreadFeedbacks} />
        <div className="mt-6">
          {tab === 'invites' && <InvitesTab />}
          {tab === 'families' && <FamiliesTab />}
          {tab === 'notifications' && <NotificationsTab />}
          {tab === 'feedbacks' && <FeedbacksTab />}
        </div>
      </div>
    </div>
  );
}
