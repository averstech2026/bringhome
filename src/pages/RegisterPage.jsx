import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getInvite, registerFamilyAdminViaInvite } from '../services/invitesService';
import { formatFamilyLimitsSummary } from '../services/familiesService';
import { getAuthErrorMessage } from '../utils/authErrors';
import AiBadge from '../components/layout/AiBadge';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('invite') || '';
  const { signInEmail, user } = useAuth();
  const navigate = useNavigate();

  const [invite, setInvite] = useState(null);
  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!token) {
      setInviteError('Ссылка более недействительна');
      setInviteLoading(false);
      return;
    }

    let active = true;
    setInviteLoading(true);
    getInvite(token)
      .then((data) => {
        if (!active) return;
        if (!data || data.isUsed) {
          setInviteError('Ссылка более недействительна');
          setInvite(null);
        } else {
          setInvite(data);
          setInviteError('');
        }
      })
      .catch(() => {
        if (active) setInviteError('Ссылка более недействительна');
      })
      .finally(() => {
        if (active) setInviteLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!invite || loading) return;

    setError('');
    setLoading(true);
    try {
      await registerFamilyAdminViaInvite({
        token,
        email,
        password,
        displayName,
        familyName,
      });
      await signInEmail(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(getAuthErrorMessage(err) || err?.message || 'Не удалось зарегистрироваться');
    } finally {
      setLoading(false);
    }
  };

  if (inviteLoading) {
    return (
      <div className="flex min-h-full items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">КупиДомой</h1>
          <AiBadge />
        </div>
        <p className="mt-1 text-sm text-slate-500">Регистрация главы семьи</p>

        {inviteError ? (
          <div className="mt-6 text-center">
            <p className="text-sm text-red-500">{inviteError}</p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Вернуться ко входу
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {invite?.familyLimits && (
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Лимиты семьи: {formatFamilyLimitsSummary(invite.familyLimits)}
              </div>
            )}

            <input
              type="text"
              placeholder="Ваше имя"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="text"
              placeholder="Название семьи"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-500"
            />
            <input
              type="email"
              placeholder="Email"
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
              {loading ? 'Регистрация…' : 'Создать семью'}
            </button>
          </form>
        )}

        {!inviteError && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Уже есть аккаунт?{' '}
            <Link to="/" className="text-brand-600 hover:text-brand-700">
              Войти
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
