import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useNotifications } from '../../hooks/useNotifications';
import { canManageNotifications } from '../../utils/notificationAdmin';
import CreateAnnouncementModal from './CreateAnnouncementModal';

const APP_ICON = `${import.meta.env.BASE_URL || '/'}icons/logo.png`;

function NotificationFilterTabs({ value, onChange }) {
  const tabs = [
    { id: 'incoming', label: 'Входящие' },
    { id: 'outgoing', label: 'Исходящие' },
  ];

  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const active = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-1.5 text-sm transition-all ${
              active
                ? 'border border-slate-200/60 bg-slate-100 font-semibold text-slate-900'
                : 'border border-transparent bg-white text-slate-500 hover:text-slate-800'
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

function IncomingNotificationItem({ notification, read, onSelect }) {
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
        <p className="mt-1 text-[11px] text-slate-400">
          {formatNotificationTime(notification.createdAt)}
        </p>
      </div>
    </button>
  );
}

function OutgoingNotificationItem({ notification }) {
  const recipientCount = notification.receiverIds?.length || 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
          <img src={APP_ICON} alt="" className="h-5 w-5 rounded-md object-cover" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-slate-800">{notification.body}</p>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {formatNotificationTime(notification.createdAt)}
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
  const [filter, setFilter] = useState('incoming');
  const [createOpen, setCreateOpen] = useState(false);

  const mode = isAdmin && filter === 'outgoing' ? 'outgoing' : 'incoming';
  const { notifications, loading, markRead, isRead } = useNotifications(userId, { mode });

  const visibleNotifications = useMemo(() => {
    if (!isAdmin || filter === 'incoming') return notifications;
    return notifications.filter((notification) => notification.senderId === userId);
  }, [notifications, isAdmin, filter, userId]);

  const senderDisplayName = profile?.displayName || user?.displayName || 'Администратор';

  const handleSelect = (notification) => {
    if (!isRead(notification)) {
      markRead(notification.id, notification).catch(() => {});
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <div className="space-y-4">
      {isAdmin && (
        <NotificationFilterTabs value={filter} onChange={setFilter} />
      )}

      {isAdmin && (
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-emerald-200 bg-white py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 active:bg-emerald-100/80"
        >
          <span className="text-base leading-none" aria-hidden>+</span>
          Новое уведомление
        </button>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        </div>
      ) : visibleNotifications.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">
          {filter === 'outgoing' ? 'Исходящих уведомлений пока нет' : 'Пока нет уведомлений'}
        </p>
      ) : (
        <ul className="space-y-3">
          {visibleNotifications.map((notification) => (
            <li key={notification.id}>
              {filter === 'outgoing' ? (
                <OutgoingNotificationItem notification={notification} />
              ) : (
                <IncomingNotificationItem
                  notification={notification}
                  read={isRead(notification)}
                  onSelect={handleSelect}
                />
              )}
            </li>
          ))}
        </ul>
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
