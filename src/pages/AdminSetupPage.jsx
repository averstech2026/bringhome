import { useState } from 'react';
import { createBootstrapAdmin } from '../services/usersService';
import { getAuthErrorMessage } from '../utils/authErrors';

export default function AdminSetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createBootstrapAdmin({
        email,
        password,
        displayName: name,
      });
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-slate-900">Первый запуск</h1>
        <p className="mt-1 text-sm text-slate-500">
          Создайте администраторский аккаунт для управления пользователями
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="text"
            placeholder="Ваше имя"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="email"
            placeholder="Email администратора"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />
          <input
            type="password"
            placeholder="Пароль (мин. 6 символов)"
            required
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Создание…' : 'Создать админ-аккаунт'}
          </button>
        </form>
      </div>
    </div>
  );
}
