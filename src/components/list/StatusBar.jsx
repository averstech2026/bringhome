import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getListProgress } from '../../utils/groupByCategory';
import {
  CARD_SURFACE,
  CARD_PAD_V,
  HINT_TEXT,
  ZONE_TITLE,
  PRIMARY_BTN,
} from './cardStyles';

const PILL_CLASS =
  'flex h-6 min-w-[3.5rem] shrink-0 items-center justify-center gap-0.5 rounded-full text-center text-xs font-semibold';

function CheckIcon() {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProgressPill({ checked, total, percent, done = false }) {
  if (done) {
    return (
      <div className={`${PILL_CLASS} bg-emerald-500 text-white`}>
        <CheckIcon />
        <span>
          {checked}/{total}
        </span>
      </div>
    );
  }

  return (
    <div className={`${PILL_CLASS} relative overflow-hidden bg-emerald-50 text-emerald-700`}>
      <div
        className="absolute inset-y-0 left-0 bg-emerald-100 transition-all duration-500 ease-out"
        style={{ width: `${percent}%` }}
      />
      <span className="relative whitespace-nowrap">
        {checked}/{total || 0}
      </span>
    </div>
  );
}

function ClearConfirmDialog({ open, clearing, onConfirm, onCancel }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onCancel}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="clear-list-title"
      >
        <h3 id="clear-list-title" className="text-base font-semibold text-slate-900">
          Очистить весь список?
        </h3>
        <p className="mt-1.5 text-sm text-slate-500">Вы уверены? Все товары будут удалены.</p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={clearing}
            className={`${PRIMARY_BTN} !bg-red-500 !py-3 text-sm hover:!bg-red-600 disabled:opacity-50`}
          >
            {clearing ? 'Очищаем…' : 'Да, очистить'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={clearing}
            className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function StatusBar({ items, onClear, clearing = false }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { total, checked, allDone, percent } = getListProgress(items);
  const remaining = total - checked;
  const done = allDone && total > 0;
  const barPercent = done ? 100 : percent;
  const showClear = Boolean(onClear) && total > 0;

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

    <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-left">
          {done ? (
            <>
              <h2 className={`${ZONE_TITLE} text-emerald-800`}>🎉 Всё собрано!</h2>
              <p className={`mt-0.5 ${HINT_TEXT} text-emerald-600/80`}>
                Все товары собраны — можно отдыхать!
              </p>
            </>
          ) : (
            <>
              <h2 className={ZONE_TITLE}>Соберите список</h2>
              <p className={`mt-0.5 ${HINT_TEXT}`}>
                {total === 0
                  ? 'Добавьте продукты в список'
                  : `Осталось ${remaining} ${pluralItems(remaining)} из ${total}`}
              </p>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          {showClear && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              disabled={clearing}
              className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-40"
            >
              {clearing ? '…' : 'Очистить'}
            </button>
          )}
        </div>
      </div>

      <div className="mt-3 flex w-full items-center gap-3">
        <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-emerald-400 transition-all duration-500 ease-out'}`}
            style={{ width: total > 0 ? `${barPercent}%` : '0%' }}
          />
        </div>
        <ProgressPill checked={checked} total={total} percent={percent} done={done} />
      </div>
    </div>
    </>
  );
}

function pluralItems(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return 'товаров';
  if (mod10 === 1) return 'товар';
  if (mod10 >= 2 && mod10 <= 4) return 'товара';
  return 'товаров';
}
