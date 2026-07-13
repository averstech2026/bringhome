import { useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ClipboardPaste, Lock, Plus, Share2, Smartphone, Sparkles } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import { FamilyToggle } from '../list/accessControls';
import { PRIMARY_BTN } from '../list/cardStyles';
import { getHintById } from '../../utils/hintsContent';
import { DEFAULT_AI_INPUT_PLACEHOLDER } from '../../utils/uiThemes';

const SLIDE_HEIGHT = 'h-[14rem]';
const FOOTER_HEIGHT = 'h-[7.5rem]';
const FOOTER_HINT_HEIGHT = 'h-[4.5rem]';
const FOOTER_HINT_CLASS = 'text-xs leading-relaxed text-slate-500';

const LIST_TYPE_CHIPS = [
  { label: '+ Домой', active: true, activeClass: 'bg-emerald-500 text-white', idleClass: 'border-slate-200 text-emerald-600/80' },
  { label: '+ Дача', active: false, activeClass: 'bg-amber-500 text-white', idleClass: 'border-slate-200 text-amber-700/80' },
  { label: '+ В дорогу', active: false, activeClass: 'bg-sky-500 text-white', idleClass: 'border-slate-200 text-sky-600/80' },
];

const DATE_CHIPS = [
  { label: 'Сегодня', active: true },
  { label: 'Завтра', active: false },
  { label: 'В выходные', active: false },
];

const THEME_CHIPS = [
  { label: 'Джедаи', className: 'border-emerald-300 text-emerald-800 bg-emerald-50/60' },
  { label: 'Паддингтон', className: 'border-amber-300 text-amber-900 bg-amber-50/60' },
  { label: 'Хогвартс', className: 'border-violet-300 text-violet-800 bg-violet-50/60' },
];

function StepVisuals({ step }) {
  if (step.showCreateListDemo) {
    return (
      <div className="mt-2 space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {LIST_TYPE_CHIPS.map((chip) => (
            <span
              key={chip.label}
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                chip.active ? chip.activeClass : chip.idleClass
              }`}
            >
              {chip.label}
            </span>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {DATE_CHIPS.map((chip) => (
              <span
                key={chip.label}
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                  chip.active
                    ? 'border-transparent bg-emerald-500 text-white'
                    : 'border-slate-200 text-slate-600'
                }`}
              >
                {chip.label}
              </span>
            ))}
          </div>
          <span
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-300/50"
            aria-hidden
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} />
          </span>
        </div>
      </div>
    );
  }

  if (step.showAiInputDemo) {
    return (
      <div className="mt-1.5 rounded-2xl border border-violet-200/80 bg-gradient-to-b from-violet-50/80 to-white p-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
          Умный ввод
        </div>
        <p className="mt-1.5 text-xs leading-snug text-slate-400">
          {DEFAULT_AI_INPUT_PLACEHOLDER}
        </p>
        <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-violet-700">
          <ClipboardPaste className="h-3 w-3" strokeWidth={2} aria-hidden />
          Вставить из чата
        </span>
      </div>
    );
  }

  if (step.showShareDemo) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-3 py-2.5">
        <Share2 className="h-4 w-4 text-sky-600" strokeWidth={2} />
        <span className="text-sm font-medium text-sky-800">Ссылка для семьи Ричарда</span>
      </div>
    );
  }

  if (step.showPwaDemo) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5">
        <Smartphone className="h-4 w-4 text-indigo-600" strokeWidth={2} />
        <span className="text-sm font-medium text-indigo-800">Добавить на главный экран</span>
      </div>
    );
  }

  if (step.showBookingDemo) {
    return (
      <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-2.5">
        <Lock className="h-4 w-4 text-amber-700" strokeWidth={2} />
        <span className="text-sm font-medium text-amber-900">Забронировано вами</span>
      </div>
    );
  }

  if (step.showThemesDemo) {
    return (
      <div className="mt-4 flex flex-wrap gap-2">
        {THEME_CHIPS.map((theme) => (
          <span
            key={theme.label}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${theme.className}`}
          >
            {theme.label}
          </span>
        ))}
      </div>
    );
  }

  return null;
}

function StepCard({ step }) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden px-1">
      <div className="space-y-2">
        {step.emoji ? (
          <span className="block h-8 text-3xl leading-none" aria-hidden>
            {step.emoji}
          </span>
        ) : null}
        <h3 className="text-xl font-bold text-slate-900">{step.title}</h3>
        <p className="text-sm leading-relaxed text-slate-600">{step.description}</p>
        <StepVisuals step={step} />
      </div>
    </div>
  );
}

function HintFooter({
  activeStep,
  steps,
  dontShowAgain,
  onDontShowAgainChange,
}) {
  const isLastStep = activeStep === steps.length - 1;
  const tip = steps[activeStep]?.tip;
  const repeatOnNextVisitHint = 'Эта подсказка появится снова при следующем входе в приложение.';
  const inboxHint = 'Эту подсказку всегда можно перечитать во «Входящих» уведомлений.';

  return (
    <div className={`mt-5 ${FOOTER_HEIGHT} w-full shrink-0`}>
      {isLastStep ? (
        <div className="flex h-9 items-center gap-3 px-0.5">
          <FamilyToggle enabled={dontShowAgain} onChange={onDontShowAgainChange} />
          <button
            type="button"
            onClick={() => onDontShowAgainChange(!dontShowAgain)}
            className="text-sm text-slate-600"
          >
            Больше не показывать
          </button>
        </div>
      ) : (
        <div className="flex h-9 items-center gap-2 px-0.5 text-xs text-violet-600">
          <BookOpen className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span className="font-medium">Интерактивная подсказка</span>
        </div>
      )}
      {isLastStep ? (
        <div className={`relative mt-2 ${FOOTER_HINT_HEIGHT}`}>
          <p
            className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ease-in-out ${FOOTER_HINT_CLASS} ${
              dontShowAgain ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
          >
            {repeatOnNextVisitHint}
          </p>
          <p
            className={`absolute inset-0 overflow-hidden transition-opacity duration-300 ease-in-out ${FOOTER_HINT_CLASS} ${
              dontShowAgain ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {inboxHint}
          </p>
        </div>
      ) : (
        <p className={`mt-2 overflow-hidden ${FOOTER_HINT_HEIGHT} ${FOOTER_HINT_CLASS}`}>
          {tip || inboxHint}
        </p>
      )}
    </div>
  );
}

export default function HintGuideModal({
  open,
  onClose,
  hintId = 'welcome',
  onComplete,
  onSessionDismiss,
  mode = 'review',
}) {
  const hint = getHintById(hintId);
  const steps = hint?.steps || [];
  const lastStepIndex = Math.max(steps.length - 1, 0);

  const scrollRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLastStep = activeStep === lastStepIndex;
  const lastStepLabel = dontShowAgain ? 'Спасибо, прочитал' : 'Отлично';

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setDontShowAgain(false);
    setSubmitting(false);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [open, hintId]);

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const width = container.clientWidth || 1;
    const index = Math.round(container.scrollLeft / width);
    setActiveStep(Math.min(Math.max(index, 0), lastStepIndex));
  }, [lastStepIndex]);

  const scrollToStep = (index) => {
    const container = scrollRef.current;
    if (!container) return;
    const nextIndex = Math.min(Math.max(index, 0), lastStepIndex);
    container.scrollTo({ left: nextIndex * container.clientWidth, behavior: 'smooth' });
    setActiveStep(nextIndex);
  };

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (dontShowAgain) {
        await onComplete?.();
      } else {
        await onSessionDismiss?.();
      }
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrimaryAction = () => {
    if (!isLastStep) {
      scrollToStep(activeStep + 1);
      return;
    }
    handleComplete();
  };

  if (!hint) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="hint-guide-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} p-5 sm:p-6`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">
          Подсказка
        </p>
        <h2 id="hint-guide-title" className="mt-1 text-xl font-bold text-slate-900">
          {hint.title}
        </h2>

        {steps.length > 1 ? (
          <>
            <div
              ref={scrollRef}
              onScroll={updateActiveFromScroll}
              className={`mt-5 flex ${SLIDE_HEIGHT} shrink-0 snap-x snap-mandatory overflow-x-auto overflow-y-hidden no-scrollbar`}
            >
              {steps.map((step) => (
                <div key={step.id} className={`flex h-full w-full shrink-0 snap-center ${SLIDE_HEIGHT}`}>
                  <StepCard step={step} />
                </div>
              ))}
            </div>

            <div className="mt-5 flex shrink-0 justify-center gap-1.5 pb-1">
              {steps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => scrollToStep(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === activeStep ? 'w-5 bg-violet-500' : 'w-1.5 bg-slate-200'
                  }`}
                  aria-label={`Шаг ${index + 1}`}
                  aria-current={index === activeStep ? 'step' : undefined}
                />
              ))}
            </div>
          </>
        ) : (
          <div className={`mt-5 ${SLIDE_HEIGHT}`}>
            {steps[0] && <StepCard step={steps[0]} />}
          </div>
        )}

        <HintFooter
          activeStep={activeStep}
          steps={steps}
          dontShowAgain={dontShowAgain}
          onDontShowAgainChange={setDontShowAgain}
        />

        <button
          type="button"
          disabled={submitting}
          onClick={handlePrimaryAction}
          className={`mt-3 shrink-0 ${PRIMARY_BTN}`}
        >
          <span
            key={isLastStep ? String(dontShowAgain) : 'next'}
            className={`inline-block transition-opacity duration-300 ease-in-out ${
              isLastStep ? 'opacity-100' : ''
            }`}
          >
            {isLastStep ? lastStepLabel : 'Далее →'}
          </span>
        </button>
      </div>
    </AppModal>
  );
}
