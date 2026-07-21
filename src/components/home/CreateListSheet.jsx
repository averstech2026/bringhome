import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  FilePlus2,
  Sparkles,
  Sword,
  Wand2,
  X,
} from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import ListExternalShareSection from '../list/ListExternalShareSection';
import ArchiveListConfirmModal from './ArchiveListConfirmModal';
import CheckToggle from '../list/CheckToggle';
import { CREATE_BTN_DISABLED, PRIMARY_BTN } from '../list/cardStyles';
import { sanitizeCustomTypeName, formatListTitle } from '../../utils/listTypes';
import {
  addDays,
  getNextWeekend,
  getToday,
  isSameDay,
  isToday,
  startOfDay,
} from '../../utils/listSchedule';
import { getShoppingCreateAiTheme } from '../../utils/uiThemes';
import { generateShoppingListWithAI } from '../../services/aiService';
import { getAiUsageStatus, recordAiUsage } from '../../services/aiUsageService';
import { isUnlimitedAiUser } from '../../utils/aiLimits';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useToast } from '../ui/ToastProvider';
import { getQuantityDisplay } from '../../utils/quantity';
import {
  CATEGORY_EMOJI,
  getCategoryHeaderClass,
} from '../../utils/categories';
import { groupItemsByCategory } from '../../utils/groupByCategory';
import {
  ensureDictionaryLoaded,
  getDictionaryCache,
} from '../../services/customProductsDictionaryService';
import { SHOPPING_ACCENT } from '../../utils/contextAccents';

export const MODE_BLANK = 'blank';
export const MODE_AI = 'ai';

const STEP_FORM = 'form';
const STEP_PREVIEW = 'preview';

const AI_PROMPT_PLACEHOLDER =
  'Например: Купи на дачу мясо для шашлыка, угли, огурцы, 2 пакета молока и творог';

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

function AiThemeIcon({ icon, className }) {
  if (icon === 'wand') {
    return <Wand2 className={className} strokeWidth={2} aria-hidden />;
  }
  if (icon === 'sword') {
    return <Sword className={className} strokeWidth={2} aria-hidden />;
  }
  if (icon === 'briefcase') {
    return <Briefcase className={className} strokeWidth={2} aria-hidden />;
  }
  return <Sparkles className={className} strokeWidth={2} aria-hidden />;
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
  initialTitle = '',
  readOnly = false,
  listId = null,
  list = null,
  currentUserId = null,
  ownerFamilyName = '',
  ownerFamilyAvatarUrl = null,
  onExternalShareChanged,
  uiTheme = 'default',
  busy = false,
}) {
  const today = useMemo(() => getToday(), []);
  const isSettings = mode === 'settings';
  const aiTheme = useMemo(() => getShoppingCreateAiTheme(uiTheme), [uiTheme]);
  const { user } = useAuth();
  const { profile, reload: reloadProfile } = useUserProfile(user);
  const toast = useToast();

  const [createMode, setCreateMode] = useState(MODE_AI);
  const [step, setStep] = useState(STEP_FORM);
  const [aiPrompt, setAiPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const [selectedType, setSelectedType] = useState('home');
  const [selectedPreset, setSelectedPreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');
  const [description, setDescription] = useState('');
  const [listTitle, setListTitle] = useState('');
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const inputRef = useRef(null);
  const customFormRef = useRef(null);

  const isAiMode = !isSettings && createMode === MODE_AI;
  const isPreview = !isSettings && step === STEP_PREVIEW && Boolean(aiPreview);
  const locked = busy || generating || archiving;

  const resetCreateState = () => {
    setCreateMode(MODE_AI);
    setStep(STEP_FORM);
    setAiPrompt('');
    setGenerating(false);
    setAiPreview(null);
    setPreviewTitle('');
    setSelectedIds(new Set());
    setSelectedType('home');
    setSelectedPreset('today');
    setCustomDate(null);
    setCalendarOpen(false);
    setCustomMode(false);
    setCustomName('');
    setDescription('');
    setListTitle('');
  };

  const hydrateSettingsState = () => {
    const resolvedType = initialType || 'home';
    setSelectedType(resolvedType);
    setCustomMode(false);
    setCustomName('');
    setDescription(initialDescription || '');
    setListTitle(initialTitle || '');

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
    } else {
      resetCreateState();
      ensureDictionaryLoaded().catch(() => {});
    }
  }, [open, mode, initialType, initialScheduledFor, initialDescription, initialTitle, today]);

  useEffect(() => {
    if (open && customMode) inputRef.current?.focus();
  }, [open, customMode]);

  const selectedDate = selectedPreset === 'custom'
    ? customDate
    : resolvePresetDate(selectedPreset, today);

  const previewGroups = useMemo(() => {
    if (!aiPreview?.items) return [];
    return groupItemsByCategory(aiPreview.items).map(([category, items]) => ({
      category,
      items,
    }));
  }, [aiPreview]);

  const selectedCount = useMemo(() => {
    if (!aiPreview?.items) return 0;
    return aiPreview.items.filter((item) => selectedIds.has(item._previewId)).length;
  }, [aiPreview, selectedIds]);

  const allSelected = Boolean(aiPreview?.items?.length) && selectedCount === aiPreview.items.length;

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
  const hasAiPrompt = Boolean(aiPrompt.trim());
  const canSubmitBlank = Boolean(resolvedType) && !customMode;
  const canSubmitForm = isAiMode
    ? hasAiPrompt && !locked
    : canSubmitBlank && !locked;

  const selectCreateMode = (nextMode) => {
    if (locked || isPreview || isSettings) return;
    setCreateMode(nextMode);
  };

  const handleGeneratePreview = async () => {
    if (!hasAiPrompt || locked) return;
    if (!user?.uid) {
      toast.error('Войдите в аккаунт, чтобы использовать ИИ');
      return;
    }

    setGenerating(true);
    try {
      if (!isUnlimitedAiUser(profile)) {
        const freshStatus = await getAiUsageStatus(user.uid);
        if (!freshStatus.allowed) {
          reloadProfile();
          toast.error('Лимит запросов ИИ исчерпан');
          return;
        }
      }

      const customDictionary = Object.values(getDictionaryCache());
      const generated = await generateShoppingListWithAI(aiPrompt.trim(), {
        customDictionary,
        today,
      });
      await recordAiUsage(user.uid);
      reloadProfile();

      const withIds = {
        ...generated,
        items: generated.items.map((item, index) => ({
          ...item,
          _previewId: `ai-preview-${index}`,
        })),
      };
      setAiPreview(withIds);
      setPreviewTitle(generated.title || '');
      setSelectedIds(new Set(withIds.items.map((item) => item._previewId)));
      setStep(STEP_PREVIEW);
    } catch (err) {
      toast.error(err?.message || 'Не удалось распознать список');
    } finally {
      setGenerating(false);
    }
  };

  const togglePreviewItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPreview = (selectAll) => {
    if (!aiPreview?.items) return;
    if (selectAll) {
      setSelectedIds(new Set(aiPreview.items.map((item) => item._previewId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleGroupPreview = (groupItems, selectAll) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of groupItems) {
        if (selectAll) next.add(item._previewId);
        else next.delete(item._previewId);
      }
      return next;
    });
  };

  const handleConfirmPreview = () => {
    if (!aiPreview || locked || selectedCount === 0) return;
    const selectedItems = aiPreview.items
      .filter((item) => selectedIds.has(item._previewId))
      .map(({ _previewId, ...item }) => item);

    onConfirm?.({
      mode: MODE_AI,
      type: aiPreview.type,
      title: (previewTitle.trim() || aiPreview.title || '').slice(0, 80),
      items: selectedItems,
      scheduledFor: null,
      // Промпт может быть длинным — на плашке только краткий title от ИИ.
      description: '',
    });
  };

  const handleSubmit = () => {
    if (readOnly) {
      onClose?.();
      return;
    }
    if (isAiMode) {
      handleGeneratePreview();
      return;
    }
    if (!canSubmitBlank) return;

    const scheduledFor = selectedPreset === 'today' ? null : selectedDate;
    const autoTitle = formatListTitle(resolvedType, scheduledFor || today);
    const resolvedTitle = isSettings
      ? (listTitle.trim() || autoTitle).slice(0, 80)
      : null;

    onConfirm?.({
      mode: MODE_BLANK,
      type: resolvedType,
      scheduledFor,
      description: description.trim(),
      items: [],
      title: resolvedTitle,
    });
  };

  const calendarActive = calendarOpen || selectedPreset === 'custom';
  const sheetTitle = isPreview
    ? 'Предпросмотр списка'
    : isSettings
      ? 'Настройки списка'
      : 'Новый список';
  const sheetSubtitle = isPreview
    ? 'Проверьте отделы и товары перед созданием'
    : isSettings
      ? 'Название, тип, дата и заметка'
      : isAiMode
        ? 'Вставьте текст — ИИ разберёт продукты и отделы'
        : 'Выберите тип списка и дату';
  const submitLabel = readOnly
    ? 'Закрыть'
    : isSettings
      ? 'Сохранить'
      : 'Создать список';
  const showArchive = Boolean(
    isSettings
    && !readOnly
    && list
    && !list.archived
    && list.status !== 'archived'
    && (onArchive || onArchiveDenied),
  );

  const primaryLabel = (() => {
    if (generating) return aiTheme.loadingLabel;
    if (busy) return 'Создаём…';
    if (isAiMode) {
      return hasAiPrompt ? aiTheme.label : aiTheme.emptyLabel;
    }
    return submitLabel;
  })();

  const primaryClassName = (() => {
    if (isAiMode) {
      if (!hasAiPrompt && !generating) return CREATE_BTN_DISABLED;
      return `relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100 ${aiTheme.buttonClass}`;
    }
    return PRIMARY_BTN;
  })();

  const showAiThemeIcon = isAiMode && (hasAiPrompt || generating);

  const handleArchiveClick = () => {
    if (archiving) return;
    if (canArchive) {
      setArchiveConfirmOpen(true);
      return;
    }
    onArchiveDenied?.(list);
  };

  const modeTiles = [
    {
      id: MODE_AI,
      Icon: Sparkles,
      title: '✨ С ИИ',
      hint: 'Продукты из чата или заметок',
      disabled: locked || isPreview,
    },
    {
      id: MODE_BLANK,
      Icon: FilePlus2,
      title: 'С чистого листа',
      hint: 'Пустой список',
      disabled: locked || isPreview,
    },
  ];

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="create-list-sheet-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-hidden pb-0`}
      disableClose={locked && !isSettings}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={locked && !isSettings ? locked : archiving}
        className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>

      <div className="shrink-0 px-5 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <div className="pr-10">
          <h2 id="create-list-sheet-title" className="text-lg font-bold text-slate-900">
            {sheetTitle}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{sheetSubtitle}</p>
        </div>

        {!isSettings && !isPreview && (
          <div
            className="mt-4 grid grid-cols-2 gap-2"
            role="tablist"
            aria-label="Способ создания списка"
          >
            {modeTiles.map(({ id, Icon, title: tileTitle, hint, disabled }) => {
              const selected = createMode === id;
              const selectedClass = id === MODE_AI
                ? `border-transparent text-white shadow-sm ${aiTheme.tabClass}`
                : `border-transparent text-white shadow-sm ${SHOPPING_ACCENT.solid}`;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  disabled={disabled}
                  onClick={() => selectCreateMode(id)}
                  className={`flex min-h-[5.25rem] flex-col items-start gap-1 rounded-2xl border px-2.5 py-2.5 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected
                      ? selectedClass
                      : id === MODE_AI
                        ? aiTheme.tabIdleClass
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  <span className="text-[12px] font-semibold leading-tight">{tileTitle}</span>
                  <span
                    className={`text-[10px] leading-snug ${
                      selected ? 'text-white/80' : 'text-slate-400'
                    }`}
                  >
                    {hint}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-2">
        {isPreview ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Определено назначение
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-slate-900">
                {aiPreview.purposeLabel}
              </p>
              <label className="mt-3 block">
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Название
                </span>
                <input
                  type="text"
                  value={previewTitle}
                  disabled={locked}
                  onChange={(e) => setPreviewTitle(e.target.value)}
                  maxLength={80}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-violet-300 focus:ring-2 focus:ring-violet-500/15 disabled:opacity-60"
                />
              </label>
              <p className="mt-2 text-[12px] text-slate-500">
                {previewGroups.length} отдел{previewGroups.length === 1 ? '' : previewGroups.length < 5 ? 'а' : 'ов'}
                {' · '}
                {aiPreview.items.length} товар{aiPreview.items.length === 1 ? '' : aiPreview.items.length < 5 ? 'а' : 'ов'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 px-0.5">
              <button
                type="button"
                disabled={locked}
                onClick={() => toggleAllPreview(!allSelected)}
                className="text-xs font-semibold text-violet-600 transition hover:text-violet-700 disabled:opacity-50"
              >
                {allSelected ? 'Снять всё' : 'Выбрать всё'}
              </button>
              <span className="text-xs font-medium text-slate-500">
                Выбрано: {selectedCount}
              </span>
            </div>

            {previewGroups.map((group) => {
              const groupSelected = group.items.filter((item) => selectedIds.has(item._previewId)).length;
              const groupAllSelected = groupSelected === group.items.length && group.items.length > 0;
              const emoji = CATEGORY_EMOJI[group.category] || '📦';
              return (
                <section
                  key={group.category}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div
                    className={`flex items-center justify-between gap-2 border-b border-slate-100 px-3.5 py-2.5 ${getCategoryHeaderClass(group.category)}`}
                  >
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">
                      <span className="mr-1.5" aria-hidden>{emoji}</span>
                      {group.category}
                    </h3>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => toggleGroupPreview(group.items, !groupAllSelected)}
                      className="shrink-0 text-[11px] font-semibold text-violet-600 hover:text-violet-700 disabled:opacity-50"
                    >
                      {groupAllSelected ? 'Снять все' : 'Выбрать все'}
                    </button>
                    <span className="shrink-0 text-[11px] font-medium opacity-70">
                      {groupSelected}/{group.items.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {group.items.map((item) => {
                      const checked = selectedIds.has(item._previewId);
                      const { label: qtyLabel } = getQuantityDisplay(item.quantity);
                      return (
                        <li
                          key={item._previewId}
                          className="flex items-center gap-3 px-3.5 py-2.5 transition hover:bg-slate-50/80"
                        >
                          <CheckToggle
                            checked={checked}
                            onChange={() => togglePreviewItem(item._previewId)}
                            disabled={locked}
                          />
                          <button
                            type="button"
                            disabled={locked}
                            onClick={() => togglePreviewItem(item._previewId)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
                          >
                            <p className={`min-w-0 flex-1 text-sm font-medium ${checked ? 'text-slate-800' : 'text-slate-400'}`}>
                              {item.name}
                            </p>
                            <span className="shrink-0 text-xs font-medium tabular-nums text-slate-500">
                              {qtyLabel}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : isAiMode ? (
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Список из чата или заметок</span>
            <textarea
              rows={8}
              value={aiPrompt}
              disabled={locked}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder={AI_PROMPT_PLACEHOLDER}
              maxLength={2000}
              autoFocus
              className={`mt-1.5 w-full resize-none rounded-2xl border bg-white/80 px-4 py-3 text-[15px] leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60 ${aiTheme.accentBorderClassName || 'border-violet-200'}`}
            />
          </label>
        ) : (
          <>
            {isSettings && (
              <label className="mb-5 block">
                <span className="text-sm font-medium text-slate-700">Название списка</span>
                <input
                  type="text"
                  value={listTitle}
                  readOnly={readOnly}
                  disabled={readOnly || locked}
                  onChange={(e) => setListTitle(e.target.value)}
                  placeholder={formatListTitle(resolvedType || 'home', selectedDate || today)}
                  maxLength={80}
                  className="mt-2.5 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-[15px] font-semibold text-slate-900 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                />
                <p className="mt-1.5 text-xs text-slate-400">
                  Можно изменить название от ИИ. Если очистить — подставим тип и дату.
                </p>
              </label>
            )}

            <p className="text-sm font-medium text-slate-700">Тип списка</p>
            <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {TYPE_OPTIONS.map(({ type, label, idleClassName, activeClassName }) => {
                const active = !customMode && selectedType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={readOnly || locked}
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
                  disabled={readOnly || locked}
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
            <p className="mt-1 text-xs text-slate-400">
              Для напоминаний{isSettings ? '' : ' и названия списка'}
            </p>
            <div className="mt-2.5 flex flex-row flex-nowrap items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
              {SCHEDULE_PRESETS.map(({ id, label }) => (
                <SelectionChip
                  key={id}
                  active={selectedPreset === id}
                  onClick={() => selectPreset(id)}
                  disabled={readOnly || locked}
                  className="shrink-0"
                >
                  {label}
                </SelectionChip>
              ))}
              <SelectionChip
                active={calendarActive}
                onClick={handleDateChipClick}
                disabled={readOnly || locked}
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
                disabled={readOnly || locked}
              />
            )}

            <p className="mt-5 text-sm font-medium text-slate-700">Заметка к списку</p>
            <textarea
              rows={3}
              value={description}
              readOnly={readOnly}
              disabled={readOnly || locked}
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
                  Список исчезнет с рабочего стола покупок у всей семьи.
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
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
        {isPreview ? (
          <div className="flex gap-2.5">
            <button
              type="button"
              disabled={locked}
              onClick={() => {
                setStep(STEP_FORM);
                setAiPreview(null);
                setPreviewTitle('');
                setSelectedIds(new Set());
              }}
              className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Назад
            </button>
            <button
              type="button"
              disabled={locked || selectedCount === 0}
              onClick={handleConfirmPreview}
              className={`relative inline-flex min-w-0 flex-1 items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100 ${aiTheme.buttonClass}`}
            >
              <AiThemeIcon
                icon={aiTheme.icon}
                className={`relative z-10 h-4 w-4 shrink-0 ${busy ? 'animate-spin' : ''}`}
              />
              <span className="relative z-10 truncate">
                {busy
                  ? aiTheme.confirmLoadingLabel
                  : selectedCount > 0
                    ? `${aiTheme.confirmLabel} (+${selectedCount})`
                    : 'Выберите товары'}
              </span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              readOnly
                ? false
                : isAiMode
                  ? !canSubmitForm
                  : (!canSubmitBlank || locked)
            }
            className={`transition-all duration-150 ${primaryClassName} disabled:cursor-not-allowed`}
          >
            {showAiThemeIcon && (
              <AiThemeIcon
                icon={aiTheme.icon}
                className={`relative z-10 h-4 w-4 shrink-0 ${generating ? 'animate-spin' : ''}`}
              />
            )}
            <span className="relative z-10">{primaryLabel}</span>
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
