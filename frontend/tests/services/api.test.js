import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import axios from 'axios'
import api, { authAPI } from '../../src/services/api'

// Mock axios
vi.mock('axios')

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock window.location
delete window.location
window.location = { href: '' }

describe('API Service with Cookie Authentication', () => {
  let mockAxios
  let mockAxiosInstance

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Mock axios instance
    mockAxiosInstance = {
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    }

    // Mock axios.create
    mockAxios = vi.mocked(axios)
    mockAxios.create.mockReturnValue(mockAxiosInstance)
    mockAxios.post = vi.fn()

    window.location.href = ''
  })

  describe('Axios Instance Configuration', () => {
    it('should create axios instance with withCredentials for cookies', () => {
      // Re-import to trigger axios.create
      vi.resetModules()
      require('../../src/services/api')

      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true,
          baseURL: expect.any(String),
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      )
    })
  })

  describe('Request Interceptor', () => {
    it('should not add Authorization header for cookie-based auth', () => {
      // Get the request interceptor
      const requestInterceptorCall = mockAxiosInstance.interceptors.request.use.mock.calls[0]
      expect(requestInterceptorCall).toBeDefined()

      const [requestInterceptor] = requestInterceptorCall

      const mockConfig = { headers: {} }
      const result = requestInterceptor(mockConfig)

      // Should not add Authorization header
      expect(result.headers.Authorization).toBeUndefined()

      // Should add metadata for debugging
      expect(result.metadata).toBeDefined()
      expect(result.metadata.requestStartedAt).toBeDefined()
      expect(result.metadata.requestId).toBeDefined()
    })
  })

  describe('Response Interceptor - Token Refresh', () => {
    let responseInterceptor
    let errorHandler

    beforeEach(() => {
      // Get the response interceptor
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      expect(interceptorCall).toBeDefined()

      ;[responseInterceptor, errorHandler] = interceptorCall
    })

    it('should handle successful responses normally', () => {
      const mockResponse = {
        status: 200,
        data: { success: true },
        config: {
          method: 'GET',
          url: '/api/test',
          metadata: { requestStartedAt: Date.now() }
        }
      }

      const result = responseInterceptor(mockResponse)
      expect(result).toBe(mockResponse)
    })

    it('should handle 401 errors with cookie-based refresh', async () => {
      // Mock the refresh API call
      mockAxios.post.mockResolvedValue({
        data: { success: true }
      })

      // Mock the retry call
      const mockRetryCall = vi.fn().mockResolvedValue({ data: 'success' })

      const mockError = {
        response: { status: 401 },
        config: { _retry: false }
      }

      // Mock api function for retry
      const originalApi = api
      const apiMock = vi.fn().mockResolvedValue({ data: 'success' })

      // Call error handler
      await expect(errorHandler(mockError)).rejects.toThrow()

      // Should have attempted refresh with cookies
      expect(mockAxios.post).toHaveBeenCalledWith(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      )
    })

    it('should redirect to login on refresh failure', async () => {
      // Mock failed refresh
      mockAxios.post.mockRejectedValue(new Error('Refresh failed'))

      const mockError = {
        response: { status: 401 },
        config: { _retry: false }
      }

      await expect(errorHandler(mockError)).rejects.toThrow()

      // Should redirect to login
      expect(window.location.href).toBe('/login')
    })

    it('should not retry if already retried', async () => {
      const mockError = {
        response: { status: 401 },
        config: { _retry: true }
      }

      await expect(errorHandler(mockError)).rejects.toBe(mockError)

      // Should not attempt refresh
      expect(mockAxios.post).not.toHaveBeenCalled()
    })
  })

  describe('Authentication API', () => {
    beforeEach(() => {
      mockAxiosInstance.post.mockClear()
      mockAxiosInstance.get.mockClear()
    })

    it('should login without expecting tokens in response', async () => {
      const mockLoginResponse = {
        data: {
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User'
            // No tokens - they're in httpOnly cookies
          }
        }
      }

      mockAxiosInstance.post.mockResolvedValue(mockLoginResponse)

      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      }

      const result = await authAPI.login(credentials)

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/login', credentials)
      expect(result.data.user).toBeDefined()
      expect(result.data.tokens).toBeUndefined()
    })

    it('should logout by calling API endpoint', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } })

      await authAPI.logout()

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout')
    })

    it('should get profile using cookies for authentication', async () => {
      const mockProfileResponse = {
        data: {
          success: true,
          user: {
            id: '1',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User'
          }
        }
      }

      mockAxiosInstance.get.mockResolvedValue(mockProfileResponse)

      const result = await authAPI.getProfile()

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me')
      expect(result.data.user).toBeDefined()
    })

    it('should refresh tokens using cookies only', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { success: true } })

      await authAPI.refreshToken()

      // Should call refresh endpoint without any token in body
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/refresh')
    })
  })

  describe('Security Features', () => {
    it('should not expose token management functions', () => {
      // These functions should not exist in cookie-based implementation
      const apiModule = require('../../src/services/api')

      expect(apiModule.setTokens).toBeUndefined()
      expect(apiModule.getAuthToken).toBeUndefined()
      expect(apiModule.clearTokens).toBeUndefined()
    })

    it('should include credentials in all requests', () => {
      expect(mockAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          withCredentials: true
        })
      )
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0]
      ;[, errorHandler] = interceptorCall
    })

    it('should handle network errors', async () => {
      const networkError = {
        code: 'ECONNABORTED'
      }

      await expect(errorHandler(networkError)).rejects.toBe(networkError)
    })

    it('should handle server errors', async () => {
      const serverError = {
        response: { status: 500 }
      }

      await expect(errorHandler(serverError)).rejects.toBe(serverError)
    })

    it('should handle rate limiting', async () => {
      const rateLimitError = {
        response: { status: 429 }
      }

      await expect(errorHandler(rateLimitError)).rejects.toBe(rateLimitError)
    })
  })
})
