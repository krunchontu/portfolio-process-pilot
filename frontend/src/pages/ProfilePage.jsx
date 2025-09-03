import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import { Eye, EyeOff, User, Save, Key } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

const ProfilePage = () => {
  const { user, updateUser, changePassword, isSubmitting } = useAuth()
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Profile form
  const profileForm = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      department: user?.department || ''
    }
  })

  // Password form
  const passwordForm = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  })

  const onProfileSubmit = async (data) => {
    try {
      await updateUser(data)
    } catch (error) {
      console.error('Profile update failed:', error)
    }
  }

  const onPasswordSubmit = async (data) => {
    try {
      await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      })
      passwordForm.reset()
    } catch (error) {
      console.error('Password change failed:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Profile Settings</h1>
        <p className="text-secondary-600 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-secondary-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Profile
          </button>

          <button
            onClick={() => setActiveTab('password')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'password'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-secondary-500 hover:text-secondary-700 hover:border-secondary-300'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Change Password
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card">
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">First name</label>
                <input
                  {...profileForm.register('firstName', { required: true })}
                  type="text"
                  className="input"
                  disabled
                />
              </div>

              <div>
                <label className="label">Last name</label>
                <input
                  {...profileForm.register('lastName', { required: true })}
                  type="text"
                  className="input"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                {...profileForm.register('email')}
                type="email"
                className="input bg-secondary-50"
                disabled
              />
              <p className="text-sm text-secondary-500 mt-1">
                Email cannot be changed. Contact your administrator if needed.
              </p>
            </div>

            <div>
              <label className="label">Department</label>
              <input
                {...profileForm.register('department')}
                type="text"
                className="input bg-secondary-50"
                disabled
              />
            </div>

            <div>
              <label className="label">Role</label>
              <input
                type="text"
                value={user?.role || ''}
                className="input bg-secondary-50 capitalize"
                disabled
              />
            </div>

            <div className="flex justify-end">
              <p className="text-sm text-secondary-500">
                Profile information is managed by your administrator.
              </p>
            </div>
          </form>
        </div>
      )}

      {/* Password Tab */}
      {activeTab === 'password' && (
        <div className="card">
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
            <div>
              <label className="label">Current password</label>
              <div className="relative">
                <input
                  {...passwordForm.register('currentPassword', { required: true })}
                  type={showCurrentPassword ? 'text' : 'password'}
                  className="input pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5 text-secondary-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-secondary-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input
                  {...passwordForm.register('newPassword', {
                    required: true,
                    minLength: 8
                  })}
                  type={showNewPassword ? 'text' : 'password'}
                  className="input pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-secondary-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-secondary-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirm new password</label>
              <input
                {...passwordForm.register('confirmPassword', {
                  required: true,
                  validate: (value) =>
                    value === passwordForm.watch('newPassword') || 'Passwords do not match'
                })}
                type="password"
                className="input"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !passwordForm.formState.isValid}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" variant="white" className="mr-2" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Change Password
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default ProfilePage
