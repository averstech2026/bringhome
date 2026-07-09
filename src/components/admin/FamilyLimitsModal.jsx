import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import AppModal, { MODAL_OVERLAY_SHEET, MODAL_PANEL_SHEET } from '../ui/AppModal';
import { PRIMARY_BTN } from '../list/cardStyles';
import { DEFAULT_FAMILY_LIMITS } from '../../services/familiesService';

export default function FamilyLimitsModal({
  open,
  limits,
  saving = false,
  onClose,
  onSave,
}) {
  const [maxUsers, setMaxUsers] = useState(DEFAULT_FAMILY_LIMITS.maxUsers);
  const [maxLists, setMaxLists] = useState(DEFAULT_FAMILY_LIMITS.maxLists);
  const [aiRequests, setAiRequests] = useState(DEFAULT_FAMILY_LIMITS.aiRequests);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setMaxUsers(limits?.maxUsers ?? DEFAULT_FAMILY_LIMITS.maxUsers);
    setMaxLists(limits?.maxLists ?? DEFAULT_FAMILY_LIMITS.maxLists);
    setAiRequests(limits?.aiRequests ?? DEFAULT_FAMILY_LIMITS.aiRequests);
    setError('');
  }, [open, limits?.maxUsers, limits?.maxLists, limits?.aiRequests]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await onSave({ maxUsers, maxLists, aiRequests });
    } catch (err) {
      setError(err?.message || 'Не удалось сохранить лимиты');
    }
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      disableClose={saving}
      overlayClassName={MODAL_OVERLAY_SHEET}
      panelClassName={MODAL_PANEL_SHEET}
      labelledBy="family-limits-title"
    >
      <form onSubmit={handleSubmit} className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="family-limits-title" className="text-lg font-bold text-slate-900">
            Лимиты семьи
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 disabled:opacity-40"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-1 text-sm text-slate-500">
          Максимальные значения для участников, списков и ИИ-запросов
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            <span>Участники</span>
            <input
              type="number"
              min={1}
              value={maxUsers}
              onChange={(e) => setMaxUsers(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            <span>Списки</span>
            <input
              type="number"
              min={1}
              value={maxLists}
              onChange={(e) => setMaxLists(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-500">
            <span title="Лимит ИИ-запросов в месяц">ИИ/мес.</span>
            <input
              type="number"
              min={0}
              value={aiRequests}
              onChange={(e) => setAiRequests(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
              aria-label="Лимит ИИ-запросов в месяц"
            />
          </label>
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className={`mt-5 w-full ${PRIMARY_BTN} !py-2.5 text-sm disabled:opacity-50`}
        >
          {saving ? 'Сохраняем…' : 'Сохранить'}
        </button>
      </form>
    </AppModal>
  );
}
