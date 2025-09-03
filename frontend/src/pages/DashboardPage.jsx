import React from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { requestsAPI, analyticsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDistanceToNow, format } from 'date-fns'

const DashboardPage = () => {
  const { user, isManagerOrAdmin } = useAuth()

  // Fetch user's requests
  const { data: myRequestsData, isLoading: isLoadingRequests } = useQuery(
    ['requests', 'my-requests'],
    () => requestsAPI.list({ createdBy: user.id, limit: 5 }),
    {
      select: data => data.data.requests
    }
  )

  // Fetch pending requests for managers/admins
  const { data: pendingRequestsData, isLoading: isLoadingPending } = useQuery(
    ['requests', 'pending'],
    () => requestsAPI.list({
      status: 'pending',
      pendingForRole: user.role,
      limit: 10
    }),
    {
      enabled: isManagerOrAdmin(),
      select: data => data.data.requests
    }
  )

  // Fetch dashboard analytics
  const { data: analyticsData, isLoading: isLoadingAnalytics } = useQuery(
    'dashboard-analytics',
    () => analyticsAPI.getOverview({
      dateFrom: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // Last 30 days
      dateTo: new Date().toISOString()
    }),
    {
      enabled: isManagerOrAdmin(),
      select: data => data.data
    }
  )

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-success-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-error-500" />
      default:
        return <FileText className="w-4 h-4 text-secondary-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending'
      case 'approved':
        return 'status-approved'
      case 'rejected':
        return 'status-rejected'
      default:
        return 'status-cancelled'
    }
  }

  const formatRequestType = (type) => {
    return type.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-secondary-600 mt-2">
          Here's what's happening with your workflows today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/requests/new"
          className="group card hover:shadow-md transition-shadow duration-200"
          data-testid="create-request-card"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
              <Plus className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-secondary-900">Create Request</h3>
              <p className="text-sm text-secondary-600">Start a new approval workflow</p>
            </div>
          </div>
        </Link>

        <Link
          to="/requests"
          className="group card hover:shadow-md transition-shadow duration-200"
          data-testid="view-requests-card"
        >
          <div className="flex items-center">
            <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center group-hover:bg-secondary-200 transition-colors">
              <FileText className="w-6 h-6 text-secondary-600" />
            </div>
            <div className="ml-4">
              <h3 className="font-semibold text-secondary-900">My Requests</h3>
              <p className="text-sm text-secondary-600">View all your submissions</p>
            </div>
          </div>
        </Link>

        {isManagerOrAdmin() && (
          <Link
            to="/analytics"
            className="group card hover:shadow-md transition-shadow duration-200"
            data-testid="analytics-card"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-success-100 rounded-lg flex items-center justify-center group-hover:bg-success-200 transition-colors">
                <TrendingUp className="w-6 h-6 text-success-600" />
              </div>
              <div className="ml-4">
                <h3 className="font-semibold text-secondary-900">Analytics</h3>
                <p className="text-sm text-secondary-600">View workflow insights</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* Stats Cards for Managers/Admins */}
      {isManagerOrAdmin() && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {isLoadingAnalytics ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-secondary-200 rounded mb-2"></div>
                <div className="h-8 bg-secondary-200 rounded"></div>
              </div>
            ))
          ) : (
            <>
              <div className="card" data-testid="total-requests-stat">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Total Requests</p>
                    <p className="text-2xl font-bold text-secondary-900">
                      {analyticsData?.totalRequests || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary-600" />
                  </div>
                </div>
              </div>

              <div className="card" data-testid="pending-requests-stat">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Pending</p>
                    <p className="text-2xl font-bold text-warning-600">
                      {analyticsData?.pendingCount || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                    <Clock className="w-4 h-4 text-warning-600" />
                  </div>
                </div>
              </div>

              <div className="card" data-testid="approved-requests-stat">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Approved</p>
                    <p className="text-2xl font-bold text-success-600">
                      {analyticsData?.approvedCount || 0}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-success-600" />
                  </div>
                </div>
              </div>

              <div className="card" data-testid="avg-completion-stat">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-secondary-600">Avg. Completion</p>
                    <p className="text-2xl font-bold text-secondary-900">
                      {analyticsData?.avgCompletionHours ?
                        `${Math.round(analyticsData.avgCompletionHours)}h` :
                        'N/A'
                      }
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-secondary-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-4 h-4 text-secondary-600" />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* My Recent Requests */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-secondary-900">My Recent Requests</h2>
          </div>

          {isLoadingRequests ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-secondary-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-secondary-200 rounded mb-2"></div>
                      <div className="h-3 bg-secondary-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : myRequestsData && myRequestsData.length > 0 ? (
            <div className="space-y-4" data-testid="my-requests-list">
              {myRequestsData.map((request) => (
                <Link
                  key={request.id}
                  to={`/requests/${request.id}`}
                  className="flex items-center p-4 rounded-lg hover:bg-secondary-50 transition-colors"
                  data-testid={`request-${request.id}`}
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(request.status)}
                  </div>
                  <div className="ml-4 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-secondary-900">
                        {formatRequestType(request.type)}
                      </h3>
                      <span className={`badge ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-secondary-600 mt-1">
                      Submitted {formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              ))}

              <div className="pt-4 border-t border-secondary-200">
                <Link
                  to="/requests"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  data-testid="view-all-requests"
                >
                  View all requests →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8" data-testid="no-requests-message">
              <FileText className="w-12 h-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-secondary-900 mb-2">No requests yet</h3>
              <p className="text-secondary-600 mb-4">
                Start by creating your first request
              </p>
              <Link to="/requests/new" className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Link>
            </div>
          )}
        </div>

        {/* Pending Actions (for Managers/Admins) */}
        {isManagerOrAdmin() && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-secondary-900">Pending Actions</h2>
            </div>

            {isLoadingPending ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-secondary-200 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-secondary-200 rounded mb-2"></div>
                        <div className="h-3 bg-secondary-200 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingRequestsData && pendingRequestsData.length > 0 ? (
              <div className="space-y-4" data-testid="pending-requests-list">
                {pendingRequestsData.map((request) => (
                  <Link
                    key={request.id}
                    to={`/requests/${request.id}`}
                    className="flex items-center p-4 rounded-lg hover:bg-secondary-50 transition-colors"
                    data-testid={`pending-request-${request.id}`}
                  >
                    <div className="flex-shrink-0">
                      {request.slaDeadline && new Date(request.slaDeadline) < new Date() ? (
                        <AlertTriangle className="w-4 h-4 text-error-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-warning-500" />
                      )}
                    </div>
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-secondary-900">
                          {formatRequestType(request.type)}
                        </h3>
                        {request.slaDeadline && new Date(request.slaDeadline) < new Date() && (
                          <span className="badge-error">Overdue</span>
                        )}
                      </div>
                      <p className="text-sm text-secondary-600 mt-1">
                        From {request.creatorFirstName} {request.creatorLastName} •
                        {formatDistanceToNow(new Date(request.submittedAt), { addSuffix: true })}
                      </p>
                    </div>
                  </Link>
                ))}

                <div className="pt-4 border-t border-secondary-200">
                  <Link
                    to="/requests?status=pending"
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    data-testid="view-all-pending"
                  >
                    View all pending requests →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8" data-testid="no-pending-message">
                <CheckCircle className="w-12 h-12 text-success-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-secondary-900 mb-2">All caught up!</h3>
                <p className="text-secondary-600">
                  No pending requests require your attention
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardPage
