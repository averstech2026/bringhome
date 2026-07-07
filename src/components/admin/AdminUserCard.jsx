import { useEffect, useRef, useState } from 'react';
import { Calendar, MoreVertical, Sparkles } from 'lucide-react';
import { isOwnerEmail } from '../../services/usersService';
import { UserAvatar } from '../profile/UserAvatar';
import { resolveAiLimits, normalizeAiUsage } from '../../utils/aiLimits';
import { UI_THEMES, resolveUiTheme } from '../../utils/uiThemes';

function formatJoinDate(timestamp) {
  if (!timestamp?.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('ru-RU');
}

function getAiTodayLabel(user) {
  const limits = resolveAiLimits(user);
  const usage = normalizeAiUsage(user.aiUsage);
  return `${usage.daily.count}/${limits.daily}`;
}

function UserActionsMenu({ user, busy, onToggleDisabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const canBlock = !isOwnerEmail(user.email) && user.role !== 'admin';
  const actions = canBlock
    ? [
        {
          key: 'disabled',
          label: user.disabled ? 'Разблокировать участника' : 'Заблокировать участника',
          destructive: !user.disabled,
          onClick: () => onToggleDisabled(user.id, user.disabled),
        },
      ]
    : [];

  useEffect(() => {
    if (!open) return undefined;

    const closeMenu = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [open]);

  if (actions.length === 0) return null;

  return (
    <div className="relative shrink-0 self-start" ref={rootRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setOpen((value) => !value)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        aria-label="Действия с пользователем"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <MoreVertical className="h-4 w-4" strokeWidth={2} aria-hidden />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 overflow-hidden rounded-xl border border-slate-100 bg-white py-1 shadow-lg"
          role="menu"
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              disabled={busy}
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 disabled:opacity-50 ${
                action.destructive ? 'text-red-500' : 'text-slate-700'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMetaLine({ user }) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
      <span className="inline-flex items-center gap-1">
        <Calendar className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
        <span>с {formatJoinDate(user.createdAt)}</span>
      </span>
      {user.role !== 'admin' && !isOwnerEmail(user.email) && (
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 shrink-0 text-violet-400" strokeWidth={2} aria-hidden />
          <span>ИИ сегодня: {getAiTodayLabel(user)}</span>
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

export function AdminUserCard({ user, busy, onEditUser, onToggleDisabled }) {
  const isOwner = isOwnerEmail(user.email);
  const canEdit = !isOwner;

  return (
    <li
      className={`relative flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm ${
        canEdit ? 'cursor-pointer transition-colors hover:bg-slate-50' : ''
      }`}
      onClick={() => canEdit && onEditUser?.(user)}
      onKeyDown={(event) => {
        if (!canEdit) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onEditUser?.(user);
        }
      }}
      role={canEdit ? 'button' : undefined}
      tabIndex={canEdit ? 0 : undefined}
    >
      <UserAvatar
        photoUrl={user.avatarUrl}
        name={user.displayName || user.email}
        variant="soft"
        className="h-10 w-10 shrink-0 text-sm"
      />

      <div className="min-w-0 flex-1 pr-1">
        <p className="font-medium text-slate-800">
          {user.displayName}
          {isOwner ? (
            <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Владелец
            </span>
          ) : (
            user.role === 'admin' && (
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                Админ
              </span>
            )
          )}
          {user.disabled && (
            <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
              Заблокирован
            </span>
          )}
        </p>
        <p className="truncate text-xs text-slate-400">{user.email}</p>
        <UserMetaLine user={user} />
      </div>

      <UserActionsMenu user={user} busy={busy} onToggleDisabled={onToggleDisabled} />
    </li>
  );
}
