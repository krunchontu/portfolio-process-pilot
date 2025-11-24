import React, { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X, UserPlus, Mail, User, Lock, Shield, Users, Building } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import { usersAPI } from '../services/api'

const CreateUserModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      role: 'employee',
      managerId: '',
      department: ''
    }
  })

  const selectedRole = watch('role')

  // Fetch potential managers (users with manager or admin role)
  const { data: managersData, isLoading: managersLoading } = useQuery(
    ['users', 'managers'],
    () => usersAPI.list({ role: 'manager,admin', limit: 100 }),
    {
      select: data => data.data?.users || [],
      enabled: isOpen && (selectedRole === 'employee' || selectedRole === 'manager')
    }
  )

  const createUserMutation = useMutation(
    (data) => usersAPI.create(data),
    {
      onSuccess: (response) => {
        toast.success('User created successfully')
        // Invalidate and refetch users list
        queryClient.invalidateQueries(['users'])
        handleClose()
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to create user'
        toast.error(message)
      }
    }
  )

  const onSubmit = async (data) => {
    try {
      // Clean up data before sending
      const payload = {
        email: data.email.trim(),
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        password: data.password,
        role: data.role,
        department: data.department.trim() || undefined,
        managerId: data.managerId || undefined
      }

      await createUserMutation.mutateAsync(payload)
    } catch (error) {
      // Error handled by mutation
      console.error('Create user error:', error)
    }
  }

  const handleClose = () => {
    if (!createUserMutation.isLoading) {
      reset()
      onClose()
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-2">
                    <UserPlus className="w-6 h-6 text-primary-500" />
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-semibold text-secondary-900"
                    >
                      Create New User
                    </Dialog.Title>
                  </div>
                  <button
                    type="button"
                    className="text-secondary-400 hover:text-secondary-600 transition-colors"
                    onClick={handleClose}
                    disabled={createUserMutation.isLoading}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="space-y-4 mb-6">
                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="label">
                        <Mail className="w-4 h-4 mr-1" />
                        Email Address <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="email"
                        type="email"
                        className={`input ${errors.email ? 'border-error-500' : ''}`}
                        placeholder="user@example.com"
                        {...register('email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        disabled={createUserMutation.isLoading}
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-error-600">{errors.email.message}</p>
                      )}
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
                          disabled={createUserMutation.isLoading}
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
                          disabled={createUserMutation.isLoading}
                        />
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-error-600">{errors.lastName.message}</p>
                        )}
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label htmlFor="password" className="label">
                        <Lock className="w-4 h-4 mr-1" />
                        Password <span className="text-error-500">*</span>
                      </label>
                      <input
                        id="password"
                        type="password"
                        className={`input ${errors.password ? 'border-error-500' : ''}`}
                        placeholder="Minimum 8 characters"
                        {...register('password', {
                          required: 'Password is required',
                          minLength: {
                            value: 8,
                            message: 'Password must be at least 8 characters'
                          }
                        })}
                        disabled={createUserMutation.isLoading}
                      />
                      {errors.password && (
                        <p className="mt-1 text-sm text-error-600">{errors.password.message}</p>
                      )}
                      <p className="mt-1 text-xs text-secondary-500">
                        Must be at least 8 characters long
                      </p>
                    </div>

                    {/* Role */}
                    <div>
                      <label htmlFor="role" className="label">
                        <Shield className="w-4 h-4 mr-1" />
                        Role <span className="text-error-500">*</span>
                      </label>
                      <select
                        id="role"
                        className={`input ${errors.role ? 'border-error-500' : ''}`}
                        {...register('role', { required: 'Role is required' })}
                        disabled={createUserMutation.isLoading}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                      {errors.role && (
                        <p className="mt-1 text-sm text-error-600">{errors.role.message}</p>
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
                          disabled={createUserMutation.isLoading || managersLoading}
                        >
                          <option value="">No manager assigned</option>
                          {managersData?.map((manager) => (
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
                        disabled={createUserMutation.isLoading}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={handleClose}
                      disabled={createUserMutation.isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={createUserMutation.isLoading}
                    >
                      {createUserMutation.isLoading ? (
                        <>
                          <span className="inline-block animate-spin mr-2">⏳</span>
                          Creating User...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create User
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

export default CreateUserModal
