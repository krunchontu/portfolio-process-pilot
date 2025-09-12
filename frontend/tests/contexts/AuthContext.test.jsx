import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { AuthProvider, useAuth } from '../../src/contexts/AuthContext'
import { authAPI } from '../../src/services/api'

// Mock the API
vi.mock('../../src/services/api', () => ({
  authAPI: {
    login: vi.fn(),
    logout: vi.fn(),
    getProfile: vi.fn(),
    register: vi.fn(),
    changePassword: vi.fn()
  }
}))

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Test component to access auth context
const TestComponent = () => {
  const auth = useAuth()
  return (
    <div>
      <div data-testid="isAuthenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="isLoading">{auth.isLoading.toString()}</div>
      <div data-testid="user">{auth.user ? JSON.stringify(auth.user) : 'null'}</div>
      <button onClick={() => auth.login({ email: 'test@example.com', password: 'password' })}>
        Login
      </button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  )
}

describe('AuthContext with Cookie Authentication', () => {
  let queryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false
        }
      }
    })
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  const renderWithProviders = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      </QueryClientProvider>
    )
  }

  describe('Initial State', () => {
    it('should initialize with loading state', () => {
      // Mock getProfile to return pending promise
      authAPI.getProfile.mockImplementation(() => new Promise(() => {}))

      renderWithProviders()

      expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
      expect(screen.getByTestId('isLoading')).toHaveTextContent('true')
      expect(screen.getByTestId('user')).toHaveTextContent('null')
    })

    it('should not check localStorage for tokens', () => {
      const getItemSpy = vi.spyOn(localStorage, 'getItem')

      renderWithProviders()

      // Should not access localStorage for access_token or refresh_token
      expect(getItemSpy).not.toHaveBeenCalledWith('access_token')
      expect(getItemSpy).not.toHaveBeenCalledWith('refresh_token')

      getItemSpy.mockRestore()
    })
  })

  describe('Profile Loading (Cookie-based)', () => {
    it('should load user profile on mount using cookies', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee'
      }

      authAPI.getProfile.mockResolvedValue({
        data: { user: mockUser }
      })

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Should call getProfile which relies on cookies
      expect(authAPI.getProfile).toHaveBeenCalledTimes(1)
    })

    it('should handle profile load failure and logout user', async () => {
      authAPI.getProfile.mockRejectedValue({
        response: { status: 401 }
      })

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
        expect(screen.getByTestId('isLoading')).toHaveTextContent('false')
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })
  })

  describe('Login Flow (Cookie-based)', () => {
    it('should login user without storing tokens locally', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee'
      }

      // Mock successful login response (no tokens in response)
      authAPI.login.mockResolvedValue({
        data: {
          user: mockUser
          // No tokens property - they're in httpOnly cookies
        }
      })

      renderWithProviders()

      // Mock localStorage to verify no token storage
      const setItemSpy = vi.spyOn(localStorage, 'setItem')

      // Trigger login
      const loginButton = screen.getByText('Login')
      loginButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Verify no tokens were stored in localStorage
      expect(setItemSpy).not.toHaveBeenCalledWith('access_token', expect.anything())
      expect(setItemSpy).not.toHaveBeenCalledWith('refresh_token', expect.anything())

      setItemSpy.mockRestore()
    })

    it('should handle login failure', async () => {
      authAPI.login.mockRejectedValue({
        response: {
          data: { error: 'Invalid credentials' }
        }
      })

      renderWithProviders()

      const loginButton = screen.getByText('Login')
      loginButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })
  })

  describe('Logout Flow (Cookie-based)', () => {
    it('should logout user and clear state without touching localStorage', async () => {
      // Setup authenticated user first
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }

      authAPI.getProfile.mockResolvedValue({
        data: { user: mockUser }
      })

      authAPI.logout.mockResolvedValue({})

      renderWithProviders()

      // Wait for initial profile load
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })

      // Mock localStorage to verify no token removal
      const removeItemSpy = vi.spyOn(localStorage, 'removeItem')

      // Trigger logout
      const logoutButton = screen.getByText('Logout')
      logoutButton.click()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })

      // Verify localStorage was not accessed for token removal
      expect(removeItemSpy).not.toHaveBeenCalledWith('access_token')
      expect(removeItemSpy).not.toHaveBeenCalledWith('refresh_token')

      // But logout API should have been called to clear httpOnly cookies
      expect(authAPI.logout).toHaveBeenCalledTimes(1)

      removeItemSpy.mockRestore()
    })

    it('should logout even if API call fails', async () => {
      // Setup authenticated user first
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User'
      }

      authAPI.getProfile.mockResolvedValue({
        data: { user: mockUser }
      })

      authAPI.logout.mockRejectedValue(new Error('Network error'))

      renderWithProviders()

      // Wait for initial profile load
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })

      // Trigger logout
      const logoutButton = screen.getByText('Logout')
      logoutButton.click()

      // Should still clear local state even if API call fails
      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false')
        expect(screen.getByTestId('user')).toHaveTextContent('null')
      })
    })
  })

  describe('Role-based Access', () => {
    const setupAuthenticatedUser = async (role = 'employee') => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role
      }

      authAPI.getProfile.mockResolvedValue({
        data: { user: mockUser }
      })

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
      })

      return mockUser
    }

    it('should provide role checking functions', async () => {
      await setupAuthenticatedUser('manager')

      // Access role functions through a test component
      const RoleTestComponent = () => {
        const { hasRole, isManager, isAdmin, isEmployee } = useAuth()
        return (
          <div>
            <div data-testid="hasManager">{hasRole('manager').toString()}</div>
            <div data-testid="isManager">{isManager().toString()}</div>
            <div data-testid="isAdmin">{isAdmin().toString()}</div>
            <div data-testid="isEmployee">{isEmployee().toString()}</div>
          </div>
        )
      }

      render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RoleTestComponent />
          </AuthProvider>
        </QueryClientProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('hasManager')).toHaveTextContent('true')
        expect(screen.getByTestId('isManager')).toHaveTextContent('true')
        expect(screen.getByTestId('isAdmin')).toHaveTextContent('false')
        expect(screen.getByTestId('isEmployee')).toHaveTextContent('false')
      })
    })
  })

  describe('Security Features', () => {
    it('should not expose sensitive user data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'employee'
      }

      authAPI.getProfile.mockResolvedValue({
        data: { user: mockUser }
      })

      renderWithProviders()

      await waitFor(() => {
        expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true')
        const userData = screen.getByTestId('user').textContent
        expect(userData).not.toContain('passwordHash')
      })
    })
  })
})
