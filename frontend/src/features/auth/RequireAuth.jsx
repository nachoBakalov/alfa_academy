import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import LoadingScreen from '../../components/ui/LoadingScreen';

export default function RequireAuth({ allowedRoles, children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  if (children) {
    return children;
  }

  return <Outlet />;
}
