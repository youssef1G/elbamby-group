import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext.jsx';

export default function AdminRoute({ children }) {
  const { admin, isLoading, isAuthenticated, sessionExpired } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-surface">
        <div className="animate-spin w-8 h-8 rounded-full border-2 border-bg-border border-t-bg-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={sessionExpired ? { reason: 'session-expired' } : undefined}
      />
    );
  }

  return children;
}