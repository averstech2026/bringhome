import { UserAvatar } from '../profile/UserAvatar';

function CheckMicroIcon() {
  return (
    <svg className="h-1.5 w-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
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
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked && checkedByName ? `Отмечено: ${checkedByName}` : 'Отметить товар'}
      disabled={disabled}
      onClick={onChange}
      className={`group relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all duration-200 active:scale-95 disabled:opacity-50 ${className} ${
        checked
          ? 'border-2 border-emerald-400 bg-white shadow-[0_2px_10px_rgba(16,185,129,0.35)] ring-2 ring-emerald-100'
          : 'border-2 border-emerald-200/80 bg-gradient-to-br from-white to-emerald-50/40 shadow-[0_2px_8px_rgba(16,185,129,0.12)] hover:border-emerald-400 hover:shadow-[0_4px_14px_rgba(16,185,129,0.22)] hover:ring-2 hover:ring-emerald-100'
      }`}
    >
      {checked && checkedByName ? (
        <>
          <UserAvatar
            key={checkedByPhotoUrl || checkedByName}
            photoUrl={checkedByPhotoUrl}
            name={checkedByName}
            variant="checkbox"
            className="h-full w-full text-[11px]"
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
            <CheckMicroIcon />
          </span>
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
    </button>
  );
}
