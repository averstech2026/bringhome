import { Calendar, Sparkles } from 'lucide-react';
import { isOwnerEmail } from '../../services/usersService';
import { isSuperAdmin, isFamilyAdmin } from '../../utils/roles';
import { UserAvatar } from '../profile/UserAvatar';
import { formatUserAiMonthLabel } from '../../utils/aiLimits';
import { UI_THEMES, resolveUiTheme } from '../../utils/uiThemes';

function formatJoinDate(timestamp) {
  if (!timestamp?.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('ru-RU');
}

export function UserRoleBadges({ user, platformAdminUid = null, familyOwnerId = null }) {
  const isOwner = isSuperAdmin(user, platformAdminUid);
  const isHead = Boolean(familyOwnerId && user.id === familyOwnerId && !isOwner);
  const isAdmin = isFamilyAdmin(user, platformAdminUid);

  return (
    <>
      {isOwner && (
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
          Владелец
        </span>
      )}
      {isHead && (
        <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
          Глава
        </span>
      )}
      {isAdmin && (
        <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
          Админ
        </span>
      )}
      {user.disabled && (
        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
          Заблокирован
        </span>
      )}
    </>
  );
}

export function UserMetaLine({ user, family = null }) {
  const showAiStats = user.role !== 'admin' && !isOwnerEmail(user.email) && !isSuperAdmin(user);

  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        <span>с {formatJoinDate(user.createdAt)}</span>
      </span>
      {showAiStats && (
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 shrink-0 text-violet-400" strokeWidth={2} aria-hidden />
          <span>{formatUserAiMonthLabel(user, family)}</span>
        </span>
      )}
      {resolveUiTheme(user) !== 'default' && (
        <span className="inline-flex items-center gap-1">
          <span>Тема: {UI_THEMES[resolveUiTheme(user)].label}</span>
        </span>
      )}
      {user.isChild && <span>Детский аккаунт</span>}
    </div>
  );
}

export default function UserInfoCard({
  user,
  family = null,
  platformAdminUid = null,
  familyOwnerId = null,
  actions = null,
  className = '',
  onClick,
}) {
  const name = user.displayName || user.email || 'Без имени';
  const interactive = Boolean(onClick);

  return (
    <div
      className={`relative flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm ${
        interactive ? 'cursor-pointer transition-colors hover:bg-slate-50' : ''
      } ${className}`}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!interactive) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      <UserAvatar
        photoUrl={user.avatarUrl}
        name={name}
        variant="soft"
        className="h-10 w-10 shrink-0 text-sm"
      />

      <div className="min-w-0 flex-1 pr-1">
        <p className="font-medium text-slate-800">
          {user.displayName || name}
          <UserRoleBadges
            user={user}
            platformAdminUid={platformAdminUid}
            familyOwnerId={familyOwnerId}
          />
        </p>
        {user.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
        <UserMetaLine user={user} family={family} />
      </div>

      {actions}
    </div>
  );
}
