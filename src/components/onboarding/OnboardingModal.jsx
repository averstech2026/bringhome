import { useCallback, useEffect, useRef, useState } from 'react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import AiBadge from '../layout/AiBadge';
import { FamilyToggle } from '../list/accessControls';
import { CHIP_BUTTON_SURFACE, PRIMARY_BTN } from '../list/cardStyles';
import { ONBOARDING_STEPS } from '../../utils/onboardingContent';

const LAST_STEP_INDEX = ONBOARDING_STEPS.length - 1;

const DEMO_BUTTONS = [
  {
    label: '+ Домой',
    className: 'border-emerald-200 text-emerald-700',
  },
  {
    label: '+ Дача',
    className: 'border-amber-200 text-amber-800',
  },
  {
    label: '+ В дорогу',
    className: 'border-sky-200 text-sky-700',
  },
];

function StepCard({ step }) {
  return (
    <div className="flex w-full shrink-0 snap-center flex-col px-1">
      {step.emoji && (
        <span className="mb-3 text-3xl" aria-hidden>
          {step.emoji}
        </span>
      )}
      <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>

      {step.showQuickButtons && (
        <div className="mt-4 flex flex-wrap gap-2">
          {DEMO_BUTTONS.map((button) => (
            <span
              key={button.label}
              className={`${CHIP_BUTTON_SURFACE} pointer-events-none ${button.className}`}
            >
              {button.label}
            </span>
          ))}
        </div>
      )}

      {step.showAiBadge && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-2.5">
          <AiBadge className="h-6 w-6 rounded-[5px]" />
          <span className="text-sm font-medium text-violet-800">AI-помощник в списке</span>
        </div>
      )}
    </div>
  );
}

function DismissToggleRow({ enabled, onChange }) {
  return (
    <div className="mt-5 w-full">
      <div className="flex items-center gap-3 px-0.5 py-1">
        <FamilyToggle enabled={enabled} onChange={onChange} />
        <button
          type="button"
          onClick={() => onChange(!enabled)}
          className="text-sm text-slate-600"
        >
          Больше не показывать
        </button>
      </div>
      {enabled && (
        <p className="mt-2.5 text-xs leading-relaxed text-slate-500">
          Это знакомство всегда можно перечитать во «Входящих» уведомлениях.
        </p>
      )}
    </div>
  );
}

export default function OnboardingModal({
  open,
  onClose,
  onComplete,
  mode = 'home',
  onboardingCompleted = false,
}) {
  const scrollRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isLastStep = activeStep === LAST_STEP_INDEX;
  const lastStepLabel = mode === 'review' ? 'Отлично!' : 'Поехали!';

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setDontShowAgain(onboardingCompleted === true);
    setSubmitting(false);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [open, onboardingCompleted]);

  const updateActiveFromScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const width = container.clientWidth || 1;
    const index = Math.round(container.scrollLeft / width);
    setActiveStep(Math.min(Math.max(index, 0), LAST_STEP_INDEX));
  }, []);

  const scrollToStep = (index) => {
    const container = scrollRef.current;
    if (!container) return;
    const nextIndex = Math.min(Math.max(index, 0), LAST_STEP_INDEX);
    container.scrollTo({ left: nextIndex * container.clientWidth, behavior: 'smooth' });
    setActiveStep(nextIndex);
  };

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onComplete?.(dontShowAgain);
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

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="onboarding-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} p-5 sm:p-6`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Знакомство с приложением
        </p>
        <h2 id="onboarding-title" className="mt-1 text-xl font-bold text-slate-900">
          Как пользоваться КупиДомой
        </h2>

        <div
          ref={scrollRef}
          onScroll={updateActiveFromScroll}
          className="mt-5 flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
        >
          {ONBOARDING_STEPS.map((step) => (
            <div key={step.id} className="w-full shrink-0 snap-center">
              <StepCard step={step} />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {ONBOARDING_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => scrollToStep(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === activeStep ? 'w-5 bg-emerald-500' : 'w-1.5 bg-slate-200'
              }`}
              aria-label={`Шаг ${index + 1}`}
              aria-current={index === activeStep ? 'step' : undefined}
            />
          ))}
        </div>

        {isLastStep && (
          <DismissToggleRow
            enabled={dontShowAgain}
            onChange={setDontShowAgain}
          />
        )}

        <button
          type="button"
          disabled={submitting}
          onClick={handlePrimaryAction}
          className={`${isLastStep ? 'mt-3' : 'mt-5'} ${PRIMARY_BTN}`}
        >
          {isLastStep ? lastStepLabel : 'Далее →'}
        </button>
      </div>
    </AppModal>
  );
}
