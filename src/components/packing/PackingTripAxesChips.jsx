import {
  PACKING_PURPOSES,
  PACKING_TRANSPORTS,
} from '../../utils/packingLists';

const CHIP_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 active:scale-[0.97]';
const CHIP_IDLE = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600';

/**
 * Два ряда чипов: способ поездки × назначение.
 */
export default function PackingTripAxesChips({
  transport,
  purpose,
  onTransportChange,
  onPurposeChange,
  disabled = false,
  transportLabel = 'Способ',
  purposeLabel = 'Назначение',
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{transportLabel}</p>
        <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PACKING_TRANSPORTS.map(({ id, label, idleClassName, activeClassName }) => {
            const active = transport === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onTransportChange?.(id)}
                className={`${CHIP_BASE} shrink-0 ${
                  active ? activeClassName : `${CHIP_IDLE} ${idleClassName}`
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">{purposeLabel}</p>
        <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {PACKING_PURPOSES.map(({ id, label, idleClassName, activeClassName }) => {
            const active = purpose === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                onClick={() => onPurposeChange?.(id)}
                className={`${CHIP_BASE} shrink-0 ${
                  active ? activeClassName : `${CHIP_IDLE} ${idleClassName}`
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
