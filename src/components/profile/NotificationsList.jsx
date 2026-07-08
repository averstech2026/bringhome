import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';

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

export default function NotificationsList({ userId }) {
  const navigate = useNavigate();
  const { notifications, loading, markRead } = useNotifications(userId);

  const handleSelect = (notification) => {
    if (!notification.isRead) {
      markRead(notification.id).catch(() => {});
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">Пока нет уведомлений</p>
    );
  }

  return (
    <ul className="space-y-3">
      {notifications.map((notification) => (
        <li key={notification.id}>
          <button
            type="button"
            onClick={() => handleSelect(notification)}
            className={`flex w-full gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3.5 text-left shadow-sm transition hover:bg-slate-50 active:bg-slate-100/80 ${
              notification.isRead ? 'opacity-75' : 'bg-emerald-50/40'
            }`}
          >
            {!notification.isRead && (
              <span
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500"
                aria-hidden
              />
            )}
            <div className={`min-w-0 flex-1 ${notification.isRead ? 'pl-5' : ''}`}>
              <p className="text-sm leading-snug text-slate-800">{notification.body}</p>
              <p className="mt-1 text-[11px] text-slate-400">
                {formatNotificationTime(notification.createdAt)}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
