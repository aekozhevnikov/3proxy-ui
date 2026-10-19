import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './app/layout.tsx';
import LoginPage from './app/login/page.tsx';
import DashboardPage from './app/admin/dashboard/page.tsx';
import UsersPage from './app/admin/users/page.tsx';
import ProfilePage from './app/admin/profile/page.tsx';
import { NotFound } from './NotFound';
import { useAuth } from './hooks/useAuth';
import { Providers } from './app/providers';

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
    <Providers themeProps={{ defaultTheme: "dark" }}>
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
          <Route path="/admin/profile" element={<ProfilePage />} />
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Providers>
  );
}
