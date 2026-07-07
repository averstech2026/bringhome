import { useEffect, useState } from 'react';
import { Delete, Trash2, X } from 'lucide-react';
import {
  parseQuantity,
  formatQuantity,
  getQuantityStep,
  roundQuantityCount,
  abbreviateUnit,
  getUnitPickerOptions,
  resolvePickerUnit,
} from '../../utils/quantity';
import { PRIMARY_BTN } from './cardStyles';

const UNIT_CHIP =
  'shrink-0 rounded-full px-2 py-1 text-[11px] font-medium transition-colors';
const UNIT_CHIP_ACTIVE = 'bg-emerald-500 text-white';
const UNIT_CHIP_IDLE = 'bg-slate-50 text-slate-600 hover:bg-slate-100';

const KEY_CLASS =
  'flex h-12 items-center justify-center rounded-full bg-[#f5f5f7] text-lg font-semibold text-slate-800 transition-all duration-150 hover:bg-slate-200/70 active:scale-[0.97]';

const KEY_ACTION_CLASS =
  'flex h-12 items-center justify-center rounded-full bg-slate-200/60 text-sm font-semibold text-slate-600 transition-all duration-150 hover:bg-slate-300/60 active:scale-[0.97]';

const QUICK_STEP_CLASS =
  'flex-1 rounded-full bg-emerald-50 py-2.5 text-xs font-semibold text-emerald-700 transition-all duration-150 hover:bg-emerald-100 active:scale-[0.97]';

function normalizeInput(value) {
  return value.replace(',', '.');
}

function appendDigit(current, digit, replace = false) {
  if (replace) return String(digit);
  const normalized = normalizeInput(current);
  if (normalized === '0') return String(digit);
  if (normalized.length >= 6) return current;
  return `${normalized}${digit}`;
}

function appendDecimal(current, replace = false) {
  if (replace) return '0.';
  const normalized = normalizeInput(current);
  if (!normalized) return '0.';
  if (normalized.includes('.')) return current;
  return `${normalized}.`;
}

function backspace(current) {
  const normalized = normalizeInput(current);
  return normalized.slice(0, -1);
}

function addStep(current, step, unit) {
  const normalized = normalizeInput(current);
  const base = normalized ? parseFloat(normalized) : 0;
  if (!Number.isFinite(base)) return current;
  return String(roundQuantityCount(base + step, unit));
}

export default function QuantityEditModal({ quantity, open, onClose, onSave, onRemove, itemName }) {
  const { count, unit } = parseQuantity(quantity);
  const [value, setValue] = useState(String(count));
  const [selectedUnit, setSelectedUnit] = useState(unit);
  const [replaceOnInput, setReplaceOnInput] = useState(true);

  useEffect(() => {
    if (!open) return undefined;
    const parsed = parseQuantity(quantity);
    setValue(String(parsed.count));
    setSelectedUnit(resolvePickerUnit(parsed.unit));
    setReplaceOnInput(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, quantity]);

  if (!open) return null;

  const displayUnit = abbreviateUnit(selectedUnit);
  const normalized = normalizeInput(value);
  const parsed = parseFloat(normalized);
  const isValid = Number.isFinite(parsed) && parsed > 0;
  const step = getQuantityStep(formatQuantity(parsed || 1, selectedUnit));
  const unitOptions = getUnitPickerOptions(selectedUnit);

  const handleSave = () => {
    if (!isValid) return;
    onSave?.(formatQuantity(roundQuantityCount(parsed, selectedUnit), selectedUnit));
    onClose?.();
  };

  const handleRemove = () => {
    onRemove?.();
    onClose?.();
  };

  const clearReplaceMode = () => {
    setReplaceOnInput(false);
  };

  const handleKey = (key) => {
    if (key === 'backspace') {
      clearReplaceMode();
      setValue((v) => backspace(v));
      return;
    }
    if (key === 'decimal') {
      setValue((v) => appendDecimal(v, replaceOnInput));
      clearReplaceMode();
      return;
    }
    if (key === 'clear') {
      setValue('');
      setReplaceOnInput(true);
      return;
    }
    setValue((v) => appendDigit(v, key, replaceOnInput));
    clearReplaceMode();
  };

  const quickSteps =
    step === 100
      ? [
          { label: '+100', delta: 100 },
          { label: '+500', delta: 500 },
          { label: '+1000', delta: 1000 },
        ]
      : step === 0.5
        ? [
            { label: '+0.5', delta: 0.5 },
            { label: '+1', delta: 1 },
            { label: '+5', delta: 5 },
          ]
        : [
            { label: '+1', delta: 1 },
            { label: '+5', delta: 5 },
            { label: '+10', delta: 10 },
          ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
      />

      <div
        className="relative w-full max-w-sm rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quantity-modal-title"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
          <div className="min-w-0">
            <p id="quantity-modal-title" className="text-sm font-semibold text-slate-800">
              Количество
            </p>
            {itemName && (
              <p className="mt-0.5 truncate text-xs text-slate-400">{itemName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pt-4">
          <div
            className={`rounded-2xl px-4 py-5 text-center transition-all ${
              replaceOnInput
                ? 'bg-emerald-50 ring-2 ring-emerald-200/80'
                : 'bg-slate-50'
            }`}
          >
            <div
              className={`min-h-[2.5rem] text-4xl font-bold tabular-nums tracking-tight ${
                replaceOnInput ? 'text-emerald-700' : 'text-slate-900'
              }`}
            >
              {normalized || '0'}
            </div>
            <div className="mt-1 text-sm font-medium text-slate-400">{displayUnit}</div>
          </div>

          <div className="mt-3 flex flex-nowrap items-center justify-center gap-1">
            {unitOptions.map((u) => {
              const isActive = abbreviateUnit(selectedUnit) === abbreviateUnit(u);
              return (
                <button
                  key={abbreviateUnit(u)}
                  type="button"
                  onClick={() => setSelectedUnit(u)}
                  aria-pressed={isActive}
                  className={`${UNIT_CHIP} ${isActive ? UNIT_CHIP_ACTIVE : UNIT_CHIP_IDLE}`}
                >
                  {abbreviateUnit(u)}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            {quickSteps.map(({ label, delta }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  clearReplaceMode();
                  setValue((v) => addStep(v, delta, selectedUnit));
                }}
                className={QUICK_STEP_CLASS}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {['1', '2', '3'].map((digit) => (
              <button key={digit} type="button" onClick={() => handleKey(digit)} className={KEY_CLASS}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => handleKey('backspace')} className={KEY_ACTION_CLASS} aria-label="Стереть">
              <Delete className="h-5 w-5" />
            </button>

            {['4', '5', '6'].map((digit) => (
              <button key={digit} type="button" onClick={() => handleKey(digit)} className={KEY_CLASS}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => handleKey('decimal')} className={KEY_ACTION_CLASS}>
              ,
            </button>

            {['7', '8', '9'].map((digit) => (
              <button key={digit} type="button" onClick={() => handleKey(digit)} className={KEY_CLASS}>
                {digit}
              </button>
            ))}
            <button type="button" onClick={() => handleKey('clear')} className={KEY_ACTION_CLASS}>
              C
            </button>

            <button type="button" onClick={() => handleKey('0')} className={`${KEY_CLASS} col-span-2`}>
              0
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className={`col-span-2 flex h-12 items-center justify-center ${PRIMARY_BTN} !w-auto !py-0 text-sm`}
            >
              Готово
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-100 p-4">
          {onRemove && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-red-200 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.98]"
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              Удалить
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
