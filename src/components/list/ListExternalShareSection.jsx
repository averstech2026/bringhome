import { useState } from 'react';
import { Link2, Share2, Users, X } from 'lucide-react';
import { useToast } from '../ui/ToastProvider';
import { getExternalFamiliesList, getFamilyInitials } from '../../utils/listShare';
import { ensureListShareInvite, revokeExternalFamilyAccess } from '../../services/listShareService';

const FAMILY_AVATAR_CLASS = 'h-7 w-7 rounded-full border-2 border-white object-cover';

function FamilyAvatarBadge({ family, className = FAMILY_AVATAR_CLASS }) {
  const name = family?.familyName || family?.name || 'Семья';
  const initials = getFamilyInitials(name);
  const roundClass = className.includes('rounded-full') ? className : `${className} rounded-full`;

  if (family?.avatarUrl) {
    return (
      <img
        src={family.avatarUrl}
        alt={name}
        className={roundClass}
        title={name}
      />
    );
  }

  return (
    <span
      className={`flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 font-bold text-white ${roundClass}`}
      title={name}
    >
      {initials}
    </span>
  );
}

async function shareOrCopyUrl(url, toast) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Совместный список покупок',
        text: 'Присоединяйтесь к нашему списку в КупиДомой',
        url,
      });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  await navigator.clipboard.writeText(url);
  toast.success('Ссылка скопирована!', { durationMs: 2500 });
}

export default function ListExternalShareSection({
  listId,
  list,
  currentUserId,
  ownerFamilyName,
  ownerFamilyAvatarUrl,
  disabled = false,
  onAccessChanged,
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [revokingId, setRevokingId] = useState(null);

  const isOwner = list?.createdBy === currentUserId;
  const externalFamilies = getExternalFamiliesList(list);
  const hasExternalAccess = externalFamilies.length > 0 || Boolean(list?.shareInviteToken);

  if (!isOwner || !listId) return null;

  const shareMeta = {
    ownerFamilyName: list?.ownerFamilyName || ownerFamilyName,
    ownerFamilyAvatarUrl: list?.ownerFamilyAvatarUrl || ownerFamilyAvatarUrl || null,
  };

  const handleShare = async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const { url } = await ensureListShareInvite(listId, currentUserId, shareMeta);
      await shareOrCopyUrl(url, toast);
      onAccessChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Не удалось создать ссылку');
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (disabled || busy) return;
    setBusy(true);
    try {
      const { url } = await ensureListShareInvite(listId, currentUserId, shareMeta);
      await navigator.clipboard.writeText(url);
      toast.success('Ссылка скопирована!', { durationMs: 2500 });
    } catch (err) {
      toast.error(err?.message || 'Не удалось получить ссылку');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async (familyId, familyName) => {
    if (disabled || revokingId) return;
    setRevokingId(familyId);
    try {
      await revokeExternalFamilyAccess(listId, familyId);
      toast.success(`Доступ закрыт: ${familyName}`);
      onAccessChanged?.();
    } catch (err) {
      toast.error(err?.message || 'Не удалось отозвать доступ');
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="mt-5">
      <p className="text-sm font-medium text-slate-700">Совместно с другой семьёй</p>
      <p className="mt-1 text-xs text-slate-400">
        Подключите родственников или друзей — они увидят список у себя и смогут бронировать позиции
      </p>

      <button
        type="button"
        disabled={disabled || busy}
        onClick={handleShare}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/60 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {navigator.share ? (
          <Share2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        ) : (
          <Link2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        )}
        + Поделиться с другой семьёй
      </button>

      {hasExternalAccess && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={handleCopyLink}
          className="mt-2 w-full text-center text-xs font-medium text-indigo-600 transition hover:text-indigo-700 disabled:opacity-50"
        >
          Скопировать ссылку-приглашение
        </button>
      )}

      {externalFamilies.length > 0 && (
        <div className="mt-4 space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Users className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Доступ открыт
          </p>
          <ul className="space-y-2">
            {externalFamilies.map((family) => (
              <li
                key={family.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-2 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FamilyAvatarBadge family={family} className="h-6 w-6 text-[10px]" />
                  <span className="truncate text-sm text-slate-700">{family.familyName}</span>
                </div>
                <button
                  type="button"
                  disabled={disabled || revokingId === family.id}
                  onClick={() => handleRevoke(family.id, family.familyName)}
                  className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  title="Отозвать доступ"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  Отозвать
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export { FamilyAvatarBadge };
