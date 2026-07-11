import { useEffect, useRef, useState } from 'react';
import {
  removeFamilyAvatar,
  resolveFamilyAiLimitMonth,
  updateFamilyAvatar,
  updateFamilyName,
} from '../../services/familiesService';
import { CARD_SURFACE, PRIMARY_BTN } from '../list/cardStyles';
import { FamilyAvatar } from './FamilyAvatar';
import { useToast } from '../ui/ToastProvider';
import { AVATAR_FILE_TOO_LARGE_MESSAGE, validateAvatarFile } from '../../utils/avatarUpload';

export function FamilySummaryCard({ family, membersCount, canEdit = true, onFamilyUpdated }) {
  const toast = useToast();
  const fileInputRef = useRef(null);
  const avatarMenuRef = useRef(null);

  const [familyName, setFamilyName] = useState('');
  const [savedFamilyName, setSavedFamilyName] = useState('');
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarRemoving, setAvatarRemoving] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSuccess, setNameSuccess] = useState('');

  const limits = family?.limits || {};
  const familyAiLimitMonth = family ? resolveFamilyAiLimitMonth(family) : null;
  const displayName = familyName.trim() || savedFamilyName.trim() || family?.name?.trim() || '';
  const displayAvatarUrl = previewUrl || savedAvatarUrl;
  const hasNameChanges = familyName.trim() !== savedFamilyName.trim();
  const hasPendingAvatar = Boolean(pendingFile);
  const hasSavedAvatar = Boolean(savedAvatarUrl);
  const avatarBusy = avatarUploading || avatarRemoving;

  useEffect(() => {
    if (!family) return;

    const currentName = family.name?.trim() || '';
    setFamilyName(currentName);
    setSavedFamilyName(currentName);
    setSavedAvatarUrl(family.avatarUrl || null);
    setPendingFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setNameError('');
    setNameSuccess('');
  }, [family?.id, family?.name, family?.avatarUrl]);

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

  if (!family) return null;

  const notifyFamilyUpdated = (patch) => {
    onFamilyUpdated?.({ ...family, ...patch });
  };

  const handleSaveName = async () => {
    if (!canEdit || nameSaving || !hasNameChanges) return;

    setNameSaving(true);
    setNameError('');
    setNameSuccess('');

    try {
      const trimmed = familyName.trim();
      await updateFamilyName(family.id, trimmed);
      setFamilyName(trimmed);
      setSavedFamilyName(trimmed);
      setNameSuccess('Название сохранено');
      notifyFamilyUpdated({ name: trimmed });
      setTimeout(() => setNameSuccess(''), 2500);
    } catch (err) {
      setNameError(err?.message || 'Не удалось сохранить название');
    } finally {
      setNameSaving(false);
    }
  };

  const handleAvatarFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      if (validationError === AVATAR_FILE_TOO_LARGE_MESSAGE) {
        toast.error(validationError);
      } else {
        toast.error(validationError);
      }
      event.target.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    event.target.value = '';
  };

  const handleCancelAvatar = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(null);
    setPreviewUrl(null);
  };

  const handleSaveAvatar = async () => {
    if (!canEdit || !pendingFile || avatarUploading) return;

    setAvatarUploading(true);
    try {
      const avatarUrl = await updateFamilyAvatar(family.id, pendingFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPendingFile(null);
      setPreviewUrl(null);
      setSavedAvatarUrl(avatarUrl);
      notifyFamilyUpdated({ avatarUrl });
      toast.success('Аватар семьи сохранён');
    } catch (err) {
      toast.error(err?.message || 'Не удалось сохранить аватар');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!canEdit || !hasSavedAvatar || avatarBusy) return;

    setAvatarMenuOpen(false);
    setAvatarRemoving(true);

    try {
      await removeFamilyAvatar(family.id);
      handleCancelAvatar();
      setSavedAvatarUrl(null);
      notifyFamilyUpdated({ avatarUrl: null });
      toast.success('Аватар семьи удалён');
    } catch (err) {
      toast.error(err?.message || 'Не удалось удалить аватар');
    } finally {
      setAvatarRemoving(false);
    }
  };

  return (
    <div className={`${CARD_SURFACE} p-4`}>
      <div className="flex items-start gap-4">
        <div className="relative shrink-0" ref={avatarMenuRef}>
          <FamilyAvatar
            photoUrl={displayAvatarUrl}
            name={displayName}
            editable={canEdit}
            busy={avatarBusy}
            menuOpen={avatarMenuOpen}
            onClick={() => {
              if (!canEdit || avatarBusy) return;
              if (hasSavedAvatar) {
                setAvatarMenuOpen((open) => !open);
              } else {
                fileInputRef.current?.click();
              }
            }}
          />

          {canEdit && avatarMenuOpen && (
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
                  disabled={avatarRemoving}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {avatarRemoving ? 'Удаляем…' : 'Удалить фото'}
                </button>
              )}
            </div>
          )}

          {canEdit && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileSelect}
            />
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          {canEdit ? (
            <>
              <input
                type="text"
                value={familyName}
                onChange={(e) => {
                  setFamilyName(e.target.value);
                  setNameError('');
                  setNameSuccess('');
                }}
                placeholder="Название семьи"
                maxLength={80}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-lg font-bold text-slate-900 outline-none focus:border-brand-500"
              />
              <p className="mt-1 text-xs text-slate-400">
                Отображается для всех участников вашей семьи
              </p>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-slate-900">{displayName || 'Без названия'}</h2>
              <p className="mt-0.5 text-xs text-slate-400">Общее название вашей семьи</p>
            </>
          )}

          {canEdit && hasNameChanges && (
            <button
              type="button"
              onClick={handleSaveName}
              disabled={nameSaving || !familyName.trim()}
              className={`mt-3 w-full ${PRIMARY_BTN} !py-2.5 text-sm disabled:opacity-50`}
            >
              {nameSaving ? 'Сохраняем…' : 'Сохранить название'}
            </button>
          )}

          {nameError && <p className="mt-2 text-sm text-red-500">{nameError}</p>}
          {nameSuccess && <p className="mt-2 text-sm text-emerald-600">{nameSuccess}</p>}
        </div>
      </div>

      {canEdit && hasPendingAvatar && (
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSaveAvatar}
            disabled={avatarUploading}
            className={`flex-1 ${PRIMARY_BTN} !py-2.5 text-sm disabled:opacity-50`}
          >
            {avatarUploading ? 'Сохраняем…' : 'Сохранить аватар'}
          </button>
          <button
            type="button"
            onClick={handleCancelAvatar}
            disabled={avatarUploading}
            className="rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-800">
            {membersCount}/{limits.maxUsers ?? '—'}
          </p>
          <p className="text-slate-400">Участники</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-800">{limits.maxLists ?? '—'}</p>
          <p className="text-slate-400">Макс. списков</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-800">{familyAiLimitMonth ?? '—'}</p>
          <p className="text-slate-400">ИИ (мес.)</p>
        </div>
      </div>
    </div>
  );
}
