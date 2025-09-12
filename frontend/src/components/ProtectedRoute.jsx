import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from './Layout'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, isLoading, user, hasAnyRole } = useAuth()
  const location = useLocation()

  // Show loading while checking authentication
  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading..." />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="mb-4">
              <div className="mx-auto w-16 h-16 bg-error-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-error-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-secondary-900 mb-2">Access Denied</h1>
            <p className="text-secondary-600 mb-6">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-secondary-500">
              Required role(s): {requiredRoles.join(', ')}
            </p>
            <p className="text-sm text-secondary-500">
              Your role: {user?.role}
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  // Render children within layout or outlet for nested routes
  return (
    <Layout>
      {children || <Outlet />}
    </Layout>
  )
}

export default ProtectedRoute
