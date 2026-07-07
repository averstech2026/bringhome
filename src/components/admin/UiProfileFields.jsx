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
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <span className="block text-sm font-medium text-slate-800">{theme.label}</span>
      <span className="mt-0.5 block text-[11px] text-slate-400">{theme.description}</span>
    </button>
  );
}

export function IsChildToggle({ checked, onChange, disabled = false }) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-3">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>
        <span className="block text-sm font-medium text-slate-800">Детский аккаунт</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Включает защиту от товаров 18+ и тему «Хогвартс» по умолчанию
        </span>
      </span>
    </label>
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
