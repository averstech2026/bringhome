import { useState } from 'react';
import {
  incrementQuantity,
  getQuantityDisplay,
  getMinimumCount,
  parseQuantity,
} from '../../utils/quantity';
import QuantityEditModal from './QuantityEditModal';

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

const STEP_BTN_BORDER = 'border border-gray-200/90';

const MINUS_ACTIVE =
  `flex h-7 w-7 items-center justify-center rounded-lg ${STEP_BTN_BORDER} bg-transparent text-sm font-bold text-red-500 transition-all hover:border-gray-300 hover:bg-red-50/50 active:scale-95 disabled:opacity-40`;

const MINUS_DISABLED =
  `pointer-events-none flex h-7 w-7 items-center justify-center rounded-lg ${STEP_BTN_BORDER} bg-transparent text-sm font-bold text-gray-400 opacity-40`;

const PLUS =
  `flex h-7 w-7 items-center justify-center rounded-lg ${STEP_BTN_BORDER} bg-transparent text-sm font-bold text-emerald-600 transition-all hover:border-gray-300 hover:bg-emerald-50/50 active:scale-95 disabled:opacity-40`;

const LABEL =
  'flex w-[4.25rem] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-white px-1 py-0.5 text-center text-xs font-medium text-slate-700 tabular-nums shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:bg-emerald-50/40 hover:text-emerald-800 active:scale-[0.97] disabled:cursor-not-allowed';

const LABEL_EMBEDDED =
  'flex w-[3rem] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-white px-1 py-0.5 text-center text-[11px] font-medium text-slate-700 tabular-nums shadow-[inset_0_1px_2px_rgba(15,23,42,0.05)] transition-all hover:bg-emerald-50/40 hover:text-emerald-800 active:scale-[0.97] disabled:cursor-not-allowed';

const MINUS_EMBEDDED =
  `flex h-6 w-6 items-center justify-center rounded-md ${STEP_BTN_BORDER} bg-transparent text-xs font-bold text-red-500 transition-all hover:border-gray-300 hover:bg-red-50/50 active:scale-95 disabled:opacity-40`;

const MINUS_EMBEDDED_DISABLED =
  `pointer-events-none flex h-6 w-6 items-center justify-center rounded-md ${STEP_BTN_BORDER} bg-transparent text-xs font-bold text-gray-400 opacity-40`;

const PLUS_EMBEDDED =
  `flex h-6 w-6 items-center justify-center rounded-md ${STEP_BTN_BORDER} bg-transparent text-xs font-bold text-emerald-600 transition-all hover:border-gray-300 hover:bg-emerald-50/50 active:scale-95 disabled:opacity-40`;

const STEPPER_COMPACT =
  'flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-50/80 px-1 py-0.5';

const STEPPER_EMBEDDED =
  'flex shrink-0 items-center gap-1 rounded-lg bg-slate-50/80 px-1 py-0.5';

const STEPPER_SHELL = `ml-auto ${STEPPER_COMPACT}`;

export default function QuantityStepper({
  quantity,
  disabled,
  onChange,
  onRemove,
  className = '',
  variant = 'default',
  itemName,
}) {
  const [editOpen, setEditOpen] = useState(false);
  const { count, label } = getQuantityDisplay(quantity);
  const minCount = getMinimumCount(quantity);
  const atMinimum = count <= minCount;
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

  const handleManualSave = (newQuantity) => {
    const { count: newCount } = parseQuantity(newQuantity);
    if (newCount < minCount) {
      onRemove?.();
      return;
    }
    onChange?.(newQuantity);
  };

  const minusClass = isEmbedded
    ? atMinimum
      ? MINUS_EMBEDDED_DISABLED
      : MINUS_EMBEDDED
    : atMinimum
      ? MINUS_DISABLED
      : MINUS_ACTIVE;
  const plusClass = isEmbedded ? PLUS_EMBEDDED : PLUS;
  const labelClass = isEmbedded ? LABEL_EMBEDDED : LABEL;
  const minusDisabled = disabled || (isEmbedded && atMinimum);
  const shellClass = isEmbedded ? `${STEPPER_EMBEDDED} ${className}` : `${STEPPER_SHELL} ${className}`;

  return (
    <>
      <div className={shellClass}>
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

        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditOpen(true)}
          className={`${labelClass} ${disabled ? 'pointer-events-none opacity-40' : ''}`}
          aria-label={`Количество: ${label}. Нажмите для изменения`}
        >
          {label}
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={handlePlus}
          aria-label="Увеличить"
          className={plusClass}
        >
          +
        </button>
      </div>

      <QuantityEditModal
        quantity={quantity}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleManualSave}
        itemName={itemName}
      />
    </>
  );
}
