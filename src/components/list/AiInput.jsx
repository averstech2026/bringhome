import { useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ClipboardPaste, Sparkles, Sword, Wand2, Briefcase } from 'lucide-react';
import { AI_PARSE_MODE, parsePackingItemsWithAI, parseProductsWithAI } from '../../services/aiService';
import { getAiUsageStatus, recordAiUsage } from '../../services/aiUsageService';
import { getFamily } from '../../services/familiesService';
import { addItemsBatch, getProductHistoryUnit } from '../../services/listsService';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import {
  checkAiUsageAllowed,
  getRemainingMonthly,
  isAiMonthlyLimitReached,
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
import { useToast } from '../ui/ToastProvider';
import { HINT_TEXT, INPUT_PLACEHOLDER } from './cardStyles';
import { enrichProductsForAi } from '../../utils/enrichProductDefaults';
import { CATEGORY_ORDER } from '../../utils/categories';

function AiThemeIcon({ icon, className }) {
  if (icon === 'wand') {
    return <Wand2 className={className} strokeWidth={2} aria-hidden />;
  }
  if (icon === 'sword') {
    return <Sword className={className} strokeWidth={2} aria-hidden />;
  }
  if (icon === 'briefcase') {
    return <Briefcase className={className} strokeWidth={2} aria-hidden />;
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

export default forwardRef(function AiInput({
  listId,
  isDraft = false,
  onDraftAdd,
  onItemsSavedToList,
  listItems = [],
  userId = null,
  footerReservePx = 0,
  disabled = false,
  /** Переопределение плейсхолдера (например, для списков сборов). */
  placeholder = null,
  /** shopping — продукты; packing — вещи и дела для сборов. */
  mode = AI_PARSE_MODE.SHOPPING,
}, ref) {
  const isPackingMode = mode === AI_PARSE_MODE.PACKING;
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [glow, setGlow] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [adding, setAdding] = useState(false);
  const [pasteHint, setPasteHint] = useState('');
  const toast = useToast();
  const [limitPhrase, setLimitPhrase] = useState(null);
  const [family, setFamily] = useState(null);

  const sectionRef = useRef(null);
  const textareaRef = useRef(null);
  const aiButtonRef = useRef(null);
  const { user } = useAuth();
  const { profile, isAdmin, reload: reloadProfile } = useUserProfile(user);

  const familyId = profile?.familyId || profile?.groupId || null;

  useEffect(() => {
    if (!familyId) {
      setFamily(null);
      return undefined;
    }

    let active = true;
    getFamily(familyId)
      .then((data) => {
        if (active) setFamily(data);
      })
      .catch(() => {
        if (active) setFamily(null);
      });

    return () => {
      active = false;
    };
  }, [familyId]);

  const usageStatus = useMemo(() => checkAiUsageAllowed(profile, family), [profile, family]);
  const remainingMonthly = useMemo(() => getRemainingMonthly(profile, family), [profile, family]);
  const limitExhausted = !isAdmin && !isUnlimitedAiUser(profile) && isAiMonthlyLimitReached(profile, family);
  const showUsageBadge = !isUnlimitedAiUser(profile);
  const uiTheme = useMemo(() => resolveUiTheme(profile, user?.uid), [profile, user?.uid]);
  const aiTheme = useMemo(() => getAiInputTheme(uiTheme), [uiTheme]);
  const textareaPlaceholder = useMemo(
    () => (typeof placeholder === 'string' && placeholder.trim()
      ? placeholder
      : aiTheme.placeholder),
    [placeholder, aiTheme.placeholder],
  );

  useCustomProductsDictionary();

  useEffect(() => {
    if (isPackingMode) return undefined;
    ensureDictionaryLoaded().catch(() => {});
    return undefined;
  }, [isPackingMode]);

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

  const glowTimerRef = useRef(null);

  const scrollAboveFooter = useCallback(() => {
    if (!footerReservePx) return;

    const target = aiButtonRef.current || sectionRef.current;
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const visibleBottom = window.innerHeight - footerReservePx - 12;
    const overflow = rect.bottom - visibleBottom;
    if (overflow > 0) {
      window.scrollTo({
        top: window.scrollY + overflow,
        behavior: 'smooth',
      });
    }
  }, [footerReservePx]);

  const reveal = useCallback(() => {
    if (glowTimerRef.current) {
      window.clearTimeout(glowTimerRef.current);
    }

    setGlow(true);
    if (footerReservePx > 0) {
      scrollAboveFooter();
    } else {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    window.setTimeout(() => {
      focusTextareaForManualPaste();
    }, 400);

    glowTimerRef.current = window.setTimeout(() => {
      setGlow(false);
      glowTimerRef.current = null;
    }, 3600);
  }, [footerReservePx, scrollAboveFooter]);

  useImperativeHandle(ref, () => ({ reveal }), [reveal]);

  useEffect(() => {
    if (!footerReservePx) return undefined;

    if (success || error || pasteHint) {
      const frame = requestAnimationFrame(scrollAboveFooter);
      return () => cancelAnimationFrame(frame);
    }

    return undefined;
  }, [
    footerReservePx,
    success,
    error,
    pasteHint,
    scrollAboveFooter,
  ]);

  useEffect(() => () => {
    if (glowTimerRef.current) {
      window.clearTimeout(glowTimerRef.current);
    }
  }, []);

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

      let products;

      if (isPackingMode) {
        products = await parsePackingItemsWithAI(text);
      } else {
        await ensureDictionaryLoaded();
        const customDictionary = Object.values(getDictionaryCache());
        products = await parseProductsWithAI(text, { customDictionary });
        products = applyAdultContentFilter(products, profile, () => {
          toast.themed(ADULT_CONTENT_TOAST);
        });
      }

      if (products.length === 0) {
        setError(
          isPackingMode
            ? 'Не удалось распознать вещи или дела для сборов'
            : 'Не удалось распознать подходящие продукты',
        );
        return;
      }

      if (user?.uid) {
        await recordAiUsage(user.uid);
      }
      reloadProfile();

      if (!isPackingMode) {
        products = await enrichProductsForAi(products, {
          listItems,
          userId,
          isDraft,
          getProductHistoryUnit,
        });
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
        if (isPackingMode) {
          const scope = p.scope === 'personal' ? 'personal' : 'common';
          return scope === category;
        }
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

  const handleChangePackingScope = (fromScope, toScope) => {
    if (!isPackingMode || fromScope === toScope) return;
    setPreviewItems((prev) => prev.map((item) => (
      item.scope === fromScope
        ? { ...item, scope: toScope }
        : item
    )));
  };

  const handleConfirmAdd = async (packingPlacement) => {
    const selected = previewItems.filter((p) => selectedIds.has(p._previewId));
    if (selected.length === 0 || disabled) return;

    setAdding(true);
    setError('');

    try {
      if (isPackingMode) {
        const useSection = packingPlacement?.placement === 'section';
        const sectionCategory = useSection ? String(packingPlacement?.category || '').trim() : '';
        const sectionIcon = useSection ? String(packingPlacement?.categoryIcon || '').trim() : '';

        const packingItems = selected.map(({ name, type, scope }) => ({
          name,
          type,
          scope,
          category: sectionCategory,
          categoryIcon: sectionCategory ? sectionIcon : '',
        }));

        if (isDraft) {
          await onDraftAdd?.(packingItems);
        }

        setPreviewItems([]);
        setSelectedIds(new Set());
        setSuccess(
          sectionCategory
            ? `Добавлено ${packingItems.length} в «${sectionCategory}»`
            : `Добавлено ${packingItems.length} позиций`,
        );
        return;
      }

      let products = selected.map(({ name, quantity, category }) => ({
        name,
        quantity,
        category,
      }));

      products = applyAdultContentFilter(products, profile, () => {
        toast.themed(ADULT_CONTENT_TOAST);
      });

      if (products.length === 0) {
        setError('Нельзя добавить товары 18+ в этот аккаунт');
        return;
      }

      products = await enrichProductsForAi(products, {
        listItems,
        userId,
        isDraft,
        getProductHistoryUnit,
      });

      if (isDraft) {
        await onDraftAdd?.(products);
      } else if (listId) {
        await addItemsBatch(listId, products);
        onItemsSavedToList?.(products.length);
      }

      await learnProducts(products, { respectExisting: true });

      setPreviewItems([]);
      setSelectedIds(new Set());
      setSuccess(
        aiTheme.formatSuccessMessage
          ? aiTheme.formatSuccessMessage(products.length)
          : `Добавлено ${products.length} позиций`,
      );
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : (isPackingMode ? 'Не удалось добавить пункты' : 'Не удалось добавить товары');
      setError(message);
    } finally {
      setAdding(false);
    }
  };

  const handleDismissPreview = () => {
    setPreviewItems([]);
    setSelectedIds(new Set());
  };

  const aiButtonDisabled =
    loading
    || disabled
    || (limitExhausted && aiTheme.limitExhaustedDisabled)
    || (!limitExhausted && !text.trim());

  const aiButtonLabel = loading
    ? aiTheme.loadingLabel
    : limitExhausted && aiTheme.limitExhaustedLabel
      ? aiTheme.limitExhaustedLabel
      : aiTheme.label;

  return (
    <>
      <section
        ref={sectionRef}
        className="scroll-mt-[calc(env(safe-area-inset-top,0px)+4.25rem+0.5rem)]"
      >
        <BorderGapCard
          className={`flex flex-col transition-all duration-300 ${aiTheme.cardClassName} ${glow ? aiTheme.glowClassName : ''}`}
          borderClassName={aiTheme.borderClassName}
          legendClassName={aiTheme.legendClassName}
          legend={
            <label htmlFor="ai-text" className="cursor-default">
              ИИ-ввод
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
            placeholder={textareaPlaceholder}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (pasteHint) setPasteHint('');
            }}
            disabled={disabled || loading}
            onPaste={() => setPasteHint('')}
            onFocus={() => {
              if (footerReservePx > 0) {
                requestAnimationFrame(scrollAboveFooter);
              }
            }}
            className={`min-h-[200px] max-h-[min(280px,40dvh)] w-full overflow-y-auto resize-none bg-transparent text-left text-sm text-gray-900 outline-none [-webkit-overflow-scrolling:touch] disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
          />

          {pasteHint && <p className={`mt-2 ${HINT_TEXT} ${aiTheme.hintClassName}`}>{pasteHint}</p>}

          {limitExhausted && aiTheme.limitExhaustedMessage && (
            <p className={`mt-2 ${HINT_TEXT} ${aiTheme.hintClassName}`}>{aiTheme.limitExhaustedMessage}</p>
          )}

          {error && <p className={`mt-2 ${HINT_TEXT} text-red-500`}>{error}</p>}
          {success && (
            <p className={`mt-2 ${HINT_TEXT} ${aiTheme.hintClassName}`}>
              {success}
            </p>
          )}

          <button
            ref={aiButtonRef}
            type="button"
            onClick={handleAiButtonClick}
            disabled={aiButtonDisabled}
            className={`relative mt-3 inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-full py-3.5 text-sm font-semibold text-white transition-all duration-300 hover:opacity-95 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none disabled:hover:opacity-70 disabled:active:scale-100 ${aiTheme.buttonClass} ${limitExhausted && !aiTheme.limitExhaustedDisabled ? 'opacity-80' : ''}`}
          >
            <AiThemeIcon
              icon={aiTheme.icon}
              className={`relative z-10 h-4 w-4 shrink-0 ${loading ? 'animate-spin' : ''}`}
            />
            <span className="relative z-10">{aiButtonLabel}</span>
            {showUsageBadge && (
              <span
                className={`relative z-10 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  limitExhausted ? 'bg-white/25 text-white' : aiTheme.badgeClass
                }`}
              >
                {limitExhausted
                  ? 'Лимит исчерпан'
                  : `${remainingMonthly ?? 0}/${usageStatus.limitMonth ?? 0}`}
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
        onChangePackingScope={handleChangePackingScope}
        onConfirm={handleConfirmAdd}
        onClose={handleDismissPreview}
        adding={adding}
        uiTheme={uiTheme}
        mode={mode}
      />

      <AiLimitModal
        open={Boolean(limitPhrase)}
        phrase={limitPhrase}
        uiTheme={uiTheme}
        onClose={() => setLimitPhrase(null)}
      />

    </>
  );
});
