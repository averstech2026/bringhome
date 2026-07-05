import {
  BUILTIN_TYPES,
  isBuiltinListType,
  getListTypeLabel,
  getDraftTypeClasses,
  getCustomTypePalette,
} from '../../utils/listTypes';

const BUILTIN_OPTIONS = Object.entries(BUILTIN_TYPES).map(([type, label]) => ({ type, label }));

export default function DraftTypeSwitcher({ value, onChange, disabled }) {
  const isCustom = !isBuiltinListType(value);
  const customPalette = isCustom ? getCustomTypePalette(value) : null;

  return (
    <div className="flex flex-wrap gap-2">
      {isCustom && (
        <button
          type="button"
          disabled
          className={`rounded-full border px-4 py-1.5 text-sm font-medium ${customPalette?.draftActive || 'border-rose-300 bg-rose-50 text-rose-700'}`}
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
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:opacity-40 ${getDraftTypeClasses(type, active)}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
