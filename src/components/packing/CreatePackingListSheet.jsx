import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, Sparkles, X } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import { EXIT_BTN_NEUTRAL } from '../list/cardStyles';
import {
  appendDateToPackingTitle,
  formatPackingDateLabel,
} from '../../utils/packingLists';
import { PACKING_ACCENT } from '../../utils/contextAccents';
import {
  addDays,
  getNextWeekend,
  getToday,
  startOfDay,
} from '../../utils/listSchedule';

const MODE_BLANK = 'blank';
const MODE_TEMPLATE = 'template';

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

export default function CreatePackingListSheet({
  open,
  onClose,
  onConfirm,
  templates = [],
  accentClassName = 'bg-indigo-600',
  busy = false,
}) {
  const today = useMemo(() => getToday(), []);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState(MODE_BLANK);
  const [templateId, setTemplateId] = useState(null);
  const [datePreset, setDatePreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setMode(MODE_BLANK);
    setTemplateId(null);
    setDatePreset('today');
    setCustomDate(null);
    setCalendarOpen(false);
  }, [open]);

  const travelDate = useMemo(
    () => resolveTravelDate(datePreset, customDate, today),
    [datePreset, customDate, today],
  );

  const hasTitle = Boolean(title.trim());
  const needsTemplate = mode === MODE_TEMPLATE && !templateId;
  const canSubmit = hasTitle && !busy && !needsTemplate;

  const handleSubmit = () => {
    if (!canSubmit) return;
    const resolvedTitle = appendDateToPackingTitle(title, travelDate);
    onConfirm?.({
      title: resolvedTitle,
      templateId: mode === MODE_TEMPLATE ? templateId : null,
      travelDate,
    });
  };

  const handlePrimaryClick = () => {
    if (!hasTitle) {
      if (!busy) onClose?.();
      return;
    }
    handleSubmit();
  };

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

  const primaryLabel = busy
    ? 'Создаём…'
    : hasTitle
      ? 'Создать список'
      : 'Введите название или Отмена';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="create-packing-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-y-auto overscroll-contain p-5 sm:p-6`}
      disableClose={busy}
    >
      <div>
        <div className="relative pr-10">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">
            Новая поездка
          </p>
          <h2 id="create-packing-title" className="mt-1 text-xl font-bold text-slate-900">
            Список сборов
          </h2>
          <button
            type="button"
            name="скрыть"
            onClick={onClose}
            disabled={busy}
            className="absolute right-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
            aria-label="Скрыть"
          >
            <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-slate-500">Название</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Например: Сочи на майские"
            maxLength={80}
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white"
            autoFocus
          />
          <p className="mt-1.5 text-[11px] text-slate-400">
            Если даты нет в названии, добавим «{formatPackingDateLabel(travelDate)}» при создании
          </p>
        </label>

        <p className="mt-5 text-xs font-medium text-slate-500">Дата поездки</p>
        <div className="mt-2 flex shrink-0 flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {DATE_PRESETS.map((preset) => {
            const active = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                disabled={busy}
                onClick={() => selectPreset(preset.id)}
                className={`${CHIP_BASE} shrink-0 ${active ? CHIP_ACTIVE : CHIP_IDLE}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {(calendarOpen || datePreset === 'custom') && (
          <div className="mt-3 shrink-0">
            <ScheduleCalendar
              value={customDate || travelDate}
              onChange={(date) => {
                const next = date ? startOfDay(date) : today;
                setCustomDate(next);
                setDatePreset('custom');
                setCalendarOpen(true);
              }}
              disabled={busy}
              selectedClassName={PACKING_ACCENT.solid}
            />
          </div>
        )}

        <p className="mt-5 text-xs font-medium text-slate-500">С чего начать</p>
        <div className="mt-2 grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setMode(MODE_BLANK);
              setTemplateId(null);
            }}
            className={`flex flex-col items-start gap-1 rounded-2xl border px-3 py-3 text-left transition ${
              mode === MODE_BLANK
                ? 'border-transparent text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            } ${mode === MODE_BLANK ? accentClassName : ''}`}
          >
            <Sparkles className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            <span className="text-sm font-semibold">С чистого листа</span>
            <span className={`text-[11px] ${mode === MODE_BLANK ? 'text-white/80' : 'text-slate-400'}`}>
              Пустой список
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode(MODE_TEMPLATE)}
            disabled={templates.length === 0}
            className={`flex flex-col items-start gap-1 rounded-2xl border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
              mode === MODE_TEMPLATE
                ? 'border-transparent text-white shadow-sm'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            } ${mode === MODE_TEMPLATE ? accentClassName : ''}`}
          >
            <LayoutTemplate className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            <span className="text-sm font-semibold">Из шаблона</span>
            <span className={`text-[11px] ${mode === MODE_TEMPLATE ? 'text-white/80' : 'text-slate-400'}`}>
              {templates.length === 0 ? 'Пока нет шаблонов' : `${templates.length} шт.`}
            </span>
          </button>
        </div>

        {mode === MODE_TEMPLATE && templates.length > 0 && (
          <div className="mt-4 shrink-0">
            <p className="text-xs font-medium text-slate-500">Выберите шаблон</p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {templates.map((template) => {
                const selected = templateId === template.id;
                const count = Array.isArray(template.items) ? template.items.length : 0;
                return (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setTemplateId(template.id)}
                    className={`min-w-[9.5rem] shrink-0 rounded-2xl border px-3 py-3 text-left transition ${
                      selected
                        ? `border-transparent text-white ${accentClassName}`
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="truncate text-sm font-semibold">{template.title}</p>
                    <p className={`mt-0.5 text-[11px] ${selected ? 'text-white/80' : 'text-slate-400'}`}>
                      {count} пунктов
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <button
          type="button"
          disabled={busy || (hasTitle && needsTemplate)}
          onClick={handlePrimaryClick}
          className={`mt-6 shrink-0 transition-all duration-150 ${
            hasTitle ? PACKING_ACCENT.primaryBtn : EXIT_BTN_NEUTRAL
          }`}
        >
          {primaryLabel}
        </button>
      </div>
    </AppModal>
  );
}
