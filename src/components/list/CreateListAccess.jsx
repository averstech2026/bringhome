import BorderGapCard from './BorderGapCard';
import { FamilyToggle, MemberAvatar } from './accessControls';

/**
 * Блок выбора доступа на экране создания списка.
 * Отличается от ShareControls тем, что списка ещё нет: нет кнопки «Поделиться
 * ссылкой» (для неё нужен уже созданный listId) — она появится на готовом списке.
 */
export default function CreateListAccess({
  members = [],
  authorId,
  currentUserAvatarUrl,
  isPublic,
  selectedIds = [],
  onTogglePublic,
  onToggleMember,
  disabled = false,
}) {
  const toggleHint = isPublic
    ? 'Список увидят все члены семьи'
    : 'Выберите, кому открыть доступ';

  return (
    <section className="pb-1">
      <BorderGapCard legend="Доступ к списку" compactTop>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800">Для всей семьи</p>
            <p className="mt-0.5 text-xs text-gray-400">{toggleHint}</p>
          </div>
          <FamilyToggle enabled={isPublic} onChange={onTogglePublic} disabled={disabled} />
        </div>

        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex gap-3 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {members.map((member) => {
              const isOwnerMember = member.id === authorId;
              const hasAccess = isPublic || isOwnerMember || selectedIds.includes(member.id);
              const avatarUrl =
                member.id === authorId && currentUserAvatarUrl
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
                  onToggle={onToggleMember}
                />
              );
            })}
          </div>

          <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <span aria-hidden>🔔</span>
            <span>Участники с доступом получат пуш о новом списке.</span>
          </p>
        </div>
      </BorderGapCard>
    </section>
  );
}
