import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ClipboardPaste, Sparkles, Sword, Wand2 } from 'lucide-react';
import { parseProductsWithAI } from '../../services/aiService';
import { getAiUsageStatus, recordAiUsage } from '../../services/aiUsageService';
import { addItemsBatch } from '../../services/listsService';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  checkAiUsageAllowed,
  getRemainingDaily,
  isUnlimitedAiUser,
} from '../../utils/aiLimits';
import {
  ADULT_CONTENT_TOAST,
  filterAdultProducts,
  shouldFilterAdultContent,
} from '../../utils/adultContentFilter';
import { getAiInputTheme, resolveUiTheme } from '../../utils/uiThemes';
import { pickAiLimitPhrase } from '../../utils/aiLimitPhrases';
import {
  ensureDictionaryLoaded,
  getDictionaryCache,
} from '../../services/customProductsDictionaryService';
import { useCustomProductsDictionary } from '../../hooks/useCustomProductsDictionary';
import { learnProducts } from '../../utils/productLearning';
import AiPreviewModal from './AiPreviewModal';
import AiLimitModal from './AiLimitModal';
import BorderGapCard from './BorderGapCard';
import ThemeToast from '../ui/ThemeToast';
import { HINT_TEXT, INPUT_PLACEHOLDER } from './cardStyles';
import { CATEGORY_ORDER } from '../../utils/categories';

function AiThemeIcon({ icon, className }) {
  if (icon === 'wand') {
    return <Wand2 className={className} strokeWidth={2} aria-hidden />;
  }
  if (icon === 'sword') {
    return <Sword className={className} strokeWidth={2} aria-hidden />;
  }
  return <Sparkles className={className} strokeWidth={2} aria-hidden />;
}

function applyAdultContentFilter(products, profile, onBlocked) {
  if (!shouldFilterAdultContent(profile)) {
    return products;
  }

  const { allowed, blocked } = filterAdultProducts(products);
  if (blocked.length > 0) {
    onBlocked?.();
  }
  return allowed;
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
  const [themeToast, setThemeToast] = useState('');
  const [limitPhrase, setLimitPhrase] = useState(null);

  const sectionRef = useRef(null);
  const textareaRef = useRef(null);
  const location = useLocation();
  const { user } = useAuth();
  const { profile, isAdmin, reload: reloadProfile } = useUserProfile(user);

  const usageStatus = useMemo(() => checkAiUsageAllowed(profile), [profile]);
  const remainingDaily = useMemo(() => getRemainingDaily(profile), [profile]);
  const limitExhausted = !isAdmin && !usageStatus.allowed;
  const showUsageBadge = !isUnlimitedAiUser(profile);
  const uiTheme = useMemo(() => resolveUiTheme(profile), [profile]);
  const aiTheme = useMemo(() => getAiInputTheme(uiTheme), [uiTheme]);

  useCustomProductsDictionary();

  useEffect(() => {
    ensureDictionaryLoaded().catch(() => {});
  }, []);

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
      setPasteHint('Буфер пуст. Скопируйте текст в чате, затем снова нажмите «Из буфера»');
      focusTextareaForManualPaste();
      return;
    }

    setPasteHint('');
    setText((prev) => (prev.trim() ? `${prev.trim()}\n${trimmed}` : trimmed));
  };

  const handlePasteClick = () => {
    if (disabled) return;

    if (!window.isSecureContext || !navigator.clipboard?.readText) {
      setPasteHint('Нажмите и удерживайте поле, затем выберите «Из буфера»');
      focusTextareaForManualPaste();
      return;
    }

    // Android Chrome: call readText() immediately in the tap handler, before focus().
    navigator.clipboard.readText().then(applyPastedText).catch(() => {
      setPasteHint('Разрешите доступ к буферу в Chrome или вставьте вручную: удерживайте поле → «Из буфера»');
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

  const openLimitModal = () => {
    setLimitPhrase(pickAiLimitPhrase(uiTheme));
  };

  const handleAiButtonClick = () => {
    if (limitExhausted) {
      openLimitModal();
      return;
    }
    handleParse();
  };

  const handleParse = async () => {
    if (!text.trim() || disabled) return;

    if (!usageStatus.allowed || limitExhausted) {
      openLimitModal();
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setPreviewItems([]);

    try {
      if (!isUnlimitedAiUser(profile) && user?.uid) {
        const freshStatus = await getAiUsageStatus(user.uid);
        if (!freshStatus.allowed) {
          reloadProfile();
          openLimitModal();
          return;
        }
      }

      await ensureDictionaryLoaded();
      const customDictionary = Object.values(getDictionaryCache());
      let products = await parseProductsWithAI(text, { customDictionary });

      products = applyAdultContentFilter(products, profile, () => {
        setThemeToast(ADULT_CONTENT_TOAST);
      });

      if (products.length === 0) {
        setError('Не удалось распознать подходящие продукты');
        return;
      }

      if (user?.uid) {
        await recordAiUsage(user.uid);
      }
      reloadProfile();

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
      let products = selected.map(({ name, quantity, category }) => ({
        name,
        quantity,
        category,
      }));

      products = applyAdultContentFilter(products, profile, () => {
        setThemeToast(ADULT_CONTENT_TOAST);
      });

      if (products.length === 0) {
        setError('Нельзя добавить товары 18+ в этот аккаунт');
        return;
      }

      if (isDraft) {
        await onDraftAdd?.(products);
      } else {
        await addItemsBatch(listId, products);
      }

      await learnProducts(products, { respectExisting: true });

      setPreviewItems([]);
      setSelectedIds(new Set());
      setSuccess(`Добавлено ${products.length} позиций`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось добавить товары';
      setError(message);
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
        <BorderGapCard
          className={`transition-all duration-300 ${aiTheme.cardClassName} ${glow ? aiTheme.glowClassName : ''}`}
          borderClassName={aiTheme.borderClassName}
          legendClassName={aiTheme.legendClassName}
          legend={
            <label htmlFor="ai-text" className="cursor-default">
              Вставить текст из чата
            </label>
          }
        >

          <button
            type="button"
            onClick={handlePasteClick}
            disabled={disabled}
            className={aiTheme.pasteButtonClassName}
          >
            <ClipboardPaste
              className={`h-4 w-4 shrink-0 stroke-[1.75] ${aiTheme.pasteIconClassName}`}
              aria-hidden
            />
            Из буфера
          </button>

          <textarea
            ref={textareaRef}
            id="ai-text"
            placeholder="Например: молоко 2л, хлеб, яйца 10 шт, помидоры 1 кг"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (pasteHint) setPasteHint('');
            }}
            disabled={disabled || loading}
            onPaste={() => setPasteHint('')}
            className={`min-h-[200px] w-full resize-none bg-transparent text-left text-sm text-gray-900 outline-none disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
          />

          {pasteHint && <p className={`mt-2 ${HINT_TEXT} ${aiTheme.hintClassName}`}>{pasteHint}</p>}

          {error && <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{error}</p>}
          {success && <p className={`mt-2 ${HINT_TEXT} text-emerald-600`}>{success}</p>}

          <button
            type="button"
            onClick={handleAiButtonClick}
            disabled={loading || disabled || (!limitExhausted && !text.trim())}
            className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:opacity-70 disabled:active:scale-100 ${aiTheme.buttonClass} ${limitExhausted ? 'opacity-80' : ''}`}
          >
            <AiThemeIcon
              icon={aiTheme.icon}
              className={`h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? aiTheme.loadingLabel : aiTheme.label}</span>
            {showUsageBadge && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  limitExhausted ? 'bg-white/25 text-white' : aiTheme.badgeClass
                }`}
              >
                {limitExhausted
                  ? 'Лимит исчерпан'
                  : `${remainingDaily ?? 0}/${usageStatus.limits?.daily ?? 0}`}
              </span>
            )}
          </button>
        </BorderGapCard>
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

      <AiLimitModal
        open={Boolean(limitPhrase)}
        phrase={limitPhrase}
        uiTheme={uiTheme}
        onClose={() => setLimitPhrase(null)}
      />

      <ThemeToast message={themeToast} themed onClose={() => setThemeToast('')} />
    </>
  );
}
