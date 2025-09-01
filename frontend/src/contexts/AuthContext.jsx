import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { authAPI } from '../services/api'
import { toast } from 'react-hot-toast'

// Auth context
const AuthContext = createContext(null)

// Auth state and actions
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true, error: null }

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        user: action.payload.user,
        error: null
      }

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        error: action.payload
      }

    case 'LOGOUT':
      return {
        ...state,
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null
      }

    case 'UPDATE_USER':
      return {
        ...state,
        user: { ...state.user, ...action.payload }
      }

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    default:
      return state
  }
}

const initialState = {
  isAuthenticated: false,
  user: null,
  isLoading: true,
  error: null
}

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState)
  const queryClient = useQueryClient()

  // Query to get current user profile (relies on cookies)
  const { data: userData, isLoading: isLoadingProfile } = useQuery(
    'profile',
    authAPI.getProfile,
    {
      retry: false,
      onSuccess: (response) => {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user: response.data.user }
        })
      },
      onError: (error) => {
        if (error.response?.status === 401) {
          dispatch({ type: 'LOGOUT' })
        }
      }
    }
  )

  // Login mutation
  const loginMutation = useMutation(authAPI.login, {
    onMutate: () => {
      dispatch({ type: 'LOGIN_START' })
    },
    onSuccess: (response) => {
      const { user } = response.data

      // Update state (tokens handled by cookies)
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user }
      })

      // Invalidate profile query to refetch
      queryClient.invalidateQueries('profile')

      toast.success(`Welcome back, ${user.firstName}!`)
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Login failed'
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: errorMessage
      })
      toast.error(errorMessage)
    }
  })

  // Register mutation
  const registerMutation = useMutation(authAPI.register, {
    onSuccess: (response) => {
      toast.success('Registration successful! Please log in.')
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Registration failed'
      toast.error(errorMessage)
    }
  })

  // Logout mutation
  const logoutMutation = useMutation(authAPI.logout, {
    onSuccess: () => {
      dispatch({ type: 'LOGOUT' })
      queryClient.clear()
      toast.success('Logged out successfully')
    },
    onError: () => {
      // Even if API call fails, clear local state
      dispatch({ type: 'LOGOUT' })
      queryClient.clear()
    }
  })

  // Password change mutation
  const changePasswordMutation = useMutation(authAPI.changePassword, {
    onSuccess: () => {
      toast.success('Password changed successfully')
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Password change failed'
      toast.error(errorMessage)
    }
  })

  // Initialize auth state on app load (cookie-based)
  useEffect(() => {
    // Auth state will be determined by profile query
    // No localStorage check needed
  }, [])

  // Update loading state based on profile query
  useEffect(() => {
    dispatch({ type: 'SET_LOADING', payload: isLoadingProfile })
  }, [isLoadingProfile])

  // Auth methods
  const login = (credentials) => {
    return loginMutation.mutate(credentials)
  }

  const register = (userData) => {
    return registerMutation.mutate(userData)
  }

  const logout = () => {
    return logoutMutation.mutate()
  }

  const changePassword = (data) => {
    return changePasswordMutation.mutate(data)
  }

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData })
  }

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' })
  }

  // Helper functions
  const hasRole = (role) => {
    return state.user?.role === role
  }

  const hasAnyRole = (roles) => {
    return roles.includes(state.user?.role)
  }

  const isEmployee = () => hasRole('employee')
  const isManager = () => hasRole('manager')
  const isAdmin = () => hasRole('admin')
  const isManagerOrAdmin = () => hasAnyRole(['manager', 'admin'])

  const value = {
    ...state,
    login,
    register,
    logout,
    changePassword,
    updateUser,
    clearError,
    hasRole,
    hasAnyRole,
    isEmployee,
    isManager,
    isAdmin,
    isManagerOrAdmin,
    isSubmitting: loginMutation.isLoading || registerMutation.isLoading || logoutMutation.isLoading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
