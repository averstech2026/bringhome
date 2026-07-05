import { useEffect, useState } from 'react';
import DraftTypeSwitcher from '../list/DraftTypeSwitcher';
import { PRIMARY_BTN } from '../list/cardStyles';

export default function RepeatListModal({ list, open, loading, onClose, onConfirm }) {
  const [selectedType, setSelectedType] = useState('home');

  useEffect(() => {
    if (list) setSelectedType(list.type || 'home');
  }, [list]);

  if (!open || !list) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="repeat-modal-title"
      >
        <h2 id="repeat-modal-title" className="text-lg font-bold text-slate-900">
          Повторить список
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          «{list.title}» — выберите тип нового списка
        </p>

        <div className="mt-4">
          <DraftTypeSwitcher
            value={selectedType}
            onChange={setSelectedType}
            disabled={loading}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={() => onConfirm(selectedType)}
            disabled={loading}
            className={`flex-1 ${PRIMARY_BTN} !py-3 text-sm`}
          >
            {loading ? 'Загружаем…' : 'Продолжить'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-full border border-gray-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-gray-50 disabled:opacity-50"
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}
