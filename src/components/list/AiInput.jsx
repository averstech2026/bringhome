import { useState } from 'react';
import { parseProductsWithAI } from '../../services/aiService';
import { addItemsBatch } from '../../services/listsService';
import { CARD_SURFACE, CARD_PAD_V, ZONE_TITLE, HINT_TEXT, INPUT_PLACEHOLDER } from './cardStyles';

function SparklesIcon({ className = 'h-4 w-4 shrink-0' }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

export default function AiInput({
  listId,
  isDraft = false,
  onDraftAdd,
  disabled = false,
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleParse = async () => {
    if (!text.trim() || disabled) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const products = await parseProductsWithAI(text);
      if (products.length === 0) {
        setError('Не удалось распознать продукты');
        return;
      }

      if (isDraft) {
        await onDraftAdd?.(products);
      } else {
        await addItemsBatch(listId, products);
        setSuccess(`Добавлено ${products.length} позиций`);
        setText('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <label htmlFor="ai-text" className={`block ${ZONE_TITLE}`}>
        Вставить текст из чата
      </label>
      <div className={`mt-2 ${CARD_SURFACE} ${CARD_PAD_V}`}>
        <textarea
          id="ai-text"
          rows={3}
          placeholder="Например: молоко 2л, хлеб, яйца 10 шт, помидоры 1 кг"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          className={`w-full resize-none bg-transparent text-left text-sm text-gray-900 outline-none disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
        />

        {error && <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{error}</p>}
        {success && <p className={`mt-2 ${HINT_TEXT} text-emerald-600`}>{success}</p>}

        <button
          type="button"
          onClick={handleParse}
          disabled={loading || disabled || !text.trim()}
          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] transition-all duration-200 hover:opacity-95 hover:shadow-[0_6px_24px_rgba(99,102,241,0.35)] active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:opacity-40 disabled:active:scale-100"
        >
          <SparklesIcon className={loading ? 'animate-pulse' : undefined} />
          <span>{loading ? 'Распознаём…' : 'Распознать ИИ'}</span>
        </button>
      </div>
    </section>
  );
}
