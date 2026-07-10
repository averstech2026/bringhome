import { useEffect, useMemo, useState } from 'react';
import {
  addDays,
  getToday,
  isSameDay,
  isToday,
  startOfDay,
} from '../../utils/listSchedule';

const WEEKDAY_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

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

export default function ScheduleCalendar({
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  const today = useMemo(() => getToday(), []);
  const selectedDate = value ? startOfDay(value) : today;
  const [viewMonth, setViewMonth] = useState(() => startOfDay(selectedDate));

  useEffect(() => {
    setViewMonth(startOfDay(selectedDate));
  }, [selectedDate]);

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const monthLabel = viewMonth.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

  const selectDate = (date) => {
    const normalized = startOfDay(date);
    onChange?.(isToday(normalized, today) ? null : normalized);
  };

  return (
    <div className={`rounded-xl border border-gray-100 bg-slate-50/60 p-3 ${className}`}>
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
  );
}
