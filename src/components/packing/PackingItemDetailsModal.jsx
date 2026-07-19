import { useEffect, useMemo, useRef, useState } from 'react';
import { Backpack, Briefcase, Calendar, Check, ClipboardList, ExternalLink, Users, X } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import ScheduleCalendar from '../list/ScheduleCalendar';
import { UserAvatar } from '../profile/UserAvatar';
import { formatBookerLabel } from '../../utils/booking';
import {
  formatPackingActivityLabel,
  mergePackingCategoryChips,
  PACKING_ACTIVITY_MAIN,
  PACKING_ITEM_TYPE,
  packingItemMatchesActivity,
  packingItemMatchesCategory,
  resolvePackingActivityRename,
} from '../../utils/packingLists';
import { PACKING_ACCENT } from '../../utils/contextAccents';
import { formatQuantity, parseQuantity } from '../../utils/quantity';
import {
  addDays,
  formatCompactDateLabel,
  formatDateParam,
  getToday,
  isSameDay,
  isToday,
  isTomorrow,
  parseDateParam,
  startOfDay,
} from '../../utils/listSchedule';

function normalizeExternalUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function toTripStartDate(raw) {
  if (!raw) return null;
  if (typeof raw?.toDate === 'function') {
    const d = raw.toDate();
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : startOfDay(raw);
  }
  if (typeof raw === 'string') {
    const ymd = raw.slice(0, 10);
    return parseDateParam(ymd);
  }
  return null;
}

const DATE_CHIP =
  'rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default disabled:opacity-50';
const DATE_CHIP_IDLE = 'bg-gray-100 text-gray-600 hover:bg-gray-200';
const DATE_CHIP_ACTIVE = `${PACKING_ACCENT.solid} text-white`;

const FIELD_CLASS =
  'mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50';

const QTY_PRESETS = [1, 2, 3, 4];
const PACKING_QTY_UNITS = [
  { value: 'шт', label: 'шт.' },
  { value: 'уп', label: 'упак.' },
  { value: 'пар', label: 'пар' },
];

const STEP_BTN =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95 disabled:opacity-40';

function resolvePackingUnit(unit) {
  const raw = String(unit || 'шт').trim().toLowerCase();
  if (raw === 'упак' || raw === 'упак.' || raw === 'упаковка') return 'уп';
  if (raw === 'пара' || raw === 'пары') return 'пар';
  const found = PACKING_QTY_UNITS.find((u) => u.value === raw);
  return found ? found.value : 'шт';
}

function quantityFromItem(raw) {
  const text = String(raw || '').trim();
  if (!text) return { count: 1, unit: 'шт' };
  const parsed = parseQuantity(/^[\d]+(?:[.,]\d+)?$/.test(text) ? `${text} шт` : text);
  const count = Number.isFinite(parsed.count) && parsed.count > 0
    ? Math.max(1, Math.round(parsed.count))
    : 1;
  return { count, unit: resolvePackingUnit(parsed.unit) };
}

export default function PackingItemDetailsModal({
  open,
  item = null,
  members = [],
  currentUserId = null,
  activityOptions = [],
  tripStartDate: tripStartDateProp = null,
  canAssign = true,
  canCopyToPersonal = false,
  canMoveToCommon = false,
  onCopyToPersonal = null,
  onMoveToCommon = null,
  onClose,
  onSave,
  saving = false,
  readOnly = false,
}) {
  const [category, setCategory] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('');
  const [activity, setActivity] = useState(PACKING_ACTIVITY_MAIN);
  const [activityIcon, setActivityIcon] = useState('');
  const [assignedTo, setAssignedTo] = useState(null);
  const [qtyCount, setQtyCount] = useState(1);
  const [qtyUnit, setQtyUnit] = useState('шт');
  const [note, setNote] = useState('');
  const [bookingUrl, setBookingUrl] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueCalendarOpen, setDueCalendarOpen] = useState(false);
  const [localSections, setLocalSections] = useState([]);
  const [addingSection, setAddingSection] = useState(false);
  const [newSectionDraft, setNewSectionDraft] = useState('');
  const newSectionInputRef = useRef(null);

  useEffect(() => {
    if (!open || !item) return;
    setCategory(item.category || '');
    setCategoryIcon(item.categoryIcon || '');
    setActivity(item.activity || PACKING_ACTIVITY_MAIN);
    setActivityIcon(item.activityIcon || '');
    setAssignedTo(item.assignedTo || null);
    const parsedQty = quantityFromItem(item.quantity);
    setQtyCount(parsedQty.count);
    setQtyUnit(parsedQty.unit);
    setNote(item.note || '');
    setBookingUrl(item.bookingUrl || '');
    setDueDate(item.dueDate || '');
    setDueCalendarOpen(false);
    setLocalSections([]);
    setAddingSection(false);
    setNewSectionDraft('');
  }, [open, item]);

  useEffect(() => {
    if (!addingSection) return;
    newSectionInputRef.current?.focus();
  }, [addingSection]);

  const chips = useMemo(() => mergePackingCategoryChips(), []);
  const sections = useMemo(() => {
    const base = Array.isArray(activityOptions) ? [...activityOptions] : [];
    if (!base.some((option) => option.activity === PACKING_ACTIVITY_MAIN)) {
      base.unshift({
        activity: PACKING_ACTIVITY_MAIN,
        activityIcon: '',
        label: formatPackingActivityLabel(PACKING_ACTIVITY_MAIN),
      });
    }
    if (localSections.length === 0) return base;
    const seen = new Set(
      base.map((option) => String(option.activity || '').trim().toLowerCase()),
    );
    const extras = localSections.filter((option) => {
      const key = String(option.activity || '').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return extras.length ? [...base, ...extras] : base;
  }, [activityOptions, localSections]);

  const tripStartDate = useMemo(
    () => toTripStartDate(tripStartDateProp),
    [tripStartDateProp],
  );
  const dueDateValue = useMemo(() => parseDateParam(dueDate), [dueDate]);
  const today = useMemo(() => getToday(), []);
  const tomorrow = useMemo(() => addDays(today, 1), [today]);

  const duePreset = useMemo(() => {
    if (!dueDateValue) return null;
    if (isToday(dueDateValue, today)) return 'today';
    if (isTomorrow(dueDateValue, today)) return 'tomorrow';
    if (tripStartDate && isSameDay(dueDateValue, tripStartDate)) return 'departure';
    return 'custom';
  }, [dueDateValue, today, tripStartDate]);

  if (!open || !item) return null;

  const isTodo = item.type === PACKING_ITEM_TYPE.TODO;
  const fieldsDisabled = saving || readOnly;
  const resolvedUrl = normalizeExternalUrl(bookingUrl);
  const pickerMembers = Array.isArray(members) ? members : [];
  const showActions = !readOnly && (canCopyToPersonal || canMoveToCommon);
  const showDeparturePreset = Boolean(tripStartDate);

  const setDueFromDate = (date) => {
    if (fieldsDisabled) return;
    setDueDate(date ? formatDateParam(date) : '');
    setDueCalendarOpen(false);
  };

  const clearDueDate = () => {
    if (fieldsDisabled) return;
    setDueDate('');
    setDueCalendarOpen(false);
  };

  const handleSelectCategory = (option) => {
    if (fieldsDisabled) return;
    setCategory(option.category || '');
    setCategoryIcon(option.categoryIcon || '');
  };

  const handleSelectActivity = (option) => {
    if (fieldsDisabled) return;
    setActivity(option.activity || PACKING_ACTIVITY_MAIN);
    setActivityIcon(
      option.activity === PACKING_ACTIVITY_MAIN ? '' : (option.activityIcon || ''),
    );
  };

  const cancelAddSection = () => {
    setAddingSection(false);
    setNewSectionDraft('');
  };

  const confirmAddSection = () => {
    if (fieldsDisabled) return;
    if (!newSectionDraft.trim()) return;
    const resolved = resolvePackingActivityRename(newSectionDraft);
    if (resolved.activity === PACKING_ACTIVITY_MAIN) {
      handleSelectActivity({
        activity: PACKING_ACTIVITY_MAIN,
        activityIcon: '',
      });
      cancelAddSection();
      return;
    }

    const matchKey = String(resolved.activity).trim().toLowerCase();
    const existing = sections.find(
      (option) => String(option.activity || '').trim().toLowerCase() === matchKey,
    );
    if (existing) {
      handleSelectActivity(existing);
      cancelAddSection();
      return;
    }

    const option = {
      activity: resolved.activity,
      activityIcon: resolved.activityIcon || '',
      label: formatPackingActivityLabel(resolved.activity, resolved.activityIcon),
    };
    setLocalSections((prev) => [...prev, option]);
    handleSelectActivity(option);
    cancelAddSection();
  };

  const handleNewSectionKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmAddSection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelAddSection();
    }
  };

  const handleSave = () => {
    if (readOnly || saving) return;
    onSave?.({
      category: category || '',
      categoryIcon: categoryIcon || '',
      activity: activity || PACKING_ACTIVITY_MAIN,
      activityIcon: activity === PACKING_ACTIVITY_MAIN ? '' : (activityIcon || ''),
      assignedTo: canAssign ? (assignedTo || null) : item.assignedTo || null,
      quantity: isTodo
        ? ''
        : qtyCount === 1 && qtyUnit === 'шт'
          ? ''
          : formatQuantity(qtyCount, qtyUnit),
      note: note.trim(),
      bookingUrl: isTodo ? bookingUrl.trim() : '',
      dueDate: isTodo ? dueDate.trim() : '',
    });
  };

  const handleOpenLink = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = () => {
    if (fieldsDisabled || !canCopyToPersonal) return;
    onCopyToPersonal?.(item);
    onClose?.();
  };

  const handleMoveCommon = () => {
    if (fieldsDisabled || !canMoveToCommon) return;
    onMoveToCommon?.(item);
    onClose?.();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="packing-item-details-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-hidden pb-0`}
      disableClose={saving}
    >
      <ModalCloseButton onClick={onClose} disabled={saving} />

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <div className="flex items-start gap-3 pr-10">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isTodo ? 'bg-teal-50 text-teal-600' : 'bg-indigo-50 text-indigo-600'
          }`}
          >
            {isTodo ? (
              <ClipboardList className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            ) : (
              <Briefcase className="h-5 w-5" strokeWidth={2.25} aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <h2 id="packing-item-details-title" className="text-lg font-bold text-slate-900">
              {isTodo ? 'Детали дела' : 'Детали вещи'}
            </h2>
            <p className="mt-0.5 truncate text-sm text-slate-500">{item.name || (isTodo ? 'Дело' : 'Вещь')}</p>
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Категория</p>
          <div className="flex flex-wrap gap-2">
            {chips.map((option) => {
              const isActive = packingItemMatchesCategory(
                { category },
                option.category,
              );
              return (
                <button
                  key={option.category || '__uncategorized'}
                  type="button"
                  disabled={fieldsDisabled}
                  onClick={() => handleSelectCategory(option)}
                  aria-pressed={isActive}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
                    isActive
                      ? `${PACKING_ACCENT.solid} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-70'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Раздел списка</p>
          <div className="flex flex-wrap items-center gap-2">
            {sections.map((option) => {
              const isActive = packingItemMatchesActivity(
                { activity },
                option.activity,
              );
              return (
                <button
                  key={option.activity || '__main'}
                  type="button"
                  disabled={fieldsDisabled}
                  onClick={() => handleSelectActivity(option)}
                  aria-pressed={isActive}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-default ${
                    isActive
                      ? `${PACKING_ACCENT.solid} text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-70'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}

            {!fieldsDisabled && !addingSection && (
              <button
                type="button"
                onClick={() => setAddingSection(true)}
                className="rounded-full border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700"
              >
                + Новый
              </button>
            )}

            {!fieldsDisabled && addingSection && (
              <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto sm:max-w-full sm:flex-1">
                <input
                  ref={newSectionInputRef}
                  type="text"
                  value={newSectionDraft}
                  onChange={(event) => setNewSectionDraft(event.target.value)}
                  onKeyDown={handleNewSectionKeyDown}
                  placeholder="Название раздела"
                  maxLength={48}
                  className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/15"
                />
                <button
                  type="button"
                  onClick={confirmAddSection}
                  disabled={!newSectionDraft.trim()}
                  aria-label="Создать раздел"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40 ${PACKING_ACCENT.solid} ${PACKING_ACCENT.solidHover}`}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={cancelAddSection}
                  aria-label="Отменить"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            )}
          </div>
        </div>

        {canAssign && (
          <div className="mt-5">
            <p className="mb-1.5 text-xs font-medium text-slate-500">Ответственный</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                disabled={fieldsDisabled}
                onClick={() => setAssignedTo(null)}
                aria-pressed={!assignedTo}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2 transition ${
                  !assignedTo
                    ? 'bg-indigo-50 ring-2 ring-indigo-200'
                    : 'hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-slate-300 text-sm text-slate-400">
                  —
                </span>
                <span className="max-w-[4.5rem] truncate text-[11px] font-medium text-slate-500">
                  Никто
                </span>
              </button>
              {pickerMembers.map((member) => {
                const selected = assignedTo === member.id;
                const name = member.displayName || member.email?.split('@')[0] || 'Участник';
                const isMine = member.id === currentUserId;
                const label = isMine ? '✨ Вы' : formatBookerLabel(name);
                return (
                  <button
                    key={member.id}
                    type="button"
                    disabled={fieldsDisabled}
                    onClick={() => setAssignedTo(member.id)}
                    aria-pressed={selected}
                    className={`flex shrink-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-2 transition ${
                      selected
                        ? 'bg-indigo-50 ring-2 ring-indigo-200'
                        : 'hover:bg-slate-50'
                    } disabled:opacity-50`}
                  >
                    <UserAvatar
                      photoUrl={member.avatarUrl}
                      name={name}
                      className="h-10 w-10 text-sm"
                      variant="vivid"
                    />
                    <span className="max-w-[4.5rem] truncate text-[11px] font-medium text-slate-600">
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isTodo ? (
          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Дата</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={fieldsDisabled}
                  onClick={() => setDueFromDate(today)}
                  aria-pressed={duePreset === 'today'}
                  className={`${DATE_CHIP} ${
                    duePreset === 'today' ? DATE_CHIP_ACTIVE : DATE_CHIP_IDLE
                  }`}
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  disabled={fieldsDisabled}
                  onClick={() => setDueFromDate(tomorrow)}
                  aria-pressed={duePreset === 'tomorrow'}
                  className={`${DATE_CHIP} ${
                    duePreset === 'tomorrow' ? DATE_CHIP_ACTIVE : DATE_CHIP_IDLE
                  }`}
                >
                  Завтра
                </button>
                {showDeparturePreset && (
                  <button
                    type="button"
                    disabled={fieldsDisabled}
                    onClick={() => setDueFromDate(tripStartDate)}
                    aria-pressed={duePreset === 'departure'}
                    className={`${DATE_CHIP} ${
                      duePreset === 'departure' ? DATE_CHIP_ACTIVE : DATE_CHIP_IDLE
                    }`}
                  >
                    В день выезда
                  </button>
                )}
                {duePreset === 'custom' && dueDateValue ? (
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={fieldsDisabled}
                      onClick={() => {
                        if (fieldsDisabled) return;
                        setDueCalendarOpen((prev) => !prev);
                      }}
                      aria-pressed={dueCalendarOpen}
                      className={`inline-flex items-center gap-1.5 ${DATE_CHIP} ${DATE_CHIP_ACTIVE}`}
                    >
                      <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                      {formatCompactDateLabel(dueDateValue)}
                    </button>
                    <button
                      type="button"
                      disabled={fieldsDisabled}
                      onClick={clearDueDate}
                      aria-label="Сбросить дату"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={fieldsDisabled}
                    onClick={() => {
                      if (fieldsDisabled) return;
                      setDueCalendarOpen((prev) => !prev);
                    }}
                    aria-pressed={dueCalendarOpen}
                    className={`inline-flex items-center gap-1.5 ${DATE_CHIP} ${
                      dueCalendarOpen ? DATE_CHIP_ACTIVE : DATE_CHIP_IDLE
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                    Выбрать дату…
                  </button>
                )}
                {dueDateValue && duePreset !== 'custom' ? (
                  <button
                    type="button"
                    disabled={fieldsDisabled}
                    onClick={clearDueDate}
                    className={`${DATE_CHIP} border border-dashed border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50`}
                  >
                    Без даты
                  </button>
                ) : null}
              </div>

              {dueCalendarOpen && !fieldsDisabled ? (
                <div className="mt-3">
                  <ScheduleCalendar
                    value={dueDateValue}
                    onChange={setDueFromDate}
                    nullOnToday={false}
                    highlightWhenEmpty={false}
                    disablePast={false}
                    selectedClassName={PACKING_ACCENT.solid}
                  />
                </div>
              ) : null}
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Ссылка на бронь</span>
              <input
                type="url"
                value={bookingUrl}
                disabled={fieldsDisabled}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://booking.com/…"
                className={FIELD_CLASS}
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Заметка</span>
              <textarea
                rows={3}
                value={note}
                disabled={fieldsDisabled}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Номер брони, время экскурсии, контакты…"
                maxLength={240}
                className={`${FIELD_CLASS} resize-none placeholder:text-slate-400`}
              />
            </label>

            {resolvedUrl && (
              <button
                type="button"
                onClick={handleOpenLink}
                disabled={saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-teal-200 bg-teal-50 py-3 text-sm font-semibold text-teal-700 transition hover:bg-teal-100 active:scale-[0.98] disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                Открыть ссылку
              </button>
            )}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-500">Количество</p>
              <div className="flex items-center gap-2.5">
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    disabled={fieldsDisabled || qtyCount <= 1}
                    onClick={() => setQtyCount((prev) => Math.max(1, prev - 1))}
                    aria-label="Уменьшить количество"
                    className={STEP_BTN}
                  >
                    −
                  </button>
                  <span className="min-w-[2rem] text-center text-xl font-semibold tabular-nums text-slate-900">
                    {qtyCount}
                  </span>
                  <button
                    type="button"
                    disabled={fieldsDisabled}
                    onClick={() => setQtyCount((prev) => prev + 1)}
                    aria-label="Увеличить количество"
                    className={STEP_BTN}
                  >
                    +
                  </button>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  {QTY_PRESETS.map((preset) => {
                    const active = qtyCount === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={fieldsDisabled}
                        onClick={() => setQtyCount(preset)}
                        aria-pressed={active}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition disabled:opacity-40 ${
                          active
                            ? `${PACKING_ACCENT.solid} text-white`
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>

                <label className="block w-[4.75rem] shrink-0">
                  <span className="sr-only">Единица измерения</span>
                  <select
                    value={qtyUnit}
                    disabled={fieldsDisabled}
                    onChange={(e) => setQtyUnit(resolvePackingUnit(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 disabled:opacity-50"
                  >
                    {PACKING_QTY_UNITS.map((unit) => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Примечание</span>
              <textarea
                rows={3}
                value={note}
                disabled={fieldsDisabled}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Размер, цвет, где лежит…"
                maxLength={240}
                className={`${FIELD_CLASS} resize-none placeholder:text-slate-400`}
              />
            </label>
          </div>
        )}

        {showActions && (
          <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
            {canCopyToPersonal && (
              <button
                type="button"
                disabled={fieldsDisabled}
                onClick={handleCopy}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Backpack className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Скопировать в мой рюкзак</span>
                  <span className="block text-[11px] text-slate-400">Личная копия для вас</span>
                </span>
              </button>
            )}
            {canMoveToCommon && (
              <button
                type="button"
                disabled={fieldsDisabled}
                onClick={handleMoveCommon}
                className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Users className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">Перенести в общие</span>
                  <span className="block text-[11px] text-slate-400">Пункт увидит вся семья</span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] sm:px-6">
        <button
          type="button"
          onClick={readOnly ? onClose : handleSave}
          disabled={saving}
          className={PACKING_ACCENT.primaryBtn}
        >
          {saving ? 'Сохранение...' : readOnly ? 'Закрыть' : 'Готово'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="mt-3 w-full rounded-full border border-gray-200 py-3.5 text-[15px] font-semibold text-gray-500 transition hover:bg-gray-50 active:scale-[0.98] disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </AppModal>
  );
}
