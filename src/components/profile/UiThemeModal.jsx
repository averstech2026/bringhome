import { Check, X } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_SHEET } from '../ui/AppModal';
import {
  PROFILE_THEME_ACTIVE_CLASSES,
  PROFILE_THEME_OPTIONS,
  UI_THEMES,
} from '../../utils/uiThemes';

function ThemeOptionRow({ option, active, disabled, onSelect }) {
  const description = UI_THEMES[option.id]?.description;
  const previewClass =
    PROFILE_THEME_ACTIVE_CLASSES[option.id] || PROFILE_THEME_ACTIVE_CLASSES.default;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={() => onSelect(option.id)}
      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition disabled:opacity-50 ${
        active
          ? 'border-emerald-200 bg-emerald-50/60'
          : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
      }`}
    >
      <span
        className={`h-10 w-10 shrink-0 rounded-full ${previewClass}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">{option.label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-slate-400">{description}</span>
        )}
      </span>
      {active && (
        <Check className="h-5 w-5 shrink-0 text-emerald-500" strokeWidth={2.5} aria-hidden />
      )}
    </button>
  );
}

export default function UiThemeModal({ open, currentTheme, saving, onClose, onSelect }) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="ui-theme-modal-title"
      describedBy="ui-theme-modal-desc"
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={MODAL_PANEL_SHEET}
      disableClose={saving}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-5">
        <div className="min-w-0">
          <p id="ui-theme-modal-title" className="text-sm font-semibold text-slate-800">
            Тема интерфейса
          </p>
          <p id="ui-theme-modal-desc" className="mt-0.5 text-xs text-slate-400">
            Стиль кнопки распознавания ИИ
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 disabled:opacity-50"
          aria-label="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2 px-5 py-4">
        {PROFILE_THEME_OPTIONS.map((option) => (
          <ThemeOptionRow
            key={option.id}
            option={option}
            active={currentTheme === option.id}
            disabled={saving}
            onSelect={onSelect}
          />
        ))}
      </div>
    </AppModal>
  );
}
