import { useEffect, useMemo, useState } from 'react';
import { LayoutTemplate, Sparkles, X } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import { CREATE_BTN_DISABLED } from '../list/cardStyles';
import {
  appendDateToPackingTitle,
  formatPackingDateLabel,
} from '../../utils/packingLists';
import { PACKING_ACCENT } from '../../utils/contextAccents';
import PackingTripAxesChips from './PackingTripAxesChips';
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
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState(MODE_BLANK);
  const [templateId, setTemplateId] = useState(null);
  const [tripTransport, setTripTransport] = useState('car');
  const [tripPurpose, setTripPurpose] = useState('city');
  const [datePreset, setDatePreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setMode(MODE_BLANK);
    setTemplateId(null);
    setTripTransport('car');
    setTripPurpose('city');
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
      description: description.trim(),
      tripTransport,
      tripPurpose,
    });
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
      ? 'Создать список 🚀'
      : 'Чтобы создать список, введите название';
  const primaryClassName = hasTitle ? PACKING_ACCENT.primaryBtn : CREATE_BTN_DISABLED;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="create-packing-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-hidden pb-0`}
      disableClose={busy}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={busy}
        className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <div className="pr-10">
          <h2 id="create-packing-title" className="text-lg font-bold text-slate-900">
            Новый список
          </h2>
          <p className="mt-1 text-sm text-slate-500">Способ, назначение и дата</p>
        </div>

        <div className="mt-5">
          <PackingTripAxesChips
            transport={tripTransport}
            purpose={tripPurpose}
            onTransportChange={setTripTransport}
            onPurposeChange={setTripPurpose}
            disabled={busy}
          />
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

        <p className="mt-5 text-sm font-medium text-slate-700">Заметка к списку</p>
        <textarea
          rows={3}
          value={description}
          disabled={busy}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Добавить важные детали, номер парковки, список магазинов..."
          maxLength={120}
          className="mt-2.5 w-full resize-none rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
        />

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
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className={`transition-all duration-150 ${primaryClassName}`}
        >
          {primaryLabel}
        </button>
      </div>
    </AppModal>
  );
}
