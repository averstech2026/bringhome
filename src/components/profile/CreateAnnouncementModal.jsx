import { useEffect, useMemo, useState } from 'react';
import { getFamilyMembers } from '../../services/usersService';
import { createAdminAnnouncement } from '../../services/notificationsService';
import { UserAvatar } from './UserAvatar';

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
}) {
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState('');
  const [sendAsPush, setSendAsPush] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const recipientMembers = useMemo(
    () => members.filter((member) => member.id !== senderId),
    [members, senderId],
  );

  const allSelected = recipientMembers.length > 0
    && recipientMembers.every((member) => selectedIds.has(member.id));

  useEffect(() => {
    if (!open) return;

    setLoadingMembers(true);
    getFamilyMembers()
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setLoadingMembers(false));
  }, [open]);

  const resetForm = () => {
    setSelectedIds(new Set());
    setMessage('');
    setSendAsPush(true);
    setError('');
  };

  const handleClose = () => {
    if (sending) return;
    resetForm();
    onClose();
  };

  const toggleMember = (memberId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(recipientMembers.map((member) => member.id)));
  };

  const handleSubmit = async () => {
    const receiverIds = [...selectedIds];
    if (receiverIds.length === 0) {
      setError('Выберите хотя бы одного получателя');
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
        receiverIds,
        body: message,
        sendAsPush,
      });
      resetForm();
      onClose();
    } catch (err) {
      setError(err?.message || 'Не удалось отправить уведомление');
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
            Сообщение увидят выбранные участники группы
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Кому
              </p>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={loadingMembers || recipientMembers.length === 0}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                Выбрать всех
              </label>
            </div>

            {loadingMembers ? (
              <div className="mt-3 flex justify-center py-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
              </div>
            ) : recipientMembers.length === 0 ? (
              <p className="mt-3 text-sm text-slate-400">Участники не найдены</p>
            ) : (
              <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto">
                {recipientMembers.map((member) => {
                  const checked = selectedIds.has(member.id);
                  const name = member.displayName || member.email?.split('@')[0] || 'Участник';

                  return (
                    <li key={member.id}>
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition ${
                          checked
                            ? 'border-emerald-200 bg-emerald-50/60'
                            : 'border-slate-100 bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(member.id)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <UserAvatar
                          photoUrl={member.avatarUrl}
                          name={name}
                          className="h-9 w-9 text-sm"
                        />
                        <span className="min-w-0 truncate text-sm font-medium text-slate-800">
                          {name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-5">
            <label htmlFor="announcement-message" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
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
