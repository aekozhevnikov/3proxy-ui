import { createBrowserRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { CreateUserPage } from './pages/CreateUserPage'
import { EditUserPage } from './pages/EditUserPage'
import { ProfilePage } from './pages/ProfilePage'
import { ConfigPage } from './pages/ConfigPage'
import { LogsPage } from './pages/LogsPage'
import { TrafficPage } from './pages/TrafficPage'
import { SystemStatusPage } from './pages/SystemStatusPage'
import { useAuth } from './hooks/useAuth'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <LoginPage />,
      },
      {
        path: 'admin',
        children: [
          {
            path: 'dashboard',
            element: <RequireAuth><DashboardPage /></RequireAuth>,
          },
          {
            path: 'users',
            element: <RequireAuth><UsersPage /></RequireAuth>,
          },
          {
            path: 'users/create',
            element: <RequireAuth><CreateUserPage /></RequireAuth>,
          },
          {
            path: 'users/:id/edit',
            element: <RequireAuth><EditUserPage /></RequireAuth>,
          },
          {
            path: 'profile',
            element: <RequireAuth><ProfilePage /></RequireAuth>,
          },
          {
            path: 'config',
            element: <RequireAuth><ConfigPage /></RequireAuth>,
          },
          {
            path: 'logs',
            element: <RequireAuth><LogsPage /></RequireAuth>,
          },
          {
            path: 'traffic',
            element: <RequireAuth><TrafficPage /></RequireAuth>,
          },
          {
            path: 'system',
            element: <RequireAuth><SystemStatusPage /></RequireAuth>,
          },
        ],
      },
    ],
  },
])

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!session.isAuthorized) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}