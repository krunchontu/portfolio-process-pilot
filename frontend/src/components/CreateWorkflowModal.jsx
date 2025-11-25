/**
 * CreateWorkflowModal Component
 *
 * Purpose: Create new workflows with dynamic multi-step approval configuration
 *
 * Features:
 * - Dynamic step management (add/remove/reorder)
 * - Form validation with React Hook Form
 * - Role-based step configuration
 * - SLA hours configuration
 * - Action selection (approve/reject/return)
 * - Real-time validation feedback
 *
 * @component
 * @example
 * <CreateWorkflowModal
 *   isOpen={true}
 *   onClose={() => setIsOpen(false)}
 * />
 */

import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import {
  X,
  Plus,
  GitBranch,
  Trash2,
  ArrowUp,
  ArrowDown,
  Clock,
  Shield,
  CheckSquare,
  FileText,
  AlertCircle
} from 'lucide-react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { workflowsAPI } from '../services/api'

const CreateWorkflowModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      name: '',
      flowId: '',
      description: '',
      isActive: true,
      steps: [
        {
          stepId: 'step-1',
          order: 1,
          role: 'manager',
          actions: ['approve', 'reject'],
          slaHours: 48
        }
      ]
    }
  })

  // Field array for dynamic steps
  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'steps'
  })

  const createWorkflowMutation = useMutation(
    (data) => workflowsAPI.create(data),
    {
      onSuccess: () => {
        toast.success('Workflow created successfully')
        queryClient.invalidateQueries(['workflows'])
        handleClose()
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to create workflow'
        toast.error(message)
      }
    }
  )

  const onSubmit = async (data) => {
    try {
      // Ensure steps have correct order
      const stepsWithOrder = data.steps.map((step, index) => ({
        ...step,
        order: index + 1,
        slaHours: step.slaHours ? parseInt(step.slaHours) : undefined
      }))

      const payload = {
        name: data.name.trim(),
        flowId: data.flowId.trim(),
        description: data.description.trim() || undefined,
        isActive: data.isActive,
        steps: stepsWithOrder
      }

      await createWorkflowMutation.mutateAsync(payload)
    } catch (error) {
      console.error('Create workflow error:', error)
    }
  }

  const handleClose = () => {
    if (!createWorkflowMutation.isLoading) {
      reset()
      onClose()
    }
  }

  const addStep = () => {
    append({
      stepId: `step-${fields.length + 1}`,
      order: fields.length + 1,
      role: 'manager',
      actions: ['approve', 'reject'],
      slaHours: 48
    })
  }

  const moveStepUp = (index) => {
    if (index > 0) {
      move(index, index - 1)
    }
  }

  const moveStepDown = (index) => {
    if (index < fields.length - 1) {
      move(index, index + 1)
    }
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-6 h-6 text-primary-500" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-secondary-900"
                    >
                      Create New Workflow
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    onClick={handleClose}
                    disabled={createWorkflowMutation.isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                  {/* Workflow Info Section */}
                  <div className="space-y-4 mb-6">
                    <h4 className="text-sm font-semibold text-secondary-700 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Workflow Information
                    </h4>

                    {/* Name */}
                    <div>
                      <label htmlFor="name" className="label">
                        Workflow Name <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        className={`input ${errors.name ? 'border-error-500' : ''}`}
                        placeholder="e.g., Leave Request Approval"
                        {...register('name', {
                          required: 'Workflow name is required',
                          minLength: {
                            value: 3,
                            message: 'Name must be at least 3 characters'
                          }
                        })}
                        disabled={createWorkflowMutation.isLoading}
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-error-600">{errors.name.message}</p>
                      )}
                    </div>

                    {/* Flow ID */}
                    <div>
                      <label htmlFor="flowId" className="label">
                        Flow ID <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="flowId"
                        type="text"
                        className={`input ${errors.flowId ? 'border-error-500' : ''}`}
                        placeholder="e.g., leave-approval, expense-approval"
                        {...register('flowId', {
                          required: 'Flow ID is required',
                          pattern: {
                            value: /^[a-z0-9-]+$/,
                            message: 'Flow ID must be lowercase letters, numbers, and hyphens only'
                          }
                        })}
                        disabled={createWorkflowMutation.isLoading}
                      />
                      {errors.flowId && (
                        <p className="mt-1 text-sm text-error-600">{errors.flowId.message}</p>
                      )}
                      <p className="mt-1 text-xs text-secondary-500">
                        Unique identifier for this workflow (lowercase, no spaces)
                      </p>
                    </div>

                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="label">
                        Description <span className="text-secondary-500">(optional)</span>
                      </label>
                      <textarea
                        id="description"
                        className="input"
                        placeholder="Describe the purpose and scope of this workflow..."
                        rows={2}
                        {...register('description')}
                        disabled={createWorkflowMutation.isLoading}
                      />
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center">
                      <input
                        id="isActive"
                        type="checkbox"
                        className="h-4 w-4 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                        {...register('isActive')}
                        disabled={createWorkflowMutation.isLoading}
                      />
                      <label htmlFor="isActive" className="ml-2 text-sm text-secondary-700">
                        Active (workflow can be used immediately)
                      </label>
                    </div>
                  </div>

                  {/* Workflow Steps Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-secondary-700 flex items-center">
                        <GitBranch className="w-4 h-4 mr-2" />
                        Approval Steps <span className="text-error-500 ml-1">*</span>
                      </h4>
                      <button
                        type="button"
                        onClick={addStep}
                        className="btn-outline text-sm py-1 px-3"
                        disabled={createWorkflowMutation.isLoading}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Step
                      </button>
                    </div>

                    {fields.length === 0 && (
                      <div className="text-center py-8 bg-secondary-50 rounded-lg">
                        <AlertCircle className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
                        <p className="text-sm text-secondary-600">
                          No steps defined. Add at least one approval step.
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="border border-secondary-200 rounded-lg p-4 bg-secondary-50"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-semibold">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium text-secondary-900">
                                Step {index + 1}
                              </span>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Move Up */}
                              {index > 0 && (
                                <button
                                  type="button"
                                  onClick={() => moveStepUp(index)}
                                  className="text-secondary-600 hover:text-secondary-900"
                                  title="Move up"
                                  disabled={createWorkflowMutation.isLoading}
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                              )}

                              {/* Move Down */}
                              {index < fields.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => moveStepDown(index)}
                                  className="text-secondary-600 hover:text-secondary-900"
                                  title="Move down"
                                  disabled={createWorkflowMutation.isLoading}
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                              )}

                              {/* Remove */}
                              {fields.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="text-error-600 hover:text-error-900"
                                  title="Remove step"
                                  disabled={createWorkflowMutation.isLoading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* Step ID */}
                            <div>
                              <label className="label text-xs">
                                Step ID <span className="text-error-500">*</span>
                              </label>
                              <input
                                type="text"
                                className={`input text-sm ${errors.steps?.[index]?.stepId ? 'border-error-500' : ''}`}
                                placeholder="e.g., mgr-approval"
                                {...register(`steps.${index}.stepId`, {
                                  required: 'Step ID is required'
                                })}
                                disabled={createWorkflowMutation.isLoading}
                              />
                              {errors.steps?.[index]?.stepId && (
                                <p className="mt-1 text-xs text-error-600">
                                  {errors.steps[index].stepId.message}
                                </p>
                              )}
                            </div>

                            {/* Role */}
                            <div>
                              <label className="label text-xs flex items-center">
                                <Shield className="w-3 h-3 mr-1" />
                                Required Role <span className="text-error-500 ml-1">*</span>
                              </label>
                              <select
                                className={`input text-sm ${errors.steps?.[index]?.role ? 'border-error-500' : ''}`}
                                {...register(`steps.${index}.role`, {
                                  required: 'Role is required'
                                })}
                                disabled={createWorkflowMutation.isLoading}
                              >
                                <option value="employee">Employee</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>

                            {/* SLA Hours */}
                            <div>
                              <label className="label text-xs flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                SLA Hours <span className="text-secondary-500">(optional)</span>
                              </label>
                              <input
                                type="number"
                                min="1"
                                className="input text-sm"
                                placeholder="e.g., 48"
                                {...register(`steps.${index}.slaHours`, {
                                  min: {
                                    value: 1,
                                    message: 'SLA must be at least 1 hour'
                                  }
                                })}
                                disabled={createWorkflowMutation.isLoading}
                              />
                              {errors.steps?.[index]?.slaHours && (
                                <p className="mt-1 text-xs text-error-600">
                                  {errors.steps[index].slaHours.message}
                                </p>
                              )}
                            </div>

                            {/* Actions */}
                            <div>
                              <label className="label text-xs flex items-center">
                                <CheckSquare className="w-3 h-3 mr-1" />
                                Available Actions
                              </label>
                              <div className="flex items-center space-x-3 mt-1">
                                <label className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    value="approve"
                                    className="h-3 w-3 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                    {...register(`steps.${index}.actions`)}
                                    disabled={createWorkflowMutation.isLoading}
                                  />
                                  <span className="ml-1">Approve</span>
                                </label>
                                <label className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    value="reject"
                                    className="h-3 w-3 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                    {...register(`steps.${index}.actions`)}
                                    disabled={createWorkflowMutation.isLoading}
                                  />
                                  <span className="ml-1">Reject</span>
                                </label>
                                <label className="flex items-center text-xs">
                                  <input
                                    type="checkbox"
                                    value="return"
                                    className="h-3 w-3 rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                                    {...register(`steps.${index}.actions`)}
                                    disabled={createWorkflowMutation.isLoading}
                                  />
                                  <span className="ml-1">Return</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-secondary-200">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleClose}
                      disabled={createWorkflowMutation.isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={createWorkflowMutation.isLoading}
                    >
                      {createWorkflowMutation.isLoading ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⏳</span>
                          Creating Workflow...
                        </>
                      ) : (
                        <>
                          <GitBranch className="w-4 h-4 mr-2" />
                          Create Workflow
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export default CreateWorkflowModal
