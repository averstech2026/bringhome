/** Акценты контекстов: покупки (зелёный) vs сборы (индиго, как на экране сборов). */

export const SHOPPING_ACCENT = {
  id: 'shopping',
  solid: 'bg-emerald-500',
  solidHover: 'hover:bg-emerald-600',
  bar: 'bg-emerald-400',
  barDone: 'bg-emerald-500',
  pillBg: 'bg-emerald-50',
  pillText: 'text-emerald-700',
  pillFill: 'bg-emerald-100',
  borderIdle: 'border-emerald-200/80',
  borderActive: 'border-emerald-400/80',
  ringActive: 'ring-emerald-200/60',
  hoverBorder: 'hover:border-emerald-400/70',
  hoverRing: 'hover:ring-emerald-100/70',
  gradientIdle: 'bg-gradient-to-br from-white to-emerald-50/40',
  gradientChecked: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  badge: 'bg-emerald-600',
  iconIdle: 'text-emerald-300/0 group-hover:text-emerald-400/70',
  syncBorder: 'border-emerald-200 border-t-emerald-500',
  shadowIdle: 'shadow-[0_1px_6px_rgba(16,185,129,0.1)]',
  shadowActive: 'shadow-[0_1px_6px_rgba(16,185,129,0.28)]',
  shadowHover: 'hover:shadow-[0_2px_10px_rgba(16,185,129,0.18)]',
  fab: 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_20px_rgba(16,185,129,0.38)] hover:shadow-[0_6px_24px_rgba(16,185,129,0.42)]',
  soft: 'bg-emerald-200',
  icon: 'text-emerald-600',
  primaryBtn:
    'w-full rounded-full bg-emerald-500 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(16,185,129,0.3)] transition-all duration-150 hover:bg-emerald-600 hover:shadow-[0_6px_20px_rgba(16,185,129,0.38)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed',
};

/** Индиго ~#402CCC с кадра сборов; CTA «Готово» — зелёная (PRIMARY_BTN / emerald). */
export const PACKING_ACCENT = {
  id: 'packing',
  solid: 'bg-indigo-600',
  solidHover: 'hover:bg-indigo-700',
  bar: 'bg-indigo-400',
  barDone: 'bg-indigo-600',
  pillBg: 'bg-indigo-50',
  pillText: 'text-indigo-700',
  pillFill: 'bg-indigo-100',
  borderIdle: 'border-indigo-200/80',
  borderActive: 'border-indigo-400/80',
  ringActive: 'ring-indigo-200/60',
  hoverBorder: 'hover:border-indigo-400/70',
  hoverRing: 'hover:ring-indigo-100/70',
  gradientIdle: 'bg-gradient-to-br from-white to-indigo-50/40',
  gradientChecked: 'bg-gradient-to-br from-indigo-500 to-indigo-700',
  badge: 'bg-indigo-600',
  iconIdle: 'text-indigo-300/0 group-hover:text-indigo-400/70',
  syncBorder: 'border-indigo-200 border-t-indigo-500',
  shadowIdle: 'shadow-[0_1px_6px_rgba(79,70,229,0.1)]',
  shadowActive: 'shadow-[0_1px_6px_rgba(79,70,229,0.28)]',
  shadowHover: 'hover:shadow-[0_2px_10px_rgba(79,70,229,0.18)]',
  fab: 'bg-indigo-600 hover:bg-indigo-700 shadow-[0_4px_20px_rgba(79,70,229,0.38)] hover:shadow-[0_6px_24px_rgba(79,70,229,0.42)]',
  soft: 'bg-indigo-200',
  softHover: 'hover:bg-indigo-300',
  icon: 'text-indigo-600',
  primaryBtn:
    'w-full rounded-full bg-indigo-600 py-3.5 text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(79,70,229,0.3)] transition-all duration-150 hover:bg-indigo-700 hover:shadow-[0_6px_20px_rgba(79,70,229,0.38)] active:scale-[0.98] disabled:opacity-50 disabled:shadow-none disabled:active:scale-100 disabled:cursor-not-allowed',
};

/** Типы пунктов сборов: «Вещь» (индиго) vs «Дело» (бирюза). */
export const PACKING_TYPE_ITEM = {
  id: 'item',
  solid: 'bg-indigo-600',
  solidHover: 'hover:bg-indigo-700',
  soft: 'bg-indigo-200',
  softBg: 'bg-indigo-50',
  softHover: 'hover:bg-indigo-100',
  icon: 'text-indigo-600',
  iconHover: 'hover:text-indigo-600',
  label: 'text-indigo-600',
  shadow: 'shadow-[0_2px_10px_rgba(79,70,229,0.35)]',
};

export const PACKING_TYPE_TODO = {
  id: 'todo',
  solid: 'bg-teal-500',
  solidHover: 'hover:bg-teal-600',
  soft: 'bg-teal-200',
  softBg: 'bg-teal-50',
  softHover: 'hover:bg-teal-100',
  icon: 'text-teal-600',
  iconHover: 'hover:text-teal-600',
  label: 'text-teal-600',
  shadow: 'shadow-[0_2px_10px_rgba(20,184,166,0.35)]',
};

export function getPackingTypeAccent(type) {
  return type === 'todo' ? PACKING_TYPE_TODO : PACKING_TYPE_ITEM;
}

export const DESKTOP_DOT_ACTIVE = {
  shopping: SHOPPING_ACCENT.solid,
  travel: PACKING_ACCENT.solid,
};

export function getContextAccent(context = 'shopping') {
  return context === 'packing' ? PACKING_ACCENT : SHOPPING_ACCENT;
}
