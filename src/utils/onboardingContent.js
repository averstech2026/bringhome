export {
  HINT_TYPE,
  LEGACY_ONBOARDING_GUIDE_TYPE as ONBOARDING_GUIDE_TYPE,
  VIRTUAL_WELCOME_HINT_ID as VIRTUAL_ONBOARDING_NOTIFICATION_ID,
  SYSTEM_HINTS,
  getHintById,
  getNotificationHintId,
  isHintNotification,
  hasWelcomeHint,
  hasWelcomeHint as hasOnboardingGuideNotification,
  createVirtualWelcomeHint,
  createVirtualWelcomeHint as createVirtualWelcomeNotification,
  withVirtualWelcomeHint,
  withVirtualWelcomeHint as withVirtualWelcomeNotification,
  filterVisibleHints,
} from './hintsContent';

import { getHintById, getNotificationHintId, HINT_TYPE } from './hintsContent';

export const WELCOME_NOTIFICATION = {
  type: HINT_TYPE,
  hintId: 'welcome',
  title: getHintById('welcome')?.title || 'Знакомство',
  body: getHintById('welcome')?.body || '',
};

/** @deprecated Use getHintById('welcome').steps */
export const ONBOARDING_STEPS = getHintById('welcome')?.steps || [];

export function isOnboardingCompleted(profile) {
  return profile?.onboardingCompleted === true;
}

function getOnboardingSkipSessionKey(userId) {
  return `onboarding_skipped_${userId}`;
}

export function isOnboardingSkippedThisSession(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return false;
  return sessionStorage.getItem(getOnboardingSkipSessionKey(userId)) === '1';
}

export function markOnboardingSkippedThisSession(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(getOnboardingSkipSessionKey(userId), '1');
}

export function clearOnboardingSkippedThisSession(userId) {
  if (!userId || typeof sessionStorage === 'undefined') return;
  sessionStorage.removeItem(getOnboardingSkipSessionKey(userId));
}

export function isOnboardingGuideNotification(notification) {
  if (notification?.type === 'onboarding_guide') return true;
  return notification?.type === HINT_TYPE && getNotificationHintId(notification) === 'welcome';
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
