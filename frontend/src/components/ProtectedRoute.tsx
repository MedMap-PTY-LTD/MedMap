// components/ProtectedRoute.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';
import { ROLES, ROUTES } from '@/App';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute = ({ 
  allowedRoles = [], 
  redirectTo 
}: ProtectedRouteProps) => {
  const { user, profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  }

  const userRole = profile?.role;

  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    const roleRedirects: Record<string, string> = {
      [ROLES.ADMIN]: ROUTES.ADMIN,
      [ROLES.DOCTOR]: ROUTES.DOCTOR,
      [ROLES.PATIENT]: ROUTES.PATIENT,
      [ROLES.AMBASSADOR]: ROUTES.AMBASSADOR,
    };
    
    return <Navigate to={redirectTo || roleRedirects[userRole] || ROUTES.HOME} replace />;
  }

  return <Outlet />;
};