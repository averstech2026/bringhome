export const HINT_TYPE = 'hint';

export const LEGACY_ONBOARDING_GUIDE_TYPE = 'onboarding_guide';

export const VIRTUAL_WELCOME_HINT_ID = '__welcome_hint__';

/** @typedef {{ id: string, title: string, description: string, emoji?: string, tip?: string, showCreateListDemo?: boolean, showAiInputDemo?: boolean, showShareDemo?: boolean, showPwaDemo?: boolean, showBookingDemo?: boolean, showThemesDemo?: boolean, showHomeDesktopDemo?: boolean, showPackingAiDemo?: boolean, showPackingBackpackDemo?: boolean }} HintGuideStep */

/** @typedef {{ hintId: string, title: string, body: string, steps: HintGuideStep[] }} SystemHint */

/** @type {SystemHint[]} */
export const SYSTEM_HINTS = [
  {
    hintId: 'welcome',
    title: 'Знакомство',
    body: 'Краткое руководство по приложению. Другие подсказки появятся здесь по мере запуска.',
    steps: [
      {
        id: 'welcome',
        title: 'Добро пожаловать!',
        description:
          'КупиДомой — семейное пространство для совместных списков покупок. Создавайте списки, делитесь ими с близкими и отмечайте купленное вместе.',
        emoji: '👋',
        tip: '💡 Совет: все интерактивные подсказки живут во «Входящих» уведомлений — к ним можно вернуться в любой момент.',
      },
      {
        id: 'lists',
        title: 'Создание списка',
        description:
          'На главном экране нажмите зелёную кнопку «+» внизу справа — откроется окно, где можно выбрать тип списка и дату покупок.',
        showCreateListDemo: true,
        tip: '💡 Совет: все списки обновляются в реальном времени — семья сразу увидит изменения.',
      },
      {
        id: 'ai',
        title: 'Умный ввод покупок 🤖',
        description:
          'Прокрутите страницу к полю ИИ внизу — вставьте список из чата или напишите продукты, и они распознаются автоматически.',
        showAiInputDemo: true,
        tip: '💡 Совет: скопируйте список продуктов из WhatsApp или Telegram — ИИ распределит их по категориям.',
      },
      {
        id: 'family',
        title: 'Семья и уведомления',
        description:
          'Делитесь списками с участниками семьи, следите за изменениями во «Входящих» и получайте push-уведомления о важных событиях.',
        emoji: '🔔',
        tip: '💡 Совет: в этой ленте также появляются системные подсказки — нажмите на карточку, чтобы перечитать гайд.',
      },
    ],
  },
  {
    hintId: 'family_sharing',
    title: 'Как шерить списки',
    body: 'Инструкция по шерингу внутри семьи и с внешними семьями.',
    steps: [
      {
        id: 'internal',
        title: 'Шеринг внутри семьи',
        description:
          'Откройте список → настройки доступа → добавьте участников семьи. Приватные списки видят только выбранные люди, публичные — вся семья.',
        emoji: '👨‍👩‍👧',
        tip: '💡 Совет: жёлтый значок означает, что список скрыт от части членов семьи.',
      },
      {
        id: 'external',
        title: 'Шеринг с внешней семьёй',
        description:
          'В настройках списка создайте ссылку-приглашение и отправьте её другой семье — например, семье Ричарда. Гости увидят товары, но не смогут менять настройки списка.',
        showShareDemo: true,
        tip: '💡 Совет: внешняя семья отображается отдельным бейджем на карточке списка.',
      },
      {
        id: 'sync',
        title: 'Синхронизация в реальном времени',
        description:
          'Все изменения — добавление товаров, отметки «куплено», бронирование — мгновенно видны всем, у кого есть доступ.',
        emoji: '⚡',
      },
    ],
  },
  {
    hintId: 'pwa_install',
    title: 'Установка на экран',
    body: 'Как добавить КупиДомой на главный экран телефона как PWA-приложение.',
    steps: [
      {
        id: 'ios',
        title: 'iPhone / iPad (Safari)',
        description:
          'Откройте сайт в Safari → нажмите «Поделиться» (квадрат со стрелкой) → «На экран Домой». Иконка появится рядом с другими приложениями.',
        emoji: '📱',
      },
      {
        id: 'android',
        title: 'Android (Chrome)',
        description:
          'Откройте сайт в Chrome → меню (три точки) → «Установить приложение» или «Добавить на главный экран». Подтвердите установку.',
        showPwaDemo: true,
        tip: '💡 Совет: PWA работает офлайн для уже открытых страниц и открывается в полноэкранном режиме.',
      },
      {
        id: 'desktop',
        title: 'Компьютер',
        description:
          'В Chrome или Edge нажмите иконку установки в адресной строке. Приложение появится в меню «Пуск» или Launchpad.',
        emoji: '💻',
      },
    ],
  },
  {
    hintId: 'ai_input',
    title: 'Умный ИИ-ввод',
    body: 'Как работает AI-помощник: примеры с единицами «кг», «шт» и категориями.',
    steps: [
      {
        id: 'activate',
        title: 'Поле ИИ в списке',
        description:
          'Откройте список — страница сразу прокрутится к полю ИИ внизу. Наберите покупки или вставьте текст из чата, затем нажмите «Распознать».',
        showAiInputDemo: true,
      },
      {
        id: 'units',
        title: 'Единицы измерения',
        description:
          'ИИ понимает «2 кг картофеля», «молоко 1 л», «яйца 10 шт». Если единица не указана — подставится подходящая по умолчанию.',
        emoji: '⚖️',
        tip: '💡 Пример: «хлеб, молоко 2л, яблоки 1 кг, яйца 10 шт» — всё разложится по категориям.',
      },
      {
        id: 'paste',
        title: 'Вставка из чата',
        description:
          'Скопируйте список из WhatsApp, Telegram или заметок — AI распознает позиции, количество и категории автоматически.',
        emoji: '📋',
      },
    ],
  },
  {
    hintId: 'booking',
    title: 'Бронирование товаров',
    body: 'Как бронировать товары и скрывать их с помощью замочков и прав доступа.',
    steps: [
      {
        id: 'book',
        title: 'Забронировать товар',
        description:
          'Нажмите на товар в списке → «Забронировать». Товар получит метку с вашим именем — другие увидят, что вы его берёте.',
        showBookingDemo: true,
        tip: '💡 Совет: бронь видна всей семье в реальном времени.',
      },
      {
        id: 'locks',
        title: 'Замочки и приватность',
        description:
          'В настройках списка можно ограничить доступ: приватный список видят только выбранные участники. Замочек на карточке списка означает ограниченный доступ.',
        emoji: '🔒',
      },
      {
        id: 'permissions',
        title: 'Права доступа',
        description:
          'Владелец списка управляет, кто может редактировать, архивировать и приглашать других. Гости внешних семей могут только отмечать товары.',
        emoji: '🛡️',
      },
    ],
  },
  {
    hintId: 'profile_themes',
    title: 'Профиль и темы',
    body: 'Смена аватарок и выбор тем оформления: Джедаи, Паддингтон, Хогвартс.',
    steps: [
      {
        id: 'avatar',
        title: 'Аватар и имя',
        description:
          'Откройте Настройки → Профиль. Загрузите фото или выберите готовый аватар — имя отображается в списках и уведомлениях.',
        emoji: '🖼️',
      },
      {
        id: 'themes',
        title: 'Темы оформления',
        description:
          'В профиле выберите тему: классическая, Джедаи, Паддингтон или Хогвартс. Тема меняет цвета, иконки и настроение приложения.',
        showThemesDemo: true,
        tip: '💡 Совет: детские аккаунты по умолчанию получают тему Хогвартс.',
      },
      {
        id: 'notifications',
        title: 'Push-уведомления',
        description:
          'В настройках включите push — будете получать оповещения о новых списках, изменениях и объявлениях от администратора.',
        emoji: '🔔',
      },
    ],
  },
  {
    hintId: 'packing_lists',
    title: 'Списки сборов',
    body: 'Как листать столы, пользоваться сборами, ИИ-вводом и рюкзаками.',
    steps: [
      {
        id: 'desktops',
        title: 'Два рабочих стола',
        description:
          'На главном экране смахните влево или вправо: слева — «Список покупок», справа — «Списки сборов». Точки внизу показывают, на каком столе вы сейчас.',
        showHomeDesktopDemo: true,
        tip: '💡 Совет: край соседнего стола слегка «выглядывает» — так проще понять, куда смахнуть.',
      },
      {
        id: 'packing_list',
        title: 'Как пользоваться сборами',
        description:
          'На столе «Сборы» нажмите «+», выберите тип поездки и название. Внутри списка добавляйте вещи и дела, группируйте их по разделам и отмечайте собранное галочкой.',
        emoji: '🧳',
        tip: '💡 Совет: из общих вещей можно скопировать пункт в «Мой рюкзак» — он появится только у вас.',
      },
      {
        id: 'packing_ai',
        title: 'ИИ-ввод в сборах',
        description:
          'Внизу списка — поле ИИ: напишите или вставьте текст вроде «едем на море / купальник, зарядка, купить билеты». ИИ разложит позиции на вещи и дела, а перед добавлением спросит — в новый раздел или «Без категории».',
        showPackingAiDemo: true,
        tip: '💡 Совет: для каждой позиции можно выбрать «Общие» или «Личные» — куда именно положить.',
      },
      {
        id: 'backpacks',
        title: 'Общий и личный рюкзак',
        description:
          '«Общие вещи и дела» видны всей семье: кто что берёт и что уже собрано. «Мой рюкзак» — только ваши личные вещи; чужие рюкзаки вам не видны.',
        showPackingBackpackDemo: true,
      },
    ],
  },
];

export function getHintById(hintId) {
  return SYSTEM_HINTS.find((hint) => hint.hintId === hintId) || null;
}

export function getHintIds() {
  return SYSTEM_HINTS.map((hint) => hint.hintId);
}

/** Статус подсказки в панели владельца (не совпадает с isActive для welcome). */
export function getHintAdminDisplayStatus(hintId, state) {
  if (hintId === 'welcome') return 'auto';
  if (state?.isActive === true) return 'launched';
  return 'hidden';
}

/** Сводка: что сейчас видят пользователи. */
export function buildHintsAdminSummary(hints, hintStateById) {
  const autoHints = [];
  const launchedHints = [];
  const hiddenHints = [];

  for (const hint of hints) {
    const state = typeof hintStateById?.get === 'function'
      ? hintStateById.get(hint.hintId)
      : hintStateById?.[hint.hintId];
    const status = getHintAdminDisplayStatus(hint.hintId, state);
    if (status === 'auto') autoHints.push(hint);
    else if (status === 'launched') launchedHints.push(hint);
    else hiddenHints.push(hint);
  }

  return { autoHints, launchedHints, hiddenHints };
}

export function isHintNotification(notification) {
  if (!notification) return false;
  if (notification.type === HINT_TYPE) return true;
  if (notification.type === LEGACY_ONBOARDING_GUIDE_TYPE) return true;
  return false;
}

export function getNotificationHintId(notification) {
  if (!notification) return null;
  if (notification.hintId) return notification.hintId;
  if (notification.type === LEGACY_ONBOARDING_GUIDE_TYPE) return 'welcome';
  return null;
}

export function hasWelcomeHint(notifications) {
  return (notifications || []).some((notification) => {
    if (!isHintNotification(notification)) return false;
    return getNotificationHintId(notification) === 'welcome';
  });
}

export function createVirtualWelcomeHint(userId, { createdAt = null } = {}) {
  const hint = getHintById('welcome');
  return {
    id: VIRTUAL_WELCOME_HINT_ID,
    userId,
    type: HINT_TYPE,
    hintId: 'welcome',
    title: hint?.title || 'Знакомство',
    body: hint?.body || '',
    link: '',
    isRead: true,
    isVirtual: true,
    createdAt,
  };
}

/** Гарантирует приветственную подсказку во «Входящих», если её нет в базе. */
export function withVirtualWelcomeHint(notifications, userId, { createdAt = null } = {}) {
  if (!userId || hasWelcomeHint(notifications)) {
    return notifications;
  }
  const virtual = createVirtualWelcomeHint(userId, { createdAt });
  return [virtual, ...(notifications || [])];
}

export function filterVisibleHints(notifications, userId, profile) {
  const unlockedHints = new Set(profile?.unlockedHints || []);
  const dismissedHints = new Set(profile?.dismissedHints || []);

  const filtered = (notifications || []).filter((notification) => {
    if (!isHintNotification(notification)) return true;

    const hintId = getNotificationHintId(notification);
    if (hintId && hintId !== 'welcome' && dismissedHints.has(hintId)) return false;

    if (notification.userId === userId) {
      return true;
    }

    if (notification.familyId === 'global') {
      if (notification.isActive === false) return false;
      if (hintId === 'welcome') return false;
      return unlockedHints.has(hintId);
    }

    return true;
  });

  return dedupeHintsByHintId(filtered);
}

function dedupeHintsByHintId(notifications) {
  const others = [];
  const hintsById = new Map();

  for (const notification of notifications) {
    if (!isHintNotification(notification)) {
      others.push(notification);
      continue;
    }

    const hintId = getNotificationHintId(notification);
    if (!hintId) {
      others.push(notification);
      continue;
    }

    const existing = hintsById.get(hintId);
    if (!existing) {
      hintsById.set(hintId, notification);
      continue;
    }

    const existingTime = existing.createdAt?.toMillis?.() ?? 0;
    const nextTime = notification.createdAt?.toMillis?.() ?? 0;
    hintsById.set(hintId, nextTime >= existingTime ? notification : existing);
  }

  return [...others, ...hintsById.values()];
}
