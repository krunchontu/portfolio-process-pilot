import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Token management
let tokenRefreshPromise = null

const getAuthToken = () => {
  return localStorage.getItem('access_token')
}

const getRefreshToken = () => {
  return localStorage.getItem('refresh_token')
}

const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem('access_token', accessToken)
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken)
  }
}

const clearTokens = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add request ID for debugging
    config.metadata = { 
      requestStartedAt: new Date().getTime(),
      requestId: Math.random().toString(36).substring(7)
    }
    
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    // Log response time in development
    if (import.meta.env.DEV && response.config.metadata) {
      const responseTime = new Date().getTime() - response.config.metadata.requestStartedAt
      console.log(
        `🚀 ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status} (${responseTime}ms)`
      )
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config
    
    // Handle token expiration
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      
      // If already refreshing token, wait for it
      if (tokenRefreshPromise) {
        await tokenRefreshPromise
        return api(originalRequest)
      }
      
      const refreshToken = getRefreshToken()
      if (refreshToken) {
        tokenRefreshPromise = refreshAccessToken(refreshToken)
        
        try {
          const newToken = await tokenRefreshPromise
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return api(originalRequest)
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError)
          clearTokens()
          window.location.href = '/login'
          return Promise.reject(refreshError)
        } finally {
          tokenRefreshPromise = null
        }
      } else {
        // No refresh token, redirect to login
        clearTokens()
        window.location.href = '/login'
      }
    }
    
    // Handle different error types
    if (error.code === 'ECONNABORTED') {
      toast.error('Request timeout. Please check your connection.')
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.')
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please slow down.')
    } else if (!error.response) {
      toast.error('Network error. Please check your connection.')
    }
    
    // Log error in development
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url: error.config?.url,
        method: error.config?.method,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      })
    }
    
    return Promise.reject(error)
  }
)

// Refresh access token
const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await axios.post('/api/auth/refresh', {
      refresh_token: refreshToken
    })
    
    const { access_token } = response.data
    setTokens(access_token, refreshToken)
    
    return access_token
  } catch (error) {
    clearTokens()
    throw error
  }
}

// API methods
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
}

export const requestsAPI = {
  list: (params) => api.get('/requests', { params }),
  create: (data) => api.post('/requests', data),
  getById: (id) => api.get(`/requests/${id}`),
  takeAction: (id, data) => api.post(`/requests/${id}/action`, data),
  cancel: (id, data) => api.post(`/requests/${id}/cancel`, data),
  getHistory: (id) => api.get(`/requests/${id}/history`),
}

export const workflowsAPI = {
  list: () => api.get('/workflows'),
  create: (data) => api.post('/workflows', data),
  getById: (id) => api.get(`/workflows/${id}`),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  delete: (id) => api.delete(`/workflows/${id}`),
}

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
}

export const analyticsAPI = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getMetrics: (params) => api.get('/analytics/metrics', { params }),
  getReports: (params) => api.get('/analytics/reports', { params }),
}

// Utility functions
export const handleApiError = (error) => {
  const message = error.response?.data?.error || error.message || 'An unexpected error occurred'
  const code = error.response?.data?.code
  
  return {
    message,
    code,
    status: error.response?.status,
    details: error.response?.data?.details
  }
}

export const isNetworkError = (error) => {
  return !error.response && error.code !== 'ECONNABORTED'
}

export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403
}

// Export token management functions
export { setTokens, clearTokens, getAuthToken }

export default api