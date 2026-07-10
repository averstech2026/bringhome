export const ONBOARDING_GUIDE_TYPE = 'onboarding_guide';

export const VIRTUAL_ONBOARDING_NOTIFICATION_ID = '__onboarding_guide__';

export const WELCOME_NOTIFICATION = {
  type: ONBOARDING_GUIDE_TYPE,
  title: 'Добро пожаловать в КупиДомой!',
  body: 'Краткое руководство по приложению. Нажмите, чтобы открыть инструкцию.',
};

export const ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Добро пожаловать!',
    description:
      'КупиДомой — семейное пространство для совместных списков покупок. Создавайте списки, делитесь ими с близкими и отмечайте купленное вместе.',
    emoji: '👋',
    tip: '💡 Совет: Добавьте приложение на главный экран смартфона через меню браузера для быстрого доступа.',
  },
  {
    id: 'lists',
    title: 'Быстрое создание списков',
    description:
      'На главном экране нажмите капсулу, чтобы сразу начать новый список нужного типа:',
    showQuickButtons: true,
    tip: '💡 Совет: Все списки обновляются в реальном времени — семья сразу увидит изменения.',
  },
  {
    id: 'ai',
    title: 'Умный помощник AI',
    description:
      'В списке нажмите на фиолетовый бейдж AI — он подскажет товары, поможет составить покупки и сэкономит время.',
    showAiBadge: true,
    tip: '💡 Совет: Вы можете скопировать список продуктов из любого чата, а ИИ автоматически распределит их по категориям.',
  },
  {
    id: 'family',
    title: 'Семья и уведомления',
    description:
      'Делитесь списками с участниками семьи, следите за изменениями во «Входящих» и получайте push-уведомления о важных событиях.',
    emoji: '🔔',
  },
];

export function isOnboardingCompleted(profile) {
  return profile?.onboardingCompleted === true;
}

export function isOnboardingGuideNotification(notification) {
  return notification?.type === ONBOARDING_GUIDE_TYPE;
}

export function hasOnboardingGuideNotification(notifications) {
  return (notifications || []).some((notification) => isOnboardingGuideNotification(notification));
}

export function createVirtualWelcomeNotification(userId, { createdAt = null } = {}) {
  return {
    id: VIRTUAL_ONBOARDING_NOTIFICATION_ID,
    userId,
    type: WELCOME_NOTIFICATION.type,
    title: WELCOME_NOTIFICATION.title,
    body: WELCOME_NOTIFICATION.body,
    link: '',
    isRead: true,
    isVirtual: true,
    createdAt,
  };
}

/** Гарантирует приветственное письмо во «Входящих», если его нет в базе. */
export function withVirtualWelcomeNotification(notifications, userId, { createdAt = null } = {}) {
  if (!userId || hasOnboardingGuideNotification(notifications)) {
    return notifications;
  }
  const virtual = createVirtualWelcomeNotification(userId, { createdAt });
  return [virtual, ...(notifications || [])];
}

export function formatNotificationBody(body) {
  if (!body) return '';
  return body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />');
}
