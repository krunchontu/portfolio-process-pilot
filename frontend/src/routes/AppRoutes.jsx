import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ProtectedRoute from '../components/ProtectedRoute'

// Lazy load components for better performance
const LoginPage = React.lazy(() => import('../pages/LoginPage'))
const RegisterPage = React.lazy(() => import('../pages/RegisterPage'))
const DashboardPage = React.lazy(() => import('../pages/DashboardPage'))
const RequestsPage = React.lazy(() => import('../pages/RequestsPage'))
const CreateRequestPage = React.lazy(() => import('../pages/CreateRequestPage'))
const RequestDetailPage = React.lazy(() => import('../pages/RequestDetailPage'))
const WorkflowsPage = React.lazy(() => import('../pages/WorkflowsPage'))
const UsersPage = React.lazy(() => import('../pages/UsersPage'))
const AnalyticsPage = React.lazy(() => import('../pages/AnalyticsPage'))
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'))
const NotFoundPage = React.lazy(() => import('../pages/NotFoundPage'))

const AppRoutes = () => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <Suspense fallback={(
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )}
    >
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          }
        />

        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard */}
          <Route path="dashboard" element={<DashboardPage />} />

          {/* Requests */}
          <Route path="requests" element={<RequestsPage />} />
          <Route path="requests/new" element={<CreateRequestPage />} />
          <Route path="requests/:id" element={<RequestDetailPage />} />

          {/* Workflows - Admin/Manager only */}
          <Route
            path="workflows"
            element={(
              <ProtectedRoute requiredRoles={['admin', 'manager']}>
                <WorkflowsPage />
              </ProtectedRoute>
            )}
          />

          {/* Users - Admin only */}
          <Route
            path="users"
            element={(
              <ProtectedRoute requiredRoles={['admin']}>
                <UsersPage />
              </ProtectedRoute>
            )}
          />

          {/* Analytics - Manager/Admin only */}
          <Route
            path="analytics"
            element={(
              <ProtectedRoute requiredRoles={['admin', 'manager']}>
                <AnalyticsPage />
              </ProtectedRoute>
            )}
          />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

export default AppRoutes
