import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useNotifications } from '../../hooks/useNotifications';

export default function NotificationBell({ userId }) {
  const { user } = useAuth();
  const { familyId } = useUserProfile(user);
  const { unreadCount } = useNotifications(userId, { familyId });

  if (!userId) return null;

  const hasUnread = unreadCount > 0;

  return (
    <Link
      to="/settings/notifications"
      className={`relative flex shrink-0 items-center justify-center rounded-full transition hover:bg-slate-100 active:bg-slate-100/80 ${
        hasUnread
          ? 'h-8 w-8 text-slate-600 hover:text-slate-800'
          : 'h-7 w-7 text-slate-400/80 hover:text-slate-500'
      }`}
      aria-label={
        hasUnread
          ? `Уведомления: ${unreadCount} непрочитанных`
          : 'Уведомления'
      }
    >
      <Bell
        className={hasUnread ? 'h-[18px] w-[18px]' : 'h-[15px] w-[15px]'}
        strokeWidth={hasUnread ? 2 : 1.75}
        aria-hidden
      />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
