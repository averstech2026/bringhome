import { useState, useRef, useEffect } from 'react';
import {
  addItem,
  searchProductHistory,
  saveToProductHistory,
} from '../../services/listsService';
import { CATEGORIES, detectCategory } from '../../utils/categories';
import { mergeAutocompleteSuggestions } from '../../utils/productAutocomplete';
import { CARD_SURFACE, CARD_PAD_V, INPUT_PLACEHOLDER } from './cardStyles';

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
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
        <div className="relative">
          <input
            type="text"
            placeholder="Добавить продукт…"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            disabled={disabled}
            className={`w-full bg-transparent pb-2 text-left text-[15px] text-gray-900 outline-none disabled:opacity-50 ${INPUT_PLACEHOLDER}`}
          />
          {showSuggestions && (
            <ul className="absolute left-0 right-0 top-full z-10 max-h-40 overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/[0.04]">
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

        <input
          type="text"
          placeholder="Комментарий, например: 2.5%, пожирнее"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={disabled}
          className={`w-full bg-transparent pb-3 text-left text-xs text-gray-700 outline-none disabled:opacity-50 placeholder:text-gray-400/80`}
        />

        <div className="flex items-center border-t border-gray-100 pt-1">
          <input
            type="text"
            placeholder="Кол-во"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={disabled}
            className="w-[72px] shrink-0 bg-transparent py-2.5 text-left text-sm text-gray-600 outline-none placeholder:text-gray-400 disabled:opacity-50"
          />
          <div className="h-5 w-px shrink-0 bg-gray-100" />
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            disabled={disabled}
            className={`min-w-0 flex-1 appearance-none bg-transparent py-2.5 pl-2 text-left text-sm outline-none disabled:opacity-50 ${
              categoryAuto ? 'font-medium text-emerald-700' : 'text-gray-600'
            }`}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
