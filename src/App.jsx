import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { isFirebaseConfigured } from './firebase';
import { useAuth } from './hooks/useAuth';
import { useUserProfile } from './hooks/useUserProfile';
import { isAppInitialized } from './services/usersService';
import AuthGate from './components/auth/AuthGate';
import AdminRoute from './components/auth/AdminRoute';
import HomePage from './pages/HomePage';
import ListPage from './pages/ListPage';
import AdminSetupPage from './pages/AdminSetupPage';
import AdminUsersPage from './pages/AdminUsersPage';
import SettingsPage from './pages/SettingsPage';
import AppHeader from './components/layout/AppHeader';
import { APP_BACKGROUND } from './components/list/cardStyles';

function ConfigMissing() {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-xl font-bold text-slate-900">Нужна настройка Firebase</h1>
        <p className="mt-2 text-sm text-slate-600">
          Приложение не может запуститься без ключей Firebase. Скопируйте{' '}
          <code className="rounded bg-slate-100 px-1">.env.example</code> в{' '}
          <code className="rounded bg-slate-100 px-1">.env</code> и заполните значения из
          Firebase Console → Project settings → Your apps.
        </p>
      </div>
    </div>
  );
}

function AccessDenied({ message, onSignOut }) {
  return (
    <div className="flex min-h-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg text-center">
        <h1 className="text-xl font-bold text-slate-900">Нет доступа</h1>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="mt-4 rounded-full bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/list/:listId" element={<ListPage />} />
      <Route
        path="/admin/users"
        element={
          <AdminRoute>
            <AdminUsersPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AppShell() {
  const location = useLocation();
  const hideHeader =
    location.pathname === '/' ||
    location.pathname.startsWith('/list/') ||
    location.pathname.startsWith('/settings') ||
    location.pathname.startsWith('/admin/');

  return (
    <div className={`mx-auto min-h-full max-w-lg ${APP_BACKGROUND}`}>
      {!hideHeader && <AppHeader />}
      <AppRoutes />
    </div>
  );
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { profile, loading: profileLoading, isDisabled } = useUserProfile(user);
  const [initialized, setInitialized] = useState(null);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setInitLoading(false);
      return;
    }

    isAppInitialized()
      .then(setInitialized)
      .finally(() => setInitLoading(false));
  }, [user]);

  if (!isFirebaseConfigured) {
    return <ConfigMissing />;
  }

  if (authLoading || initLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!initialized) {
    return <AdminSetupPage />;
  }

  if (!user) {
    return <AuthGate />;
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!profile) {
    return (
      <AccessDenied
        message="Аккаунт не найден. Обратитесь к администратору."
        onSignOut={signOut}
      />
    );
  }

  if (isDisabled) {
    return (
      <AccessDenied
        message="Ваш аккаунт заблокирован. Обратитесь к администратору."
        onSignOut={signOut}
      />
    );
  }

  return <AppShell />;
}
