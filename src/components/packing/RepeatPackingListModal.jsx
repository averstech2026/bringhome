import { useEffect, useMemo, useState } from 'react';
import AppModal from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import ScheduleCalendar from '../list/ScheduleCalendar';
import { PACKING_ACCENT } from '../../utils/contextAccents';
import {
  appendDateToPackingTitle,
} from '../../utils/packingLists';
import {
  addDays,
  getNextWeekend,
  getToday,
  startOfDay,
} from '../../utils/listSchedule';

const CHIP_ACTIVE_SHADOW = 'shadow-sm shadow-black/10';
const CHIP_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 active:scale-[0.97]';
const CHIP_IDLE = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-600';
const CHIP_ACTIVE =
  `border-transparent ${PACKING_ACCENT.solid} font-semibold text-white ${CHIP_ACTIVE_SHADOW}`;

const DATE_PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'weekend', label: 'В выходные' },
  { id: 'custom', label: 'Дата' },
];

function resolveTravelDate(preset, customDate, today) {
  if (preset === 'tomorrow') return addDays(today, 1);
  if (preset === 'weekend') return getNextWeekend(today);
  if (preset === 'custom' && customDate) return startOfDay(customDate);
  return today;
}

export default function RepeatPackingListModal({
  list,
  open,
  loading = false,
  onClose,
  onConfirm,
}) {
  const today = useMemo(() => getToday(), []);
  const [datePreset, setDatePreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDatePreset('today');
    setCustomDate(null);
    setCalendarOpen(false);
  }, [open, list?.id]);

  if (!list) return null;

  const travelDate = resolveTravelDate(datePreset, customDate, today);

  const selectPreset = (presetId) => {
    setDatePreset(presetId);
    if (presetId === 'custom') {
      setCalendarOpen(true);
      if (!customDate) setCustomDate(today);
      return;
    }
    setCalendarOpen(false);
    setCustomDate(null);
  };

  const handleConfirm = () => {
    const baseTitle = String(list.title || '')
      .replace(/\s+\d{1,2}\.\d{1,2}(?:\.\d{2,4})?\b/g, '')
      .trim() || list.title;
    onConfirm?.({
      title: appendDateToPackingTitle(baseTitle, travelDate),
      travelDate,
    });
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="repeat-packing-modal-title"
      panelClassName="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
      disableClose={loading}
    >
      <ModalCloseButton onClick={onClose} disabled={loading} />
      <h2 id="repeat-packing-modal-title" className="pr-10 text-lg font-bold text-slate-900">
        Повторить список
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        «{list.title}» — создадим новый список с теми же пунктами
      </p>

      <p className="mt-4 text-xs font-medium text-slate-500">Дата поездки</p>
      <div className="mt-2 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {DATE_PRESETS.map((preset) => {
          const active = datePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              disabled={loading}
              onClick={() => selectPreset(preset.id)}
              className={`${CHIP_BASE} shrink-0 ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {(calendarOpen || datePreset === 'custom') && (
        <div className="mt-3">
          <ScheduleCalendar
            value={customDate || travelDate}
            onChange={(date) => {
              const next = date ? startOfDay(date) : today;
              setCustomDate(next);
              setDatePreset('custom');
              setCalendarOpen(true);
            }}
            disabled={loading}
            selectedClassName={PACKING_ACCENT.solid}
          />
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className={`flex-1 ${PACKING_ACCENT.primaryBtn} !py-3 text-sm`}
        >
          {loading ? 'Загружаем…' : 'Продолжить'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="flex-1 rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </AppModal>
  );
}
