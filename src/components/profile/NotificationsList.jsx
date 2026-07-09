import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, Plus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useNotifications } from '../../hooks/useNotifications';
import { canManageNotifications } from '../../utils/notificationAdmin';
import CreateAnnouncementModal from './CreateAnnouncementModal';

const APP_ICON = `${import.meta.env.BASE_URL || '/'}icons/logo.png`;
const PAGE_SIZE = 20;

function NotificationFilterTabs({ value, onChange }) {
  const tabs = [
    { id: 'all', label: 'Все' },
    { id: 'incoming', label: 'Входящие' },
    { id: 'outgoing', label: 'Исходящие' },
  ];

  return (
    <div className="inline-flex h-9 min-w-0 flex-1 items-center rounded-full bg-slate-100/80 p-1">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex h-full flex-1 items-center justify-center rounded-full px-2 text-sm transition-colors ${
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

function getAnnouncementLabel(notification) {
  const name = notification.senderDisplayName?.trim();
  if (name) return `Объявление от ${name}`;
  return 'Объявление от администратора';
}

function DirectionBadge({ direction }) {
  if (direction === 'outgoing') {
    return (
      <span className="rounded bg-emerald-50/50 px-2 py-0.5 text-xs text-emerald-600">
        Исходящее
      </span>
    );
  }

  return (
    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
      Входящее
    </span>
  );
}

function NotificationIcon({ notification, read }) {
  if (notification.type === 'admin_announcement') {
    return (
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          read ? 'bg-slate-100' : 'bg-emerald-100'
        }`}
        aria-hidden
      >
        <Megaphone
          className={`h-4 w-4 ${read ? 'text-slate-400' : 'text-emerald-600'}`}
          strokeWidth={2}
        />
      </span>
    );
  }

  if (!read) {
    return (
      <span
        className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
        aria-hidden
      />
    );
  }

  return <span className="w-2 shrink-0" aria-hidden />;
}

function IncomingNotificationItem({ notification, read, onSelect, showDirectionBadge }) {
  const isAnnouncement = notification.type === 'admin_announcement';

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`flex w-full gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 active:bg-slate-100/80 ${
        read ? 'opacity-75' : 'bg-emerald-50/40'
      }`}
    >
      <NotificationIcon notification={notification} read={read} />
      <div className="min-w-0 flex-1">
        {isAnnouncement && (
          <p className="text-xs font-semibold text-emerald-700">
            {getAnnouncementLabel(notification)}
          </p>
        )}
        <p className={`text-sm leading-snug text-slate-800 ${isAnnouncement ? 'mt-1' : ''}`}>
          {notification.body}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
          {formatNotificationTime(notification.createdAt)}
          {showDirectionBadge && <DirectionBadge direction="incoming" />}
        </p>
      </div>
    </button>
  );
}

function OutgoingNotificationItem({ notification, showDirectionBadge }) {
  const recipientCount = notification.receiverIds?.length || 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <img src={APP_ICON} alt="" className="h-5 w-5 rounded-md object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-slate-800">{notification.body}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
            {formatNotificationTime(notification.createdAt)}
            {showDirectionBadge && <DirectionBadge direction="outgoing" />}
            {recipientCount > 0 && (
              <span className="text-slate-300"> · </span>
            )}
            {recipientCount > 0 && (
              <span>
                {recipientCount}
                {' '}
                {recipientCount === 1 ? 'получатель' : recipientCount < 5 ? 'получателя' : 'получателей'}
              </span>
            )}
            {notification.sendAsPush && (
              <>
                <span className="text-slate-300"> · </span>
                <span>Push</span>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsList({ userId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const isAdmin = canManageNotifications({ profile, uid: userId });
  const [filter, setFilter] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mode = isAdmin
    ? (filter === 'all' ? 'all' : filter === 'outgoing' ? 'outgoing' : 'incoming')
    : 'incoming';

  const { notifications, loading, markRead, isRead } = useNotifications(userId, { mode });

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filter]);

  const visibleNotifications = useMemo(() => {
    if (filter === 'outgoing' && isAdmin) {
      return notifications.filter((notification) => notification.senderId === userId);
    }
    return notifications;
  }, [notifications, filter, isAdmin, userId]);

  const displayedNotifications = visibleNotifications.slice(0, visibleCount);
  const hasMore = visibleNotifications.length > visibleCount;
  const showDirectionBadge = isAdmin && filter === 'all';

  const senderDisplayName = profile?.displayName || user?.displayName || 'Администратор';

  const handleSelect = (notification) => {
    if (!isRead(notification)) {
      markRead(notification.id, notification).catch(() => {});
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const emptyMessage = filter === 'outgoing'
    ? 'Исходящих уведомлений пока нет'
    : 'Пока нет уведомлений';

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex w-full items-center justify-between gap-2">
          <NotificationFilterTabs value={filter} onChange={setFilter} />
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            Создать
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : visibleNotifications.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {emptyMessage}
        </p>
      ) : (
        <>
          <ul className="space-y-3">
            {displayedNotifications.map((notification) => {
              const isOutgoing = filter === 'outgoing' || notification.direction === 'outgoing';

              return (
                <li key={notification.id}>
                  {isOutgoing ? (
                    <OutgoingNotificationItem
                      notification={notification}
                      showDirectionBadge={showDirectionBadge}
                    />
                  ) : (
                    <IncomingNotificationItem
                      notification={notification}
                      read={isRead(notification)}
                      onSelect={handleSelect}
                      showDirectionBadge={showDirectionBadge}
                    />
                  )}
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                className="flex h-9 items-center justify-center rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Показать еще
              </button>
            </div>
          )}
        </>
      )}

      <CreateAnnouncementModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        senderId={userId}
        senderDisplayName={senderDisplayName}
      />
    </div>
  );
}
