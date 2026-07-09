import { useEffect, useRef, useState } from 'react';
import { MoreVertical } from 'lucide-react';
import { isOwnerEmail } from '../../services/usersService';
import { ROLES } from '../../utils/roles';
import UserInfoCard from './UserInfoCard';

function UserActionsMenu({ user, busy, onEditUser, onToggleDisabled }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const canEdit = !isOwnerEmail(user.email) && user.role !== ROLES.SUPER_ADMIN;
  const canBlock = canEdit && user.role !== ROLES.FAMILY_ADMIN && user.role !== 'admin';
  const actions = [
    ...(canEdit && onEditUser
      ? [{
          key: 'edit',
          label: 'Настройки',
          onClick: () => onEditUser(user),
        }]
      : []),
    ...(canBlock
      ? [{
          key: 'disabled',
          label: user.disabled ? 'Разблокировать участника' : 'Заблокировать участника',
          destructive: !user.disabled,
          onClick: () => onToggleDisabled(user.id, user.disabled),
        }]
      : []),
  ];

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

export function AdminUserCard({
  user,
  family = null,
  platformAdminUid = null,
  busy,
  onEditUser,
  onToggleDisabled,
}) {
  const isOwner = isOwnerEmail(user.email);
  const canEdit = !isOwner && user.role !== ROLES.SUPER_ADMIN;

  return (
    <li>
      <UserInfoCard
        user={user}
        family={family}
        platformAdminUid={platformAdminUid}
        familyOwnerId={family?.ownerId}
        onClick={canEdit ? () => onEditUser?.(user) : undefined}
        actions={(
          <UserActionsMenu
            user={user}
            busy={busy}
            onEditUser={canEdit ? onEditUser : undefined}
            onToggleDisabled={onToggleDisabled}
          />
        )}
      />
    </li>
  );
}
