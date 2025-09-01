import React from 'react'
import { Link } from 'react-router-dom'
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  FileText,
  ArrowRight
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { useAuth } from '../contexts/AuthContext'

const RequestCard = ({ request, showCreator = false, showActions = true }) => {
  const { user } = useAuth()

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-warning-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-success-500" />
      case 'rejected':
        return <XCircle className="w-4 h-4 text-error-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-secondary-500" />
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
      case 'cancelled':
        return 'status-cancelled'
      default:
        return 'badge-secondary'
    }
  }

  const formatRequestType = (type) => {
    return type.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const isOverdue = () => {
    return request.sla_deadline &&
           new Date(request.sla_deadline) < new Date() &&
           request.status === 'pending'
  }

  const canCancel = () => {
    return request.created_by === user?.id &&
           request.status === 'pending'
  }

  const isPendingForUser = () => {
    // Check if this request is pending for the current user to act on
    const currentStep = request.steps?.[request.current_step_index]
    if (!currentStep) return false

    const expectedRole = currentStep.escalatedTo || currentStep.role
    return request.status === 'pending' &&
           (user?.role === expectedRole || user?.role === 'admin')
  }

  return (
    <div
      className={`card hover:shadow-md transition-all duration-200 ${
        isPendingForUser() ? 'ring-2 ring-primary-200 bg-primary-50' : ''
      }`}
      data-testid={`request-card-${request.id}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              {getStatusIcon(request.status)}
              <h3 className="font-semibold text-secondary-900" data-testid="request-type">
                {formatRequestType(request.type)}
              </h3>
              {isOverdue() && (
                <span className="badge-error text-xs" data-testid="overdue-badge">
                  Overdue
                </span>
              )}
              {isPendingForUser() && (
                <span className="badge-primary text-xs" data-testid="action-required-badge">
                  Action Required
                </span>
              )}
            </div>
            <span className={`badge ${getStatusColor(request.status)}`} data-testid="status-badge">
              {request.status}
            </span>
          </div>

          {/* Request Details */}
          <div className="space-y-2 text-sm text-secondary-600 mb-4">
            {showCreator && request.creatorFirstName && (
              <div className="flex items-center space-x-2" data-testid="creator-info">
                <User className="w-4 h-4" />
                <span>
                  {request.creatorFirstName} {request.creatorLastName}
                  {request.creator_email && (
                    <span className="text-xs ml-1">({request.creator_email})</span>
                  )}
                </span>
              </div>
            )}

            <div className="flex items-center space-x-2" data-testid="submitted-date">
              <Calendar className="w-4 h-4" />
              <span>
                Submitted {formatDistanceToNow(new Date(request.submitted_at), { addSuffix: true })}
                {request.submitted_at && (
                  <span className="text-xs ml-1">
                    ({format(new Date(request.submitted_at), 'MMM dd, yyyy')})
                  </span>
                )}
              </span>
            </div>

            {request.sla_deadline && (
              <div className="flex items-center space-x-2" data-testid="sla-deadline">
                <AlertTriangle className={`w-4 h-4 ${
                  isOverdue() ? 'text-error-500' : 'text-warning-500'
                }`}
                />
                <span>
                  SLA: {formatDistanceToNow(new Date(request.sla_deadline), { addSuffix: true })}
                  {isOverdue() && <span className="text-error-600 font-medium ml-1">(Overdue)</span>}
                </span>
              </div>
            )}

            {request.workflow_name && (
              <div className="flex items-center space-x-2" data-testid="workflow-info">
                <FileText className="w-4 h-4" />
                <span>Workflow: {request.workflow_name}</span>
              </div>
            )}

            {request.completed_at && (
              <div className="flex items-center space-x-2" data-testid="completed-date">
                <CheckCircle className="w-4 h-4 text-success-500" />
                <span>
                  Completed {formatDistanceToNow(new Date(request.completed_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>

          {/* Request Summary */}
          {request.payload && Object.keys(request.payload).length > 0 && (
            <div className="mb-4 p-3 bg-secondary-50 rounded-lg" data-testid="request-summary">
              <h4 className="text-xs font-medium text-secondary-700 mb-2 uppercase tracking-wide">
                Request Details
              </h4>
              <div className="space-y-1 text-sm">
                {Object.entries(request.payload).slice(0, 3).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-secondary-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
                    </span>
                    <span className="text-secondary-900 font-medium">
                      {typeof value === 'string' && value.length > 30
                        ? `${value.substring(0, 30)}...`
                        : String(value)
                      }
                    </span>
                  </div>
                ))}
                {Object.keys(request.payload).length > 3 && (
                  <p className="text-xs text-secondary-500 italic">
                    +{Object.keys(request.payload).length - 3} more details
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="flex items-center justify-between pt-4 border-t border-secondary-200">
          <div className="flex space-x-2">
            {isPendingForUser() && (
              <span className="text-xs text-primary-600 font-medium">
                Requires your attention
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {canCancel() && (
              <button
                className="text-sm text-error-600 hover:text-error-800 font-medium"
                data-testid="cancel-button"
                onClick={(e) => {
                  e.preventDefault()
                  // TODO: Implement cancel functionality
                  // Cancel functionality will be implemented in future story
                }}
              >
                Cancel
              </button>
            )}

            <Link
              to={`/requests/${request.id}`}
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-800 font-medium"
              data-testid="view-details-link"
            >
              View Details
              <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default RequestCard
