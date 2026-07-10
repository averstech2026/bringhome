import { useCallback, useEffect, useRef, useState } from 'react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_WIDE } from '../ui/AppModal';
import { PRIMARY_BTN } from '../list/cardStyles';

const SLIDE_HEIGHT = 'h-[11rem]';
const FOOTER_HEIGHT = 'h-[6.25rem]';
const FOOTER_HINT_CLASS = 'text-xs leading-relaxed text-slate-500';

function AnnouncementSlide({ announcement }) {
  return (
    <div className="flex h-full w-full flex-col justify-between px-1">
      <div>
        <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{announcement.content}</p>
      </div>
    </div>
  );
}

function AnnouncementFooter({ hint }) {
  return (
    <div className={`mt-5 ${FOOTER_HEIGHT} w-full shrink-0`}>
      <div className="flex h-9 items-center gap-3 px-0.5" aria-hidden>
        <span className="invisible flex items-center gap-3">
          <span className="inline-block h-7 w-12 rounded-full bg-gray-200" />
          <span className="text-sm">Больше не показывать</span>
        </span>
      </div>
      <p className={`mt-2 line-clamp-3 h-14 ${FOOTER_HINT_CLASS}`}>
        {hint || '\u00a0'}
      </p>
    </div>
  );
}

export default function FeatureAnnouncementModal({
  open,
  announcements = [],
  onClose,
  onComplete,
}) {
  const scrollRef = useRef(null);
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const lastStepIndex = Math.max(announcements.length - 1, 0);
  const isLastStep = activeStep === lastStepIndex;
  const activeAnnouncement = announcements[activeStep];
  const showDots = announcements.length > 1;

  useEffect(() => {
    if (!open) return;
    setActiveStep(0);
    setSubmitting(false);
    scrollRef.current?.scrollTo({ left: 0, behavior: 'instant' });
  }, [open, announcements]);

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
      await onComplete?.(announcements.map((announcement) => announcement.id));
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

  if (!announcements.length) return null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="feature-announcement-title"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={`${MODAL_PANEL_WIDE} p-5 sm:p-6`}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
          Что нового
        </p>
        <h2 id="feature-announcement-title" className="mt-1 text-xl font-bold text-slate-900">
          Обновления приложения
        </h2>

        <div
          ref={scrollRef}
          onScroll={updateActiveFromScroll}
          className={`mt-5 flex ${SLIDE_HEIGHT} shrink-0 snap-x snap-mandatory overflow-x-auto no-scrollbar`}
        >
          {announcements.map((announcement) => (
            <div key={announcement.id} className="flex h-full w-full shrink-0 snap-center">
              <AnnouncementSlide announcement={announcement} />
            </div>
          ))}
        </div>

        {showDots && (
          <div className="mt-4 flex justify-center gap-1.5">
            {announcements.map((announcement, index) => (
              <button
                key={announcement.id}
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
        )}

        <AnnouncementFooter hint={activeAnnouncement?.hint} />

        <button
          type="button"
          disabled={submitting}
          onClick={handlePrimaryAction}
          className={`mt-3 ${PRIMARY_BTN}`}
        >
          {isLastStep ? 'Отлично!' : 'Далее →'}
        </button>
      </div>
    </AppModal>
  );
}
