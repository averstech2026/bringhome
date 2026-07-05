import { UserAvatar } from '../profile/UserAvatar';

function CheckMicroIcon() {
  return (
    <svg className="h-1.5 w-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
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
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked && checkedByName ? `Отмечено: ${checkedByName}` : 'Отметить товар'}
      disabled={disabled}
      onClick={onChange}
      className={`relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full transition-all duration-200 disabled:opacity-50 ${
        checked
          ? 'border-2 border-slate-300 bg-white shadow-sm'
          : 'border-2 border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {checked && checkedByName ? (
        <>
          <UserAvatar
            key={checkedByPhotoUrl || checkedByName}
            photoUrl={checkedByPhotoUrl}
            name={checkedByName}
            variant="vivid"
            className="h-full w-full text-[11px]"
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm ring-2 ring-white">
            <CheckMicroIcon />
          </span>
        </>
      ) : checked ? (
        <span className="flex h-full w-full items-center justify-center bg-emerald-500 text-white">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
      ) : null}
    </button>
  );
}
