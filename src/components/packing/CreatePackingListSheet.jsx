import { useEffect, useMemo, useState } from 'react';
import {
  Briefcase,
  ClipboardList,
  FilePlus2,
  LayoutTemplate,
  Sparkles,
  Sword,
  Wand2,
  X,
} from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import ScheduleCalendar from '../list/ScheduleCalendar';
import CheckToggle from '../list/CheckToggle';
import { CREATE_BTN_DISABLED } from '../list/cardStyles';
import {
  appendDateToPackingTitle,
  formatPackingActivityLabel,
  formatPackingDateLabel,
  groupPackingItemsByActivity,
  PACKING_ITEM_TYPE,
} from '../../utils/packingLists';
import { PACKING_ACCENT } from '../../utils/contextAccents';
import { getPackingCreateAiTheme } from '../../utils/uiThemes';
import { generatePackingListWithAI } from '../../services/aiService';
import { getAiUsageStatus, recordAiUsage } from '../../services/aiUsageService';
import { isUnlimitedAiUser } from '../../utils/aiLimits';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useToast } from '../ui/ToastProvider';
import PackingTripAxesChips from './PackingTripAxesChips';
import {
  addDays,
  getNextWeekend,
  getToday,
  startOfDay,
} from '../../utils/listSchedule';

export const MODE_BLANK = 'blank';
export const MODE_TEMPLATE = 'template';
export const MODE_AI = 'ai';

const STEP_FORM = 'form';
const STEP_PREVIEW = 'preview';

const AI_PROMPT_PLACEHOLDER =
  'Например: В начале сентября планируем поездку в Турцию самолетом. Сначала живем в Анталии, потом в отеле на море. Подбери вещи.';

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
  uiTheme = 'default',
}) {
  const today = useMemo(() => getToday(), []);
  const aiTheme = useMemo(() => getPackingCreateAiTheme(uiTheme), [uiTheme]);
  const { user } = useAuth();
  const { profile, reload: reloadProfile } = useUserProfile(user);
  const toast = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [mode, setMode] = useState(MODE_AI);
  const [templateId, setTemplateId] = useState(null);
  const [tripTransport, setTripTransport] = useState('car');
  const [tripPurpose, setTripPurpose] = useState('city');
  const [datePreset, setDatePreset] = useState('today');
  const [customDate, setCustomDate] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [step, setStep] = useState(STEP_FORM);
  const [generating, setGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  const isAiMode = mode === MODE_AI;
  const isTemplateMode = mode === MODE_TEMPLATE;
  const hasTemplates = templates.length > 0;
  const isPreview = step === STEP_PREVIEW && Boolean(aiPreview);
  const locked = busy || generating;

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setAiPrompt('');
    setMode(MODE_AI);
    setTemplateId(null);
    setTripTransport('car');
    setTripPurpose('city');
    setDatePreset('today');
    setCustomDate(null);
    setCalendarOpen(false);
    setStep(STEP_FORM);
    setGenerating(false);
    setAiPreview(null);
    setSelectedIds(new Set());
  }, [open]);

  const travelDate = useMemo(
    () => resolveTravelDate(datePreset, customDate, today),
    [datePreset, customDate, today],
  );

  const previewGroups = useMemo(() => {
    if (!aiPreview?.items) return [];
    return groupPackingItemsByActivity(aiPreview.items);
  }, [aiPreview]);

  const selectedCount = useMemo(() => {
    if (!aiPreview?.items) return 0;
    return aiPreview.items.filter((item) => selectedIds.has(item._previewId)).length;
  }, [aiPreview, selectedIds]);

  const allSelected = Boolean(aiPreview?.items?.length) && selectedCount === aiPreview.items.length;

  const previewTitle = useMemo(() => {
    if (!aiPreview) return '';
    const raw = String(title || '').trim() || aiPreview.title;
    return appendDateToPackingTitle(raw, today);
  }, [aiPreview, title, today]);

  const hasTitle = Boolean(title.trim());
  const hasAiPrompt = Boolean(aiPrompt.trim());
  const needsTemplate = isTemplateMode && !templateId;
  const canSubmitForm = isAiMode
    ? hasAiPrompt && !locked
    : !locked && !needsTemplate;

  const selectMode = (nextMode) => {
    if (locked || isPreview) return;
    if (nextMode === MODE_TEMPLATE && !hasTemplates) return;
    setMode(nextMode);
    if (nextMode !== MODE_TEMPLATE) setTemplateId(null);
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

      const generated = await generatePackingListWithAI(aiPrompt.trim());
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
      setSelectedIds(new Set(withIds.items.map((item) => item._previewId)));
      setStep(STEP_PREVIEW);
    } catch (err) {
      toast.error(err?.message || 'Не удалось сгенерировать список');
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
      title: previewTitle,
      items: selectedItems,
      sections: aiPreview.sections,
      description: aiPrompt.trim(),
      travelDate: today,
      tripTransport: null,
      tripPurpose: null,
      templateId: null,
      aiPrompt: '',
    });
  };

  const handleSubmit = () => {
    if (!canSubmitForm) return;

    if (isAiMode) {
      handleGeneratePreview();
      return;
    }

    const rawTitle = title.trim() || 'Поездка';
    const resolvedTitle = appendDateToPackingTitle(rawTitle, travelDate);
    onConfirm?.({
      mode,
      title: resolvedTitle,
      templateId: isTemplateMode ? templateId : null,
      travelDate,
      description: description.trim(),
      tripTransport,
      tripPurpose,
      aiPrompt: '',
      items: [],
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

  const primaryLabel = (() => {
    if (generating) return aiTheme.loadingLabel;
    if (busy) return 'Создаём…';
    if (isAiMode) {
      return hasAiPrompt ? aiTheme.label : aiTheme.emptyLabel;
    }
    if (needsTemplate) return 'Выберите шаблон';
    return hasTitle
      ? 'Создать список 🚀'
      : `Создать «Поездка ${formatPackingDateLabel(travelDate)}» 🚀`;
  })();

  const primaryClassName = (() => {
    if (isAiMode) {
      if (!hasAiPrompt && !generating) return CREATE_BTN_DISABLED;
      return `relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100 ${aiTheme.buttonClass}`;
    }
    return !needsTemplate ? PACKING_ACCENT.primaryBtn : CREATE_BTN_DISABLED;
  })();

  const showAiThemeIcon = isAiMode && (hasAiPrompt || generating);

  const subtitle = isPreview
    ? 'Проверьте разделы и вещи перед созданием'
    : isAiMode
      ? 'Опишите поездку — ИИ подберёт вещи и разделы'
      : 'Способ, назначение и дата';

  const modeTiles = [
    {
      id: MODE_AI,
      Icon: Sparkles,
      title: '✨ С ИИ',
      hint: 'Разделы и вещи по описанию',
      disabled: locked || isPreview,
    },
    {
      id: MODE_BLANK,
      Icon: FilePlus2,
      title: 'С чистого листа',
      hint: 'Пустой список',
      disabled: locked || isPreview,
    },
    {
      id: MODE_TEMPLATE,
      Icon: LayoutTemplate,
      title: 'Из шаблона',
      hint: hasTemplates ? `${templates.length} шт.` : 'Пока нет шаблонов',
      disabled: locked || isPreview || !hasTemplates,
    },
  ];

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="create-packing-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} overflow-hidden pb-0`}
      disableClose={locked}
    >
      <button
        type="button"
        onClick={onClose}
        disabled={locked}
        className="absolute right-4 top-4 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow-sm ring-1 ring-slate-100 backdrop-blur-sm transition hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
        aria-label="Закрыть"
      >
        <X className="h-4 w-4" strokeWidth={2.25} aria-hidden />
      </button>

      <div className="shrink-0 px-5 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" aria-hidden />

        <div className="pr-10">
          <h2 id="create-packing-title" className="text-lg font-bold text-slate-900">
            {isPreview ? 'Предпросмотр списка' : 'Новый список'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>

        {!isPreview && (
          <div
            className="mt-4 grid grid-cols-3 gap-2"
            role="tablist"
            aria-label="Способ создания списка"
          >
            {modeTiles.map(({ id, Icon, title: tileTitle, hint, disabled }) => {
              const selected = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  disabled={disabled}
                  onClick={() => selectMode(id)}
                  className={`flex min-h-[5.25rem] flex-col items-start gap-1 rounded-2xl border px-2.5 py-2.5 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected
                      ? `border-transparent text-white shadow-sm ${accentClassName}`
                      : id === MODE_AI
                        ? 'border-indigo-100 bg-indigo-50/60 text-slate-700 hover:bg-indigo-50'
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
                Название
              </p>
              <p className="mt-0.5 text-[15px] font-semibold text-slate-900">{previewTitle}</p>
              <p className="mt-1 text-[12px] text-slate-500">
                {previewGroups.length} раздел{previewGroups.length === 1 ? '' : previewGroups.length < 5 ? 'а' : 'ов'}
                {' · '}
                {aiPreview.items.length} пункт{aiPreview.items.length === 1 ? '' : aiPreview.items.length < 5 ? 'а' : 'ов'}
                {' · все в общих'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 px-0.5">
              <button
                type="button"
                disabled={locked}
                onClick={() => toggleAllPreview(!allSelected)}
                className="text-xs font-semibold text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
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
              return (
                <section
                  key={group.activity || '__main'}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-3.5 py-2.5">
                    <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">
                      {formatPackingActivityLabel(group.activity, group.activityIcon)}
                    </h3>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => toggleGroupPreview(group.items, !groupAllSelected)}
                      className="shrink-0 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                    >
                      {groupAllSelected ? 'Снять все' : 'Выбрать все'}
                    </button>
                    <span className="shrink-0 text-[11px] font-medium text-slate-400">
                      {groupSelected}/{group.items.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {group.items.map((item) => {
                      const isTodo = item.type === PACKING_ITEM_TYPE.TODO;
                      const checked = selectedIds.has(item._previewId);
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
                            <div className="min-w-0 flex-1">
                              <p className={`text-sm font-medium ${checked ? 'text-slate-800' : 'text-slate-400'}`}>
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {isTodo ? 'Дело' : 'Вещь'}
                                {item.category ? ` · ${item.category}` : ''}
                              </p>
                            </div>
                            {isTodo ? (
                              <ClipboardList
                                className="h-4 w-4 shrink-0 text-teal-500"
                                strokeWidth={2}
                                aria-hidden
                              />
                            ) : (
                              <Briefcase
                                className="h-4 w-4 shrink-0 text-indigo-500"
                                strokeWidth={2}
                                aria-hidden
                              />
                            )}
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
          <>
            <label className="block">
              <span className="text-xs font-medium text-slate-500">Название</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Турция"
                maxLength={80}
                disabled={locked}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white disabled:opacity-60"
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Можно оставить пустым — ИИ предложит название по описанию
              </p>
            </label>

            <label className="mt-5 block">
              <span className="text-xs font-medium text-slate-500">Описание для ИИ</span>
              <textarea
                rows={7}
                value={aiPrompt}
                disabled={locked}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={AI_PROMPT_PLACEHOLDER}
                maxLength={2000}
                autoFocus
                className={`mt-1.5 w-full resize-none rounded-2xl border bg-white/80 px-4 py-3 text-[15px] leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-black/5 disabled:opacity-60 ${aiTheme.accentBorderClassName || 'border-indigo-200'}`}
              />
            </label>
          </>
        ) : (
          <>
            <PackingTripAxesChips
              transport={tripTransport}
              purpose={tripPurpose}
              onTransportChange={setTripTransport}
              onPurposeChange={setTripPurpose}
              disabled={locked}
            />

            <label className="mt-5 block">
              <span className="text-xs font-medium text-slate-500">Название</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Сочи на майские"
                maxLength={80}
                disabled={locked}
                className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white disabled:opacity-60"
                autoFocus
              />
              <p className="mt-1.5 text-[11px] text-slate-400">
                Можно оставить пустым — будет «Поездка {formatPackingDateLabel(travelDate)}».
                Если даты нет в названии, добавим её при создании
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
                    disabled={locked}
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
                  disabled={locked}
                  selectedClassName={PACKING_ACCENT.solid}
                />
              </div>
            )}

            <p className="mt-5 text-sm font-medium text-slate-700">Заметка к списку</p>
            <textarea
              rows={3}
              value={description}
              disabled={locked}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Добавить важные детали, номер парковки, список магазинов..."
              maxLength={120}
              className="mt-2.5 w-full resize-none rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-60"
            />

            {isTemplateMode && hasTemplates && (
              <div className="mt-5 shrink-0">
                <p className="text-xs font-medium text-slate-500">Выберите шаблон</p>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {templates.map((template) => {
                    const selected = templateId === template.id;
                    const count = Array.isArray(template.items) ? template.items.length : 0;
                    return (
                      <button
                        key={template.id}
                        type="button"
                        disabled={locked}
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
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-100 bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
        {isPreview ? (
          <button
            type="button"
            disabled={locked || selectedCount === 0}
            onClick={handleConfirmPreview}
            className={`relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-[15px] font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:active:scale-100 ${aiTheme.buttonClass}`}
          >
            <AiThemeIcon
              icon={aiTheme.icon}
              className={`relative z-10 h-4 w-4 shrink-0 ${busy ? 'animate-spin' : ''}`}
            />
            <span className="relative z-10">
              {busy
                ? aiTheme.confirmLoadingLabel
                : selectedCount > 0
                  ? `${aiTheme.confirmLabel} (+${selectedCount})`
                  : 'Выберите пункты'}
            </span>
          </button>
        ) : (
          <button
            type="button"
            disabled={!canSubmitForm}
            onClick={handleSubmit}
            className={`transition-all duration-150 ${primaryClassName}`}
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
    </AppModal>
  );
}
