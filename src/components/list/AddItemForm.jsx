import { useState, useRef, useEffect } from 'react';
import {
  addItem,
  searchProductHistory,
  saveToProductHistory,
} from '../../services/listsService';
import { CATEGORIES, CATEGORY_EMOJI, detectCategory } from '../../utils/categories';
import { mergeAutocompleteSuggestions } from '../../utils/productAutocomplete';
import { CARD_SURFACE, CARD_PAD_V } from './cardStyles';
import QuantityStepper from './QuantityStepper';

const NAME_INPUT_CONTAINER =
  'flex items-center gap-2 rounded-full border border-gray-200 bg-gray-100/80 px-5 py-3 transition-colors focus-within:border-emerald-400 focus-within:bg-white';

function NoteIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

export default function AddItemForm({
  listId,
  userId,
  isDraft = false,
  onDraftAdd,
  disabled = false,
}) {
  const [name, setName] = useState('');
  const [comment, setComment] = useState('');
  const [quantity, setQuantity] = useState('1 шт');
  const [category, setCategory] = useState('Прочее');
  const [categoryAuto, setCategoryAuto] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const commentInputRef = useRef(null);
  const categoryChipRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

    const detected = detectCategory(value);
    if (detected) {
      setCategory(detected);
      setCategoryAuto(true);
    } else if (categoryAuto) {
      setCategoryAuto(false);
    }

    if (value.length >= 2) {
      const history = await searchProductHistory(userId, value);
      const merged = mergeAutocompleteSuggestions(value, history);
      setSuggestions(merged);
      setShowSuggestions(merged.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setName(suggestion);
    setShowSuggestions(false);
    const detected = detectCategory(suggestion);
    if (detected) {
      setCategory(detected);
      setCategoryAuto(true);
    }
  };

  const handleCategoryChange = (value) => {
    setCategory(value);
    setCategoryAuto(false);
  };

  const resetForm = () => {
    setName('');
    setComment('');
    setQuantity('1 шт');
    setCategory('Прочее');
    setCategoryAuto(false);
    setShowComment(false);
  };

  const openComment = () => {
    setShowComment(true);
    requestAnimationFrame(() => commentInputRef.current?.focus());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || disabled) return;

    setLoading(true);
    try {
      const itemData = {
        name: name.trim(),
        quantity,
        category,
        comment: comment.trim(),
      };

      if (isDraft) {
        await onDraftAdd?.(itemData);
      } else {
        await addItem(listId, itemData);
        await saveToProductHistory(userId, itemData.name);
      }

      resetForm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div ref={wrapperRef} className={`overflow-hidden ${CARD_SURFACE} ${CARD_PAD_V}`}>
        <div className={NAME_INPUT_CONTAINER}>
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              autoFocus
              placeholder="Добавить продукт…"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              disabled={disabled}
              className="w-full bg-transparent text-left text-base font-medium text-gray-900 outline-none placeholder:text-gray-500 disabled:opacity-50"
            />
            {showSuggestions && (
              <ul className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/[0.04]">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => selectSuggestion(s)}
                      className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-gray-50"
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
            disabled={disabled}
            onChange={setQuantity}
            variant="embedded"
            className="mr-0"
          />
        </div>

        {!showComment && (
          <button
            type="button"
            onClick={openComment}
            disabled={disabled}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gray-200/80 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 active:scale-95 disabled:opacity-50"
          >
            <NoteIcon />
            Примечание
          </button>
        )}

        <div
          className={`overflow-hidden transition-all duration-200 ease-out ${
            showComment ? 'mt-2 max-h-16 opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <input
            ref={commentInputRef}
            type="text"
            placeholder="Комментарий, например: 2.5%, пожирнее"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={disabled}
            tabIndex={showComment ? 0 : -1}
            className="w-full rounded-xl border border-gray-200 bg-gray-100/80 px-4 py-2 text-sm text-gray-600 outline-none transition-colors placeholder:text-gray-500 focus:border-emerald-400 focus:bg-white disabled:opacity-50"
          />
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <div className="relative min-w-0 flex-1">
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
                    disabled={disabled}
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
          <button
            type="submit"
            disabled={loading || disabled || !name.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg font-light text-white transition-all duration-200 hover:bg-emerald-600 active:scale-95 disabled:opacity-30 disabled:hover:bg-emerald-500 disabled:active:scale-100"
            aria-label="Добавить"
          >
            +
          </button>
        </div>
      </div>
    </form>
  );
}
