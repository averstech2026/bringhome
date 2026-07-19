import { useEffect, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import AppModal from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import { DEFAULT_AI_LIMITS, normalizeAiUsage, resolveAiLimits } from '../../utils/aiLimits';
import { resolveUiTheme } from '../../utils/uiThemes';
import { PRIMARY_BTN } from '../list/cardStyles';
import { ROLES, normalizeRole } from '../../utils/roles';
import { IsChildToggle, UiThemeSelect } from './UiProfileFields';

const EMPTY_FORM = {
  displayName: '',
  email: '',
  password: '',
  role: 'member',
  isChild: false,
  uiTheme: 'default',
  daily: String(DEFAULT_AI_LIMITS.daily),
  weekly: String(DEFAULT_AI_LIMITS.weekly),
  monthly: String(DEFAULT_AI_LIMITS.monthly),
};

function RoleOption({ value, current, label, onChange, disabled }) {
  const active = value === current;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(value)}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
      }`}
    >
      {label}
    </button>
  );
}

function SectionHeading({ children }) {
  return <h3 className="text-sm font-semibold text-slate-900">{children}</h3>;
}

function userToForm(user, family = null) {
  const limits = resolveAiLimits(user, family);
  return {
    displayName: user.displayName || '',
    email: user.email || '',
    password: '',
    role: normalizeRole(user.role) === ROLES.SUPER_ADMIN ? ROLES.SUPER_ADMIN : ROLES.MEMBER,
    isChild: user.isChild === true,
    uiTheme: resolveUiTheme(user),
    daily: String(limits.daily),
    weekly: String(limits.weekly),
    monthly: String(limits.monthly),
  };
}

export default function UserFormModal({
  open,
  mode = 'create',
  user = null,
  family = null,
  currentUserId,
  saving = false,
  canResetTodayLimit = false,
  resettingToday = false,
  onResetTodayLimit,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const isEdit = mode === 'edit';
  const isSelf = isEdit && user?.id === currentUserId;
  const todayUsage = user ? normalizeAiUsage(user.aiUsage) : null;
  const todayLimit = form.role !== 'admin'
    ? Math.max(0, Number(form.daily) || DEFAULT_AI_LIMITS.daily)
    : DEFAULT_AI_LIMITS.daily;

  useEffect(() => {
    if (!open) return;
    setForm(isEdit && user ? userToForm(user, family) : EMPTY_FORM);
    setError('');
  }, [open, isEdit, user, family]);

  if (!open) return null;

  const setField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'isChild' && value === true) {
        next.uiTheme = 'hogwarts';
      }
      if (key === 'isChild' && value === false && prev.uiTheme === 'hogwarts') {
        next.uiTheme = 'default';
      }
      return next;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const aiLimits =
        form.role === 'admin'
          ? { ...DEFAULT_AI_LIMITS }
          : {
              daily: Number(form.daily),
              weekly: Number(form.weekly),
              monthly: Number(form.monthly),
            };

      await onSubmit?.({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        isChild: form.isChild,
        uiTheme: form.uiTheme,
        aiLimits,
      });
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Этот email уже занят'
          : err.message || (isEdit ? 'Не удалось сохранить настройки' : 'Не удалось создать пользователя'),
      );
    }
  };

  const displayName = user?.displayName?.trim() || form.displayName.trim();
  const title = isEdit
    ? `Настройки пользователя ${displayName || 'участника'}`
    : 'Добавить пользователя';

  const subtitle = isEdit
    ? 'Измените роль, лимиты ИИ и тему интерфейса участника.'
    : form.role === 'admin'
      ? 'Создайте аккаунт администратора с неограниченным доступом к ИИ.'
      : 'Создайте аккаунт и сразу настройте роль и лимиты ИИ.';

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="user-form-title"
      closeOnBackdrop={!saving && !resettingToday}
      disableClose={saving || resettingToday}
      panelClassName="relative flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
    >
        <ModalCloseButton onClick={onClose} disabled={saving || resettingToday} />
        <header className="flex-shrink-0 border-b border-slate-100 bg-white p-5">
          <h2 id="user-form-title" className="pr-10 text-base font-semibold text-slate-900">
            {title}
          </h2>
        </header>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-6 overflow-y-auto p-5 [scrollbar-width:thin]">
            <p className="text-sm text-slate-500">{subtitle}</p>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Имя</span>
              <input
                type="text"
                required
                value={form.displayName}
                onChange={(e) => setField('displayName', e.target.value)}
                placeholder="Имя"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">Email</span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                placeholder="Email"
                disabled={isEdit}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
              />
            </label>

            {!isEdit && (
              <label className="block">
                <span className="text-xs font-medium text-slate-500">Пароль</span>
                <input
                  type="text"
                  required
                  minLength={6}
                  value={form.password}
                  onChange={(e) => setField('password', e.target.value)}
                  placeholder="Не менее 6 символов"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500"
                />
              </label>
            )}

            <div>
              <span className="text-xs font-medium text-slate-500">Роль</span>
              {isSelf && (
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Нельзя изменить свою собственную роль
                </p>
              )}
              <div className="mt-1.5 flex gap-2">
                <RoleOption
                  value="user"
                  current={form.role}
                  label="Член семьи"
                  onChange={(role) => setField('role', role)}
                  disabled={isSelf}
                />
                <RoleOption
                  value="admin"
                  current={form.role}
                  label="Администратор"
                  onChange={(role) => setField('role', role)}
                  disabled={isSelf}
                />
              </div>
            </div>

            {form.role !== 'admin' && (
              <section className="space-y-4">
                <SectionHeading>Лимиты и статистика</SectionHeading>

                <div className="grid grid-cols-3 gap-2">
                  <label className="block">
                    <span className="text-xs text-slate-500">В день</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.daily}
                      onChange={(e) => setField('daily', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-violet-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">В неделю</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.weekly}
                      onChange={(e) => setField('weekly', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-violet-400"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-slate-500">В месяц</span>
                    <input
                      type="number"
                      min="0"
                      required
                      value={form.monthly}
                      onChange={(e) => setField('monthly', e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-2.5 py-2.5 text-sm outline-none focus:border-violet-400"
                    />
                  </label>
                </div>

                {canResetTodayLimit && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-slate-600">Использовано сегодня</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                          {todayUsage?.daily.count ?? 0} / {todayLimit}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={saving || resettingToday}
                        onClick={() => onResetTodayLimit?.()}
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-amber-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw
                          className={`h-4 w-4 ${resettingToday ? 'animate-spin' : ''}`}
                          aria-hidden
                        />
                        {resettingToday ? '…' : 'Сбросить'}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Обнуляет только дневной счётчик. Лимиты {form.daily}/{form.weekly}/{form.monthly} останутся без изменений.
                    </p>
                  </div>
                )}
              </section>
            )}

            <section className="space-y-4">
              <SectionHeading>Ограничения и интерфейс</SectionHeading>

              {form.role !== 'admin' && (
                <IsChildToggle checked={form.isChild} onChange={(value) => setField('isChild', value)} />
              )}

              <UiThemeSelect value={form.uiTheme} onChange={(value) => setField('uiTheme', value)} />
            </section>
          </div>

          <footer className="flex flex-shrink-0 flex-col gap-2 border-t border-slate-100 bg-white p-5">
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={saving || resettingToday} className={`${PRIMARY_BTN} !py-3 text-sm`}>
              {saving
                ? isEdit
                  ? 'Сохраняем…'
                  : 'Создание…'
                : isEdit
                  ? 'Сохранить'
                  : 'Создать пользователя'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving || resettingToday}
              className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Отмена
            </button>
          </footer>
        </form>
    </AppModal>
  );
}
