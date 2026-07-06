import { incrementQuantity, getQuantityDisplay } from '../../utils/quantity';

function TrashIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

const MINUS_ACTIVE =
  'flex h-7 w-7 items-center justify-center rounded-full border border-red-200 bg-white text-sm font-bold text-red-500 shadow-sm transition-all hover:border-red-300 hover:bg-red-50 active:scale-95 disabled:opacity-40';

const MINUS_DISABLED =
  'pointer-events-none flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-sm font-bold text-gray-400 opacity-40';

const PLUS =
  'flex h-7 w-7 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-600 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 disabled:opacity-40';

const LABEL = 'min-w-[32px] text-center text-xs font-semibold text-gray-700';

export default function QuantityStepper({
  quantity,
  disabled,
  onChange,
  onRemove,
  className = 'mr-4',
  variant = 'default',
}) {
  const { count, label } = getQuantityDisplay(quantity);
  const atMinimum = count <= 1;
  const isEmbedded = variant === 'embedded';

  const handleMinus = () => {
    if (atMinimum) {
      onRemove?.();
      return;
    }
    const next = incrementQuantity(quantity, -1);
    if (next) onChange?.(next);
  };

  const handlePlus = () => {
    const next = incrementQuantity(quantity, 1);
    if (next) onChange?.(next);
  };

  const minusClass = isEmbedded && atMinimum ? MINUS_DISABLED : MINUS_ACTIVE;
  const minusDisabled = disabled || (isEmbedded && atMinimum);

  return (
    <div className={`flex shrink-0 items-center gap-2.5 ${className}`}>
      <button
        type="button"
        disabled={minusDisabled}
        onClick={handleMinus}
        aria-label={
          isEmbedded && atMinimum ? 'Минимальное количество' : atMinimum ? 'Удалить' : 'Уменьшить'
        }
        className={minusClass}
      >
        {isEmbedded || !atMinimum ? '−' : <TrashIcon />}
      </button>

      <span className={LABEL}>{label}</span>

      <button
        type="button"
        disabled={disabled}
        onClick={handlePlus}
        aria-label="Увеличить"
        className={PLUS}
      >
        +
      </button>
    </div>
  );
}
