import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../hooks/useUserProfile';
import {
  createUserAsAdmin,
  getFamilyMembers,
  isOwnerEmail,
  setUserDisabled,
  updateUserAsAdmin,
} from '../services/usersService';
import { getFamily } from '../services/familiesService';
import { resetTodayAiUsage } from '../services/aiUsageService';
import { ROLES } from '../utils/roles';
import UserFormModal from '../components/admin/UserFormModal';
import { AdminUserCard } from '../components/admin/AdminUserCard';
import { AddMemberButton } from '../components/admin/AddMemberButton';
import { FamilySummaryCard } from '../components/admin/FamilySummaryCard';
import PageHeader from '../components/layout/PageHeader';
import { PAGE_SECTION_TITLE } from '../components/list/cardStyles';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { profile, platformAdminUid, loading: profileLoading } = useUserProfile(user);
  const scopedFamilyId = profile?.familyId || profile?.groupId || null;
  const [family, setFamily] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [resettingToday, setResettingToday] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = useCallback(() => {
    if (!scopedFamilyId) {
      setFamily(null);
      setUsers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([
      getFamily(scopedFamilyId),
      getFamilyMembers(scopedFamilyId, {
        includeDisabled: true,
        sortBy: 'createdAt',
        includeLegacy: false,
      }),
    ])
      .then(([familyData, members]) => {
        setFamily(familyData);
        setUsers(members.filter((member) => member.familyId === scopedFamilyId));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopedFamilyId]);

  useEffect(() => {
    if (profileLoading) return;
    loadUsers();
  }, [loadUsers, profileLoading]);

  const closeModal = () => {
    if (!saving && !resettingToday) setModal(null);
  };

  const canResetTodayLimit =
    modal?.mode === 'edit' &&
    modal?.user?.id !== user?.uid &&
    modal?.user?.role !== ROLES.SUPER_ADMIN &&
    modal?.user?.role !== 'admin' &&
    !isOwnerEmail(modal?.user?.email);

  const handleResetTodayLimit = async () => {
    if (!modal?.user || resettingToday || saving) return;

    setError('');
    setResettingToday(true);

    try {
      const newUsage = await resetTodayAiUsage(modal.user.id);
      const updatedUser = { ...modal.user, aiUsage: newUsage };

      setModal((current) =>
        current?.user?.id === updatedUser.id ? { ...current, user: updatedUser } : current,
      );
      setUsers((prev) =>
        prev.map((item) => (item.id === updatedUser.id ? { ...item, aiUsage: newUsage } : item)),
      );
      setSuccess(`Дневной лимит ИИ для ${updatedUser.displayName || 'пользователя'} сброшен.`);
    } catch (err) {
      setError(err?.message || 'Не удалось сбросить дневной лимит ИИ');
    } finally {
      setResettingToday(false);
    }
  };

  const handleCreateUser = async (formData) => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await createUserAsAdmin({
        email: formData.email,
        password: formData.password,
        displayName: formData.displayName,
        createdBy: user.uid,
        familyId: scopedFamilyId,
        role: formData.role,
        aiLimits: formData.aiLimits,
        isChild: formData.isChild,
        uiTheme: formData.uiTheme,
      });
      setModal(null);
      setSuccess(`Пользователь ${formData.email} создан. Передайте ему email и пароль.`);
      loadUsers();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateUser = async (formData) => {
    if (!modal?.user) return;

    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await updateUserAsAdmin(
        modal.user.id,
        {
          displayName: formData.displayName,
          role: formData.role,
          isChild: formData.isChild,
          uiTheme: formData.uiTheme,
          aiLimits: formData.aiLimits,
        },
        { currentUserId: user.uid },
      );
      setModal(null);
      setSuccess(`Настройки ${formData.displayName} сохранены.`);
      loadUsers();
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDisabled = async (userId, currentDisabled) => {
    setError('');
    setBusyUserId(userId);
    try {
      await setUserDisabled(userId, !currentDisabled);
      loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4 pb-8 pt-0">
      <PageHeader title="Управление семьёй" backTo="/settings" />

      <div className="pt-4">
        <p className="text-sm text-slate-500">Создание и управление аккаунтами</p>

        {family && (
          <div className="mt-6">
            <FamilySummaryCard family={family} membersCount={users.length} />
          </div>
        )}

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className={PAGE_SECTION_TITLE}>Участники</h2>
            <AddMemberButton
              onClick={() => {
                setSuccess('');
                setModal({ mode: 'create' });
              }}
            />
          </div>

          {success && <p className="mt-3 text-sm text-brand-700">{success}</p>}

          {loading || profileLoading ? (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {users.map((member) => (
                <AdminUserCard
                  key={member.id}
                  user={member}
                  family={family}
                  platformAdminUid={platformAdminUid}
                  busy={busyUserId === member.id}
                  onEditUser={(selectedUser) => setModal({ mode: 'edit', user: selectedUser })}
                  onToggleDisabled={handleToggleDisabled}
                />
              ))}
            </ul>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
      </div>

      <UserFormModal
        open={Boolean(modal)}
        mode={modal?.mode || 'create'}
        user={modal?.user || null}
        family={family}
        currentUserId={user.uid}
        saving={saving}
        canResetTodayLimit={canResetTodayLimit}
        resettingToday={resettingToday}
        onResetTodayLimit={handleResetTodayLimit}
        onSubmit={modal?.mode === 'edit' ? handleUpdateUser : handleCreateUser}
        onClose={closeModal}
      />
    </div>
  );
}
