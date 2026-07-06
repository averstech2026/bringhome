function LockIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function hasSharedAccess(list) {
  return Boolean(list.isPublic);
}

export default function ListAccessIcon({ list, className }) {
  const shared = hasSharedAccess(list);
  const title = shared ? 'Общий доступ' : 'Личный список';

  return (
    <span title={title} aria-label={title} className="inline-flex shrink-0">
      {shared ? (
        <UsersIcon className={className || 'h-3.5 w-3.5 text-amber-500'} />
      ) : (
        <LockIcon className={className || 'h-3.5 w-3.5 text-gray-400'} />
      )}
    </span>
  );
}
