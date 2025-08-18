import React from 'react'
import { render as rtlRender } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { vi } from 'vitest'

// Create a custom render function that includes providers
export function render(ui, options = {}) {
  const {
    initialEntries = ['/'],
    user = null,
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options

  // Mock auth context
  const MockAuthProvider = ({ children }) => {
    const mockAuthContext = {
      isAuthenticated: !!user,
      user: user,
      isLoading: false,
      error: null,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      changePassword: vi.fn(),
      updateUser: vi.fn(),
      clearError: vi.fn(),
      hasRole: vi.fn((role) => user?.role === role),
      hasAnyRole: vi.fn((roles) => roles.includes(user?.role)),
      isEmployee: vi.fn(() => user?.role === 'employee'),
      isManager: vi.fn(() => user?.role === 'manager'),
      isAdmin: vi.fn(() => user?.role === 'admin'),
      isManagerOrAdmin: vi.fn(() => ['manager', 'admin'].includes(user?.role)),
      isSubmitting: false
    }

    return (
      <div data-testid="mock-auth-provider">
        {React.cloneElement(children, { authContext: mockAuthContext })}
      </div>
    )
  }

  function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MockAuthProvider>
            {children}
          </MockAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient
  }
}

// Create a test query client
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  })
}

// Mock auth context hook
export const createMockAuthContext = (user = null, overrides = {}) => ({
  isAuthenticated: !!user,
  user,
  isLoading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  changePassword: vi.fn(),
  updateUser: vi.fn(),
  clearError: vi.fn(),
  hasRole: vi.fn((role) => user?.role === role),
  hasAnyRole: vi.fn((roles) => roles.includes(user?.role)),
  isEmployee: vi.fn(() => user?.role === 'employee'),
  isManager: vi.fn(() => user?.role === 'manager'),
  isAdmin: vi.fn(() => user?.role === 'admin'),
  isManagerOrAdmin: vi.fn(() => ['manager', 'admin'].includes(user?.role)),
  isSubmitting: false,
  ...overrides
})

// Mock API responses
export const mockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {},
})

export const mockApiError = (message, status = 400, code = 'API_ERROR') => {
  const error = new Error(message)
  error.response = {
    data: { error: message, code },
    status,
    statusText: 'Bad Request'
  }
  return error
}

// Wait for loading states
export const waitForLoadingToFinish = () =>
  new Promise((resolve) => setTimeout(resolve, 0))

// Custom matchers
expect.extend({
  toHaveFormError(received, fieldName, expectedError) {
    const field = received.querySelector(`[name="${fieldName}"]`)
    if (!field) {
      return {
        message: () => `Expected to find form field with name "${fieldName}"`,
        pass: false,
      }
    }

    const errorElement = received.querySelector(`[data-testid="${fieldName}-error"]`)
    if (!errorElement) {
      return {
        message: () => `Expected to find error element for field "${fieldName}"`,
        pass: false,
      }
    }

    const hasError = errorElement.textContent.includes(expectedError)
    return {
      message: () => 
        hasError
          ? `Expected field "${fieldName}" not to have error "${expectedError}"`
          : `Expected field "${fieldName}" to have error "${expectedError}", but got "${errorElement.textContent}"`,
      pass: hasError,
    }
  }
})

// Re-export everything from React Testing Library
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'