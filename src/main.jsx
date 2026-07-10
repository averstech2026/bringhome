import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { registerSW } from 'virtual:pwa-register';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/ui/ToastProvider';
import App from './App.jsx';
import './index.css';

// Регистрируем PWA service worker (offline-кэш + фоновые push) и включаем
// автообновление. immediate: true — регистрируем сразу при загрузке страницы.
registerSW({ immediate: true });

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready
    .then(() => import('./services/scheduledNotifications'))
    .then(({ syncStoredRemindersWithServiceWorker, pruneExpiredStoredReminders }) => {
      pruneExpiredStoredReminders();
      syncStoredRemindersWithServiceWorker().catch(() => {});
    })
    .catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
