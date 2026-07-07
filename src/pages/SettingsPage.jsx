import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useAppSettings } from '../hooks/useAppSettings';
import { useUserProfile } from '../hooks/useUserProfile';
import { updateUserAvatar } from '../services/usersService';
import {
  getUserArchivedLists,
  getArchivedLists,
  deleteList,
  getListItemsForRepeat,
} from '../services/listsService';
import { UserAvatar } from '../components/profile/UserAvatar';
import { getUserPhotoUrl } from '../utils/userPhoto';
import PageHeader from '../components/layout/PageHeader';
import ListCard from '../components/home/ListCard';
import RepeatListModal from '../components/home/RepeatListModal';
import { HINT_TEXT, PAGE_SECTION_TITLE, PRIMARY_BTN } from '../components/list/cardStyles';
import { saveRepeatDraft } from '../utils/repeatDraftStorage';
import { encodeListTypeForUrl } from '../utils/listTypes';

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

function SignOutConfirmModal({ open, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Закрыть"
        onClick={onCancel}
      />

      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-out-title"
      >
        <h2 id="sign-out-title" className="text-base font-semibold text-slate-900">
          Выйти из аккаунта?
        </h2>
        <p className="mt-1.5 text-sm text-slate-500">Вы уверены, что хотите выйти?</p>

        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={onConfirm}
            className={`${PRIMARY_BTN} !bg-red-500 !py-3 text-sm hover:!bg-red-600`}
          >
            Да, выйти
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="w-full rounded-full border border-gray-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SettingsPage() {
  const { user, signOut, reloadUser } = useAuth();
  const { settings, updateSetting } = useAppSettings();
  const { profile, isAdmin, reload } = useUserProfile(user);
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [archivedLists, setArchivedLists] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [repeatTarget, setRepeatTarget] = useState(null);
  const [visibleArchiveCount, setVisibleArchiveCount] = useState(10);
  const [signOutOpen, setSignOutOpen] = useState(false);

  const name = profile?.displayName || user?.displayName || 'Пользователь';
  const savedPhotoUrl = getUserPhotoUrl(user, profile);
  const displayPhotoUrl = previewUrl || savedPhotoUrl;
  const hasChanges = Boolean(pendingFile);
  const visibleArchivedLists = archivedLists.slice(0, visibleArchiveCount);
  const hasMoreArchived = archivedLists.length > visibleArchiveCount;

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const loadArchivedLists = useCallback(async () => {
    if (!user?.uid) return;

    setArchiveLoading(true);
    try {
      const lists = isAdmin
        ? await getArchivedLists()
        : await getUserArchivedLists(user.uid);
      setArchivedLists(lists);
    } catch {
      setArchivedLists([]);
    } finally {
      setArchiveLoading(false);
    }
  }, [user?.uid, isAdmin]);

  useEffect(() => {
    loadArchivedLists();
  }, [loadArchivedLists]);

  const handleDeleteArchived = async (listId, title) => {
    if (!window.confirm(`Удалить «${title}» навсегда? Это действие нельзя отменить.`)) return;

    setBusyId(listId);
    setArchivedLists((prev) => prev.filter((list) => list.id !== listId));

    try {
      await deleteList(listId);
    } catch (err) {
      window.alert(err?.message || 'Не удалось удалить список');
      await loadArchivedLists();
    } finally {
      setBusyId(null);
    }
  };

  const handleRepeatArchived = (list) => {
    setRepeatTarget(list);
  };

  const handleRepeatConfirm = async (type) => {
    if (!repeatTarget) return;

    setBusyId(repeatTarget.id);
    try {
      const repeatItems = await getListItemsForRepeat(repeatTarget.id);
      saveRepeatDraft({ repeatItems, repeatFrom: repeatTarget.id, type });
      navigate(`/list/new?type=${encodeListTypeForUrl(type)}`);
      setRepeatTarget(null);
    } catch (err) {
      window.alert(err?.message || 'Не удалось загрузить товары списка');
    } finally {
      setBusyId(null);
    }
  };

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
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="group relative shrink-0 disabled:opacity-50"
            >
              <UserAvatar photoUrl={displayPhotoUrl} name={name} className="h-[72px] w-[72px] text-2xl" />
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/30 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100">
                Изменить
              </span>
            </button>
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
        </section>

        {isAdmin && (
          <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Link
              to="/admin/users"
              className="flex items-center justify-between px-4 py-4 transition hover:bg-black/[0.02] active:bg-black/[0.04]"
            >
              <span className="text-[15px] text-slate-800">Управление пользователями</span>
              <ChevronRightIcon />
            </Link>
          </section>
        )}

        <section className="mt-10">
          <h2 className={PAGE_SECTION_TITLE}>Архив списков</h2>

          {archiveLoading ? (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
            </div>
          ) : archivedLists.length === 0 ? (
            <p className={`mt-4 ${HINT_TEXT}`}>Архив пуст</p>
          ) : (
            <>
              <ul className="mt-4 space-y-2.5">
                {visibleArchivedLists.map((list) => (
                  <li key={list.id}>
                    <ListCard
                      list={list}
                      archived
                      busy={busyId === list.id}
                      onRepeat={handleRepeatArchived}
                      onDelete={handleDeleteArchived}
                    />
                  </li>
                ))}
              </ul>

              {hasMoreArchived && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleArchiveCount((prev) => prev + 10)}
                    className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
                  >
                    Показать еще
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <RepeatListModal
        list={repeatTarget}
        open={Boolean(repeatTarget)}
        loading={Boolean(repeatTarget && busyId === repeatTarget.id)}
        onClose={() => !busyId && setRepeatTarget(null)}
        onConfirm={handleRepeatConfirm}
      />

      <SignOutConfirmModal
        open={signOutOpen}
        onConfirm={() => {
          setSignOutOpen(false);
          signOut();
        }}
        onCancel={() => setSignOutOpen(false)}
      />
    </div>
  );
}
