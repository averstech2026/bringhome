import { UserAvatar } from '../profile/UserAvatar';

function CheckMicroIcon() {
  return (
    <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default function ItemCheckbox({
  checked,
  onChange,
  disabled,
  checkedByName,
  checkedByPhotoUrl,
  className = '',
  isSyncing = false,
  syncSuccessPulse = false,
}) {
  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-busy={isSyncing}
        aria-label={checked && checkedByName ? `Отмечено: ${checkedByName}` : 'Отметить товар'}
        disabled={disabled || isSyncing}
        onClick={onChange}
        className={`group relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 ${
          isSyncing ? 'opacity-100 disabled:opacity-100' : ''
        } ${syncSuccessPulse ? 'animate-sync-success-pulse' : ''} ${
          isSyncing
            ? 'border-0 bg-white shadow-none ring-0'
            : checked
              ? 'border border-emerald-400/80 bg-white shadow-[0_1px_6px_rgba(16,185,129,0.28)] ring-1 ring-emerald-200/60'
              : 'border border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-[0_1px_6px_rgba(16,185,129,0.1)] hover:border-emerald-400/70 hover:shadow-[0_2px_10px_rgba(16,185,129,0.18)] hover:ring-1 hover:ring-emerald-100/70'
        }`}
      >
        <span className={`relative flex h-full w-full items-center justify-center ${isSyncing ? 'opacity-60' : ''}`}>
        {checked && checkedByName ? (
          <>
            <UserAvatar
              key={checkedByPhotoUrl || checkedByName}
              photoUrl={checkedByPhotoUrl}
              name={checkedByName}
              variant="checkbox"
              className="h-full w-full text-[11px]"
            />
            {!isSyncing && (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center overflow-hidden rounded-full bg-emerald-600 text-white shadow-sm ring-1 ring-white/90">
                <CheckMicroIcon />
              </span>
            )}
          </>
        ) : checked ? (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
            <CheckIcon />
          </span>
        ) : (
          <span className="flex h-full w-full items-center justify-center text-emerald-300/0 transition-colors group-hover:text-emerald-400/70">
            <CheckIcon />
          </span>
        )}
        </span>
      </button>
      {isSyncing && (
        <span
          className="pointer-events-none absolute -inset-0.5 z-10 animate-spin rounded-full border-2 border-emerald-200 border-t-emerald-500"
          aria-hidden
        />
      )}
    </div>
  );
}
