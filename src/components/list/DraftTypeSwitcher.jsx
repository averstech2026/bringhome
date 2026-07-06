import {
  BUILTIN_TYPES,
  isBuiltinListType,
  getListTypeLabel,
  getDraftTypeClasses,
  getCustomTypePalette,
} from '../../utils/listTypes';

const BUILTIN_OPTIONS = Object.entries(BUILTIN_TYPES).map(([type, label]) => ({ type, label }));

export default function DraftTypeSwitcher({ value, onChange, disabled, variant = 'default' }) {
  const isCustom = !isBuiltinListType(value);
  const customPalette = isCustom ? getCustomTypePalette(value) : null;
  const compact = variant === 'compact';

  const shellClass = compact
    ? 'flex min-w-0 flex-1 items-center gap-1 overflow-x-auto no-scrollbar'
    : 'flex flex-wrap gap-2';

  const btnClass = compact
    ? 'shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-40'
    : 'rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:opacity-40';

  return (
    <div className={shellClass}>
      {isCustom && (
        <button
          type="button"
          disabled
          className={`${btnClass} ${customPalette?.draftActive || 'border-rose-300 bg-rose-50 text-rose-700'}`}
        >
          {getListTypeLabel(value)}
        </button>
      )}

      {BUILTIN_OPTIONS.map(({ type, label }) => {
        const active = value === type;
        return (
          <button
            key={type}
            type="button"
            disabled={disabled}
            onClick={() => onChange(type)}
            className={`${btnClass} ${getDraftTypeClasses(type, active)}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
