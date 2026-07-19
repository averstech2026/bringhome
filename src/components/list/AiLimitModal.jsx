import AppModal from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import { PRIMARY_BTN } from './cardStyles';

const THEME_ACCENT = {
  hogwarts: 'border-red-200 bg-gradient-to-b from-red-50 to-white',
  star_wars: 'border-slate-200 bg-gradient-to-b from-slate-100 to-white',
  paddington: 'border-blue-200 bg-gradient-to-b from-blue-50 to-white',
  default: 'bg-white',
};

export default function AiLimitModal({ open, phrase, uiTheme = 'default', onClose }) {
  if (!phrase) return null;

  const accentClass = THEME_ACCENT[uiTheme] || THEME_ACCENT.default;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="ai-limit-title"
      panelClassName={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl ${accentClass}`}
    >
      <ModalCloseButton onClick={onClose} />
      <h2 id="ai-limit-title" className="pr-10 text-base font-semibold text-slate-900">
        {phrase.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{phrase.text}</p>

      <button type="button" onClick={onClose} className={`${PRIMARY_BTN} mt-5 !py-3 text-sm`}>
        Понятно
      </button>
    </AppModal>
  );
}
