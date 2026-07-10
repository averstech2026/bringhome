import { useEffect, useRef, useState } from 'react';
import { MoreVertical, RotateCcw } from 'lucide-react';
import { isOwnerEmail } from '../../services/usersService';
import { ROLES } from '../../utils/roles';
import { isOnboardingCompleted } from '../../utils/onboardingContent';
import UserInfoCard from './UserInfoCard';

function buildMemberActions({ user, onEditUser, onToggleDisabled }) {
  const canEdit = !isOwnerEmail(user.email) && user.role !== ROLES.SUPER_ADMIN;
  const canBlock = canEdit && user.role !== ROLES.FAMILY_ADMIN && user.role !== 'admin';

  return [
    ...(canEdit && onEditUser
      ? [{
          key: 'edit',
          label: 'Настройки',
          onClick: () => onEditUser(user),
        }]
      : []),
    ...(canBlock && onToggleDisabled
      ? [{
          key: 'disabled',
          label: user.disabled ? 'Разблокировать участника' : 'Заблокировать участника',
          destructive: !user.disabled,
          onClick: () => onToggleDisabled(user.id, user.disabled),
        }]
      : []),
  ];
}

function OnboardingStatusBadge({ user, interactive = false, busy = false, onReset }) {
  const completed = isOnboardingCompleted(user);
  const label = completed ? 'Знакомство пройдено' : 'Знакомство не пройдено';
  const className = `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium leading-none ${
    completed
      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
      : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200/80'
  } ${
    interactive
      ? 'cursor-pointer transition hover:ring-2 hover:ring-emerald-200/80 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
      : ''
  }`;

  if (!interactive) {
    return <span className={className}>{label}</span>;
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={(event) => {
        event.stopPropagation();
        onReset?.(user.id);
      }}
      className={className}
      title="Сбросить знакомство"
      aria-label={`${label}. Сбросить знакомство`}
    >
      {label}
      <RotateCcw className="h-2.5 w-2.5 shrink-0 opacity-50" strokeWidth={2.5} aria-hidden />
    </button>
  );
}

function UserActionsMenu({ actions, busy }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

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

  if (actions.length === 0) {
    return <span className="block h-8 w-8 shrink-0" aria-hidden />;
  }

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

export function AdminUserCard({
  user,
  family = null,
  platformAdminUid = null,
  busy,
  onEditUser,
  onToggleDisabled,
  showOnboardingStatus = false,
  onResetOnboarding,
}) {
  const isOwner = isOwnerEmail(user.email);
  const canEdit = !isOwner && user.role !== ROLES.SUPER_ADMIN;
  const menuActions = buildMemberActions({ user, onEditUser, onToggleDisabled });
  const canResetOnboarding = showOnboardingStatus && Boolean(onResetOnboarding);

  return (
    <li>
      <UserInfoCard
        user={user}
        family={family}
        platformAdminUid={platformAdminUid}
        familyOwnerId={family?.ownerId}
        onClick={canEdit ? () => onEditUser?.(user) : undefined}
        extraMeta={showOnboardingStatus ? (
          <OnboardingStatusBadge
            user={user}
            interactive={canResetOnboarding}
            busy={busy}
            onReset={onResetOnboarding}
          />
        ) : null}
        actions={<UserActionsMenu actions={menuActions} busy={busy} />}
      />
    </li>
  );
}
