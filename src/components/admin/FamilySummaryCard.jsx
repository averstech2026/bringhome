import { resolveFamilyAiLimitMonth } from '../../services/familiesService';
import { CARD_SURFACE } from '../list/cardStyles';

export function FamilySummaryCard({ family, membersCount }) {
  if (!family) return null;

  const limits = family.limits || {};
  const familyAiLimitMonth = resolveFamilyAiLimitMonth(family);

  return (
    <div className={`${CARD_SURFACE} p-4`}>
      <h2 className="text-lg font-bold text-slate-900">{family.name}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-800">
            {membersCount}/{limits.maxUsers ?? '—'}
          </p>
          <p className="text-slate-400">Участники</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-800">{limits.maxLists ?? '—'}</p>
          <p className="text-slate-400">Макс. списков</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-800">{familyAiLimitMonth ?? '—'}</p>
          <p className="text-slate-400">ИИ (мес.)</p>
        </div>
      </div>
    </div>
  );
}
