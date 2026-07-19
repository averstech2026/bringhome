import { useEffect, useMemo, useRef, useState } from 'react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import ListExternalShareSection from '../list/ListExternalShareSection';
import ArchiveListConfirmModal from './ArchiveListConfirmModal';
import { PRIMARY_BTN } from '../list/cardStyles';
import { sanitizeCustomTypeName } from '../../utils/listTypes';
import {
  addDays,
  getNextWeekend,
  getToday,
  isSameDay,
  isToday,
  startOfDay,
} from '../../utils/listSchedule';

const CHIP_ACTIVE_SHADOW = 'shadow-sm shadow-black/10';
const TYPE_OPTIONS = [
  {
    type: 'home',
    label: '+ Домой',
    idleClassName: 'text-emerald-600/80',
    activeClassName:
      `border-transparent bg-emerald-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    type: 'cottage',
    label: '+ Дача',
    idleClassName: 'text-amber-700/80',
    activeClassName:
      `border-transparent bg-amber-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
  {
    type: 'trip',
    label: '+ В дорогу',
    idleClassName: 'text-sky-600/80',
    activeClassName:
      `border-transparent bg-sky-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`,
  },
];

const SCHEDULE_PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'weekend', label: 'В выходные' },
];

const CHIP_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 active:scale-[0.97]';
const CHIP_IDLE = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';
const SCHEDULE_CHIP_IDLE = `${CHIP_IDLE} text-slate-600`;
const SCHEDULE_CHIP_ACTIVE =
  `border-transparent bg-emerald-500 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`;
const CUSTOM_TYPE_ACTIVE =
  `border-transparent bg-slate-700 font-semibold text-white ${CHIP_ACTIVE_SHADOW}`;

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function SelectionChip({ active, onClick, disabled = false, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${CHIP_BASE} ${
        active ? SCHEDULE_CHIP_ACTIVE : SCHEDULE_CHIP_IDLE
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
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

function inferPresetFromDate(date, today) {
  if (!date || isToday(date, today)) {
    return { preset: 'today', customDate: null };
  }
  if (isSameDay(date, addDays(today, 1))) {
    return { preset: 'tomorrow', customDate: null };
  }
  if (isSameDay(date, getNextWeekend(today))) {
    return { preset: 'weekend', customDate: null };
  }
  return { preset: 'custom', customDate: startOfDay(date) };
}

function isBuiltinSelection(type) {
  return type === 'home' || type === 'cottage' || type === 'trip';
}

export default function CreateListSheet({
  open,
  onClose,
  onConfirm,
  onArchive = null,
  onArchiveDenied = null,
  canArchive = false,
  archiving = false,
  archiveCreatorName = null,
  adminArchivingOthers = false,
  canCreateCustom = false,
  onRequestCustom,
  mode = 'create',
  initialType = 'home',
  initialScheduledFor = null,
  initialDescription = '',
  readOnly = false,
  listId = null,
  list = null,
  currentUserId = null,
  ownerFamilyName = '',
  ownerFamilyAvatarUrl = null,
  onExternalShareChanged,
}) {
  const today = useMemo(() => getToday(), []);
  const [selectedType, setSelectedType] = useState('home');
  const [selectedPreset, setSelectedPreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const inputRef = useRef(null);
  const customFormRef = useRef(null);

  const resetCreateState = () => {
    setSelectedType('home');
    setSelectedPreset('today');
    setCustomDate(null);
    setCalendarOpen(false);
    setCustomMode(false);
    setCustomName('');
    setDescription('');
  };

  const hydrateSettingsState = () => {
    const resolvedType = initialType || 'home';
    setSelectedType(resolvedType);
    setCustomMode(false);
    setCustomName('');
    setDescription(initialDescription || '');

    const { preset, customDate: nextCustomDate } = inferPresetFromDate(initialScheduledFor, today);
    setSelectedPreset(preset);
    setCustomDate(nextCustomDate);
    setCalendarOpen(false);
  };

  useEffect(() => {
    if (!open) {
      setArchiveConfirmOpen(false);
      if (mode === 'create') resetCreateState();
      return;
    }

    if (mode === 'settings') {
      hydrateSettingsState();
      setArchiveConfirmOpen(false);
    }
  }, [open, mode, initialType, initialScheduledFor, initialDescription, today]);

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

  const handleDateChipClick = () => {
    if (calendarOpen) {
      setCalendarOpen(false);
      return;
    }

    setCalendarOpen(true);
    setSelectedPreset('custom');

    const currentDate = selectedPreset === 'custom'
      ? customDate
      : resolvePresetDate(selectedPreset, today);

    if (currentDate && !isToday(currentDate, today)) {
      setCustomDate(startOfDay(currentDate));
    } else if (selectedPreset !== 'custom') {
      setCustomDate(null);
    }
  };

  const handleCalendarDate = (date) => {
    if (!date) {
      selectPreset('today');
      return;
    }

    setSelectedPreset('custom');
    setCustomDate(startOfDay(date));
    setCalendarOpen(true);
  };

  const resolvedType = customMode ? '' : selectedType;
  const canSubmit = Boolean(resolvedType) && !customMode;

  const handleSubmit = () => {
    if (readOnly) {
      onClose?.();
      return;
    }
    if (!canSubmit) return;

    const scheduledFor = selectedPreset === 'today' ? null : selectedDate;
    onConfirm?.({
      type: resolvedType,
      scheduledFor,
      description: description.trim(),
    });
  };

  const calendarActive = calendarOpen || selectedPreset === 'custom';
  const isSettings = mode === 'settings';
  const sheetTitle = isSettings ? 'Настройки списка' : 'Новый список';
  const sheetSubtitle = isSettings
    ? 'Тип, дата покупок и заметка'
    : 'Выберите тип списка и дату';
  const submitLabel = readOnly ? 'Закрыть' : isSettings ? 'Сохранить' : 'Создать список';
  const showArchive = Boolean(
    isSettings
    && !readOnly
    && list
    && !list.archived
    && list.status !== 'archived'
    && (onArchive || onArchiveDenied),
  );

  const handleArchiveClick = () => {
    if (archiving) return;
    if (canArchive) {
      setArchiveConfirmOpen(true);
      return;
    }
    onArchiveDenied?.(list);
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="create-list-sheet-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-y-auto overscroll-contain pb-0 ${
        calendarOpen ? 'sm:!max-h-none sm:overflow-visible' : ''
      }`}
    >
      <div className="px-5 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <h2 id="create-list-sheet-title" className="text-lg font-bold text-slate-900">
          {sheetTitle}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{sheetSubtitle}</p>

        <p className="mt-5 text-sm font-medium text-slate-700">Тип списка</p>
        <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TYPE_OPTIONS.map(({ type, label, idleClassName, activeClassName }) => {
            const active = !customMode && selectedType === type;
            return (
              <button
                key={type}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  setCustomMode(false);
                  setSelectedType(type);
                }}
                className={`${CHIP_BASE} shrink-0 ${
                  active
                    ? activeClassName
                    : `${CHIP_IDLE} ${idleClassName}`
                }`}
              >
                {label}
              </button>
            );
          })}

          {customMode && canCreateCustom ? (
            <div
              ref={customFormRef}
              className="flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-3 pr-0.5"
            >
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={customName}
                disabled={readOnly}
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
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.35)] transition hover:bg-emerald-600 disabled:opacity-40"
              >
                <CheckIcon />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleNewClick}
              disabled={readOnly}
              className={`${CHIP_BASE} shrink-0 ${
                !customMode && !isBuiltinSelection(selectedType) && selectedType
                  ? CUSTOM_TYPE_ACTIVE
                  : canCreateCustom
                    ? `${CHIP_IDLE} text-slate-600`
                    : `${CHIP_IDLE} text-slate-500 opacity-60 hover:opacity-80`
              }`}
            >
              + Новый
            </button>
          )}
        </div>

        <p className="mt-5 text-sm font-medium text-slate-700">Дата покупок</p>
        <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {SCHEDULE_PRESETS.map(({ id, label }) => (
            <SelectionChip
              key={id}
              active={selectedPreset === id}
              onClick={() => selectPreset(id)}
              disabled={readOnly}
              className="shrink-0"
            >
              {label}
            </SelectionChip>
          ))}
          <SelectionChip
            active={calendarActive}
            onClick={handleDateChipClick}
            disabled={readOnly}
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
            disabled={readOnly}
          />
        )}

        <p className="mt-5 text-sm font-medium text-slate-700">Заметка к списку</p>
        <textarea
          rows={3}
          value={description}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Добавить важные детали, номер парковки, список магазинов..."
          maxLength={120}
          className="mt-2.5 w-full resize-none rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
        />

        {isSettings && !readOnly && (
          <ListExternalShareSection
            listId={listId}
            list={list}
            currentUserId={currentUserId}
            ownerFamilyName={ownerFamilyName}
            ownerFamilyAvatarUrl={ownerFamilyAvatarUrl}
            disabled={readOnly || archiving}
            onAccessChanged={onExternalShareChanged}
          />
        )}

        {showArchive && (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">Архив</p>
            <p className="mt-1 text-xs text-amber-800/80">
              Список исчезнет с главного экрана у всей семьи.
            </p>
            <button
              type="button"
              disabled={archiving}
              onClick={handleArchiveClick}
              className={`mt-3 w-full rounded-full border border-amber-200 bg-white py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 ${
                canArchive
                  ? 'text-amber-700 hover:bg-amber-50'
                  : 'text-amber-700/50 hover:bg-amber-50/80'
              }`}
            >
              Отправить в архив
            </button>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 z-10 mt-6 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!readOnly && !canSubmit) || archiving}
          className={`${PRIMARY_BTN} disabled:cursor-not-allowed`}
        >
          {submitLabel}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={onClose}
            disabled={archiving}
            className="mt-3 w-full rounded-full border border-gray-200 py-3.5 text-[15px] font-semibold text-gray-500 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
          >
            Отмена
          </button>
        )}
      </div>

      <ArchiveListConfirmModal
        open={archiveConfirmOpen}
        listTitle={list?.title}
        creatorName={archiveCreatorName}
        adminArchivingOthers={adminArchivingOthers}
        archiving={archiving}
        onCancel={() => !archiving && setArchiveConfirmOpen(false)}
        onConfirm={() => onArchive?.(list)}
      />
    </AppModal>
  );
}
