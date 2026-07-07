import { isOwnerEmail } from '../../services/usersService';
import {
  DEFAULT_AI_LIMITS,
  isUnlimitedAiUser,
  normalizeAiUsage,
  resolveAiLimits,
} from '../../utils/aiLimits';

const PERIODS = [
  { key: 'daily', label: 'Сегодня', reference: DEFAULT_AI_LIMITS.daily },
  { key: 'weekly', label: 'Неделя', reference: DEFAULT_AI_LIMITS.weekly },
  { key: 'monthly', label: 'Месяц', reference: DEFAULT_AI_LIMITS.monthly },
];

function hasUnlimitedAi(profile) {
  return isUnlimitedAiUser(profile) || isOwnerEmail(profile?.email);
}

function getBarVisuals(used, limit, unlimited) {
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  if (unlimited) {
    return {
      percent,
      barClass: 'bg-violet-400',
      textClass: 'text-slate-500',
    };
  }

  const exhausted = limit > 0 && used >= limit;
  const warning = !exhausted && limit > 0 && used / limit >= 0.8;

  if (exhausted) {
    return { percent, barClass: 'bg-red-400', textClass: 'font-medium text-red-500' };
  }
  if (warning) {
    return { percent, barClass: 'bg-orange-400', textClass: 'font-medium text-orange-600' };
  }

  return { percent, barClass: 'bg-emerald-500', textClass: 'text-slate-500' };
}

function UsageBar({ label, used, limit, unlimited, referenceLimit }) {
  const visualLimit = unlimited ? referenceLimit : limit;
  const { percent, barClass, textClass } = getBarVisuals(used, visualLimit, unlimited);
  const ratioLabel = unlimited ? `${used} / ∞` : `${used} / ${limit}`;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={`text-xs tabular-nums ${textClass}`}>{ratioLabel}</span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={unlimited ? visualLimit : limit}
        aria-label={`${label}: ${ratioLabel}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${barClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export function AiUsageSummary({ profile, compact = false }) {
  const unlimited = hasUnlimitedAi(profile);
  const limits = profile?.resolvedLimits ?? resolveAiLimits(profile);
  const usage = profile?.resolvedUsage ?? normalizeAiUsage(profile?.aiUsage);

  if (!usage) return null;

  if (compact) {
    const dailyUsed = usage.daily.count;
    const dailyLimit = limits.daily;
    const label = unlimited ? `${dailyUsed}/∞` : `${dailyUsed}/${dailyLimit}`;
    return <p className="text-[10px] text-slate-400">ИИ сегодня: {label}</p>;
  }

  return (
    <div className="mt-3 space-y-3">
      {PERIODS.map(({ key, label, reference }) => (
        <UsageBar
          key={key}
          label={label}
          used={usage[key].count}
          limit={limits[key]}
          unlimited={unlimited}
          referenceLimit={reference}
        />
      ))}

      <div className="flex justify-end pt-0.5">
        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-400">
          Всего запросов: {usage.total}
        </span>
      </div>
    </div>
  );
}
