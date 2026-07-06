import { useState, useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  addItem,
  searchProductHistory,
  saveToProductHistory,
} from '../../services/listsService';
import { CATEGORIES, CATEGORY_EMOJI, detectCategory } from '../../utils/categories';
import { getLearnedCategory } from '../../utils/productCategoryMap';
import { mergeAutocompleteSuggestions } from '../../utils/productAutocomplete';
import { CARD_SURFACE, CARD_PAD_V, INPUT_PLACEHOLDER, LIST_ITEM_ROW_X } from './cardStyles';
import QuantityStepper from './QuantityStepper';

const NAME_INPUT_CONTAINER =
  'flex min-w-0 flex-1 items-center gap-1.5 rounded-xl border border-gray-200/90 bg-white px-3 py-2 transition-colors focus-within:border-emerald-400 focus-within:shadow-[0_0_0_3px_rgba(16,185,129,0.08)]';

const SUBMIT_BTN =
  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-500 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-200 hover:border-emerald-600 hover:bg-emerald-600 hover:shadow-[0_4px_14px_rgba(16,185,129,0.38)] active:scale-95 disabled:border-emerald-200 disabled:bg-emerald-200/60 disabled:text-white/70 disabled:shadow-none disabled:hover:bg-emerald-200/60 disabled:active:scale-100';

export default function AddItemForm({
  listId,
  userId,
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
  const wrapperRef = useRef(null);
  const categoryChipRefs = useRef({});

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const resolveCategory = (productName) => getLearnedCategory(productName) || detectCategory(productName);

  const applyDetectedCategory = (productName) => {
    const detected = resolveCategory(productName);
    if (detected) {
      setCategory(detected);
      setCategoryAuto(true);
      return;
    }
    setCategoryAuto((wasAuto) => (wasAuto ? false : wasAuto));
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
    applyDetectedCategory(value);

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
    setName(suggestion);
    setShowSuggestions(false);
    applyDetectedCategory(suggestion);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || disabled || loading) return;

    setLoading(true);
    setSubmitError('');
    try {
      const itemData = {
        name: name.trim(),
        quantity,
        category,
      };

      if (isDraft) {
        await onDraftAdd?.(itemData);
      } else {
        await addItem(listId, itemData);
        await saveToProductHistory(userId, itemData.name);
      }

      resetForm();
    } catch (err) {
      setSubmitError(err?.message || 'Не удалось добавить товар');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div ref={wrapperRef} className={`${CARD_SURFACE} ${CARD_PAD_V}`}>
        <div className="flex items-center gap-2.5">
          <div className={NAME_INPUT_CONTAINER}>
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                placeholder="Добавить продукт…"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                disabled={disabled || loading}
                className={`w-full bg-transparent text-left text-sm text-gray-900 outline-none disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
              />
              {showSuggestions && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/[0.04]">
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => selectSuggestion(s)}
                        className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-gray-50 active:bg-gray-100"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <QuantityStepper
              quantity={quantity}
              disabled={disabled || loading}
              onChange={setQuantity}
              variant="embedded"
              className="mr-0"
            />
          </div>

          <button
            type="submit"
            disabled={loading || disabled || !name.trim()}
            className={`shrink-0 ${SUBMIT_BTN}`}
            aria-label="Добавить товар"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
          </button>
        </div>

        {submitError && <p className="mt-2 text-sm text-red-500">{submitError}</p>}

        <div className={`relative mt-2.5 min-w-0 ${LIST_ITEM_ROW_X}`}>
          <div className="flex flex-row items-center gap-2 overflow-x-auto whitespace-nowrap py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {CATEGORY_EMOJI[c]} {c}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-r from-transparent to-white" />
        </div>
      </div>
    </form>
  );
}
