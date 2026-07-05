/** Порядок категорий в списке */
export const CATEGORY_ORDER = [
  'Овощи и фрукты',
  'Молочные продукты',
  'Мясо и рыба',
  'Бакалея',
  'Напитки',
  'Заморозка',
  'К чаю / Сладости',
  'Бытовая химия',
  'Прочее',
];

/** Все категории для селекта */
export const CATEGORIES = [...CATEGORY_ORDER];

export const CATEGORY_EMOJI = {
  'Овощи и фрукты': '🍎',
  'Молочные продукты': '🥛',
  'Мясо и рыба': '🥩',
  'Бакалея': '🌾',
  'Напитки': '🥤',
  'Заморозка': '❄️',
  'К чаю / Сладости': '🍪',
  'Бытовая химия': '🧴',
  'Прочее': '📦',
};

export const CATEGORY_HEADER_CLASS = {
  'Овощи и фрукты': 'bg-emerald-50/70 text-emerald-700',
  'Молочные продукты': 'bg-blue-50/70 text-blue-700',
  'Мясо и рыба': 'bg-red-50/70 text-red-700',
  'Бакалея': 'bg-amber-50/70 text-amber-800',
  'Напитки': 'bg-cyan-50/70 text-cyan-700',
  'Заморозка': 'bg-sky-50/70 text-sky-700',
  'К чаю / Сладости': 'bg-pink-50/70 text-pink-700',
  'Бытовая химия': 'bg-violet-50/70 text-violet-700',
  'Прочее': 'bg-slate-100 text-slate-700',
};

/** @deprecated используйте getCategoryHeaderClass */
export const CATEGORY_LABEL_CLASS =
  'mb-2 mt-4 block w-max rounded-md bg-slate-100/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-700 first:mt-0';

export function getCategoryHeaderClass(category) {
  return CATEGORY_HEADER_CLASS[category] || CATEGORY_HEADER_CLASS['Прочее'];
}

export function getCategoryLabel(category) {
  const emoji = CATEGORY_EMOJI[category] || '📦';
  return `${emoji} ${category}`;
}

/** Корни слов → категория (умный выбор отдела) */
const CATEGORY_KEYWORDS = [
  {
    category: 'Молочные продукты',
    roots: [
      'молок', 'кефир', 'кеф', 'творог', 'твор', 'сыр', 'йогурт',
      'сметан', 'ряжен', 'простокваш', 'сливк', 'масло слив', 'бифид',
    ],
  },
  {
    category: 'Мясо и рыба',
    roots: [
      'мяс', 'кури', 'говя', 'свини', 'индей', 'колбас', 'сосиск', 'ветчин',
      'фарш', 'рыб', 'лосос', 'семг', 'форел', 'треск', 'кревет', 'кальмар',
    ],
  },
  {
    category: 'Овощи и фрукты',
    roots: [
      'яблок', 'банан', 'апельс', 'мандар', 'помид', 'томат', 'огур', 'картоф',
      'морков', 'лук', 'чеснок', 'капуст', 'перец', 'авокад', 'зелен', 'салат',
      'груш', 'виногра', 'ягод', 'лимон',
    ],
  },
  {
    category: 'Бакалея',
    roots: [
      'греч', 'рис', 'макарон', 'спагет', 'паста', 'мук', 'хлеб', 'батон', 'бул',
      'овсян', 'перлов', 'пшён', 'круп', 'масло подс', 'сахар', 'соль', 'уксус',
      'кетчуп', 'майон', 'соус',
    ],
  },
  {
    category: 'Напитки',
    roots: ['вода', 'сок', 'лимонад', 'кола', 'чай', 'кофе', 'компот', 'морс', 'пиво'],
  },
  {
    category: 'Заморозка',
    roots: ['замороз', 'морож', 'пельмен', 'вареник', 'полуфаб', 'frozen'],
  },
  {
    category: 'К чаю / Сладости',
    roots: [
      'печень', 'пряник', 'конфет', 'шоколад', 'вафл', 'торт', 'кекс', 'мёд', 'мед',
      'варень', 'джем', 'сладост', 'зефир', 'мармелад',
    ],
  },
  {
    category: 'Бытовая химия',
    roots: [
      'порош', 'гель для стир', 'освеж', 'мыл', 'шампун', 'бальзам', 'средство',
      'спрей', 'туалет', 'салфет', 'бумаг',
    ],
  },
];

export function detectCategory(productName) {
  const lower = productName.toLowerCase().trim();
  if (!lower) return null;

  for (const { category, roots } of CATEGORY_KEYWORDS) {
    if (roots.some((root) => lower.includes(root))) {
      return category;
    }
  }
  return null;
}
