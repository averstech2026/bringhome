import { UserAvatar } from '../profile/UserAvatar';
import { getContextAccent } from '../../utils/contextAccents';

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
  tone = 'shopping',
  ariaLabel = null,
  size = 'md',
}) {
  const accent = getContextAccent(tone);
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const badgeSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <div className={`relative shrink-0 ${className}`}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-busy={isSyncing}
        aria-label={
          ariaLabel
          || (checked && checkedByName ? `Отмечено: ${checkedByName}` : 'Отметить')
        }
        disabled={disabled || isSyncing}
        onClick={onChange}
        className={`group relative flex ${sizeClass} items-center justify-center overflow-hidden rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 ${
          isSyncing ? 'opacity-100 disabled:opacity-100' : ''
        } ${syncSuccessPulse ? 'animate-sync-success-pulse' : ''} ${
          isSyncing
            ? 'border-0 bg-white shadow-none ring-0'
            : checked
              ? `border ${accent.borderActive} bg-white ${accent.shadowActive} ring-1 ${accent.ringActive}`
              : `border ${accent.borderIdle} ${accent.gradientIdle} ${accent.shadowIdle} ${accent.hoverBorder} ${accent.shadowHover} hover:ring-1 ${accent.hoverRing}`
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
                <span
                  className={`absolute -bottom-0.5 -right-0.5 flex ${badgeSize} items-center justify-center overflow-hidden rounded-full ${accent.badge} text-white shadow-sm ring-1 ring-white/90`}
                >
                  <CheckMicroIcon />
                </span>
              )}
            </>
          ) : checked ? (
            <span className={`flex h-full w-full items-center justify-center ${accent.gradientChecked} text-white`}>
              <CheckIcon />
            </span>
          ) : (
            <span className={`flex h-full w-full items-center justify-center transition-colors ${accent.iconIdle}`}>
              <CheckIcon />
            </span>
          )}
        </span>
      </button>
      {isSyncing && (
        <span
          className={`pointer-events-none absolute -inset-0.5 z-10 animate-spin rounded-full border-2 ${accent.syncBorder}`}
          aria-hidden
        />
      )}
    </div>
  );
}
