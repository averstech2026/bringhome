import { useState } from 'react';
import { getListProgress } from '../../utils/groupByCategory';
import ConfirmModal from '../ui/ConfirmModal';
import { getContextAccent } from '../../utils/contextAccents';

const PILL_CLASS =
  'flex h-5 min-w-[2.75rem] shrink-0 items-center justify-center gap-0.5 rounded-full text-center text-[11px] font-semibold tabular-nums';

function CheckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProgressPill({ checked, total, percent, done = false, accent }) {
  if (done) {
    return (
      <div className={`${PILL_CLASS} ${accent.barDone} text-white`}>
        <CheckIcon />
        <span>
          {checked}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className={`${PILL_CLASS} relative overflow-hidden ${accent.pillBg} ${accent.pillText}`}>
      <div
        className={`absolute inset-y-0 left-0 ${accent.pillFill} transition-all duration-500 ease-out`}
        style={{ width: `${percent}%` }}
      />
      <span className="relative whitespace-nowrap">
        {checked}/{total || 0}
      </span>
    </div>
  );
}

function ClearConfirmDialog({ open, clearing, onConfirm, onCancel }) {
  return (
    <ConfirmModal
      open={open}
      title="Очистить весь список?"
      titleId="clear-list-title"
      message="Вы уверены? Все товары будут удалены."
      confirmLabel="Да, очистить"
      confirming={clearing}
      confirmingLabel="Очищаем…"
      onConfirm={onConfirm}
      onCancel={onCancel}
      destructive
    />
  );
}

function ClearButton({ clearing, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={clearing}
      title="Очистить список"
      aria-label="Очистить список"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );
}

export default function ListHeaderProgress({
  items,
  onClear,
  clearing = false,
  inline = false,
  className = '',
  ariaLabel = null,
  tone = 'shopping',
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const accent = getContextAccent(tone);
  const { total, checked, allDone, percent } = getListProgress(items);
  const done = allDone && total > 0;
  const barPercent = done ? 100 : percent;
  const showClear = Boolean(onClear) && total > 0;
  const progressAriaLabel = ariaLabel || `Куплено ${checked} из ${total}`;

  const handleConfirmClear = () => {
    onClear?.();
    setConfirmOpen(false);
  };

  return (
    <>
      <ClearConfirmDialog
        open={confirmOpen}
        clearing={clearing}
        onConfirm={handleConfirmClear}
        onCancel={() => setConfirmOpen(false)}
      />

      <div
        className={`flex items-center gap-1.5 ${
          inline ? 'min-w-0 flex-1' : ''
        } ${className}`}
      >
        <div
          className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100"
          role="progressbar"
          aria-valuenow={checked}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={progressAriaLabel}
        >
          <div
            className={`h-full rounded-full ${done ? accent.barDone : `${accent.bar} transition-all duration-500 ease-out`}`}
            style={{ width: total > 0 ? `${barPercent}%` : '0%' }}
          />
        </div>
        <ProgressPill
          checked={checked}
          total={total}
          percent={percent}
          done={done}
          accent={accent}
        />
        {showClear && !inline && (
          <ClearButton clearing={clearing} onClick={() => setConfirmOpen(true)} />
        )}
      </div>
    </>
  );
}
