import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNotifications } from '../hooks/useNotifications';
import { updateUserAvatar, removeUserAvatar, updateOwnUiTheme } from '../services/usersService';
import {
  isPushSupported,
  enablePushNotifications,
  disablePushNotifications,
  sendTestPush,
  onForegroundPush,
} from '../services/pushNotification';
import { UserAvatar } from '../components/profile/UserAvatar';
import PageHeader from '../components/layout/PageHeader';
import { PRIMARY_BTN } from '../components/list/cardStyles';
import { getProfileThemeButtonClass, PROFILE_THEME_OPTIONS, resolveUiTheme } from '../utils/uiThemes';

const PUSH_LOGO = `${import.meta.env.BASE_URL}icons/logo.png`;
const PUSH_BADGE = `${import.meta.env.BASE_URL}icons/badge.png`;

function scrollThemeButtonIntoView(container, button) {
  if (!container || !button) return;

  const padding = 6;
  const containerRect = container.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const overflowRight = buttonRect.right - containerRect.right;
  const overflowLeft = containerRect.left - buttonRect.left;

  if (overflowRight > 0) {
    container.scrollBy({ left: overflowRight + padding, behavior: 'smooth' });
  } else if (overflowLeft > 0) {
    container.scrollBy({ left: -(overflowLeft + padding), behavior: 'smooth' });
  }
}

function SettingsSwitch({ enabled, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
        enabled ? 'bg-emerald-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getAvatarErrorMessage(err) {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code.includes('permission-denied')) {
    return 'Нет прав на сохранение профиля. Задеплойте firestore.rules: firebase deploy --only firestore:rules';
  }
  if (code.includes('unauthenticated')) {
    return 'Сессия истекла. Выйдите и войдите снова.';
  }
  return message || 'Не удалось сохранить фото';
}

export default function SettingsPage() {
  const { user, signOut, reloadUser } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const { profile, isAdmin, reload, loading: profileLoading } = useUserProfile(user);
  const { unreadCount } = useNotifications(user?.uid);
  const fileInputRef = useRef(null);
  const avatarMenuRef = useRef(null);
  const themeCarouselRef = useRef(null);
  const themeButtonRefs = useRef({});

  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [activeUiTheme, setActiveUiTheme] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [pushTesting, setPushTesting] = useState(false);

  const name = profile?.displayName || user?.displayName || 'Пользователь';
  const savedPhotoUrl = profile?.avatarUrl || null;
  const displayPhotoUrl = previewUrl || savedPhotoUrl;
  const hasSavedAvatar = Boolean(profile?.avatarUrl);
  const hasChanges = Boolean(pendingFile);
  const currentUiTheme = activeUiTheme ?? resolveUiTheme(profile);

  useEffect(() => {
    if (profile) {
      setActiveUiTheme(resolveUiTheme(profile));
    }
  }, [profile?.uiTheme, profile?.id]);

  useEffect(() => {
    setPushEnabled(profile?.pushEnabled === true);
  }, [profile?.pushEnabled, profile?.id]);

  useEffect(() => {
    let active = true;
    isPushSupported().then((supported) => {
      if (active) setPushSupported(supported);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let unsubscribe;
    onForegroundPush((payload) => {
      const note = payload?.notification || {};
      const data = payload?.data || {};
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification(note.title || 'КупиДомой', {
          body: note.body || '',
          icon: data.icon || note.icon || PUSH_LOGO,
          badge: data.badge || PUSH_BADGE,
          image: data.image || note.image || undefined,
        });
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const button = themeButtonRefs.current[currentUiTheme];
    if (!button) return undefined;

    const frame = window.requestAnimationFrame(() => {
      scrollThemeButtonIntoView(themeCarouselRef.current, button);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentUiTheme]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!avatarMenuOpen) return undefined;

    const closeMenu = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setAvatarMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [avatarMenuOpen]);

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Выберите изображение');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Файл слишком большой (макс. 5 МБ)');
      return;
    }

    setError('');
    setSuccess('');

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleCancel = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!pendingFile || uploading) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await updateUserAvatar(user, pendingFile);
      await reloadUser();
      reload();

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingFile(null);
      setPreviewUrl(null);
      setSuccess('Фото сохранено');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(getAvatarErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!hasSavedAvatar || uploading || removingAvatar) return;

    setAvatarMenuOpen(false);
    setRemovingAvatar(true);
    setError('');
    setSuccess('');

    try {
      await removeUserAvatar(user);
      handleCancel();
      reload();
      await reloadUser();
      setSuccess('Фото удалено');
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(getAvatarErrorMessage(err));
    } finally {
      setRemovingAvatar(false);
    }
  };

  const handleTogglePush = async (value) => {
    if (!user?.uid || pushBusy) return;

    const previous = pushEnabled;
    setPushEnabled(value);
    setPushBusy(true);
    setError('');
    setSuccess('');

    try {
      if (value) {
        await enablePushNotifications(user.uid);
        setSuccess('Пуш-уведомления включены');
      } else {
        await disablePushNotifications(user.uid);
        setSuccess('Пуш-уведомления выключены');
      }
      reload();
      setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setPushEnabled(previous);
      setError(err?.message || 'Не удалось изменить настройку уведомлений');
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    if (!user?.uid || pushTesting) return;

    setPushTesting(true);
    setError('');
    setSuccess('');
    try {
      const result = await sendTestPush(user.uid, { photoUrl: displayPhotoUrl });
      setSuccess(`Тестовый пуш отправлен (доставок: ${result.sent ?? 0})`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Не удалось отправить тестовый пуш');
    } finally {
      setPushTesting(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    if (!user?.uid || newTheme === currentUiTheme || savingTheme) return;

    const previousTheme = currentUiTheme;
    setActiveUiTheme(newTheme);
    setSavingTheme(true);
    setError('');

    try {
      await updateOwnUiTheme(user.uid, newTheme);
      reload();
    } catch (err) {
      setActiveUiTheme(previousTheme);
      setError(err?.message || 'Не удалось сохранить тему');
    } finally {
      setSavingTheme(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader
        title="Профиль"
        backTo="/"
        rightAction={
          <button
            type="button"
            onClick={() => setSignOutOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50 active:bg-red-50/80"
            aria-label="Выйти"
            title="Выйти"
          >
            <LogOut className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          </button>
        }
      />

      <div className="pt-4">
        <section>
          <div className="flex items-center gap-4">
            <div className="relative shrink-0" ref={avatarMenuRef}>
              <button
                type="button"
                disabled={uploading || removingAvatar}
                onClick={() => setAvatarMenuOpen((open) => !open)}
                className="group relative cursor-pointer disabled:opacity-50"
                aria-haspopup="menu"
                aria-expanded={avatarMenuOpen}
                aria-label="Управление фото профиля"
              >
                <UserAvatar
                  photoUrl={displayPhotoUrl}
                  name={name}
                  variant="soft"
                  className="h-[72px] w-[72px] text-2xl"
                />
                {!avatarMenuOpen && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                    Изменить
                  </span>
                )}
              </button>

              {avatarMenuOpen && (
                <div
                  className="absolute left-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg"
                  role="menu"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAvatarMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                    className="w-full px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                  >
                    Обновить фото
                  </button>
                  {hasSavedAvatar && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleRemoveAvatar}
                      disabled={removingAvatar}
                      className="w-full px-4 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {removingAvatar ? 'Удаляем…' : 'Удалить фото'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="min-w-0 flex-1">
              <p className="text-[22px] font-bold tracking-tight text-slate-900">{name}</p>
              <p className="mt-0.5 text-sm text-slate-400">{user?.email}</p>
            </div>
          </div>

          {hasChanges && (
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading}
                className={`flex-1 ${PRIMARY_BTN} !py-3 text-sm`}
              >
                {uploading ? 'Сохраняем…' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={uploading}
                className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Отмена
              </button>
            </div>
          )}

          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          {success && <p className="mt-2 text-sm text-emerald-600">{success}</p>}
        </section>

        <section className="mt-10 overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <p className="text-[15px] text-slate-800">Группировать завершенные списки по датам</p>
              <p className="mt-0.5 text-xs text-slate-400">
                На главном экране готовые списки будут сгруппированы по дням
              </p>
            </div>
            <SettingsSwitch
              enabled={settings.groupByDate}
              onChange={(value) => updateSetting('groupByDate', value)}
            />
          </div>

          <div className="mx-4 border-t border-gray-100" />

          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <p className="text-[15px] text-slate-800">Пуш-уведомления</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Получать уведомления о новых списках продуктов от семьи
              </p>
              {!pushSupported && (
                <p className="mt-1 text-xs text-amber-600">
                  Этот браузер не поддерживает пуш-уведомления
                </p>
              )}
            </div>
            <SettingsSwitch
              enabled={pushEnabled}
              onChange={handleTogglePush}
              disabled={pushBusy || !pushSupported}
            />
          </div>

          {pushEnabled && (
            <div className="px-4 pb-4">
              <button
                type="button"
                onClick={handleTestPush}
                disabled={pushTesting}
                className="w-full rounded-full border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                {pushTesting ? 'Отправляем…' : 'Проверить пуш'}
              </button>
              <p className="mt-1.5 text-center text-xs text-slate-400">
                Пришлёт тестовое уведомление на это устройство
              </p>
            </div>
          )}
        </section>

        {user && (
        <section
          className="mt-6 rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
          aria-labelledby="profile-ui-theme-title"
        >
          <div className="px-4 py-4">
            <p id="profile-ui-theme-title" className="text-[15px] text-slate-800">Тема интерфейса</p>
            <p className="mt-0.5 text-xs text-slate-400">
              Стиль кнопки распознавания ИИ — настраивается для каждого члена семьи отдельно
            </p>
            {profile?.isChild && (
              <p className="mt-1 text-xs text-amber-700">
                Защита от товаров 18+ остаётся активной независимо от выбранной темы
              </p>
            )}

            {profileLoading || !profile ? (
              <div
                className="-mx-1 mt-3 flex flex-nowrap gap-1.5 px-1 pb-0.5"
                aria-hidden
              >
                {PROFILE_THEME_OPTIONS.map((option) => (
                  <div
                    key={option.id}
                    className="h-[30px] shrink-0 animate-pulse rounded-full bg-slate-100"
                    style={{ width: `${Math.max(72, option.label.length * 8)}px` }}
                  />
                ))}
              </div>
            ) : (
              <div
                ref={themeCarouselRef}
                className="-mx-1 mt-3 flex flex-nowrap gap-1.5 overflow-x-auto scroll-smooth px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {PROFILE_THEME_OPTIONS.map((option) => {
                  const active = currentUiTheme === option.id;
                  return (
                    <button
                      key={option.id}
                      ref={(node) => {
                        if (node) themeButtonRefs.current[option.id] = node;
                      }}
                      type="button"
                      disabled={savingTheme}
                      aria-pressed={active}
                      onClick={() => handleThemeChange(option.id)}
                      className={getProfileThemeButtonClass(option.id, active)}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          {[
            {
              to: '/settings/notifications',
              label: 'Уведомления',
              badge: unreadCount,
            },
            {
              to: '/admin/lists',
              label: 'Все списки группы',
            },
            ...(isAdmin
              ? [
                  { to: '/admin/ai-stats', label: 'Статистика ИИ' },
                  { to: '/admin/users', label: 'Управление пользователями' },
                ]
              : []),
          ].map((item, index, items) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50/80 active:bg-slate-50/80 ${
                index < items.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <span className="flex items-center gap-2 text-[15px] text-slate-800">
                {item.label}
                {item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold leading-none text-white">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <ChevronRightIcon />
            </Link>
          ))}
        </section>
      </div>

      <ConfirmModal
        open={signOutOpen}
        title="Выйти из аккаунта?"
        titleId="sign-out-title"
        message="Вы уверены, что хотите выйти?"
        confirmLabel="Да, выйти"
        onConfirm={() => {
          setSignOutOpen(false);
          signOut();
        }}
        onCancel={() => setSignOutOpen(false)}
        destructive
      />
    </div>
  );
}
