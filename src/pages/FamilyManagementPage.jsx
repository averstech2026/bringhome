import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  createUserAsAdmin,
  getFamilyMembers,
  isOwnerEmail,
  setUserDisabled,
} from '../services/usersService';
import {
  getFamily,
  resolveFamilyAiLimitMonth,
  updateFamilyMemberByAdmin,
} from '../services/familiesService';
import { ROLES } from '../utils/roles';
import PageHeader from '../components/layout/PageHeader';
import { PAGE_SECTION_TITLE } from '../components/list/cardStyles';
import { AddMemberButton } from '../components/admin/AddMemberButton';
import { FamilySummaryCard } from '../components/admin/FamilySummaryCard';
import { AdminUserCard } from '../components/admin/AdminUserCard';
import AddMemberModal from '../components/admin/AddMemberModal';
import FamilyMemberFormModal from '../components/admin/FamilyMemberFormModal';

export default function FamilyManagementPage() {
  const { user } = useAuth();
  const { profile, platformAdminUid, loading: profileLoading } = useUserProfile(user);
  const scopedFamilyId = profile?.familyId || profile?.groupId || null;
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [modal, setModal] = useState(null);

  const load = async () => {
    if (!scopedFamilyId) {
      setFamily(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const [familyData, membersData] = await Promise.all([
        getFamily(scopedFamilyId),
        getFamilyMembers(scopedFamilyId, { includeDisabled: true, includeLegacy: false }),
      ]);
      setFamily(familyData);
      setMembers(membersData.filter((member) => member.familyId === scopedFamilyId));
    } catch (err) {
      setLoadError(err?.message || 'Не удалось загрузить данные семьи');
      setFamily(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profileLoading) return;
    load();
  }, [scopedFamilyId, profileLoading]);

  const familyAiLimitMonth = family ? resolveFamilyAiLimitMonth(family) : null;

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const canEditMember = (member) => (
    member.id !== user?.uid
    && member.role !== ROLES.SUPER_ADMIN
    && member.role !== 'admin'
    && !isOwnerEmail(member.email)
  );

  const handleCreateMember = async (formData) => {
    setSaving(true);
    try {
      await createUserAsAdmin({
        ...formData,
        createdBy: user.uid,
        familyId: scopedFamilyId,
        role: ROLES.MEMBER,
      });
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateMember = async (updates) => {
    if (!modal?.user || !scopedFamilyId) return;

    setSaving(true);
    try {
      await updateFamilyMemberByAdmin(
        scopedFamilyId,
        modal.user.id,
        updates,
        { actorId: user.uid },
      );
      setModal(null);
      await load();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisabled = async (userId, currentDisabled) => {
    setBusyUserId(userId);
    try {
      await setUserDisabled(userId, !currentDisabled);
      await load();
    } catch (err) {
      setLoadError(err?.message || 'Не удалось изменить статус участника');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title="Управление семьёй" backTo="/settings" />

      <div className="pt-4">
        <p className="text-sm text-slate-500">Создание и управление аккаунтами</p>

        {loadError && <p className="mt-3 text-sm text-red-500">{loadError}</p>}
        {!scopedFamilyId && !profileLoading && (
          <p className="mt-3 text-sm text-slate-500">
            Семья не привязана к аккаунту. Обратитесь к поддержке.
          </p>
        )}

        {family && (
          <div className="mt-6">
            <FamilySummaryCard family={family} membersCount={members.length} />
          </div>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className={PAGE_SECTION_TITLE}>Участники</h2>
            <AddMemberButton onClick={() => setModal({ mode: 'create' })} />
          </div>

          {loading || profileLoading ? (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {members.map((member) => (
                <AdminUserCard
                  key={member.id}
                  user={member}
                  family={family}
                  platformAdminUid={platformAdminUid}
                  busy={busyUserId === member.id}
                  onEditUser={canEditMember(member) ? (selected) => setModal({ mode: 'edit', user: selected }) : undefined}
                  onToggleDisabled={handleToggleDisabled}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <AddMemberModal
        open={modal?.mode === 'create'}
        saving={saving}
        onSubmit={handleCreateMember}
        onClose={closeModal}
      />

      <FamilyMemberFormModal
        open={modal?.mode === 'edit'}
        member={modal?.user || null}
        familyAiLimitMonth={familyAiLimitMonth}
        saving={saving}
        onSubmit={handleUpdateMember}
        onClose={closeModal}
      />
    </div>
  );
}
