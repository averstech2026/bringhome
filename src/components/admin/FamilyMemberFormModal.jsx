import { useEffect, useState } from 'react';
import AppModal from '../ui/AppModal';
import { PRIMARY_BTN } from '../list/cardStyles';
import { ROLES } from '../../utils/roles';
import { getPersonalAiLimitMonth, normalizeAiUsage } from '../../utils/aiLimits';
import { IsChildToggle } from './UiProfileFields';

function ToggleRow({ title, hint, checked, onChange, disabled = false, activeColor = 'bg-emerald-500' }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {hint && <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
          checked ? activeColor : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export default function FamilyMemberFormModal({
  open,
  member = null,
  familyAiLimitMonth,
  saving = false,
  onSubmit,
  onClose,
}) {
  const [isFamilyAdmin, setIsFamilyAdmin] = useState(false);
  const [isChild, setIsChild] = useState(false);
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !member) return;
    const personal = getPersonalAiLimitMonth(member);
    setIsFamilyAdmin(member.role === ROLES.FAMILY_ADMIN || member.role === 'admin');
    setIsChild(member.isChild === true);
    setMonthlyLimit(personal != null ? String(personal) : '');
    setError('');
  }, [open, member]);

  if (!open || !member) return null;

  const displayName = member.displayName?.trim() || member.email || 'участника';
  const monthlyUsage = normalizeAiUsage(member.aiUsage).monthly.count;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const trimmed = String(monthlyLimit).trim();
      await onSubmit?.({
        role: isFamilyAdmin ? ROLES.FAMILY_ADMIN : ROLES.MEMBER,
        isChild,
        aiLimitMonth: trimmed === '' ? null : Number(trimmed),
      });
    } catch (err) {
      setError(err?.message || 'Не удалось сохранить настройки');
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="family-member-form-title"
      closeOnBackdrop={!saving}
      disableClose={saving}
      panelClassName="relative flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
      <header className="flex-shrink-0 border-b border-slate-100 bg-white p-5">
        <h2 id="family-member-form-title" className="text-base font-semibold text-slate-900">
          Настройки участника {displayName}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{member.email}</p>
      </header>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5 [scrollbar-width:thin]">
          <ToggleRow
            title="Админ семьи"
            hint="Может управлять участниками"
            checked={isFamilyAdmin}
            onChange={(value) => {
              setIsFamilyAdmin(value);
              if (value) setIsChild(false);
            }}
          />

          {!isFamilyAdmin && (
            <IsChildToggle checked={isChild} onChange={setIsChild} />
          )}

          <div className="rounded-xl border border-slate-100 bg-white px-4 py-3.5">
            <label className="block text-sm font-medium text-slate-800">
              Лимит ИИ (месяц)
              <input
                type="number"
                min={0}
                placeholder="Общий"
                value={monthlyLimit}
                onChange={(e) => setMonthlyLimit(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </label>
            <p className="mt-2 text-xs text-slate-400">
              Использовано в этом месяце: {monthlyUsage}
            </p>
            <p className="text-xs text-slate-400">
              Пустое поле — общий лимит семьи ({familyAiLimitMonth ?? '—'})
            </p>
          </div>
        </div>

        <footer className="flex flex-shrink-0 flex-col gap-2 border-t border-slate-100 bg-white p-5">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={saving} className={`${PRIMARY_BTN} !py-3 text-sm`}>
            {saving ? 'Сохраняем…' : 'Сохранить'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </footer>
      </form>
    </AppModal>
  );
}
