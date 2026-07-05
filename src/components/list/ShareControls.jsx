import { useEffect, useState } from 'react';
import { toggleListPublic, toggleUserListAccess } from '../../services/listsService';
import { getFamilyMembers } from '../../services/usersService';
import { UserAvatar } from '../profile/UserAvatar';
import { CARD_SURFACE, CARD_PAD_V, ZONE_TITLE, HINT_TEXT } from './cardStyles';

function FamilyToggle({ enabled, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 disabled:opacity-40 ${
        enabled ? 'bg-emerald-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function AccessDot() {
  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
      <svg className="h-2 w-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function MemberAvatar({ member, hasAccess, isOwner, onToggle, loading, dimmed = false }) {
  const name = member.displayName || member.email?.split('@')[0] || '?';

  return (
    <button
      type="button"
      disabled={loading || isOwner || dimmed}
      onClick={() => onToggle(member.id, hasAccess)}
      title={
        dimmed
          ? `${name} — доступ для всех`
          : isOwner
            ? `${name} (создатель)`
            : hasAccess
              ? `${name} — убрать доступ`
              : `${name} — дать доступ`
      }
      className={`group flex shrink-0 flex-col items-center gap-1 disabled:cursor-default ${
        isOwner || dimmed ? 'cursor-default' : 'cursor-pointer'
      }`}
    >
      <div
        className={`relative transition-opacity duration-200 ${
          hasAccess || dimmed ? 'opacity-100' : 'opacity-40'
        }`}
      >
        <UserAvatar photoUrl={member.avatarUrl} name={name} className="h-9 w-9 text-xs" />
        {hasAccess && !isOwner && !dimmed && <AccessDot />}
        {isOwner && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 text-[7px] font-bold text-white ring-2 ring-white">
            ★
          </span>
        )}
      </div>
      <span
        className={`max-w-[48px] truncate text-[10px] font-medium ${
          hasAccess || dimmed ? 'text-slate-600' : 'text-slate-300'
        }`}
      >
        {name.split(' ')[0]}
      </span>
    </button>
  );
}

function CopyLinkButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Скопировать ссылку"
      className="group flex shrink-0 flex-col items-center gap-1"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 transition hover:bg-gray-100 disabled:opacity-40">
        <svg
          className="h-4 w-4 text-gray-500 transition group-hover:text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      </div>
      <span className="max-w-[48px] truncate text-[10px] font-medium text-slate-600">Ссылка</span>
    </button>
  );
}

export default function ShareControls({ list, listId, currentUserId, currentUserAvatarUrl }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const isOwner = list.createdBy === currentUserId;
  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/list/${listId}`;
  const allowedUsers = list.allowedUsers || [];
  const isPublic = list.isPublic;

  useEffect(() => {
    if (!isOwner) return;
    getFamilyMembers().then(setMembers).catch(() => setMembers([]));
  }, [isOwner, currentUserAvatarUrl]);

  if (!isOwner) return null;

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      await toggleListPublic(listId, !isPublic);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMember = async (userId, hasAccess) => {
    if (userId === list.createdBy || isPublic) return;

    setLoading(true);
    setMessage('');
    try {
      await toggleUserListAccess(listId, userId, hasAccess);
    } catch {
      setMessage('Не удалось изменить доступ');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setMessage('Ссылка скопирована');
    setTimeout(() => setMessage(''), 2000);
  };

  const toggleHint = isPublic
    ? 'Список видят все члены семьи'
    : 'Выберите участников ниже';

  return (
    <section className="pb-2">
      <h3 className={ZONE_TITLE}>Совместный доступ</h3>

      <div className={`mt-2 ${CARD_SURFACE} ${CARD_PAD_V}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Для всей семьи</p>
            <p className="mt-0.5 text-xs text-gray-400">{toggleHint}</p>
          </div>
          <FamilyToggle enabled={isPublic} onChange={handleTogglePublic} disabled={loading} />
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              className={`flex gap-3 ${isPublic ? 'opacity-45' : ''}`}
            >
              {members.map((member) => {
                const isOwnerMember = member.id === list.createdBy;
                const hasAccess = isPublic || isOwnerMember || allowedUsers.includes(member.id);
                const avatarUrl =
                  member.id === currentUserId && currentUserAvatarUrl
                    ? currentUserAvatarUrl
                    : member.avatarUrl;

                return (
                  <MemberAvatar
                    key={member.id}
                    member={{ ...member, avatarUrl }}
                    hasAccess={hasAccess}
                    isOwner={isOwnerMember}
                    loading={loading}
                    dimmed={isPublic}
                    onToggle={handleToggleMember}
                  />
                );
              })}
            </div>
            <CopyLinkButton onClick={copyLink} disabled={loading} />
          </div>

          <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <span aria-hidden>🔒</span>
            <span>
              Просмотреть список по ссылке смогут только те участники, у которых включен доступ.
            </span>
          </p>
        </div>
      </div>

      {message && (
        <p className={`mt-2 ${HINT_TEXT} text-center text-emerald-600`}>{message}</p>
      )}
    </section>
  );
}
