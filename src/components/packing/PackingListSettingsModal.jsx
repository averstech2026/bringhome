import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import ListExternalShareSection from '../list/ListExternalShareSection';
import ArchiveListConfirmModal from '../home/ArchiveListConfirmModal';
import { PACKING_ACCENT } from '../../utils/contextAccents';
import {
  ensurePackingListShareInvite,
  revokePackingExternalFamilyAccess,
} from '../../services/packingListShareService';
import {
  addDays,
  getNextWeekend,
  getToday,
  isSameDay,
  isToday,
  startOfDay,
} from '../../utils/listSchedule';
import { resolvePackingTripAxes } from '../../utils/packingLists';
import PackingTripAxesChips from './PackingTripAxesChips';

const CHIP_ACTIVE_SHADOW = 'shadow-sm shadow-black/10';
const CHIP_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-300 active:scale-[0.97]';
const CHIP_IDLE = 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50';
const SCHEDULE_CHIP_IDLE = `${CHIP_IDLE} text-slate-600`;
const SCHEDULE_CHIP_ACTIVE =
  `border-transparent ${PACKING_ACCENT.solid} font-semibold text-white ${CHIP_ACTIVE_SHADOW}`;

const DATE_PRESETS = [
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'weekend', label: 'Выходные' },
  { id: 'custom', label: 'Период' },
];

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return startOfDay(value);
  if (typeof value?.toDate === 'function') return startOfDay(value.toDate());
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : startOfDay(parsed);
}

function toTimestamp(date) {
  if (!date) return null;
  return Timestamp.fromDate(startOfDay(date));
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

function inferDatePreset(startDate, endDate, today) {
  if (!startDate) return 'today';
  if (isToday(startDate, today) && (!endDate || isSameDay(startDate, endDate))) {
    return 'today';
  }
  if (isSameDay(startDate, addDays(today, 1)) && (!endDate || isSameDay(startDate, endDate))) {
    return 'tomorrow';
  }
  const weekend = getNextWeekend(today);
  if (isSameDay(startDate, weekend) && endDate && isSameDay(endDate, addDays(weekend, 1))) {
    return 'weekend';
  }
  return 'custom';
}

export default function PackingListSettingsModal({
  open,
  onClose,
  onSave,
  onArchive = null,
  list = null,
  listId = null,
  currentUserId = null,
  ownerFamilyName = '',
  ownerFamilyAvatarUrl = null,
  onExternalShareChanged,
  saving = false,
  archiving = false,
  readOnly = false,
}) {
  const today = useMemo(() => getToday(), []);
  const [tripTransport, setTripTransport] = useState('car');
  const [tripPurpose, setTripPurpose] = useState('city');
  const [datePreset, setDatePreset] = useState('today');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [description, setDescription] = useState('');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);

  const canSaveAsTemplate = Boolean(list && !list.isTemplate && !readOnly);
  const canArchive = Boolean(
    onArchive
    && list
    && !list.isTemplate
    && !readOnly
    && currentUserId
    && list.createdBy === currentUserId,
  );

  useEffect(() => {
    if (!open || !list) return;
    const axes = resolvePackingTripAxes(list);
    setTripTransport(axes.transport);
    setTripPurpose(axes.purpose);
    setDescription(list.description || '');
    setGroupByCategory(Boolean(list.groupByCategory));
    setSaveAsTemplate(false);
    setArchiveConfirmOpen(false);
    const travel = toDate(list.travelDate);
    const nextStart = toDate(list.tripStartDate) || travel || today;
    const nextEnd = toDate(list.tripEndDate) || nextStart;
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setDatePreset(inferDatePreset(nextStart, nextEnd, today));
    setPickingEnd(false);
  }, [open, list, today]);

  const applyPreset = (preset) => {
    setDatePreset(preset);
    setPickingEnd(false);
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
      return;
    }
    if (preset === 'tomorrow') {
      const date = addDays(today, 1);
      setStartDate(date);
      setEndDate(date);
      return;
    }
    if (preset === 'weekend') {
      const weekend = getNextWeekend(today);
      setStartDate(weekend);
      setEndDate(addDays(weekend, 1));
      return;
    }
    setStartDate(startDate || today);
    setEndDate(endDate || startDate || today);
  };

  const handleCalendarChange = (date) => {
    const next = date ? startOfDay(date) : today;
    if (!pickingEnd) {
      setStartDate(next);
      setEndDate((prev) => (prev && prev < next ? next : prev));
      setPickingEnd(true);
      return;
    }
    setEndDate(next < startDate ? startDate : next);
    setPickingEnd(false);
  };

  const handleSave = () => {
    if (readOnly || saving) {
      onClose?.();
      return;
    }

    let resolvedStart = startDate;
    let resolvedEnd = endDate;

    if (datePreset === 'today') {
      resolvedStart = today;
      resolvedEnd = today;
    } else if (datePreset === 'tomorrow') {
      resolvedStart = addDays(today, 1);
      resolvedEnd = resolvedStart;
    } else if (datePreset === 'weekend') {
      resolvedStart = getNextWeekend(today);
      resolvedEnd = addDays(resolvedStart, 1);
    }

    const travelDate = toTimestamp(resolvedStart || today);

    onSave?.({
      tripTransport,
      tripPurpose,
      travelDate,
      tripStartDate: travelDate,
      tripEndDate: toTimestamp(resolvedEnd || resolvedStart || today),
      description: description.trim(),
      groupByCategory,
      saveAsTemplate: canSaveAsTemplate && saveAsTemplate,
    });
  };

  const calendarVisible = datePreset === 'custom';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="packing-settings-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-hidden pb-0`}
      disableClose={saving}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={saving || archiving}
        className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <div className="pr-10">
          <h2 id="packing-settings-title" className="text-lg font-bold text-slate-900">
            Настройки списка
          </h2>
          <p className="mt-1 text-sm text-slate-500">Способ, назначение, даты и отображение</p>
        </div>

        <div className="mt-5">
          <PackingTripAxesChips
            transport={tripTransport}
            purpose={tripPurpose}
            onTransportChange={setTripTransport}
            onPurposeChange={setTripPurpose}
            disabled={readOnly || saving}
          />
        </div>

        <p className="mt-5 text-sm font-medium text-slate-700">Дата поездки</p>
        <p className="mt-1 text-xs text-slate-400">
          Используется в названии и для ИИ-подсказок по сборам
        </p>
        <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {DATE_PRESETS.map((preset) => (
            <SelectionChip
              key={preset.id}
              active={datePreset === preset.id}
              disabled={readOnly || saving}
              onClick={() => applyPreset(preset.id)}
            >
              {preset.label}
            </SelectionChip>
          ))}
        </div>

        {calendarVisible && (
          <div className="mt-3">
            <p className="mb-2 text-xs text-slate-400">
              {pickingEnd || endDate
                ? `Начало: ${(startDate || today).toLocaleDateString('ru-RU')} · выберите окончание`
                : 'Выберите дату начала, затем окончания'}
            </p>
            <ScheduleCalendar
              value={pickingEnd ? endDate : startDate}
              onChange={handleCalendarChange}
              disabled={readOnly || saving}
              selectedClassName={PACKING_ACCENT.solid}
            />
          </div>
        )}

        <p className="mt-5 text-sm font-medium text-slate-700">Заметка к списку</p>
        <textarea
          rows={3}
          value={description}
          readOnly={readOnly}
          disabled={readOnly || saving}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Адрес отеля, детали маршрута, важные напоминания…"
          maxLength={200}
          className="mt-2.5 w-full resize-none rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
        />

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">Разделить по подгруппам</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Внутри разделов группировать вещи по категориям (одежда, техника…)
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={groupByCategory}
            aria-label="Разделить по подгруппам"
            disabled={readOnly || saving}
            onClick={() => setGroupByCategory((prev) => !prev)}
            className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
              groupByCategory ? PACKING_ACCENT.solid : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                groupByCategory ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {canSaveAsTemplate && (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={saveAsTemplate}
              disabled={saving}
              onChange={(e) => setSaveAsTemplate(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-800">
                Сохранить как шаблон
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Скопируем текущий набор вещей в «Мои шаблоны» на рабочем столе сборов
              </span>
            </span>
          </label>
        )}

        {!readOnly && (
          <ListExternalShareSection
            listId={listId}
            list={list}
            currentUserId={currentUserId}
            ownerFamilyName={ownerFamilyName}
            ownerFamilyAvatarUrl={ownerFamilyAvatarUrl}
            disabled={saving || archiving}
            onAccessChanged={onExternalShareChanged}
            ensureInvite={ensurePackingListShareInvite}
            revokeAccess={revokePackingExternalFamilyAccess}
            shareTitle="Совместный список сборов"
            shareText="Присоединяйтесь к нашему списку сборов в КупиДомой"
            hintText="Подключите родственников или друзей — они увидят сборы у себя на рабочем столе в разделе «Общие»"
          />
        )}

        {canArchive && (
          <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50/60 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">Архив</p>
            <p className="mt-1 text-xs text-amber-800/80">
              Поездка исчезнет с рабочего стола сборов у всей семьи.
            </p>
            <button
              type="button"
              disabled={saving || archiving}
              onClick={() => setArchiveConfirmOpen(true)}
              className="mt-3 w-full rounded-full border border-amber-200 bg-white py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 active:scale-[0.98] disabled:opacity-50"
            >
              Отправить в архив
            </button>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || archiving}
          className={`${PACKING_ACCENT.primaryBtn} disabled:cursor-not-allowed`}
        >
          {readOnly ? 'Закрыть' : saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        {!readOnly && (
          <button
            type="button"
            onClick={onClose}
            disabled={saving || archiving}
            className="mt-3 w-full rounded-full border border-gray-200 py-3.5 text-[15px] font-semibold text-gray-500 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
          >
            Отмена
          </button>
        )}
      </div>

      <ArchiveListConfirmModal
        open={archiveConfirmOpen}
        listTitle={list?.title}
        archiving={archiving}
        onCancel={() => !archiving && setArchiveConfirmOpen(false)}
        onConfirm={() => onArchive?.()}
      />
    </AppModal>
  );
}
