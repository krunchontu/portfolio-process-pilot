import axios from 'axios'
import { toast } from 'react-hot-toast'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000,
  withCredentials: true, // Include cookies in all requests
  headers: {
    'Content-Type': 'application/json'
  }
})

// Token refresh management (cookies handled by browser)
let tokenRefreshPromise = null

// Request interceptor for debugging (auth handled by cookies)
api.interceptors.request.use(
  (config) => {
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

    // Handle token expiration (cookie-based)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      // If already refreshing token, wait for it
      if (tokenRefreshPromise) {
        await tokenRefreshPromise
        return api(originalRequest)
      }

      // Try to refresh token using cookies
      tokenRefreshPromise = refreshAccessToken()

      try {
        await tokenRefreshPromise
        return api(originalRequest)
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError)
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        tokenRefreshPromise = null
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

// Refresh access token using cookies
const refreshAccessToken = async () => {
  try {
    const response = await axios.post('/api/auth/refresh', {}, {
      withCredentials: true
    })

    return response.data
  } catch (error) {
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
  refreshToken: () => api.post('/auth/refresh')
}

export const requestsAPI = {
  list: (params) => api.get('/requests', { params }),
  create: (data) => api.post('/requests', data),
  get: (id) => api.get(`/requests/${id}`),
  getById: (id) => api.get(`/requests/${id}`),
  action: (id, action, data) => api.post(`/requests/${id}/action`, { action, ...data }),
  takeAction: (id, data) => api.post(`/requests/${id}/action`, data),
  cancel: (id, data) => api.post(`/requests/${id}/cancel`, data),
  getHistory: (id) => api.get(`/requests/${id}/history`)
}

export const workflowsAPI = {
  list: () => api.get('/workflows'),
  create: (data) => api.post('/workflows', data),
  getById: (id) => api.get(`/workflows/${id}`),
  update: (id, data) => api.put(`/workflows/${id}`, data),
  delete: (id) => api.delete(`/workflows/${id}`)
}

export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

export const analyticsAPI = {
  getOverview: (params) => api.get('/analytics/overview', { params }),
  getMetrics: (params) => api.get('/analytics/metrics', { params }),
  getReports: (params) => api.get('/analytics/reports', { params })
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

// Cookie-based authentication - no token management functions needed

export default api
