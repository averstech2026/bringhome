import { UserAvatar } from '../profile/UserAvatar';

/** Тумблер «доступ для всей семьи». */
export function FamilyToggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
        enabled ? 'bg-emerald-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function AccessDot() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
      <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

/** Аватар участника с состоянием доступа (владелец залочен со звездой). */
export function MemberAvatar({ member, hasAccess, isOwner, onToggle, loading, locked = false }) {
  const name = member.displayName || member.email?.split('@')[0] || '?';

  return (
    <button
      type="button"
      disabled={loading || isOwner || locked}
      onClick={() => onToggle(member.id, hasAccess)}
      title={
        locked
          ? `${name} — доступ для всех`
          : isOwner
            ? `${name} (создатель)`
            : hasAccess
              ? `${name} — убрать доступ`
              : `${name} — дать доступ`
      }
      className={`group flex shrink-0 flex-col items-center gap-1 disabled:cursor-default ${
        isOwner || locked ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <div
        className={`relative transition-opacity duration-200 ${
          hasAccess ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <UserAvatar photoUrl={member.avatarUrl} name={name} className="h-9 w-9 text-xs" />
        {hasAccess && !isOwner && <AccessDot />}
        {isOwner && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[7px] font-bold text-white ring-2 ring-white">
            ★
          </span>
        )}
      </div>
      <span
        className={`max-w-[48px] truncate text-[10px] font-medium ${
          hasAccess ? 'text-slate-600' : 'text-slate-300'
        }`}
      >
        {name.split(' ')[0]}
      </span>
    </button>
  );
}
