export const DEFAULT_AI_LIMIT_MONTH = 50;

/** @deprecated используйте DEFAULT_AI_LIMIT_MONTH */
export const DEFAULT_AI_LIMITS = {
  daily: 5,
  weekly: 20,
  monthly: DEFAULT_AI_LIMIT_MONTH,
};

import { isFamilyAdmin, isSuperAdmin } from './roles';

function isFamilyScoped(user) {
  return Boolean(user?.familyId || user?.groupId);
}

function hasStoredAiLimits(user) {
  const raw = user?.aiLimits;
  return Boolean(raw && (raw.daily != null || raw.weekly != null || raw.monthly != null));
}

function parseStoredAiLimits(raw) {
  return {
    daily: Math.max(0, Number(raw.daily ?? DEFAULT_AI_LIMITS.daily)),
    weekly: Math.max(0, Number(raw.weekly ?? DEFAULT_AI_LIMITS.weekly)),
    monthly: Math.max(0, Number(raw.monthly ?? DEFAULT_AI_LIMITS.monthly)),
  };
}

export function resolveFamilyAiLimitMonth(family) {
  if (family?.aiLimitMonth != null && family.aiLimitMonth !== '') {
    return Math.max(0, Number(family.aiLimitMonth));
  }
  if (family?.limits?.aiRequests != null && family.limits.aiRequests !== '') {
    return Math.max(0, Number(family.limits.aiRequests));
  }
  return DEFAULT_AI_LIMIT_MONTH;
}

/** Персональный месячный лимит (поле aiLimitMonth в настройках семьи). */
export function getPersonalAiLimitMonth(user) {
  if (!user) return null;

  if ('aiLimitMonth' in user) {
    if (user.aiLimitMonth == null || user.aiLimitMonth === '') return null;
    return Math.max(0, Number(user.aiLimitMonth));
  }

  return null;
}

export function hasPersonalAiLimitMonth(user) {
  return getPersonalAiLimitMonth(user) != null;
}

export function resolveEffectiveAiLimitMonth(user, family = null) {
  const personal = getPersonalAiLimitMonth(user);
  if (personal != null) return personal;
  if (family) return resolveFamilyAiLimitMonth(family);
  return DEFAULT_AI_LIMIT_MONTH;
}

/** Детальные день/неделя/месяц — только для участников с лимитом от владельца платформы. */
export function hasGranularAiLimits(user) {
  if (!hasStoredAiLimits(user)) return false;
  if ('aiLimitMonth' in user) return false;
  if (isFamilyAdmin(user) && isFamilyScoped(user)) return false;
  return true;
}

export function formatUserAiMonthLabel(user, family = null) {
  const usage = normalizeAiUsage(user?.aiUsage);
  const limits = resolveAiLimits(user, family);

  if (hasGranularAiLimits(user)) {
    return `ИИ/день: ${usage.daily.count} / ${limits.daily} · ИИ/мес: ${usage.monthly.count} / ${limits.monthly}`;
  }

  const used = usage.monthly.count;
  const limit = resolveEffectiveAiLimitMonth(user, family);

  if (hasPersonalAiLimitMonth(user)) {
    return `ИИ/мес: ${used} / ${limit}`;
  }

  return `ИИ/мес: ${used} / ${limit} (из общего)`;
}

export function getPeriodKeys(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const weekday = date.getDay();
  const thursday = new Date(date);
  thursday.setDate(date.getDate() + (4 - (weekday || 7)));
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);

  return {
    daily: `${year}-${month}-${day}`,
    weekly: `${year}-W${String(week).padStart(2, '0')}`,
    monthly: `${year}-${month}`,
  };
}

/** Эффективные лимиты: персональный aiLimitMonth, aiLimits (владелец) или общий лимит семьи. */
export function resolveAiLimits(profile, family = null) {
  const personalMonth = getPersonalAiLimitMonth(profile);
  if (personalMonth != null) {
    return deriveAiLimitsFromMonthly(personalMonth);
  }

  if (isFamilyAdmin(profile) && isFamilyScoped(profile)) {
    return deriveAiLimitsFromMonthly(resolveFamilyAiLimitMonth(family));
  }

  if (hasStoredAiLimits(profile)) {
    if (isSuperAdmin(profile) || !isFamilyAdmin(profile)) {
      return parseStoredAiLimits(profile.aiLimits);
    }
  }

  const monthly = resolveEffectiveAiLimitMonth(profile, family);
  return deriveAiLimitsFromMonthly(monthly);
}

export function normalizeAiUsage(raw, date = new Date()) {
  const keys = getPeriodKeys(date);
  const usage = raw || {};

  return {
    daily: {
      count: usage.daily?.periodKey === keys.daily ? Number(usage.daily?.count || 0) : 0,
      periodKey: keys.daily,
    },
    weekly: {
      count: usage.weekly?.periodKey === keys.weekly ? Number(usage.weekly?.count || 0) : 0,
      periodKey: keys.weekly,
    },
    monthly: {
      count: usage.monthly?.periodKey === keys.monthly ? Number(usage.monthly?.count || 0) : 0,
      periodKey: keys.monthly,
    },
    total: Number(usage.total || 0),
  };
}

export function isUnlimitedAiUser(profile) {
  return isSuperAdmin(profile);
}

export function isAiMonthlyLimitReached(profile, family = null, date = new Date()) {
  if (isUnlimitedAiUser(profile)) return false;

  const limitMonth = resolveEffectiveAiLimitMonth(profile, family);
  const usage = normalizeAiUsage(profile?.aiUsage, date);
  return usage.monthly.count >= limitMonth;
}

export function checkAiUsageAllowed(profile, family = null, date = new Date()) {
  if (isUnlimitedAiUser(profile)) {
    return { allowed: true, unlimited: true, limitMonth: null, usage: null };
  }

  const limits = resolveAiLimits(profile, family);
  const usage = normalizeAiUsage(profile?.aiUsage, date);
  const limitMonth = resolveEffectiveAiLimitMonth(profile, family);

  // Участники семьи с общим месячным пулом — только месячный лимит (без derived daily/weekly).
  if (hasGranularAiLimits(profile)) {
    if (usage.daily.count >= limits.daily) {
      return { allowed: false, reason: 'daily', limitMonth, limits, usage };
    }
    if (usage.weekly.count >= limits.weekly) {
      return { allowed: false, reason: 'weekly', limitMonth, limits, usage };
    }
  }

  if (usage.monthly.count >= limitMonth) {
    return { allowed: false, reason: 'monthly', limitMonth, limits, usage };
  }

  return { allowed: true, limitMonth, limits, usage };
}

export function getRemainingMonthly(profile, family = null, date = new Date()) {
  if (isUnlimitedAiUser(profile)) return null;
  const limitMonth = resolveEffectiveAiLimitMonth(profile, family);
  const usage = normalizeAiUsage(profile?.aiUsage, date);
  return Math.max(0, limitMonth - usage.monthly.count);
}

/** @deprecated используйте getRemainingMonthly */
export function getRemainingDaily(profile, family = null, date = new Date()) {
  return getRemainingMonthly(profile, family, date);
}

export function buildNextAiUsage(currentUsage, date = new Date()) {
  const keys = getPeriodKeys(date);
  const current = normalizeAiUsage(currentUsage, date);

  return {
    daily: { periodKey: keys.daily, count: current.daily.count + 1 },
    weekly: { periodKey: keys.weekly, count: current.weekly.count + 1 },
    monthly: { periodKey: keys.monthly, count: current.monthly.count + 1 },
    total: current.total + 1,
  };
}

/** Сбрасывает только дневной счётчик; недельный, месячный и total не трогаем. */
export function buildResetDailyAiUsage(currentUsage, date = new Date()) {
  const keys = getPeriodKeys(date);
  const current = normalizeAiUsage(currentUsage, date);

  return {
    daily: { periodKey: keys.daily, count: 0 },
    weekly: current.weekly,
    monthly: current.monthly,
    total: current.total,
  };
}

/** Раскладывает месячный лимит на день / неделю / месяц (legacy). */
export function deriveAiLimitsFromMonthly(monthly) {
  const monthlyValue = Math.max(0, Number(monthly || 0));
  return {
    daily: Math.min(DEFAULT_AI_LIMITS.daily, Math.max(1, Math.floor(monthlyValue / 10))),
    weekly: Math.min(DEFAULT_AI_LIMITS.weekly, Math.max(5, Math.floor(monthlyValue / 3))),
    monthly: monthlyValue,
  };
}
