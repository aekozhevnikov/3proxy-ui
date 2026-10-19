import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/login/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { UsersPage } from './pages/users/UsersPage';
import { ConfigPage } from './pages/admin/ConfigPage';
import { LogsPage } from './pages/admin/LogsPage';
import { ProfilePage } from './pages/profile/ProfilePage';
import { NotFound } from './NotFound';
import { useAuth } from './hooks/useAuth';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route path="/admin/dashboard" element={<DashboardPage />} />
        <Route path="/admin/users" element={<UsersPage />} />
        <Route path="/admin/config" element={<ConfigPage />} />
        <Route path="/admin/logs" element={<LogsPage />} />
        <Route path="/admin/profile" element={<ProfilePage />} />
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
