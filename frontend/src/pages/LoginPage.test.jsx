import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, userEvent, setupAuthContextMock } from '../test/test-utils'
import LoginPage from './LoginPage'

// Mock the auth context
const mockLogin = vi.fn()
const mockClearError = vi.fn()

// Mock useNavigate and useLocation
const mockNavigate = vi.fn()
const mockLocation = { state: null }

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
  }
})

describe('LoginPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockLocation.state = null
  })

  const renderLoginPage = (authContextOverrides = {}) => {
    const defaultContext = {
      login: mockLogin,
      isSubmitting: false,
      error: null,
      clearError: mockClearError,
      isAuthenticated: false,
      user: null,
      isLoading: false,
      ...authContextOverrides
    }

    setupAuthContextMock(defaultContext.user, defaultContext)

    return render(<LoginPage />, { user: defaultContext.user })
  }

  describe('Rendering', () => {
    it('should render login form with all required fields', () => {
      renderLoginPage()

      expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
      expect(screen.getByText('Sign in to your ProcessPilot account')).toBeInTheDocument()
      expect(screen.getByTestId('login-form')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('login-button')).toBeInTheDocument()
      expect(screen.getByTestId('register-link')).toBeInTheDocument()
    })

    it('should display ProcessPilot branding', () => {
      renderLoginPage()

      expect(screen.getByText('P')).toBeInTheDocument() // Logo
    })

    it('should show demo credentials in development', () => {
      // Mock development environment
      import.meta.env.DEV = true

      renderLoginPage()

      expect(screen.getByText('Demo Credentials')).toBeInTheDocument()
      expect(screen.getByText(/employee.jane@processpilot.com/)).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should validate email field', async () => {
      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')

      // Empty email
      await user.click(emailInput)
      await user.tab() // Trigger blur

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email is required')
      })

      // Invalid email format
      await user.type(emailInput, 'invalid-email')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email address')
      })

      // Valid email
      await user.clear(emailInput)
      await user.type(emailInput, 'test@example.com')

      await waitFor(() => {
        expect(screen.queryByTestId('email-error')).not.toBeInTheDocument()
      })
    })

    it('should validate password field', async () => {
      renderLoginPage()

      const passwordInput = screen.getByTestId('password-input')

      // Empty password
      await user.click(passwordInput)
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password is required')
      })

      // Too short password
      await user.type(passwordInput, '123')
      await user.tab()

      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 6 characters')
      })

      // Valid password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'password123')

      await waitFor(() => {
        expect(screen.queryByTestId('password-error')).not.toBeInTheDocument()
      })
    })

    it('should disable submit button when form is invalid', () => {
      renderLoginPage()

      const submitButton = screen.getByTestId('login-button')
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when form is valid', async () => {
      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      await waitFor(() => {
        const submitButton = screen.getByTestId('login-button')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })

  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      renderLoginPage()

      const passwordInput = screen.getByTestId('password-input')
      const toggleButton = screen.getByTestId('toggle-password')

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click toggle to show password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click toggle to hide password
      await user.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Form Submission', () => {
    it('should call login function with form data', async () => {
      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('login-button')

      // Fill form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')

      // Submit form
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    it('should navigate to dashboard after successful login', async () => {
      mockLogin.mockResolvedValueOnce()
      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('login-button')

      // Fill and submit form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true })
      })
    })

    it('should navigate to intended page after login', async () => {
      mockLogin.mockResolvedValueOnce()
      mockLocation.state = { from: { pathname: '/requests' } }

      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('login-button')

      // Fill and submit form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/requests', { replace: true })
      })
    })

    it('should show loading state during submission', async () => {
      renderLoginPage({ isSubmitting: true })

      const submitButton = screen.getByTestId('login-button')

      expect(submitButton).toHaveTextContent('Signing in...')
      expect(submitButton).toBeDisabled()
    })

    it('should handle login failure', async () => {
      const errorMessage = 'Invalid credentials'
      mockLogin.mockRejectedValueOnce(new Error(errorMessage))

      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const submitButton = screen.getByTestId('login-button')

      // Fill and submit form
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'wrongpassword')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display auth error message', () => {
      const errorMessage = 'Invalid email or password'
      renderLoginPage({ error: errorMessage })

      expect(screen.getByTestId('login-error')).toHaveTextContent(errorMessage)
    })

    it('should clear error when form changes', async () => {
      renderLoginPage({ error: 'Some error' })

      const emailInput = screen.getByTestId('email-input')

      await user.type(emailInput, 't')

      expect(mockClearError).toHaveBeenCalled()
    })
  })

  describe('Navigation', () => {
    it('should have link to registration page', () => {
      renderLoginPage()

      const registerLink = screen.getByTestId('register-link')
      expect(registerLink).toHaveAttribute('href', '/register')
    })
  })

  describe('Accessibility', () => {
    it('should have proper labels and form associations', () => {
      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')

      expect(emailInput).toHaveAttribute('aria-invalid', 'false')
      expect(passwordInput).toHaveAttribute('aria-invalid', 'false')

      expect(screen.getByLabelText('Email address')).toBe(emailInput)
      expect(screen.getByLabelText('Password')).toBe(passwordInput)
    })

    it('should have proper ARIA attributes for errors', async () => {
      renderLoginPage()

      const emailInput = screen.getByTestId('email-input')

      // Trigger validation error
      await user.click(emailInput)
      await user.tab()

      await waitFor(() => {
        expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      })
    })
  })
})
