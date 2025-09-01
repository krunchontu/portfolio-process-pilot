import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  ArrowLeft,
  Clock,
  User,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  Briefcase,
  Activity
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { requestsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const RequestDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isManagerOrAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [actionComment, setActionComment] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null)

  // Fetch request details
  const {
    data: requestData,
    isLoading,
    error
  } = useQuery(
    ['requests', 'detail', id],
    () => requestsAPI.get(id),
    {
      select: data => data.data.request,
      enabled: !!id
    }
  )

  // Action mutation (approve/reject)
  const actionMutation = useMutation(
    ({ action, comment }) => requestsAPI.action(id, action, { comment }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['requests'])
        setShowActionModal(false)
        setActionComment('')
        setPendingAction(null)
      },
      onError: (error) => {
        console.error('Action failed:', error)
      }
    }
  )

  const handleAction = (action) => {
    setPendingAction(action)
    setShowActionModal(true)
  }

  const confirmAction = async () => {
    if (pendingAction) {
      await actionMutation.mutateAsync({
        action: pendingAction,
        comment: actionComment
      })
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-warning-500" />
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-success-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-error-500" />
      case 'cancelled':
        return <AlertTriangle className="w-5 h-5 text-secondary-500" />
      default:
        return <Clock className="w-5 h-5 text-secondary-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-100 text-warning-800 border-warning-200'
      case 'approved':
        return 'bg-success-100 text-success-800 border-success-200'
      case 'rejected':
        return 'bg-error-100 text-error-800 border-error-200'
      case 'cancelled':
        return 'bg-secondary-100 text-secondary-800 border-secondary-200'
      default:
        return 'bg-secondary-100 text-secondary-800 border-secondary-200'
    }
  }

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'leave-request':
        return <Calendar className="w-5 h-5 text-primary-500" />
      case 'expense-approval':
        return <DollarSign className="w-5 h-5 text-success-500" />
      case 'equipment-request':
        return <Briefcase className="w-5 h-5 text-warning-500" />
      default:
        return <FileText className="w-5 h-5 text-secondary-500" />
    }
  }

  const formatRequestType = (type) => {
    return type?.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderRequestDetails = () => {
    if (!requestData?.payload) return null

    const { type, payload } = requestData

    switch (type) {
      case 'leave-request':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-secondary-700">Start Date</label>
              <p className="text-secondary-900" data-testid="start-date">
                {new Date(payload.startDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">End Date</label>
              <p className="text-secondary-900" data-testid="end-date">
                {new Date(payload.endDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Leave Type</label>
              <p className="text-secondary-900 capitalize" data-testid="leave-type">
                {payload.leaveType}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Total Days</label>
              <p className="text-secondary-900" data-testid="total-days">
                {Math.ceil((new Date(payload.endDate) - new Date(payload.startDate)) / (1000 * 60 * 60 * 24)) + 1} days
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-secondary-700">Reason</label>
              <p className="text-secondary-900" data-testid="reason">
                {payload.reason}
              </p>
            </div>
          </div>
        )

      case 'expense-approval':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-secondary-700">Amount</label>
              <p className="text-secondary-900 font-semibold" data-testid="amount">
                {payload.currency} {parseFloat(payload.amount).toFixed(2)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Expense Date</label>
              <p className="text-secondary-900" data-testid="expense-date">
                {new Date(payload.expenseDate).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Category</label>
              <p className="text-secondary-900 capitalize" data-testid="category">
                {payload.category.replace('-', ' ')}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-secondary-700">Description</label>
              <p className="text-secondary-900" data-testid="description">
                {payload.description}
              </p>
            </div>
          </div>
        )

      case 'equipment-request':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm font-medium text-secondary-700">Equipment Type</label>
              <p className="text-secondary-900 capitalize" data-testid="equipment-type">
                {payload.equipmentType}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Urgency</label>
              <p className="text-secondary-900 capitalize" data-testid="urgency">
                {payload.urgency}
              </p>
            </div>
            {payload.specifications && (
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-secondary-700">Specifications</label>
                <p className="text-secondary-900" data-testid="specifications">
                  {payload.specifications}
                </p>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="text-sm font-medium text-secondary-700">Business Justification</label>
              <p className="text-secondary-900" data-testid="justification">
                {payload.justification}
              </p>
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-secondary-700">Subject</label>
              <p className="text-secondary-900" data-testid="subject">
                {payload.subject}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-secondary-700">Details</label>
              <p className="text-secondary-900" data-testid="details">
                {payload.details}
              </p>
            </div>
          </div>
        )
    }
  }

  const canTakeAction = () => {
    if (!requestData || requestData.status !== 'pending' || !isManagerOrAdmin()) {
      return false
    }

    const currentStep = requestData.steps?.[requestData.current_step_index]
    if (!currentStep) return false

    const expectedRole = currentStep.escalatedTo || currentStep.role
    return user?.role === expectedRole || user?.role === 'admin'
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" data-testid="loading-spinner" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12" data-testid="error-state">
          <div className="text-error-500 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            Failed to load request
          </h3>
          <p className="text-secondary-600 mb-4">
            {error.response?.data?.error || 'Request not found'}
          </p>
          <button
            onClick={() => navigate('/requests')}
            className="btn-primary"
          >
            Back to Requests
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/requests')}
          className="inline-flex items-center text-secondary-600 hover:text-secondary-800 mb-4"
          data-testid="back-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requests
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              {getRequestTypeIcon(requestData.type)}
              <h1 className="text-3xl font-bold text-secondary-900" data-testid="page-title">
                {formatRequestType(requestData.type)}
              </h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(requestData.status)}`} data-testid="status-badge">
                {requestData.status.charAt(0).toUpperCase() + requestData.status.slice(1)}
              </span>
            </div>
            <p className="text-secondary-600">
              Request ID: {requestData.id}
            </p>
          </div>

          {canTakeAction() && (
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={() => handleAction('approve')}
                className="btn-success"
                data-testid="approve-button"
                disabled={actionMutation.isLoading}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </button>
              <button
                onClick={() => handleAction('reject')}
                className="btn-error"
                data-testid="reject-button"
                disabled={actionMutation.isLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Details */}
          <div className="card" data-testid="request-details">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Request Details
            </h2>
            {renderRequestDetails()}
          </div>

          {/* Workflow Progress */}
          <div className="card" data-testid="workflow-progress">
            <h2 className="text-lg font-semibold text-secondary-900 mb-4">
              Approval Progress
            </h2>
            <div className="space-y-4">
              {requestData.steps?.map((step, index) => {
                const isCurrentStep = index === requestData.current_step_index
                const isCompletedStep = index < requestData.current_step_index
                const isPendingStep = requestData.status === 'pending' && isCurrentStep

                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-4 p-4 rounded-lg border ${
                      isCompletedStep
                        ? 'bg-success-50 border-success-200'
                        : isPendingStep
                          ? 'bg-warning-50 border-warning-200'
                          : 'bg-secondary-50 border-secondary-200'
                    }`}
                    data-testid={`workflow-step-${index}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompletedStep
                        ? 'bg-success-200 text-success-800'
                        : isPendingStep
                          ? 'bg-warning-200 text-warning-800'
                          : 'bg-secondary-200 text-secondary-600'
                    }`}
                    >
                      {isCompletedStep ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-secondary-900">
                        {step.role === 'manager' ? 'Manager' :
                          step.role === 'admin' ? 'Administrator' :
                            step.role.charAt(0).toUpperCase() + step.role.slice(1)} Approval
                      </p>
                      {step.sla_hours && (
                        <p className="text-sm text-secondary-600">
                          SLA: {step.sla_hours} hours
                        </p>
                      )}
                      {step.completed_at && (
                        <p className="text-sm text-success-600">
                          Completed: {formatDate(step.completed_at)}
                        </p>
                      )}
                    </div>
                    {isPendingStep && (
                      <div className="text-warning-600">
                        <Clock className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Request History */}
          {requestData.history && requestData.history.length > 0 && (
            <div className="card" data-testid="request-history">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Request History
              </h2>
              <div className="space-y-4">
                {requestData.history.map((entry, index) => (
                  <div key={index} className="flex space-x-4 p-4 bg-secondary-50 rounded-lg" data-testid={`history-entry-${index}`}>
                    <div className="flex-shrink-0">
                      <Activity className="w-5 h-5 text-secondary-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-secondary-900">
                        {entry.action} by {entry.user_name}
                      </p>
                      <p className="text-sm text-secondary-600">
                        {formatDate(entry.createdAt)}
                      </p>
                      {entry.comment && (
                        <p className="text-sm text-secondary-700 mt-1">
                          &ldquo;{entry.comment}&rdquo;
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Request Information */}
          <div className="card" data-testid="request-info">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              Request Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-secondary-700">Submitted by</label>
                <div className="flex items-center space-x-2 mt-1">
                  <User className="w-4 h-4 text-secondary-400" />
                  <span className="text-secondary-900" data-testid="creator-name">
                    {requestData.creatorFirstName} {requestData.creatorLastName}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-secondary-700">Submitted on</label>
                <div className="flex items-center space-x-2 mt-1">
                  <Calendar className="w-4 h-4 text-secondary-400" />
                  <span className="text-secondary-900" data-testid="submitted-date">
                    {formatDate(requestData.submitted_at)}
                  </span>
                </div>
              </div>

              {requestData.completed_at && (
                <div>
                  <label className="text-sm font-medium text-secondary-700">Completed on</label>
                  <div className="flex items-center space-x-2 mt-1">
                    <CheckCircle className="w-4 h-4 text-success-500" />
                    <span className="text-secondary-900" data-testid="completed-date">
                      {formatDate(requestData.completed_at)}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-secondary-700">Current Status</label>
                <div className="flex items-center space-x-2 mt-1">
                  {getStatusIcon(requestData.status)}
                  <span className="text-secondary-900 capitalize" data-testid="current-status">
                    {requestData.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SLA Information */}
          {requestData.sla_deadline && (
            <div className="card" data-testid="sla-info">
              <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                SLA Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-warning-500" />
                  <span className="text-sm text-secondary-700">Deadline:</span>
                </div>
                <p className="text-secondary-900" data-testid="sla-deadline">
                  {formatDate(requestData.sla_deadline)}
                </p>
                {new Date(requestData.sla_deadline) < new Date() && requestData.status === 'pending' && (
                  <p className="text-error-600 text-sm font-medium">
                    ⚠️ SLA Deadline Overdue
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="action-modal">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">
              {pendingAction === 'approve' ? 'Approve Request' : 'Reject Request'}
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-2">
                Comment {pendingAction === 'reject' && <span className="text-error-500">*</span>}
              </label>
              <textarea
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="input"
                rows="4"
                placeholder={`Please provide ${pendingAction === 'approve' ? 'any additional comments' : 'a reason for rejection'}`}
                data-testid="action-comment"
              />
            </div>

            {actionMutation.error && (
              <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg">
                <p className="text-error-700 text-sm">
                  {actionMutation.error.response?.data?.error || 'Action failed. Please try again.'}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowActionModal(false)
                  setPendingAction(null)
                  setActionComment('')
                }}
                className="btn-outline"
                disabled={actionMutation.isLoading}
                data-testid="cancel-action"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                disabled={actionMutation.isLoading || (pendingAction === 'reject' && !actionComment.trim())}
                className={pendingAction === 'approve' ? 'btn-success' : 'btn-error'}
                data-testid="confirm-action"
              >
                {actionMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  `${pendingAction === 'approve' ? 'Approve' : 'Reject'} Request`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RequestDetailPage
