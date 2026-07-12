import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronDown, LogOut, MessageSquare, Shield } from 'lucide-react';
import ConfirmModal from '../components/ui/ConfirmModal';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProfile } from '../hooks/useUserProfile';
import { useNotifications } from '../hooks/useNotifications';
import { useUnreadFeedbacks } from '../hooks/useUnreadFeedbacks';
import { useUnseenFeedbackStatuses } from '../hooks/useUnseenFeedbackStatuses';
import { updateUserAvatar, removeUserAvatar, updateOwnUiTheme } from '../services/usersService';
import {
  isPushSupported,
  enablePushNotifications,
  disablePushNotifications,
  sendTestPush,
  onForegroundPush,
  formatPushError,
  getNotificationPermissionState,
  PUSH_BLOCKED_HINT,
} from '../services/pushNotification';
import { UserAvatar } from '../components/profile/UserAvatar';
import PageHeader from '../components/layout/PageHeader';
import { CARD_SURFACE, PRIMARY_BTN } from '../components/list/cardStyles';
import { useToast } from '../components/ui/ToastProvider';
import { AVATAR_FILE_TOO_LARGE_MESSAGE, validateAvatarFile } from '../utils/avatarUpload';
import {
  getProfileThemeButtonClass,
  getThemeAccent,
  PROFILE_THEME_OPTIONS,
  resolveUiTheme,
  setCachedUiTheme,
} from '../utils/uiThemes';
import UiThemeModal from '../components/profile/UiThemeModal';
import packageJson from '../../package.json';

const appVersion = packageJson.version;
const buildDate = __BUILD_DATE__;
const PUSH_LOGO = `${import.meta.env.BASE_URL}icons/logo.png`;
const PUSH_BADGE = `${import.meta.env.BASE_URL}icons/badge.png`;

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

function ChevronRightIcon({ className = 'text-slate-300' }) {
  return (
    <svg className={`h-4 w-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  const toast = useToast();
  const { user, signOut, reloadUser } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const { profile, isSuperAdmin, isFamilyAdmin, familyId, reload, loading: profileLoading } = useUserProfile(user);
  const { unreadCount } = useNotifications(user?.uid, { familyId });
  const { unreadCount: feedbackUnreadCount } = useUnreadFeedbacks(isSuperAdmin);
  const { unseenCount: feedbackStatusUnseenCount } = useUnseenFeedbackStatuses(
    user?.uid,
    Boolean(familyId) && !isSuperAdmin,
  );
  const fileInputRef = useRef(null);
  const avatarMenuRef = useRef(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [activeUiTheme, setActiveUiTheme] = useState(null);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushSupported, setPushSupported] = useState(true);
  const [pushPermission, setPushPermission] = useState('default');
  const [pushTesting, setPushTesting] = useState(false);

  const name = profile?.displayName || user?.displayName || 'Пользователь';
  const savedPhotoUrl = profile?.avatarUrl || null;
  const displayPhotoUrl = previewUrl || savedPhotoUrl;
  const hasSavedAvatar = Boolean(profile?.avatarUrl);
  const hasChanges = Boolean(pendingFile);
  const currentUiTheme = activeUiTheme ?? resolveUiTheme(profile, user?.uid);
  const currentThemeLabel =
    PROFILE_THEME_OPTIONS.find((option) => option.id === currentUiTheme)?.label || 'Обычная';
  const themeAccent = getThemeAccent(currentUiTheme);

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
    const syncPermission = () => {
      if (active) setPushPermission(getNotificationPermissionState());
    };
    syncPermission();
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', syncPermission);
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

    const validationError = validateAvatarFile(file);
    if (validationError) {
      if (validationError === AVATAR_FILE_TOO_LARGE_MESSAGE) {
        toast.error(validationError);
      } else {
        setError(validationError);
      }
      event.target.value = '';
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
      setPushPermission(getNotificationPermissionState());
      setError(formatPushError(err));
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
      setError(formatPushError(err));
    } finally {
      setPushTesting(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    if (!user?.uid || newTheme === currentUiTheme || savingTheme) return;

    const previousTheme = currentUiTheme;
    setActiveUiTheme(newTheme);
    setCachedUiTheme(user.uid, newTheme);
    setSavingTheme(true);
    setError('');
    setThemeModalOpen(false);

    try {
      await updateOwnUiTheme(user.uid, newTheme);
      reload();
    } catch (err) {
      setActiveUiTheme(previousTheme);
      setThemeModalOpen(true);
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
                  ringClassName={themeAccent.avatarRingClassName}
                />
                {!avatarMenuOpen && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                    Изменить
                  </span>
                )}
                <span className={`absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-white shadow-md transition ${themeAccent.solidClassName} ${themeAccent.solidHoverClassName}`}>
                  <Camera className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
                </span>
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

        {isSuperAdmin && (
          <section className="mt-6">
            <Link
              to="/admin/dashboard"
              className={`flex h-14 items-center justify-between gap-3 ${CARD_SURFACE} px-4 transition hover:bg-slate-50/80 active:scale-[0.99]`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100/90">
                  <Shield className="h-4 w-4 text-violet-600" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="text-[15px] font-semibold text-violet-800">Панель владельца</span>
                {feedbackUnreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold leading-none text-white">
                    {feedbackUnreadCount > 9 ? '9+' : feedbackUnreadCount}
                  </span>
                )}
              </span>
              <ChevronRightIcon className="shrink-0 text-violet-300" />
            </Link>
          </section>
        )}

        {familyId && !isSuperAdmin && (
          <section className="mt-6">
            <Link
              to="/settings/feedbacks"
              className={`flex h-14 items-center justify-between gap-3 ${CARD_SURFACE} px-4 transition hover:bg-slate-50/80 active:scale-[0.99]`}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100/90">
                  <MessageSquare className="h-4 w-4 text-violet-600" strokeWidth={2.25} aria-hidden />
                </span>
                <span className="text-[15px] font-semibold text-violet-800">
                  Сообщить об ошибке / улучшении
                </span>
                {feedbackStatusUnseenCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 text-[10px] font-bold leading-none text-white">
                    {feedbackStatusUnseenCount > 9 ? '9+' : feedbackStatusUnseenCount}
                  </span>
                )}
              </span>
              <ChevronRightIcon className="shrink-0 text-violet-300" />
            </Link>
          </section>
        )}

        <section className={`mt-6 overflow-hidden ${CARD_SURFACE}`}>
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
              {pushSupported && pushPermission === 'denied' && (
                <p className="mt-1 text-xs text-amber-700">{PUSH_BLOCKED_HINT}</p>
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
          className={`mt-6 ${CARD_SURFACE}`}
          aria-labelledby="profile-ui-theme-title"
        >
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            disabled={profileLoading || !profile || savingTheme}
            className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="min-w-0">
              <p id="profile-ui-theme-title" className="text-[15px] text-slate-800">Тема интерфейса</p>
              <p className="mt-0.5 text-xs text-slate-400">
                Нажмите, чтобы изменить стиль кнопки распознавания ИИ
              </p>
              {profile?.isChild && (
                <p className="mt-1 text-xs text-amber-700">
                  Детский аккаунт: защита от товаров 18+ активна.
                </p>
              )}
            </div>
            <span className="flex shrink-0 items-center">
              {profileLoading || !profile ? (
                <span className="h-[34px] w-28 animate-pulse rounded-full bg-slate-100" aria-hidden />
              ) : (
                <span
                  className={`${getProfileThemeButtonClass(currentUiTheme, true)} inline-flex max-w-[11rem] items-center`}
                  aria-hidden
                >
                  <span className="truncate">{currentThemeLabel}</span>
                  <ChevronDown
                    className="ml-2 h-3.5 w-3.5 shrink-0 text-white/80"
                    strokeWidth={2.5}
                    aria-hidden
                  />
                </span>
              )}
            </span>
          </button>
        </section>
        )}

        <UiThemeModal
          open={themeModalOpen}
          currentTheme={currentUiTheme}
          saving={savingTheme}
          onClose={() => setThemeModalOpen(false)}
          onSelect={handleThemeChange}
        />

        <section className={`mt-6 overflow-hidden ${CARD_SURFACE}`}>
          {[
            {
              to: '/settings/notifications',
              label: 'Уведомления',
              badge: unreadCount,
            },
            {
              to: '/admin/lists',
              label: 'Все списки семьи',
            },
            ...(isFamilyAdmin && !isSuperAdmin
              ? [{ to: '/family/manage', label: 'Управление семьёй' }]
              : []),
            ...(isSuperAdmin
              ? [
                  { to: '/admin/users', label: 'Управление семьёй' },
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

      <footer className="mt-auto pt-10 pb-2 text-center">
        <p className="text-xs text-slate-400">
          Версия {appVersion}
          <span className="mx-1.5 text-slate-300" aria-hidden>
            ·
          </span>
          Сборка от {buildDate}
        </p>
        <p className="mt-1 text-xs text-slate-400/80">
          © {new Date().getFullYear()} КупиДомой
        </p>
      </footer>

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
