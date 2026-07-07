import { UI_THEME_IDS, UI_THEMES } from '../../utils/uiThemes';

function ThemeOption({ themeId, current, onChange }) {
  const theme = UI_THEMES[themeId];
  const active = current === themeId;

  return (
    <button
      type="button"
      onClick={() => onChange(themeId)}
      className={`rounded-xl border px-3 py-2.5 text-left transition ${
        active
          ? 'border-violet-400 bg-violet-50'
          : 'border-slate-100 bg-white hover:border-slate-200'
      }`}
    >
      <span className="block text-sm font-medium text-slate-800">{theme.label}</span>
      <span className="mt-0.5 block text-[11px] text-slate-400">{theme.description}</span>
    </button>
  );
}

function ChildAccountSwitch({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
        checked ? 'bg-emerald-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export function IsChildToggle({ checked, onChange, disabled = false }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800">Детский аккаунт</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
          Включает защиту от товаров 18+ и тему «Хогвартс» по умолчанию
        </span>
      </div>
      <ChildAccountSwitch checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function UiThemeSelect({ value, onChange }) {
  return (
    <div>
      <span className="text-xs font-medium text-slate-500">Тема интерфейса</span>
      <div className="mt-2 grid gap-2">
        {UI_THEME_IDS.map((themeId) => (
          <ThemeOption
            key={themeId}
            themeId={themeId}
            current={value}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
