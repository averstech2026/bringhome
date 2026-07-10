import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { getAllFamilies, getFamily } from '../../services/familiesService';
import { createAdminAnnouncement } from '../../services/notificationsService';
import { createFeatureAnnouncement } from '../../services/announcementsService';
import { useToast } from '../ui/ToastProvider';

const GLOBAL_TARGET = 'global';
const GLOBAL_OPTION_LABEL = '📢 Всем пользователям';
const GLOBAL_TRIGGER_LABEL = '📢 Всем пользователям (Глобально)';

const INPUT_FIELD_CLASS =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100';

const AUDIENCE_OPTION_BASE =
  'flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors';

function getAudienceOptionClass(active) {
  if (active) {
    return `${AUDIENCE_OPTION_BASE} bg-emerald-50 font-medium text-emerald-800`;
  }
  return `${AUDIENCE_OPTION_BASE} text-slate-800 hover:bg-slate-50`;
}

function AudienceDropdown({ value, families, disabled, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  const selectedFamily = families.find((family) => family.id === value);
  const selectedLabel = value === GLOBAL_TARGET
    ? GLOBAL_TRIGGER_LABEL
    : (selectedFamily?.name?.trim() || 'Без названия');

  const normalizedSearch = search.trim().toLowerCase();
  const filteredFamilies = useMemo(() => {
    if (!normalizedSearch) return families;
    return families.filter((family) => {
      const name = family.name?.trim() || 'Без названия';
      return name.toLowerCase().includes(normalizedSearch);
    });
  }, [families, normalizedSearch]);

  useEffect(() => {
    if (!open) return undefined;

    searchRef.current?.focus();

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        setSearch('');
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const closeMenu = () => {
    setOpen(false);
    setSearch('');
  };

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    closeMenu();
  };

  const toggleMenu = () => {
    if (disabled) return;
    if (open) {
      closeMenu();
      return;
    }
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative mt-2">
      <button
        type="button"
        onClick={toggleMenu}
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex items-center justify-between gap-2 text-left disabled:opacity-50 ${INPUT_FIELD_CLASS}`}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-all duration-200 ease-out">
          <div className="sticky top-0 z-10 border-b border-slate-100 bg-white p-2">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="🔍 Найти семью..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <ul role="listbox" aria-label="Получатели" className="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                role="option"
                aria-selected={value === GLOBAL_TARGET}
                onClick={() => handleSelect(GLOBAL_TARGET)}
                className={getAudienceOptionClass(value === GLOBAL_TARGET)}
              >
                <span>{GLOBAL_OPTION_LABEL}</span>
                {value === GLOBAL_TARGET && (
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                )}
              </button>
            </li>

            {filteredFamilies.map((family) => {
              const active = value === family.id;
              const name = family.name?.trim() || 'Без названия';
              return (
                <li key={family.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => handleSelect(family.id)}
                    className={getAudienceOptionClass(active)}
                  >
                    <span className="truncate">{name}</span>
                    {active && (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    )}
                  </button>
                </li>
              );
            })}

            {filteredFamilies.length === 0 && normalizedSearch && (
              <li className="px-4 py-3 text-sm text-slate-400">Семьи не найдены</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function AnnouncementSwitch({ enabled, onChange, disabled = false }) {
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

export default function CreateAnnouncementModal({
  open,
  onClose,
  senderId,
  senderDisplayName,
  scope = 'platform',
  familyId: fixedFamilyId = null,
  familyName: fixedFamilyName = '',
  initialFeatureAnnouncement = false,
  onCreated,
}) {
  const toast = useToast();
  const isFamilyScope = scope === 'family';
  const [families, setFamilies] = useState([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [targetFamilyId, setTargetFamilyId] = useState(GLOBAL_TARGET);
  const [resolvedFamilyName, setResolvedFamilyName] = useState(fixedFamilyName);
  const [isFeatureAnnouncement, setIsFeatureAnnouncement] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [hint, setHint] = useState('');
  const [sendAsPush, setSendAsPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    setIsFeatureAnnouncement(initialFeatureAnnouncement);

    if (isFamilyScope) {
      setIsFeatureAnnouncement(false);
      setTargetFamilyId(fixedFamilyId || '');
      if (fixedFamilyName) {
        setResolvedFamilyName(fixedFamilyName);
        return undefined;
      }
      if (!fixedFamilyId) {
        setResolvedFamilyName('');
        return undefined;
      }

      setLoadingFamilies(true);
      getFamily(fixedFamilyId)
        .then((family) => setResolvedFamilyName(family?.name?.trim() || 'Семья'))
        .catch(() => setResolvedFamilyName('Семья'))
        .finally(() => setLoadingFamilies(false));
      return undefined;
    }

    setLoadingFamilies(true);
    getAllFamilies()
      .then(setFamilies)
      .catch(() => setFamilies([]))
      .finally(() => setLoadingFamilies(false));
  }, [open, initialFeatureAnnouncement, isFamilyScope, fixedFamilyId, fixedFamilyName]);

  const resetForm = () => {
    setTargetFamilyId(isFamilyScope ? (fixedFamilyId || '') : GLOBAL_TARGET);
    setIsFeatureAnnouncement(initialFeatureAnnouncement);
    setTitle('');
    setMessage('');
    setHint('');
    setSendAsPush(true);
    setError('');
  };

  const handleClose = () => {
    if (sending) return;
    resetForm();
    onClose();
  };

  const selectedFamily = families.find((family) => family.id === targetFamilyId);
  const targetFamilyName = isFamilyScope
    ? (resolvedFamilyName || fixedFamilyName || 'Семья')
    : targetFamilyId === GLOBAL_TARGET
      ? 'Всем пользователям'
      : (selectedFamily?.name?.trim() || 'Семья');

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Введите заголовок');
      return;
    }

    if (isFeatureAnnouncement) {
      if (!message.trim()) {
        setError('Введите текст слайда');
        return;
      }

      setSending(true);
      setError('');
      try {
        await createFeatureAnnouncement({
          title: title.trim(),
          content: message.trim(),
          hint: hint.trim(),
          active: true,
        });
        resetForm();
        onClose();
        onCreated?.({ type: 'feature' });
        toast.success('Глобальный анонс опубликован');
      } catch (err) {
        const code = err?.code || '';
        if (code === 'permission-denied') {
          setError('Нет прав на публикацию анонса');
        } else {
          setError(err?.message || 'Не удалось опубликовать анонс');
        }
      } finally {
        setSending(false);
      }
      return;
    }

    if (!targetFamilyId) {
      setError('Не удалось определить семью получателей');
      return;
    }
    if (!message.trim()) {
      setError('Введите текст сообщения');
      return;
    }

    setSending(true);
    setError('');
    try {
      await createAdminAnnouncement({
        senderId,
        senderDisplayName,
        familyId: targetFamilyId,
        familyName: targetFamilyName,
        title: title.trim(),
        body: message,
        sendAsPush,
      });
      resetForm();
      onClose();
      onCreated?.({ type: 'notification' });
      toast.success('Уведомление отправлено');
    } catch (err) {
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setError('Нет прав на отправку уведомления');
      } else {
        setError(err?.message || 'Не удалось отправить уведомление');
      }
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={handleClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="create-announcement-title"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="create-announcement-title" className="text-lg font-bold text-slate-900">
            {isFeatureAnnouncement ? 'Новый глобальный анонс' : 'Новое уведомление'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isFeatureAnnouncement
              ? 'Слайд появится на главном экране у всех, кто ещё не видел этот анонс'
              : isFamilyScope
                ? 'Сообщение увидят все участники вашей семьи'
                : 'Сообщение увидят пользователи выбранной аудитории'}
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {!isFamilyScope && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-violet-900">Глобальный анонс</p>
                <p className="mt-0.5 text-xs text-violet-700/80">
                  Модалка на главном в стиле онбординга, без push и входящих
                </p>
              </div>
              <AnnouncementSwitch
                enabled={isFeatureAnnouncement}
                onChange={setIsFeatureAnnouncement}
                disabled={sending}
              />
            </div>
          )}

          {!isFeatureAnnouncement && (
            <div className={isFamilyScope ? undefined : 'mt-5'}>
              <p className="text-xs font-semibold text-slate-400">Получатели</p>
              {loadingFamilies ? (
                <div className="mt-2 flex justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                </div>
              ) : isFamilyScope ? (
                <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                  {targetFamilyName}
                </p>
              ) : (
                <AudienceDropdown
                  value={targetFamilyId}
                  families={families}
                  disabled={sending}
                  onChange={setTargetFamilyId}
                />
              )}
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="announcement-title" className="text-xs font-semibold text-slate-400">
              Заголовок
            </label>
            <input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isFeatureAnnouncement ? 'Заголовок слайда…' : 'Заголовок уведомления…'}
              className={`mt-2 ${INPUT_FIELD_CLASS}`}
            />
          </div>

          <div className="mt-5">
            <label htmlFor="announcement-message" className="text-xs font-semibold text-slate-400">
              {isFeatureAnnouncement ? 'Текст слайда' : 'Сообщение'}
            </label>
            <textarea
              id="announcement-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder={isFeatureAnnouncement ? 'Основной текст анонса…' : 'Текст объявления…'}
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {isFeatureAnnouncement && (
            <div className="mt-5">
              <label htmlFor="announcement-hint" className="text-xs font-semibold text-slate-400">
                Подсказка внизу слайда
              </label>
              <textarea
                id="announcement-hint"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                rows={2}
                placeholder="Мини-совет под контентом (необязательно)…"
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          {!isFeatureAnnouncement && (
            <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-800">Отправить как Push-уведомление</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Дублирует сообщение на устройства получателей
                </p>
              </div>
              <AnnouncementSwitch
                enabled={sendAsPush}
                onChange={setSendAsPush}
                disabled={sending}
              />
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-500">{error}</p>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={sending}
            className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={sending}
            className="flex-1 rounded-2xl bg-emerald-500 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {sending
              ? (isFeatureAnnouncement ? 'Публикуем…' : 'Отправляем…')
              : (isFeatureAnnouncement ? 'Опубликовать' : 'Отправить')}
          </button>
        </div>
      </div>
    </div>
  );
}
