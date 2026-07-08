import { useAuth } from '../hooks/useAuth';
import PageHeader from '../components/layout/PageHeader';
import NotificationsList from '../components/profile/NotificationsList';

export default function NotificationsPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-full flex-col px-4 pb-10 pt-0">
      <PageHeader title="Уведомления" backTo="/settings" />
      <div className="pt-4">
        <NotificationsList userId={user?.uid} />
      </div>
    </div>
  );
}
