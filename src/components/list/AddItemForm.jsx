import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  addItem,
  searchProductHistory,
  getProductHistoryUnit,
  saveToProductHistory,
} from '../../services/listsService';
import {
  lookupCustomProduct,
  findPartialCustomProductMatch,
} from '../../services/customProductsDictionaryService';
import { useCustomProductsDictionary } from '../../hooks/useCustomProductsDictionary';
import { useAuth } from '../../hooks/useAuth';
import { useUserProfile } from '../../hooks/useUserProfile';
import { ADULT_CONTENT_TOAST, isRestrictedItemName } from '../../utils/adultContentFilter';
import { CATEGORIES, CATEGORY_EMOJI, detectCategory } from '../../utils/categories';
import { getLearnedCategory } from '../../utils/productCategoryMap';
import { learnProducts } from '../../utils/productLearning';
import { getRecommendedUnit, hasDictionaryUnitHint } from '../../utils/recommendedUnit';
import { mergeAutocompleteSuggestions } from '../../utils/productAutocomplete';
import { formatQuantity, parseQuantity } from '../../utils/quantity';
import { normalizeItemName } from '../../utils/mergeItems';
import { CARD_SURFACE, CARD_PAD_V, INPUT_PLACEHOLDER } from './cardStyles';
import QuantityStepper from './QuantityStepper';
import ThemeToast from '../ui/ThemeToast';

const NAME_INPUT_CONTAINER =
  'flex w-full min-w-0 items-center rounded-xl border border-gray-200/90 bg-white px-2.5 py-1 transition-colors focus-within:border-emerald-400 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]';

const SUBMIT_BTN =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-100/50 text-emerald-600 shadow-none transition-all duration-150 enabled:border-transparent enabled:bg-emerald-500 enabled:text-white enabled:shadow-[0_4px_14px_rgba(16,185,129,0.3)] enabled:hover:bg-emerald-600 enabled:hover:shadow-[0_6px_20px_rgba(16,185,129,0.38)] active:scale-95 enabled:active:scale-[0.95] disabled:border-transparent disabled:bg-emerald-50/60 disabled:text-emerald-300 disabled:shadow-none disabled:hover:bg-emerald-50/60 disabled:active:scale-100';

export default function AddItemForm({
  listId,
  userId,
  listItems = [],
  isDraft = false,
  onDraftAdd,
  disabled = false,
}) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('1 шт');
  const [category, setCategory] = useState('Прочее');
  const [categoryAuto, setCategoryAuto] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [themeToast, setThemeToast] = useState('');
  const wrapperRef = useRef(null);
  const categoryChipRefs = useRef({});
  const unitManualRef = useRef(false);
  const autoUnitAppliedForRef = useRef('');
  const categoryRef = useRef(category);
  const categoryAutoRef = useRef(categoryAuto);

  useCustomProductsDictionary();
  const { user } = useAuth();
  const { profile } = useUserProfile(user);

  useEffect(() => {
    categoryRef.current = category;
  }, [category]);

  useEffect(() => {
    categoryAutoRef.current = categoryAuto;
  }, [categoryAuto]);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const shouldApplyDictionaryCategory = (exact) => {
    if (exact) return true;
    return categoryAutoRef.current || categoryRef.current === 'Прочее';
  };

  const applyDictionaryUnit = (productName, entry) => {
    if (!entry?.unit || unitManualRef.current) return;

    const trimmed = productName.trim();
    const { count } = parseQuantity(quantity);
    setQuantity(formatQuantity(count, entry.unit));
    autoUnitAppliedForRef.current = normalizeItemName(trimmed);
  };

  const applySmartDefaults = (productName, { forceCategory = false } = {}) => {
    const trimmed = productName.trim();
    if (!trimmed) return;

    const exact = lookupCustomProduct(trimmed);
    const partial = exact ? null : findPartialCustomProductMatch(trimmed);
    const dictEntry = exact || partial;

    if (dictEntry?.category && (forceCategory || shouldApplyDictionaryCategory(Boolean(exact)))) {
      setCategory(dictEntry.category);
      setCategoryAuto(true);
      applyDictionaryUnit(trimmed, dictEntry);
      return;
    }

    if (!forceCategory && !categoryAutoRef.current && categoryRef.current !== 'Прочее') {
      if (dictEntry) applyDictionaryUnit(trimmed, dictEntry);
      return;
    }

    const detected = getLearnedCategory(trimmed) || detectCategory(trimmed);
    if (detected) {
      setCategory(detected);
      setCategoryAuto(true);
    } else if (forceCategory) {
      setCategory('Прочее');
      setCategoryAuto(false);
    } else {
      setCategoryAuto((wasAuto) => (wasAuto ? false : wasAuto));
    }
  };

  const applyRecommendedUnit = async (productName) => {
    const trimmed = productName.trim();
    if (!trimmed || unitManualRef.current) return;

    const norm = trimmed.toLowerCase();
    if (autoUnitAppliedForRef.current === norm) return;

    let firestoreUnit = null;
    if (!isDraft && userId) {
      try {
        firestoreUnit = await getProductHistoryUnit(userId, trimmed);
      } catch {
        firestoreUnit = null;
      }
    }

    const unit = getRecommendedUnit(trimmed, { listItems, firestoreUnit });
    const { count } = parseQuantity(quantity);
    setQuantity(formatQuantity(count, unit));
    autoUnitAppliedForRef.current = norm;
  };

  const handleQuantityChange = (nextQuantity) => {
    unitManualRef.current = true;
    setQuantity(nextQuantity);
  };

  useEffect(() => {
    if (!categoryAuto) return;

    const chip = categoryChipRefs.current[category];
    if (!chip) return;

    chip.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [category, categoryAuto]);

  const handleNameChange = async (value) => {
    setName(value);
    setSubmitError('');

    if (!value.trim()) {
      unitManualRef.current = false;
      autoUnitAppliedForRef.current = '';
    }

    applySmartDefaults(value);

    if (hasDictionaryUnitHint(value)) {
      applyRecommendedUnit(value);
    }

    if (value.length >= 2) {
      try {
        const history = await searchProductHistory(userId, value);
        const merged = mergeAutocompleteSuggestions(value, history);
        setSuggestions(merged);
        setShowSuggestions(merged.length > 0);
      } catch {
        const merged = mergeAutocompleteSuggestions(value, []);
        setSuggestions(merged);
        setShowSuggestions(merged.length > 0);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    const normalized = normalizeItemName(suggestion);
    setName(normalized);
    setShowSuggestions(false);
    applySmartDefaults(normalized, { forceCategory: true });
    applyRecommendedUnit(normalized);
  };

  const handleNameBlur = () => {
    if (name.trim()) {
      const normalized = normalizeItemName(name);
      if (normalized !== name) setName(normalized);
      applySmartDefaults(normalized);
      applyRecommendedUnit(normalized);
    }
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    setCategoryAuto(false);
  };

  const resetForm = () => {
    setName('');
    setQuantity('1 шт');
    setCategory('Прочее');
    setCategoryAuto(false);
    unitManualRef.current = false;
    autoUnitAppliedForRef.current = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || disabled || loading) return;

    const normalizedName = normalizeItemName(name);

    if (isRestrictedItemName(normalizedName, profile)) {
      setThemeToast(ADULT_CONTENT_TOAST);
      return;
    }

    setLoading(true);
    setSubmitError('');
    try {
      const itemData = {
        name: normalizedName,
        quantity,
        category,
      };

      if (isDraft) {
        await onDraftAdd?.(itemData);
      } else {
        await addItem(listId, itemData);
        try {
          await saveToProductHistory(userId, itemData.name, itemData.quantity);
        } catch {
          // не блокируем добавление
        }
      }

      resetForm();
      learnProducts([itemData]).catch(() => {});
    } catch (err) {
      setSubmitError(err?.message || 'Не удалось добавить товар');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div ref={wrapperRef} className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
        <div className="flex flex-col gap-3 px-3 py-2">
          <div className="flex w-full min-w-0 items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <div className={NAME_INPUT_CONTAINER}>
                <input
                  type="text"
                  placeholder="Добавить продукт…"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  onBlur={handleNameBlur}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  disabled={disabled || loading}
                  className={`w-full min-w-0 bg-transparent text-left text-sm text-gray-900 outline-none disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
                />
              </div>
              {showSuggestions && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/[0.04]">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                        className="w-full px-4 py-2.5 text-left text-sm lowercase text-slate-700 hover:bg-gray-50 active:bg-gray-100"
                      >
                        {normalizeItemName(s)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || disabled || !name.trim()}
              className={SUBMIT_BTN}
              aria-label="Добавить товар"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
            </button>
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <div className="flex min-w-0 items-center gap-2">
            <QuantityStepper
              quantity={quantity}
              disabled={disabled || loading}
              onChange={handleQuantityChange}
              className="!ml-0 shrink-0"
            />

            <div className="relative min-w-0 flex-1">
              <div className="flex flex-row items-center gap-2 overflow-x-auto whitespace-nowrap py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {CATEGORIES.map((c) => {
                  const isActive = category === c;
                  return (
                    <button
                      key={c}
                      ref={(el) => {
                        categoryChipRefs.current[c] = el;
                      }}
                      type="button"
                      onClick={() => handleCategoryChange(c)}
                      disabled={disabled || loading}
                      aria-pressed={isActive}
                      className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                        isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100/80'
                      }`}
                    >
                      {CATEGORY_EMOJI[c]} {c}
                    </button>
                  );
                })}
              </div>
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-6 bg-gradient-to-r from-transparent to-white" />
            </div>
          </div>
        </div>
      </div>

      <ThemeToast message={themeToast} onClose={() => setThemeToast('')} />
    </form>
  );
}
