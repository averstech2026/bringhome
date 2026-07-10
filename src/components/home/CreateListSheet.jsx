import { useEffect, useMemo, useRef, useState } from 'react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import { CHIP_BUTTON_SURFACE, PRIMARY_BTN } from '../list/cardStyles';
import { sanitizeCustomTypeName } from '../../utils/listTypes';
import {
  addDays,
  getNextWeekend,
  getToday,
  isSameDay,
  isToday,
  startOfDay,
} from '../../utils/listSchedule';

const TYPE_OPTIONS = [
  {
    type: 'home',
    label: '+ Домой',
    idleClassName:
      'border-emerald-200 text-emerald-700 hover:bg-emerald-50/60 active:bg-emerald-50',
  },
  {
    type: 'cottage',
    label: '+ Дача',
    idleClassName: 'border-amber-200 text-amber-800 hover:bg-amber-50/60 active:bg-amber-50',
  },
  {
    type: 'trip',
    label: '+ В дорогу',
    idleClassName: 'border-sky-200 text-sky-700 hover:bg-sky-50/60 active:bg-sky-50',
  },
];

const SCHEDULE_PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'weekend', label: 'В выходные' },
];

const CHIP_BASE = `${CHIP_BUTTON_SURFACE} border transition-colors`;
const CHIP_ACTIVE = 'border-emerald-300 bg-emerald-50 text-emerald-700';
const CHIP_IDLE = 'border-gray-200/80 text-slate-600 hover:border-gray-300';

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SelectionChip({ active, onClick, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CHIP_BASE} ${active ? CHIP_ACTIVE : CHIP_IDLE} ${className}`}
    >
      {children}
    </button>
  );
}

function resolvePresetDate(preset, today) {
  if (preset === 'tomorrow') return addDays(today, 1);
  if (preset === 'weekend') return getNextWeekend(today);
  return null;
}

function detectPreset(date, today) {
  if (!date || isToday(date, today)) return 'today';
  if (isSameDay(date, addDays(today, 1))) return 'tomorrow';
  if (isSameDay(date, getNextWeekend(today))) return 'weekend';
  return 'custom';
}

export default function CreateListSheet({
  open,
  onClose,
  onConfirm,
  canCreateCustom = false,
  onRequestCustom,
}) {
  const today = useMemo(() => getToday(), []);
  const [selectedType, setSelectedType] = useState('home');
  const [selectedPreset, setSelectedPreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const inputRef = useRef(null);
  const customFormRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setSelectedType('home');
      setSelectedPreset('today');
      setCustomDate(null);
      setCalendarOpen(false);
      setCustomMode(false);
      setCustomName('');
    }
  }, [open]);

  useEffect(() => {
    if (open && customMode) inputRef.current?.focus();
  }, [open, customMode]);

  const selectedDate = selectedPreset === 'custom'
    ? customDate
    : resolvePresetDate(selectedPreset, today);

  const cancelCustom = () => {
    setCustomMode(false);
    setCustomName('');
    setSelectedType('home');
  };

  const handleCustomBlur = () => {
    window.setTimeout(() => {
      if (customFormRef.current?.contains(document.activeElement)) return;
      cancelCustom();
    }, 0);
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = sanitizeCustomTypeName(customName);
      if (!name) return;
      setSelectedType(name);
      setCustomMode(false);
      setCustomName('');
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelCustom();
    }
  };

  const handleNewClick = () => {
    if (canCreateCustom) {
      setCustomMode(true);
      setSelectedType('');
    } else {
      onRequestCustom?.();
    }
  };

  const selectPreset = (preset) => {
    setSelectedPreset(preset);
    setCustomDate(null);
    setCalendarOpen(false);
  };

  const handleCalendarDate = (date) => {
    if (!date) {
      selectPreset('today');
      return;
    }

    const preset = detectPreset(date, today);
    if (preset === 'custom') {
      setSelectedPreset('custom');
      setCustomDate(startOfDay(date));
      setCalendarOpen(true);
      return;
    }

    selectPreset(preset);
  };

  const resolvedType = customMode ? '' : selectedType;
  const canSubmit = Boolean(resolvedType) && !customMode;

  const handleSubmit = () => {
    if (!canSubmit) return;

    const scheduledFor = selectedPreset === 'today' ? null : selectedDate;
    onConfirm?.({ type: resolvedType, scheduledFor });
  };

  const calendarActive = calendarOpen || selectedPreset === 'custom';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="create-list-sheet-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]`}
    >
      <div className="px-5 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <h2 id="create-list-sheet-title" className="text-lg font-bold text-slate-900">
          Новый список
        </h2>
        <p className="mt-1 text-sm text-slate-500">Выберите тип списка и дату</p>

        <p className="mt-5 text-sm font-medium text-slate-700">Тип списка</p>
        <div className="mt-2.5 flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1 no-scrollbar">
          {TYPE_OPTIONS.map(({ type, label, idleClassName }) => {
            const active = !customMode && selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setCustomMode(false);
                  setSelectedType(type);
                }}
                className={`${CHIP_BASE} shrink-0 ${active ? CHIP_ACTIVE : idleClassName}`}
              >
                {label}
              </button>
            );
          })}

          {customMode && canCreateCustom ? (
            <div
              ref={customFormRef}
              className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white py-1.5 pl-3 pr-1.5"
            >
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onBlur={handleCustomBlur}
                onKeyDown={handleCustomKeyDown}
                placeholder="Название..."
                className="w-[7rem] flex-shrink-0 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                maxLength={32}
              />
              <button
                type="button"
                disabled={!sanitizeCustomTypeName(customName)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  const name = sanitizeCustomTypeName(customName);
                  if (!name) return;
                  setSelectedType(name);
                  setCustomMode(false);
                  setCustomName('');
                }}
                aria-label="Подтвердить"
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 disabled:opacity-40"
              >
                <CheckIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleNewClick}
              className={`${CHIP_BASE} shrink-0 ${
                !customMode && !isBuiltinSelection(selectedType) && selectedType
                  ? CHIP_ACTIVE
                  : canCreateCustom
                    ? 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    : 'border-slate-200 text-slate-500 opacity-60 hover:opacity-80'
              }`}
            >
              + Новый
            </button>
          )}
        </div>

        <p className="mt-5 text-sm font-medium text-slate-700">Дата покупок</p>
        <div className="mt-2.5 flex flex-row flex-nowrap gap-2 overflow-x-auto pb-1 no-scrollbar">
          {SCHEDULE_PRESETS.map(({ id, label }) => (
            <SelectionChip
              key={id}
              active={selectedPreset === id}
              onClick={() => selectPreset(id)}
              className="shrink-0"
            >
              {label}
            </SelectionChip>
          ))}
          <SelectionChip
            active={calendarActive}
            onClick={() => setCalendarOpen((open) => !open)}
            className="shrink-0"
          >
            Дата
          </SelectionChip>
        </div>

        {calendarOpen && (
          <ScheduleCalendar
            className="mt-3"
            value={selectedDate}
            onChange={handleCalendarDate}
          />
        )}
      </div>

      <div className="mt-6 border-t border-gray-100 px-5 pt-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`${PRIMARY_BTN} disabled:cursor-not-allowed`}
        >
          Создать список
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full rounded-full py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
        >
          Отмена
        </button>
      </div>
    </AppModal>
  );
}

function isBuiltinSelection(type) {
  return type === 'home' || type === 'cottage' || type === 'trip';
}
