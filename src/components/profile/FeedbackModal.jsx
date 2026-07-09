import { useEffect, useState } from 'react';
import { createFeedback, FEEDBACK_CATEGORIES } from '../../services/feedbacksService';
import { getFamily } from '../../services/familiesService';
import { useToast } from '../ui/ToastProvider';

const CATEGORY_OPTIONS = Object.values(FEEDBACK_CATEGORIES);

export default function FeedbackModal({
  open,
  onClose,
  userId,
  familyId,
  displayName,
}) {
  const toast = useToast();
  const [category, setCategory] = useState('error');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [familyName, setFamilyName] = useState('');

  useEffect(() => {
    if (!open || !familyId) return;

    getFamily(familyId)
      .then((family) => setFamilyName(family?.name || ''))
      .catch(() => setFamilyName(''));
  }, [open, familyId]);

  const resetForm = () => {
    setCategory('error');
    setText('');
    setError('');
  };

  const handleClose = () => {
    if (sending) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!text.trim()) {
      setError('Введите текст сообщения');
      return;
    }

    setSending(true);
    setError('');
    try {
      await createFeedback({
        fromUser: userId,
        fromFamily: familyId,
        fromUserName: displayName || '',
        fromFamilyName: familyName,
        category,
        text,
      });
      resetForm();
      onClose();
      toast.success('Спасибо за фидбек!');
    } catch (err) {
      const code = err?.code || '';
      if (code === 'permission-denied') {
        setError('Нет прав на отправку. Проверьте, что вы вошли в семью, и попробуйте снова.');
      } else {
        setError(err?.message || 'Не удалось отправить сообщение');
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
        aria-labelledby="feedback-modal-title"
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="feedback-modal-title" className="text-lg font-bold text-slate-900">
            Сообщить об ошибке / улучшении
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ваше сообщение увидит команда разработки
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold text-slate-400">Категория</p>
          <div className="mt-2 inline-flex h-10 w-full items-center rounded-full bg-slate-100/80 p-1">
            {CATEGORY_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCategory(option.value)}
                className={`flex h-full flex-1 items-center justify-center gap-1.5 rounded-full text-sm transition-colors ${
                  category === option.value
                    ? 'bg-white font-semibold text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span aria-hidden>{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label htmlFor="feedback-text" className="text-xs font-semibold text-slate-400">
              Сообщение
            </label>
            <textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="Опишите ошибку или предложите улучшение…"
              className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
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
