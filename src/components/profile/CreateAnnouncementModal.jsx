import { useEffect, useState } from 'react';
import { getAllFamilies, getFamily } from '../../services/familiesService';
import { createAdminAnnouncement } from '../../services/notificationsService';
import { useToast } from '../ui/ToastProvider';

const GLOBAL_TARGET = 'global';

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
}) {
  const toast = useToast();
  const isFamilyScope = scope === 'family';
  const [families, setFamilies] = useState([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [targetFamilyId, setTargetFamilyId] = useState(GLOBAL_TARGET);
  const [resolvedFamilyName, setResolvedFamilyName] = useState(fixedFamilyName);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendAsPush, setSendAsPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    if (isFamilyScope) {
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
  }, [open, isFamilyScope, fixedFamilyId, fixedFamilyName]);

  const resetForm = () => {
    setTargetFamilyId(isFamilyScope ? (fixedFamilyId || '') : GLOBAL_TARGET);
    setTitle('');
    setMessage('');
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
    if (!targetFamilyId) {
      setError('Не удалось определить семью получателей');
      return;
    }
    if (!title.trim()) {
      setError('Введите заголовок');
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
            Новое уведомление
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isFamilyScope
              ? 'Сообщение увидят все участники вашей семьи'
              : 'Сообщение увидят пользователи выбранной аудитории'}
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div>
            <label htmlFor="announcement-target" className="text-xs font-semibold text-slate-400">
              Получатели
            </label>
            {loadingFamilies ? (
              <div className="mt-2 flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              </div>
            ) : isFamilyScope ? (
              <p className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
                {targetFamilyName}
              </p>
            ) : (
              <select
                id="announcement-target"
                value={targetFamilyId}
                onChange={(e) => setTargetFamilyId(e.target.value)}
                disabled={sending}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
              >
                <option value={GLOBAL_TARGET}>📢 Всем пользователям (Глобально)</option>
                {families.map((family) => (
                  <option key={family.id} value={family.id}>
                    {family.name?.trim() || 'Без названия'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor="announcement-title" className="text-xs font-semibold text-slate-400">
              Заголовок
            </label>
            <input
              id="announcement-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Заголовок уведомления…"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div className="mt-5">
            <label htmlFor="announcement-message" className="text-xs font-semibold text-slate-400">
              Сообщение
            </label>
            <textarea
              id="announcement-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Текст объявления…"
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

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
            {sending ? 'Отправляем…' : 'Отправить'}
          </button>
        </div>
      </div>
    </div>
  );
}
