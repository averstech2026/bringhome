import { PACKING_ITEM_TYPE } from './packingLists';

/**
 * Базовый словарь тревел-пунктов для автодополнения.
 * name — в нижнем регистре; type — item (Вещь) или todo (Дело).
 */
export const POPULAR_PACKING_ITEMS = [
  // Документы
  { name: 'паспорт', type: PACKING_ITEM_TYPE.ITEM, category: 'Документы' },
  { name: 'загранпаспорт', type: PACKING_ITEM_TYPE.ITEM, category: 'Документы' },
  { name: 'водительские права', type: PACKING_ITEM_TYPE.ITEM, category: 'Документы' },
  { name: 'страховка', type: PACKING_ITEM_TYPE.ITEM, category: 'Документы' },
  { name: 'билеты', type: PACKING_ITEM_TYPE.ITEM, category: 'Документы' },
  { name: 'ваучер отеля', type: PACKING_ITEM_TYPE.ITEM, category: 'Документы' },
  { name: 'проверить документы', type: PACKING_ITEM_TYPE.TODO, category: 'Документы' },

  // Одежда
  { name: 'футболка', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'куртка', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'купальник', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'плавки', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'носки', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'термобелье', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'дождевик', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'кроссовки', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },
  { name: 'шапка', type: PACKING_ITEM_TYPE.ITEM, category: 'Одежда' },

  // Аптечка
  { name: 'аптечка', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },
  { name: 'лекарства', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },
  { name: 'пластырь', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },
  { name: 'бинт', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },
  { name: 'солнцезащитный крем', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },
  { name: 'антисептик', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },
  { name: 'обезболивающее', type: PACKING_ITEM_TYPE.ITEM, category: 'Аптечка' },

  // Техника
  { name: 'пауэрбанк', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'зарядка', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'зарядка для телефона', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'наушники', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'переходник', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'телефон', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'ноутбук', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },
  { name: 'фотоаппарат', type: PACKING_ITEM_TYPE.ITEM, category: 'Техника' },

  // Снаряжение
  { name: 'палатка', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },
  { name: 'спальник', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },
  { name: 'фонарик', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },
  { name: 'рюкзак', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },
  { name: 'термос', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },
  { name: 'треккинговые палки', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },
  { name: 'коврик', type: PACKING_ITEM_TYPE.ITEM, category: 'Снаряжение' },

  // Перекус
  { name: 'бутылка воды', type: PACKING_ITEM_TYPE.ITEM, category: 'Перекус' },
  { name: 'снеки', type: PACKING_ITEM_TYPE.ITEM, category: 'Перекус' },
  { name: 'батончики', type: PACKING_ITEM_TYPE.ITEM, category: 'Перекус' },
  { name: 'орехи', type: PACKING_ITEM_TYPE.ITEM, category: 'Перекус' },
  { name: 'бутерброды', type: PACKING_ITEM_TYPE.ITEM, category: 'Перекус' },

  // Дела / Прочее
  { name: 'заказать экскурсию', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'забронировать отель', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'купить билеты', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'снять наличные', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'передать ключи', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'проверить погоду', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'заправить авто', type: PACKING_ITEM_TYPE.TODO, category: 'Прочее' },
  { name: 'зубная щётка', type: PACKING_ITEM_TYPE.ITEM, category: 'Прочее' },
  { name: 'зубная паста', type: PACKING_ITEM_TYPE.ITEM, category: 'Прочее' },
  { name: 'полотенце', type: PACKING_ITEM_TYPE.ITEM, category: 'Прочее' },
];
