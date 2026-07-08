import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  createUserAsAdmin,
  getAllUsers,
  isOwnerEmail,
  setUserDisabled,
  updateUserAsAdmin,
} from '../services/usersService';
import { resetTodayAiUsage } from '../services/aiUsageService';
import UserFormModal from '../components/admin/UserFormModal';
import { AdminUserCard } from '../components/admin/AdminUserCard';
import PageHeader from '../components/layout/PageHeader';
import { PAGE_SECTION_TITLE } from '../components/list/cardStyles';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);
  const [resettingToday, setResettingToday] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadUsers = () => {
    setLoading(true);
    getAllUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const closeModal = () => {
    if (!saving && !resettingToday) setModal(null);
  };

  const canResetTodayLimit =
    modal?.mode === 'edit' &&
    modal?.user?.id !== user?.uid &&
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
      <PageHeader title="Пользователи" backTo="/settings" />

      <div className="pt-4">
        <p className="text-sm text-slate-500">Создание и управление аккаунтами</p>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className={PAGE_SECTION_TITLE}>Все пользователи</h2>
            <button
              type="button"
              onClick={() => {
                setSuccess('');
                setModal({ mode: 'create' });
              }}
              className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-4 text-sm font-medium text-slate-700 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" aria-hidden />
              Пользователь
            </button>
          </div>

          {success && <p className="mt-3 text-sm text-brand-700">{success}</p>}

          {loading ? (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {users.map((u) => (
                <AdminUserCard
                  key={u.id}
                  user={u}
                  busy={busyUserId === u.id}
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
