export const DEFAULT_AI_LIMITS = { daily: 5, weekly: 20, monthly: 50 };

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

export function resolveAiLimits(profile) {
  return {
    daily: Number(profile?.aiLimits?.daily ?? DEFAULT_AI_LIMITS.daily),
    weekly: Number(profile?.aiLimits?.weekly ?? DEFAULT_AI_LIMITS.weekly),
    monthly: Number(profile?.aiLimits?.monthly ?? DEFAULT_AI_LIMITS.monthly),
  };
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
  return profile?.role === 'admin' && profile?.disabled !== true;
}

export function checkAiUsageAllowed(profile, date = new Date()) {
  if (isUnlimitedAiUser(profile)) {
    return { allowed: true, unlimited: true, limits: null, usage: null };
  }

  const limits = resolveAiLimits(profile);
  const usage = normalizeAiUsage(profile?.aiUsage, date);

  if (usage.daily.count >= limits.daily) {
    return { allowed: false, reason: 'daily', limits, usage };
  }
  if (usage.weekly.count >= limits.weekly) {
    return { allowed: false, reason: 'weekly', limits, usage };
  }
  if (usage.monthly.count >= limits.monthly) {
    return { allowed: false, reason: 'monthly', limits, usage };
  }

  return { allowed: true, limits, usage };
}

export function getRemainingDaily(profile, date = new Date()) {
  if (isUnlimitedAiUser(profile)) return null;
  const limits = resolveAiLimits(profile);
  const usage = normalizeAiUsage(profile?.aiUsage, date);
  return Math.max(0, limits.daily - usage.daily.count);
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
