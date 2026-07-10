import { useEffect, useMemo, useState } from 'react';
import { FamilyToggle } from './accessControls';
import { CARD_SURFACE, CHIP_BUTTON_SURFACE } from './cardStyles';
import {
  addDays,
  formatSchedulePresetLabel,
  getNextWeekend,
  getToday,
  isFutureDay,
  isSameDay,
  isToday,
  startOfDay,
} from '../../utils/listSchedule';

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function buildMonthGrid(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(startOfDay(new Date(year, month, day)));
  }
  return cells;
}

function PresetChip({ active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${CHIP_BUTTON_SURFACE} border transition-colors ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : 'border-gray-200/80 text-slate-600 hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  );
}

export default function ListSchedulePicker({
  value = null,
  remindOnDay = false,
  onChange,
  onRemindChange,
  disabled = false,
}) {
  const today = useMemo(() => getToday(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);
  const weekend = useMemo(() => getNextWeekend(today), [today]);

  const selectedDate = value ? startOfDay(value) : today;
  const showRemindToggle = isFutureDay(selectedDate, today);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => startOfDay(selectedDate));

  useEffect(() => {
    setViewMonth(startOfDay(selectedDate));
  }, [selectedDate]);

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = viewMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const selectDate = (date) => {
    const normalized = startOfDay(date);
    onChange?.(isToday(normalized, today) ? null : normalized);
    if (isToday(normalized, today)) {
      onRemindChange?.(false);
    }
    setCalendarOpen(false);
  };

  return (
    <div className={`${CARD_SURFACE} px-3 py-3`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800">Дата покупок</p>
        <span className="text-xs text-slate-400">
          {formatSchedulePresetLabel(selectedDate, today)}
        </span>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <PresetChip
          active={isToday(selectedDate, today)}
          disabled={disabled}
          onClick={() => selectDate(today)}
        >
          Сегодня
        </PresetChip>
        <PresetChip
          active={isSameDay(selectedDate, tomorrow)}
          disabled={disabled}
          onClick={() => selectDate(tomorrow)}
        >
          Завтра
        </PresetChip>
        <PresetChip
          active={isSameDay(selectedDate, weekend)}
          disabled={disabled}
          onClick={() => selectDate(weekend)}
        >
          В выходные
        </PresetChip>
        <PresetChip
          active={calendarOpen}
          disabled={disabled}
          onClick={() => setCalendarOpen((open) => !open)}
        >
          <span className="inline-flex items-center gap-1">
            <CalendarIcon />
            Дата
          </span>
        </PresetChip>
      </div>

      {calendarOpen && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setViewMonth((month) => addDays(month, -1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white disabled:opacity-40"
              aria-label="Предыдущий месяц"
            >
              ‹
            </button>
            <span className="text-sm font-medium capitalize text-slate-700">{monthLabel}</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setViewMonth((month) => addDays(month, 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white disabled:opacity-40"
              aria-label="Следующий месяц"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-slate-400">
            {WEEKDAY_SHORT.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {monthCells.map((cell, index) => {
              if (!cell) {
                return <span key={`empty-${index}`} />;
              }

              const isSelected = isSameDay(cell, selectedDate);
              const isPast = cell < today;

              return (
                <button
                  key={cell.toISOString()}
                  type="button"
                  disabled={disabled || isPast}
                  onClick={() => selectDate(cell)}
                  className={`flex h-8 w-full items-center justify-center rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-emerald-500 text-white'
                      : isPast
                        ? 'cursor-not-allowed text-slate-300'
                        : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showRemindToggle && (
        <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-xl bg-slate-50/80 px-3 py-2.5 ring-1 ring-black/[0.03]">
          <span className="text-sm text-slate-700">Напомнить утром этого дня</span>
          <FamilyToggle
            enabled={remindOnDay}
            disabled={disabled}
            onChange={onRemindChange}
          />
        </label>
      )}
    </div>
  );
}
