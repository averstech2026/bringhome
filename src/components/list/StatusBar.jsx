import { Trash2 } from 'lucide-react';
import { getListProgress } from '../../utils/groupByCategory';
import {
  CARD_SURFACE,
  CARD_PAD_V,
  HINT_TEXT,
  ZONE_TITLE,
  HEADER_CONTROL_INSET,
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

export default function StatusBar({ items, onClear, clearing = false }) {
  const { total, checked, allDone, percent } = getListProgress(items);
  const remaining = total - checked;
  const done = allDone && total > 0;
  const barPercent = done ? 100 : percent;
  const showClear = Boolean(onClear) && total > 0;

  return (
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
        <div className="flex shrink-0 items-center gap-2">
          {showClear && (
            <button
              type="button"
              onClick={onClear}
              disabled={clearing}
              title="Очистить список"
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4 text-gray-400 transition-colors hover:text-red-500" />
            </button>
          )}
          <ProgressPill checked={checked} total={total} percent={percent} done={done} />
        </div>
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-emerald-400 transition-all duration-500 ease-out'}`}
          style={{ width: total > 0 ? `${barPercent}%` : '0%' }}
        />
      </div>
    </div>
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
