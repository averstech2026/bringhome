import { Navigate } from 'react-router-dom';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useAuth } from '../../hooks/useAuth';

export default function FamilyAdminRoute({ children }) {
  const { user } = useAuth();
  const { isFamilyAdmin, isSuperAdmin, loading } = useUserProfile(user);

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!isFamilyAdmin && !isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
