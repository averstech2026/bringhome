import { isOwnerEmail } from '../../services/usersService';
import { UserAvatar } from '../profile/UserAvatar';
import { AiUsageSummary } from './AiUsageSummary';

export function AiStatsUserCard({ user }) {
  return (
    <li className="rounded-2xl border border-slate-100 bg-white px-3 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <UserAvatar
          photoUrl={user.avatarUrl}
          name={user.displayName || user.email}
          variant="soft"
          className="h-10 w-10 shrink-0 text-sm"
        />

        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-800">
            {user.displayName}
            {isOwnerEmail(user.email) ? (
              <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                Владелец
              </span>
            ) : (
              user.role === 'admin' && (
                <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                  Админ
                </span>
              )
            )}
            {user.disabled && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                Заблокирован
              </span>
            )}
          </p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
          <AiUsageSummary profile={user} />
        </div>
      </div>
    </li>
  );
}
