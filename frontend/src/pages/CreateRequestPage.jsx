import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from 'react-query'
import { useForm } from 'react-hook-form'
import {
  ArrowLeft,
  Save,
  AlertCircle,
  FileText,
  Calendar,
  DollarSign,
  User,
  Briefcase,
  Clock,
  CheckCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { requestsAPI, workflowsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const CreateRequestPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedWorkflow, setSelectedWorkflow] = useState(null)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm()

  const requestType = watch('type')

  // Fetch available workflows
  const { data: workflowsData, isLoading: workflowsLoading } = useQuery(
    'workflows',
    () => workflowsAPI.list(),
    {
      select: data => data.data.workflows || []
    }
  )

  // Create request mutation
  const createRequestMutation = useMutation(requestsAPI.create, {
    onSuccess: (data) => {
      navigate('/requests', {
        state: {
          message: `Request submitted successfully! Your request ID is ${data.data.request.id}`,
          type: 'success'
        }
      })
    },
    onError: (error) => {
      console.error('Failed to create request:', error)
    }
  })

  const onSubmit = async (data) => {
    try {
      const payload = { ...data }
      delete payload.type
      delete payload.workflowId

      await createRequestMutation.mutateAsync({
        type: data.type,
        workflowId: data.workflowId,
        payload
      })
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const getRequestTypeIcon = (type) => {
    switch (type) {
      case 'leave-request':
        return <Calendar className="w-5 h-5 text-primary-500" />
      case 'expense-approval':
        return <DollarSign className="w-5 h-5 text-success-500" />
      case 'hiring-request':
        return <User className="w-5 h-5 text-info-500" />
      case 'equipment-request':
        return <Briefcase className="w-5 h-5 text-warning-500" />
      case 'document-approval':
        return <FileText className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-secondary-500" />
    }
  }

  const renderFormFields = () => {
    switch (requestType) {
      case 'leave-request':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="label">
                  Start Date *
                </label>
                <input
                  id="startDate"
                  type="date"
                  {...register('startDate', { required: 'Start date is required' })}
                  className="input"
                  data-testid="start-date-input"
                />
                {errors.startDate && (
                  <p className="error-message">{errors.startDate.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="endDate" className="label">
                  End Date *
                </label>
                <input
                  id="endDate"
                  type="date"
                  {...register('endDate', { required: 'End date is required' })}
                  className="input"
                  data-testid="end-date-input"
                />
                {errors.endDate && (
                  <p className="error-message">{errors.endDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="leaveType" className="label">
                Leave Type *
              </label>
              <select
                id="leaveType"
                {...register('leaveType', { required: 'Leave type is required' })}
                className="input"
                data-testid="leave-type-select"
              >
                <option value="">Select leave type</option>
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="maternity">Maternity/Paternity</option>
                <option value="emergency">Emergency</option>
              </select>
              {errors.leaveType && (
                <p className="error-message">{errors.leaveType.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="reason" className="label">
                Reason *
              </label>
              <textarea
                id="reason"
                {...register('reason', { required: 'Reason is required' })}
                className="input"
                rows="4"
                placeholder="Please provide a reason for your leave request"
                data-testid="reason-textarea"
              />
              {errors.reason && (
                <p className="error-message">{errors.reason.message}</p>
              )}
            </div>
          </div>
        )

      case 'expense-approval':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="amount" className="label">
                  Amount *
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  {...register('amount', {
                    required: 'Amount is required',
                    min: { value: 0.01, message: 'Amount must be greater than 0' }
                  })}
                  className="input"
                  placeholder="0.00"
                  data-testid="amount-input"
                />
                {errors.amount && (
                  <p className="error-message">{errors.amount.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="currency" className="label">
                  Currency *
                </label>
                <select
                  id="currency"
                  {...register('currency', { required: 'Currency is required' })}
                  className="input"
                  data-testid="currency-select"
                >
                  <option value="">Select currency</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="CAD">CAD</option>
                </select>
                {errors.currency && (
                  <p className="error-message">{errors.currency.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="expenseDate" className="label">
                Expense Date *
              </label>
              <input
                id="expenseDate"
                type="date"
                {...register('expenseDate', { required: 'Expense date is required' })}
                className="input"
                data-testid="expense-date-input"
              />
              {errors.expenseDate && (
                <p className="error-message">{errors.expenseDate.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="category" className="label">
                Category *
              </label>
              <select
                id="category"
                {...register('category', { required: 'Category is required' })}
                className="input"
                data-testid="category-select"
              >
                <option value="">Select category</option>
                <option value="travel">Travel</option>
                <option value="meals">Meals & Entertainment</option>
                <option value="office-supplies">Office Supplies</option>
                <option value="software">Software & Subscriptions</option>
                <option value="training">Training & Education</option>
                <option value="other">Other</option>
              </select>
              {errors.category && (
                <p className="error-message">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description *
              </label>
              <textarea
                id="description"
                {...register('description', { required: 'Description is required' })}
                className="input"
                rows="4"
                placeholder="Please provide details about this expense"
                data-testid="description-textarea"
              />
              {errors.description && (
                <p className="error-message">{errors.description.message}</p>
              )}
            </div>
          </div>
        )

      case 'equipment-request':
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="equipmentType" className="label">
                Equipment Type *
              </label>
              <select
                id="equipmentType"
                {...register('equipmentType', { required: 'Equipment type is required' })}
                className="input"
                data-testid="equipment-type-select"
              >
                <option value="">Select equipment type</option>
                <option value="laptop">Laptop</option>
                <option value="monitor">Monitor</option>
                <option value="keyboard">Keyboard</option>
                <option value="mouse">Mouse</option>
                <option value="headset">Headset</option>
                <option value="software">Software License</option>
                <option value="other">Other</option>
              </select>
              {errors.equipmentType && (
                <p className="error-message">{errors.equipmentType.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="specifications" className="label">
                Specifications
              </label>
              <textarea
                id="specifications"
                {...register('specifications')}
                className="input"
                rows="3"
                placeholder="Any specific requirements or model preferences"
                data-testid="specifications-textarea"
              />
            </div>

            <div>
              <label htmlFor="justification" className="label">
                Business Justification *
              </label>
              <textarea
                id="justification"
                {...register('justification', { required: 'Business justification is required' })}
                className="input"
                rows="4"
                placeholder="Please explain why this equipment is needed"
                data-testid="justification-textarea"
              />
              {errors.justification && (
                <p className="error-message">{errors.justification.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="urgency" className="label">
                Urgency *
              </label>
              <select
                id="urgency"
                {...register('urgency', { required: 'Urgency level is required' })}
                className="input"
                data-testid="urgency-select"
              >
                <option value="">Select urgency</option>
                <option value="low">Low - Can wait 2+ weeks</option>
                <option value="medium">Medium - Needed within 1-2 weeks</option>
                <option value="high">High - Needed within days</option>
                <option value="critical">Critical - Needed immediately</option>
              </select>
              {errors.urgency && (
                <p className="error-message">{errors.urgency.message}</p>
              )}
            </div>
          </div>
        )

      default:
        return (
          <div className="space-y-4">
            <div>
              <label htmlFor="subject" className="label">
                Subject *
              </label>
              <input
                id="subject"
                type="text"
                {...register('subject', { required: 'Subject is required' })}
                className="input"
                placeholder="Brief description of your request"
                data-testid="subject-input"
              />
              {errors.subject && (
                <p className="error-message">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="details" className="label">
                Details *
              </label>
              <textarea
                id="details"
                {...register('details', { required: 'Details are required' })}
                className="input"
                rows="6"
                placeholder="Please provide detailed information about your request"
                data-testid="details-textarea"
              />
              {errors.details && (
                <p className="error-message">{errors.details.message}</p>
              )}
            </div>
          </div>
        )
    }
  }

  const formatRequestType = (type) => {
    return type?.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (workflowsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
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

        <h1 className="text-3xl font-bold text-secondary-900" data-testid="page-title">
          Create New Request
        </h1>
        <p className="text-secondary-600 mt-2">
          Submit a new workflow request for approval
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Request Type Selection */}
        <div className="card">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">
            Request Type
          </h2>

          <div>
            <label htmlFor="type" className="label">
              Select Request Type *
            </label>
            <select
              id="type"
              {...register('type', { required: 'Request type is required' })}
              className="input"
              data-testid="request-type-select"
              onChange={(e) => {
                setValue('type', e.target.value)
                // Reset workflow selection when type changes
                setValue('workflowId', '')
                setSelectedWorkflow(null)
              }}
            >
              <option value="">Choose request type</option>
              <option value="leave-request">Leave Request</option>
              <option value="expense-approval">Expense Approval</option>
              <option value="equipment-request">Equipment Request</option>
              <option value="document-approval">Document Approval</option>
              <option value="hiring-request">Hiring Request</option>
              <option value="other">Other</option>
            </select>
            {errors.type && (
              <p className="error-message">{errors.type.message}</p>
            )}
          </div>

          {/* Workflow Selection */}
          {requestType && workflowsData && workflowsData.length > 0 && (
            <div className="mt-4">
              <label htmlFor="workflowId" className="label">
                Approval Workflow *
              </label>
              <select
                id="workflowId"
                {...register('workflowId', { required: 'Workflow selection is required' })}
                className="input"
                data-testid="workflow-select"
                onChange={(e) => {
                  const workflow = workflowsData.find(w => w.id === e.target.value)
                  setSelectedWorkflow(workflow)
                }}
              >
                <option value="">Select workflow</option>
                {workflowsData
                  .filter(workflow =>
                    workflow.requestTypes.includes(requestType) ||
                    workflow.requestTypes.includes('*')
                  )
                  .map(workflow => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </option>
                  ))}
              </select>
              {errors.workflowId && (
                <p className="error-message">{errors.workflowId.message}</p>
              )}

              {/* Workflow Preview */}
              {selectedWorkflow && (
                <div className="mt-4 p-4 bg-secondary-50 rounded-lg" data-testid="workflow-preview">
                  <h4 className="font-medium text-secondary-900 mb-2">
                    Approval Process
                  </h4>
                  <div className="space-y-2">
                    {selectedWorkflow.steps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <span className="text-sm text-secondary-700">
                          {step.role === 'manager' ? 'Manager' :
                            step.role === 'admin' ? 'Administrator' :
                              step.role.charAt(0).toUpperCase() + step.role.slice(1)} Approval
                        </span>
                        {step.slaHours && (
                          <span className="text-xs text-secondary-500">
                            (SLA: {step.slaHours}h)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Request Details */}
        {requestType && (
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              {getRequestTypeIcon(requestType)}
              <h2 className="text-lg font-semibold text-secondary-900">
                {formatRequestType(requestType)} Details
              </h2>
            </div>

            {renderFormFields()}
          </div>
        )}

        {/* Submit Section */}
        {requestType && (
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-secondary-900">
                  Ready to Submit?
                </h3>
                <p className="text-sm text-secondary-600 mt-1">
                  Review your request and submit for approval
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => navigate('/requests')}
                  className="btn-outline"
                  data-testid="cancel-button"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || createRequestMutation.isLoading}
                  className="btn-primary"
                  data-testid="submit-button"
                >
                  {isSubmitting || createRequestMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Submit Request
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Display */}
            {createRequestMutation.error && (
              <div className="mt-4 p-4 bg-error-50 border border-error-200 rounded-lg" data-testid="error-message">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-error-500" />
                  <p className="text-error-700">
                    {createRequestMutation.error.response?.data?.error || 'Failed to submit request. Please try again.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  )
}

export default CreateRequestPage
