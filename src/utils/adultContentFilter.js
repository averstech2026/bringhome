export const RESTRICTED_KEYWORDS = [
  'пиво',
  'вино',
  'водка',
  'коньяк',
  'виски',
  'алко',
  'сигарет',
  'табак',
  'вейп',
  'beer',
  'wine',
  'vodka',
  'whiskey',
  'cigarettes',
  'шампан',
  'ликёр',
  'ликер',
  'сигар',
  'никотин',
  'алкогол',
  'портвейн',
  'текила',
  'джин',
  'абсент',
  'сидр',
  'медовух',
  'настойк',
  'игрист',
  'бренди',
  'самогон',
  'кальян',
];

const ADULT_CATEGORIES = ['алкоголь', 'табак', 'сигарет'];

const ADULT_CONTENT_TOASTS = {
  default: 'Этот товар нельзя добавить в детский аккаунт (18+). Попробуй что-нибудь другое!',
  hogwarts: 'Muggle stuff detected! Магия Хогвартса не работает на товары 18+ 🙅‍♂️',
  star_wars: 'Тёмная сторона Силы! ⚔️ Товары 18+ в этот список не проходят. Выбери светлую сторону меню!',
  paddington: 'Ой! В чемоданчике Паддингтона нет места для товаров 18+ 🧸 Попробуй добавить что-нибудь другое.',
};

/** @deprecated используйте getAdultContentToast(themeId) */
export const ADULT_CONTENT_TOAST = ADULT_CONTENT_TOASTS.hogwarts;

/** Тематический тост фильтра 18+ (детский аккаунт). */
export function getAdultContentToast(themeId = 'default') {
  return ADULT_CONTENT_TOASTS[themeId] || ADULT_CONTENT_TOASTS.default;
}

/** Фильтр 18+ привязан к роли аккаунта, а не к визуальной теме. */
export function isChildAccount(profile) {
  return profile?.isChild === true;
}

export function shouldFilterAdultContent(profile) {
  return isChildAccount(profile);
}

function matchesRestrictedKeyword(nameLower, keyword) {
  if (keyword === 'ром') {
    return /\bром\b/.test(nameLower);
  }
  return nameLower.includes(keyword);
}

export function containsRestrictedKeyword(name) {
  const nameLower = String(name || '').toLowerCase();
  return RESTRICTED_KEYWORDS.some((keyword) => matchesRestrictedKeyword(nameLower, keyword));
}

export function isAdultProduct(product) {
  const name = String(product?.name || '').toLowerCase();
  const category = String(product?.category || '').toLowerCase();

  if (ADULT_CATEGORIES.some((token) => category.includes(token))) {
    return true;
  }

  return RESTRICTED_KEYWORDS.some((keyword) => matchesRestrictedKeyword(name, keyword));
}

export function isRestrictedItemName(name, profile) {
  if (!shouldFilterAdultContent(profile)) {
    return false;
  }
  return containsRestrictedKeyword(name);
}

export function filterAdultProducts(products) {
  const allowed = [];
  const blocked = [];

  for (const product of products) {
    if (isAdultProduct(product)) {
      blocked.push(product);
    } else {
      allowed.push(product);
    }
  }

  return { allowed, blocked };
}
