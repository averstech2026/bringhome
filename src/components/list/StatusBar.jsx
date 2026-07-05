import { getListProgress } from '../../utils/groupByCategory';
import { CARD_SURFACE, CARD_PAD_V, HINT_TEXT, ZONE_TITLE } from './cardStyles';

function CheckIcon() {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ProgressPill({ checked, total, percent, done = false }) {
  if (done) {
    return (
      <div className="flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white">
        <CheckIcon />
        <span>{checked}/{total}</span>
      </div>
    );
  }

  return (
    <div className="relative min-w-[72px] overflow-hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
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

export default function StatusBar({ items }) {
  const { total, checked, allDone, percent } = getListProgress(items);
  const remaining = total - checked;

  if (allDone && total > 0) {
    return (
      <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-left">
            <h2 className={`${ZONE_TITLE} text-emerald-800`}>Готово к выходу</h2>
            <p className={`mt-0.5 ${HINT_TEXT} text-emerald-600/80`}>
              Все {total} {pluralItems(total)} собраны — можно идти!
            </p>
          </div>
          <ProgressPill checked={checked} total={total} percent={100} done />
        </div>
      </div>
    );
  }

  return (
    <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 text-left">
          <h2 className={ZONE_TITLE}>Соберите список</h2>
          <p className={`mt-0.5 ${HINT_TEXT}`}>
            {total === 0
              ? 'Добавьте продукты в список'
              : `Осталось ${remaining} ${pluralItems(remaining)} из ${total}`}
          </p>
        </div>
        <ProgressPill checked={checked} total={total} percent={percent} />
      </div>

      {total > 0 && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
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
