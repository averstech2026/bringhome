import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  createUserAsAdmin,
  getAllUsers,
  isOwnerEmail,
  setUserDisabled,
  setUserRole,
} from '../services/usersService';
import { UserAvatar } from '../components/profile/UserAvatar';
import PageHeader from '../components/layout/PageHeader';

function formatDate(timestamp) {
  if (!timestamp?.toDate) return '—';
  return timestamp.toDate().toLocaleDateString('ru-RU');
}

function UserActions({ user: u, currentUserId, onToggleDisabled, onToggleRole, busy }) {
  const isSelf = u.id === currentUserId;
  const isOwner = isOwnerEmail(u.email);

  if (isOwner) return null;

  const btnBase =
    'rounded-lg border text-xs font-medium px-2.5 py-1 transition-all duration-200 disabled:opacity-40';
  const btnNeutral =
    'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300';
  const btnDestructive =
    'border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200';

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-1.5">
      {!isSelf && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleRole(u.id, u.role)}
          className={`${btnBase} ${btnNeutral}`}
        >
          {u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}
        </button>
      )}
      {u.role !== 'admin' && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleDisabled(u.id, u.disabled)}
          className={`${btnBase} ${u.disabled ? btnNeutral : btnDestructive}`}
        >
          {u.disabled ? 'Разблокировать' : 'Заблокировать'}
        </button>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busyUserId, setBusyUserId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setCreating(true);
    try {
      await createUserAsAdmin({
        email,
        password,
        displayName,
        createdBy: user.uid,
      });
      setEmail('');
      setPassword('');
      setDisplayName('');
      setSuccess(`Пользователь ${email} создан. Передайте ему email и пароль.`);
      loadUsers();
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'Этот email уже занят'
          : err.message,
      );
    } finally {
      setCreating(false);
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

  const handleToggleRole = async (userId, currentRole) => {
    setError('');
    setBusyUserId(userId);
    try {
      const nextRole = currentRole === 'admin' ? 'user' : 'admin';
      await setUserRole(userId, nextRole);
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

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Новый пользователь</h2>
          <form onSubmit={handleCreate} className="mt-3 space-y-2">
            <input
              type="text"
              placeholder="Имя"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="text"
              placeholder="Пароль"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
            >
              {creating ? 'Создание…' : 'Создать пользователя'}
            </button>
          </form>
          {success && <p className="mt-2 text-sm text-brand-700">{success}</p>}
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-semibold text-slate-900">Все пользователи</h2>

          {loading ? (
            <div className="mt-4 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3"
                >
                  <UserAvatar
                    photoUrl={u.avatarUrl}
                    name={u.displayName || u.email}
                    className="h-10 w-10 shrink-0 text-sm"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800">
                      {u.displayName}
                      {isOwnerEmail(u.email) ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Владелец
                        </span>
                      ) : (
                        u.role === 'admin' && (
                          <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                            Админ
                          </span>
                        )
                      )}
                      {u.disabled && (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          Заблокирован
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-slate-400">{u.email}</p>
                    <p className="text-[10px] text-slate-300">с {formatDate(u.createdAt)}</p>
                  </div>

                  <UserActions
                    user={u}
                    currentUserId={user.uid}
                    busy={busyUserId === u.id}
                    onToggleDisabled={handleToggleDisabled}
                    onToggleRole={handleToggleRole}
                  />
                </li>
              ))}
            </ul>
          )}

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </section>
      </div>
    </div>
  );
}
