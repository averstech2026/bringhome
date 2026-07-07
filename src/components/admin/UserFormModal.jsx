import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_AI_LIMITS, resolveAiLimits } from '../../utils/aiLimits';
import { resolveUiTheme } from '../../utils/uiThemes';
import { PRIMARY_BTN } from '../list/cardStyles';
import { IsChildToggle, UiThemeSelect } from './UiProfileFields';

const EMPTY_FORM = {
  displayName: '',
  email: '',
  password: '',
  role: 'user',
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

function userToForm(user) {
  const limits = resolveAiLimits(user);
  return {
    displayName: user.displayName || '',
    email: user.email || '',
    password: '',
    role: user.role === 'admin' ? 'admin' : 'user',
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
  currentUserId,
  saving = false,
  onSubmit,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const isEdit = mode === 'edit';
  const isSelf = isEdit && user?.id === currentUserId;

  useEffect(() => {
    if (!open) return;
    setForm(isEdit && user ? userToForm(user) : EMPTY_FORM);
    setError('');
  }, [open, isEdit, user]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  const title = isEdit
    ? `Настройки пользователя ${user?.displayName || ''}`.trim()
    : 'Добавить пользователя';

  const subtitle = isEdit
    ? 'Измените роль, лимиты ИИ и тему интерфейса участника.'
    : form.role === 'admin'
      ? 'Создайте аккаунт администратора с неограниченным доступом к ИИ.'
      : 'Создайте аккаунт и сразу настройте роль и лимиты ИИ.';

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onClose}
        disabled={saving}
      />

      <div
        className="relative max-h-[min(90vh,720px)] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <h2 id="user-form-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
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
            <div>
              <span className="text-xs font-medium text-slate-500">Лимиты запросов ИИ</span>
              <div className="mt-2 space-y-2">
                <label className="block">
                  <span className="text-xs text-slate-500">В день</span>
                  <input
                    type="number"
                    min="0"
                    required
                    value={form.daily}
                    onChange={(e) => setField('daily', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
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
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                  />
                </label>
              </div>
            </div>
          )}

          {form.role !== 'admin' && (
            <IsChildToggle checked={form.isChild} onChange={(value) => setField('isChild', value)} />
          )}

          <UiThemeSelect value={form.uiTheme} onChange={(value) => setField('uiTheme', value)} />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="space-y-2 pt-1">
            <button type="submit" disabled={saving} className={`${PRIMARY_BTN} !py-3 text-sm`}>
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
              disabled={saving}
              className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
