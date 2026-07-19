import { useEffect, useState } from 'react';
import AppModal from '../ui/AppModal';
import ModalCloseButton from '../ui/ModalCloseButton';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function AddMemberModal({
  open,
  onClose,
  onSubmit,
  saving = false,
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await onSubmit?.({
        email: email.trim(),
        password,
        displayName: displayName.trim(),
      });
    } catch (err) {
      setError(err?.message || 'Не удалось создать участника');
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      labelledBy="add-member-title"
      closeOnBackdrop={!saving}
      disableClose={saving}
      panelClassName="relative w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
    >
      <ModalCloseButton onClick={onClose} disabled={saving} />
      <h2 id="add-member-title" className="pr-10 text-lg font-bold text-slate-900">
        Добавить участника
      </h2>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <input
          type="text"
          placeholder="Имя"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        <input
          type="password"
          placeholder="Пароль (мин. 6 символов)"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-brand-500"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-full border border-slate-200 py-2.5 text-sm text-slate-600 disabled:opacity-50"
          >
            Отмена
          </button>
          <button type="submit" disabled={saving} className={`flex-1 ${PRIMARY_BTN} !py-2.5 text-sm`}>
            {saving ? 'Создаём…' : 'Создать'}
          </button>
        </div>
      </form>
    </AppModal>
  );
}
