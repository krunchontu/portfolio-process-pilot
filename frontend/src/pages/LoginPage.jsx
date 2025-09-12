import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false)
  const { login, isSubmitting, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch
  } = useForm({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: ''
    }
  })

  // Clear auth errors when form changes
  const watchedFields = watch()
  useEffect(() => {
    if (error) {
      clearError()
    }
  }, [watchedFields, error, clearError])

  const onSubmit = async (data) => {
    try {
      await login(data)
      navigate(from, { replace: true })
    } catch (err) {
      // Error is handled by auth context
      console.error('Login failed:', err)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-mesh py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mb-4">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h2 className="text-3xl font-bold text-secondary-900 mb-2">
              Welcome back
            </h2>
            <p className="text-secondary-600">
              Sign in to your ProcessPilot account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" data-testid="login-form">
            {/* Global Error */}
            {error && (
              <div
                className="flex items-center p-4 bg-error-50 border border-error-200 rounded-lg"
                data-testid="login-error"
              >
                <AlertCircle className="w-5 h-5 text-error-500 mr-3 flex-shrink-0" />
                <p className="text-error-700 text-sm">{error}</p>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                type="email"
                id="email"
                name="email"
                autoComplete="email"
                className={errors.email ? 'input-error' : 'input'}
                placeholder="Enter your email"
                data-testid="email-input"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-error-600" data-testid="email-error">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                  className={errors.password ? 'input-error pr-10' : 'input pr-10'}
                  placeholder="Enter your password"
                  data-testid="password-input"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  data-testid="toggle-password"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-secondary-400 hover:text-secondary-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-error-600" data-testid="password-error">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !isValid}
              className="w-full btn-primary py-3 text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="login-button"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <LoadingSpinner size="sm" variant="white" className="mr-2" />
                  Signing in...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign in
                </div>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-secondary-600">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="text-primary-600 hover:text-primary-700 font-medium"
                data-testid="register-link"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Credentials */}
        {import.meta.env.DEV && (
          <div className="mt-6 p-4 bg-warning-50 border border-warning-200 rounded-lg">
            <h3 className="font-medium text-warning-800 mb-2">Demo Credentials</h3>
            <div className="text-sm text-warning-700 space-y-1">
              <p><strong>Employee:</strong> employee.jane@processpilot.com / password123</p>
              <p><strong>Manager:</strong> manager.hr@processpilot.com / password123</p>
              <p><strong>Admin:</strong> admin@processpilot.com / password123</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default LoginPage
