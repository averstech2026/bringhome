import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardPaste } from 'lucide-react';
import { parseProductsWithAI } from '../../services/aiService';
import { addItemsBatch } from '../../services/listsService';
import AiPreviewModal from './AiPreviewModal';
import { CARD_SURFACE, CARD_PAD_V, ZONE_TITLE, HINT_TEXT, INPUT_PLACEHOLDER } from './cardStyles';
import { CATEGORY_ORDER } from '../../utils/categories';

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
  showEntryGlow = false,
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [glow, setGlow] = useState(showEntryGlow);
  const [previewItems, setPreviewItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [pasteHint, setPasteHint] = useState('');

  const sectionRef = useRef(null);
  const textareaRef = useRef(null);
  const location = useLocation();

  const focusTextareaForManualPaste = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    try {
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    } catch {
      // setSelectionRange may fail on some mobile browsers
    }
  };

  const applyPastedText = (clip) => {
    const trimmed = (clip || '').trim();
    if (!trimmed) {
      setPasteHint('Буфер пуст. Скопируйте текст в чате, затем снова нажмите «Вставить»');
      focusTextareaForManualPaste();
      return;
    }

    setPasteHint('');
    setText((prev) => (prev.trim() ? `${prev.trim()}\n${trimmed}` : trimmed));
  };

  const handlePasteClick = () => {
    if (disabled) return;

    if (!window.isSecureContext || !navigator.clipboard?.readText) {
      setPasteHint('Нажмите и удерживайте поле, затем выберите «Вставить»');
      focusTextareaForManualPaste();
      return;
    }

    // Android Chrome: call readText() immediately in the tap handler, before focus().
    navigator.clipboard.readText().then(applyPastedText).catch(() => {
      setPasteHint('Разрешите доступ к буферу в Chrome или вставьте вручную: удерживайте поле → «Вставить»');
      focusTextareaForManualPaste();
    });
  };

  useEffect(() => {
    if (!showEntryGlow) return undefined;

    setGlow(true);

    const scrollTimer = window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 350);

    const glowTimer = window.setTimeout(() => setGlow(false), 3600);

    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(glowTimer);
    };
  }, [showEntryGlow, listId, isDraft, location.key]);

  const handleParse = async () => {
    if (!text.trim() || disabled) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setPreviewItems([]);

    try {
      const products = await parseProductsWithAI(text);
      if (products.length === 0) {
        setError('Не удалось распознать продукты');
        return;
      }

      const withIds = products.map((p, i) => ({ ...p, _previewId: `preview-${i}` }));
      setPreviewItems(withIds);
      setSelectedIds(new Set(withIds.map((p) => p._previewId)));
      setText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePreviewItem = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPreview = (selectAll) => {
    if (selectAll) {
      setSelectedIds(new Set(previewItems.map((p) => p._previewId)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const toggleCategoryPreview = (category, selectAll) => {
    const ids = previewItems
      .filter((p) => {
        const cat = p.category && CATEGORY_ORDER.includes(p.category) ? p.category : 'Прочее';
        return cat === category;
      })
      .map((p) => p._previewId);

    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (selectAll) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleConfirmAdd = async () => {
    const selected = previewItems.filter((p) => selectedIds.has(p._previewId));
    if (selected.length === 0 || disabled) return;

    setAdding(true);
    setError('');

    try {
      const products = selected.map(({ name, quantity, category }) => ({
        name,
        quantity,
        category,
      }));

      if (isDraft) {
        await onDraftAdd?.(products);
      } else {
        await addItemsBatch(listId, products);
      }

      setPreviewItems([]);
      setSelectedIds(new Set());
      setSuccess(`Добавлено ${products.length} позиций`);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDismissPreview = () => {
    setPreviewItems([]);
    setSelectedIds(new Set());
  };

  return (
    <>
      <section ref={sectionRef} className="scroll-mt-24">
        <div className="mb-2 flex w-full items-center justify-between gap-2">
          <label htmlFor="ai-text" className={ZONE_TITLE}>
            Вставить текст из чата
          </label>
          <button
            type="button"
            onClick={handlePasteClick}
            disabled={disabled}
            className="flex shrink-0 touch-manipulation select-none items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 transition-colors duration-200 ease-in-out hover:bg-violet-100 active:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ClipboardPaste className="h-4 w-4 shrink-0 text-violet-600 stroke-[1.75]" aria-hidden />
            Вставить
          </button>
        </div>

        <div className={`mt-2 rounded-2xl ${glow ? 'animate-ai-glow' : ''}`}>
          <div className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
            <textarea
              ref={textareaRef}
              id="ai-text"
              rows={4}
              placeholder="Например: молоко 2л, хлеб, яйца 10 шт, помидоры 1 кг"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                if (pasteHint) setPasteHint('');
              }}
              disabled={disabled || loading}
              onPaste={() => setPasteHint('')}
              className={`w-full resize-none bg-transparent text-left text-sm text-gray-900 outline-none disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
            />

            {pasteHint && <p className={`mt-2 ${HINT_TEXT} text-violet-600`}>{pasteHint}</p>}

            {error && <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{error}</p>}
            {success && <p className={`mt-2 ${HINT_TEXT} text-emerald-600`}>{success}</p>}

            <button
              type="button"
              onClick={handleParse}
              disabled={loading || disabled || !text.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(99,102,241,0.25)] transition-all duration-200 hover:opacity-95 hover:shadow-[0_6px_24px_rgba(99,102,241,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:opacity-70 disabled:active:scale-100"
            >
              <SparklesIcon className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Распознаём…' : 'Распознать ИИ'}</span>
            </button>
          </div>
        </div>
      </section>

      <AiPreviewModal
        open={previewItems.length > 0}
        items={previewItems}
        selectedIds={selectedIds}
        onToggleItem={togglePreviewItem}
        onToggleAll={toggleAllPreview}
        onToggleCategory={toggleCategoryPreview}
        onConfirm={handleConfirmAdd}
        onClose={handleDismissPreview}
        adding={adding}
      />
    </>
  );
}
