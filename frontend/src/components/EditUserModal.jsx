import React, { Fragment, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, Edit, Mail, User, Shield, Users, Building, ToggleLeft, ToggleRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI } from '../services/api'

const EditUserModal = ({ isOpen, onClose, user }) => {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'employee',
      managerId: '',
      department: '',
      isActive: true
    }
  })

  const selectedRole = watch('role')
  const isActive = watch('isActive')

  // Pre-populate form when user changes
  useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        role: user.role || 'employee',
        managerId: user.managerId || '',
        department: user.department || '',
        isActive: user.isActive !== undefined ? user.isActive : true
      })
    }
  }, [user, reset])

  // Fetch potential managers (users with manager or admin role)
  const { data: managersData, isLoading: managersLoading } = useQuery(
    ['users', 'managers'],
    () => usersAPI.list({ role: 'manager,admin', limit: 100 }),
    {
      select: data => data.data?.users || [],
      enabled: isOpen && (selectedRole === 'employee' || selectedRole === 'manager')
    }
  )

  const updateUserMutation = useMutation(
    (data) => usersAPI.update(user.id, data),
    {
      onSuccess: (response) => {
        toast.success('User updated successfully')
        // Invalidate and refetch users list
        queryClient.invalidateQueries(['users'])
        queryClient.invalidateQueries(['users', user.id])
        handleClose()
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to update user'
        toast.error(message)
      }
    }
  )

  const onSubmit = async (data) => {
    try {
      // Clean up data before sending
      const payload = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: data.email.trim(),
        role: data.role,
        department: data.department.trim() || undefined,
        managerId: data.managerId || undefined,
        isActive: data.isActive
      }

      await updateUserMutation.mutateAsync(payload)
    } catch (error) {
      // Error handled by mutation
      console.error('Update user error:', error)
    }
  }

  const handleClose = () => {
    if (!updateUserMutation.isLoading) {
      reset()
      onClose()
    }
  }

  const toggleActiveStatus = () => {
    setValue('isActive', !isActive)
  }

  // Safety check: can't edit own user
  const isEditingSelf = user?.id === currentUser?.id

  if (!user) {
    return null
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <Edit className="w-6 h-6 text-primary-500" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-secondary-900"
                    >
                      Edit User
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    onClick={handleClose}
                    disabled={updateUserMutation.isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Safety Warning */}
                {isEditingSelf && (
                  <div className="mb-6 p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-800">
                      ⚠️ You are editing your own account. Role and status changes are disabled for safety.
                    </p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-4 mb-6">
                    {/* Email (Read-only) */}
                    <div>
                      <label htmlFor="email" className="label">
                        <Mail className="w-4 h-4 mr-1" />
                        Email Address
                      </label>
                      <input
                        id="email"
                        type="email"
                        className="input bg-secondary-50 cursor-not-allowed"
                        {...register('email')}
                        disabled
                        title="Email cannot be changed"
                      />
                      <p className="mt-1 text-xs text-secondary-500">
                        Email address cannot be changed
                      </p>
                    </div>

                    {/* Name Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="firstName" className="label">
                          <User className="w-4 h-4 mr-1" />
                          First Name <span className="text-error-500">*</span>
                        </label>
                        <input
                          id="firstName"
                          type="text"
                          className={`input ${errors.firstName ? 'border-error-500' : ''}`}
                          placeholder="John"
                          {...register('firstName', {
                            required: 'First name is required',
                            minLength: {
                              value: 2,
                              message: 'First name must be at least 2 characters'
                            }
                          })}
                          disabled={updateUserMutation.isLoading}
                        />
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-error-600">{errors.firstName.message}</p>
                        )}
                      </div>

                      <div>
                        <label htmlFor="lastName" className="label">
                          Last Name <span className="text-error-500">*</span>
                        </label>
                        <input
                          id="lastName"
                          type="text"
                          className={`input ${errors.lastName ? 'border-error-500' : ''}`}
                          placeholder="Doe"
                          {...register('lastName', {
                            required: 'Last name is required',
                            minLength: {
                              value: 2,
                              message: 'Last name must be at least 2 characters'
                            }
                          })}
                          disabled={updateUserMutation.isLoading}
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Role */}
                    <div>
                      <label htmlFor="role" className="label">
                        <Shield className="w-4 h-4 mr-1" />
                        Role <span className="text-error-500">*</span>
                      </label>
                      <select
                        id="role"
                        className={`input ${errors.role ? 'border-error-500' : ''} ${isEditingSelf ? 'bg-secondary-50 cursor-not-allowed' : ''}`}
                        {...register('role', { required: 'Role is required' })}
                        disabled={updateUserMutation.isLoading || isEditingSelf}
                        title={isEditingSelf ? 'Cannot change your own role' : ''}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      {errors.role && (
                        <p className="mt-1 text-sm text-error-600">{errors.role.message}</p>
                      )}
                      {isEditingSelf && (
                        <p className="mt-1 text-xs text-secondary-500">
                          Cannot change your own role for security reasons
                        </p>
                      )}
                    </div>

                    {/* Manager (only for employee and manager roles) */}
                    {(selectedRole === 'employee' || selectedRole === 'manager') && (
                      <div>
                        <label htmlFor="managerId" className="label">
                          <Users className="w-4 h-4 mr-1" />
                          Manager {selectedRole === 'employee' && <span className="text-secondary-500">(optional)</span>}
                        </label>
                        <select
                          id="managerId"
                          className="input"
                          {...register('managerId')}
                          disabled={updateUserMutation.isLoading || managersLoading}
                        >
                          <option value="">No manager assigned</option>
                          {managersData
                            ?.filter(manager => manager.id !== user.id) // Can't be own manager
                            .map((manager) => (
                              <option key={manager.id} value={manager.id}>
                                {manager.firstName} {manager.lastName} ({manager.role})
                              </option>
                            ))}
                        </select>
                        {managersLoading && (
                          <p className="mt-1 text-xs text-secondary-500">Loading managers...</p>
                        )}
                      </div>
                    )}

                    {/* Department */}
                    <div>
                      <label htmlFor="department" className="label">
                        <Building className="w-4 h-4 mr-1" />
                        Department <span className="text-secondary-500">(optional)</span>
                      </label>
                      <input
                        id="department"
                        type="text"
                        className="input"
                        placeholder="Engineering, Sales, HR, etc."
                        {...register('department')}
                        disabled={updateUserMutation.isLoading}
                      />
                    </div>

                    {/* Active Status Toggle */}
                    <div>
                      <label className="label mb-2">
                        {isActive ? <ToggleRight className="w-4 h-4 mr-1" /> : <ToggleLeft className="w-4 h-4 mr-1" />}
                        Account Status
                      </label>
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          onClick={toggleActiveStatus}
                          disabled={updateUserMutation.isLoading || isEditingSelf}
                          className={`
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                            ${isActive ? 'bg-success-500' : 'bg-secondary-300'}
                            ${(updateUserMutation.isLoading || isEditingSelf) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                          title={isEditingSelf ? 'Cannot change your own status' : ''}
                        >
                          <span
                            className={`
                              inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                              ${isActive ? 'translate-x-6' : 'translate-x-1'}
                            `}
                          />
                        </button>
                        <span className={`text-sm font-medium ${isActive ? 'text-success-700' : 'text-secondary-600'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      {isEditingSelf && (
                        <p className="mt-1 text-xs text-secondary-500">
                          Cannot change your own account status for security reasons
                        </p>
                      )}
                      {!isEditingSelf && (
                        <p className="mt-1 text-xs text-secondary-500">
                          Inactive users cannot log in to the system
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleClose}
                      disabled={updateUserMutation.isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={updateUserMutation.isLoading}
                    >
                      {updateUserMutation.isLoading ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⏳</span>
                          Updating User...
                        </>
                      ) : (
                        <>
                          <Edit className="w-4 h-4 mr-2" />
                          Update User
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

export default EditUserModal
