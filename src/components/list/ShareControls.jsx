import { useEffect, useState } from 'react';
import { Link } from 'lucide-react';
import { getFamilyMembers } from '../../services/usersService';
import { useToast } from '../ui/ToastProvider';
import BorderGapCard from './BorderGapCard';
import { FamilyToggle, MemberAvatar } from './accessControls';

function ShareLinkRow({ onCopy, disabled, highlighted = false }) {
  return (
    <button
      type="button"
      onClick={onCopy}
      disabled={disabled}
      className={`mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 p-3 text-left transition hover:bg-slate-100/80 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
        highlighted ? 'animate-share-highlight border-indigo-200/70' : ''
      }`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <Link className="h-4 w-4 shrink-0 text-slate-500" strokeWidth={2} aria-hidden />
        <span className="text-sm text-slate-700">Поделиться ссылкой на список</span>
      </div>
      <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold text-indigo-600">
        Копировать
      </span>
    </button>
  );
}

export default function ShareControls({
  list,
  listId,
  currentUserId,
  currentUserAvatarUrl,
  shareLinkRef,
  highlightShareLink = false,
  isPublic,
  allowedUsers = [],
  onTogglePublic,
  onToggleMember,
  disabled = false,
}) {
  const [members, setMembers] = useState([]);
  const toast = useToast();

  const isOwner = list.createdBy === currentUserId;
  const shareUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/list/${listId}`;

  useEffect(() => {
    if (!isOwner) return;
    getFamilyMembers().then(setMembers).catch(() => setMembers([]));
  }, [isOwner, currentUserAvatarUrl]);

  if (!isOwner) return null;

  const handleTogglePublic = (nextValue) => {
    if (disabled) return;
    onTogglePublic?.(nextValue);
  };

  const handleToggleMember = (userId, hasAccess) => {
    if (disabled || userId === list.createdBy || isPublic) return;
    onToggleMember?.(userId, hasAccess);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Ссылка скопирована!', { durationMs: 2000 });
  };

  const toggleHint = isPublic
    ? 'Список видят все члены семьи'
    : 'Выберите участников ниже';

  return (
    <section className="pb-2">
      <BorderGapCard legend="Совместный доступ">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Для всей семьи</p>
            <p className="mt-0.5 text-xs text-gray-400">{toggleHint}</p>
          </div>
          <FamilyToggle enabled={isPublic} onChange={handleTogglePublic} disabled={disabled} />
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                  loading={disabled}
                  locked={isPublic}
                  onToggle={handleToggleMember}
                />
              );
            })}
          </div>

          <div ref={shareLinkRef}>
            <ShareLinkRow
              onCopy={copyLink}
              disabled={disabled}
              highlighted={highlightShareLink}
            />
          </div>

          <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <span aria-hidden>🔒</span>
            <span>
              Просмотреть список по ссылке смогут только те участники, у которых включен доступ.
            </span>
          </p>
        </div>
      </BorderGapCard>

    </section>
  );
}
