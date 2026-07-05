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

export default function QuantityStepper({ quantity, disabled, onChange, onRemove }) {
  const { count, label } = getQuantityDisplay(quantity);
  const atMinimum = count <= 1;

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

  return (
    <div className="mr-4 flex shrink-0 items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={handleMinus}
        aria-label={atMinimum ? 'Удалить' : 'Уменьшить'}
        className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-sm transition-colors disabled:opacity-40 ${
          atMinimum
            ? 'bg-red-50 text-red-400 hover:bg-red-100'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {atMinimum ? <TrashIcon /> : '−'}
      </button>

      <span className="mx-2 min-w-[24px] text-center text-sm font-semibold text-gray-700">
        {label}
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={handlePlus}
        aria-label="Увеличить"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600 transition-colors hover:bg-emerald-100 disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
