import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, userEvent } from '@/test/test-utils'
import RegisterPage from './RegisterPage'
import * as AuthContext from '../contexts/AuthContext'

// Mock the auth context
const mockRegister = vi.fn()

const createMockAuthContext = (overrides = {}) => ({
  register: mockRegister,
  isSubmitting: false,
  error: null,
  isAuthenticated: false,
  user: null,
  isLoading: false,
  ...overrides
})

// Mock useNavigate
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
  }
})

describe('RegisterPage', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  const renderRegisterPage = (authContextOverrides = {}) => {
    const mockAuthContext = createMockAuthContext(authContextOverrides)
    
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue(mockAuthContext)
    
    return render(<RegisterPage />)
  }
  
  describe('Rendering', () => {
    it('should render registration form with all required fields', () => {
      renderRegisterPage()
      
      expect(screen.getByRole('heading', { name: 'Create account' })).toBeInTheDocument()
      expect(screen.getByText('Join ProcessPilot and streamline your workflows')).toBeInTheDocument()
      expect(screen.getByTestId('register-form')).toBeInTheDocument()
      expect(screen.getByTestId('first-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('last-name-input')).toBeInTheDocument()
      expect(screen.getByTestId('email-input')).toBeInTheDocument()
      expect(screen.getByTestId('department-input')).toBeInTheDocument()
      expect(screen.getByTestId('password-input')).toBeInTheDocument()
      expect(screen.getByTestId('confirm-password-input')).toBeInTheDocument()
      expect(screen.getByTestId('register-button')).toBeInTheDocument()
      expect(screen.getByTestId('login-link')).toBeInTheDocument()
    })
    
    it('should display ProcessPilot branding', () => {
      renderRegisterPage()
      
      expect(screen.getByText('P')).toBeInTheDocument() // Logo
    })
  })
  
  describe('Form Validation', () => {
    it('should validate first name field', async () => {
      renderRegisterPage()
      
      const firstNameInput = screen.getByTestId('first-name-input')
      
      // Empty first name
      await user.click(firstNameInput)
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('first-name-error')).toHaveTextContent('First name is required')
      })
      
      // Too short first name
      await user.type(firstNameInput, 'A')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('first-name-error')).toHaveTextContent('First name must be at least 2 characters')
      })
      
      // Valid first name
      await user.clear(firstNameInput)
      await user.type(firstNameInput, 'John')
      
      await waitFor(() => {
        expect(screen.queryByTestId('first-name-error')).not.toBeInTheDocument()
      })
    })
    
    it('should validate last name field', async () => {
      renderRegisterPage()
      
      const lastNameInput = screen.getByTestId('last-name-input')
      
      // Empty last name
      await user.click(lastNameInput)
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('last-name-error')).toHaveTextContent('Last name is required')
      })
      
      // Valid last name
      await user.type(lastNameInput, 'Doe')
      
      await waitFor(() => {
        expect(screen.queryByTestId('last-name-error')).not.toBeInTheDocument()
      })
    })
    
    it('should validate email field', async () => {
      renderRegisterPage()
      
      const emailInput = screen.getByTestId('email-input')
      
      // Empty email
      await user.click(emailInput)
      await user.tab()
      
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
      renderRegisterPage()
      
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
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must be at least 8 characters')
      })
      
      // Password without required pattern
      await user.clear(passwordInput)
      await user.type(passwordInput, 'password')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('password-error')).toHaveTextContent('Password must contain at least one uppercase letter, one lowercase letter, and one number')
      })
      
      // Valid password
      await user.clear(passwordInput)
      await user.type(passwordInput, 'Password123')
      
      await waitFor(() => {
        expect(screen.queryByTestId('password-error')).not.toBeInTheDocument()
      })
    })
    
    it('should validate password confirmation', async () => {
      renderRegisterPage()
      
      const passwordInput = screen.getByTestId('password-input')
      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      
      // Fill password
      await user.type(passwordInput, 'Password123')
      
      // Empty confirmation
      await user.click(confirmPasswordInput)
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Please confirm your password')
      })
      
      // Non-matching confirmation
      await user.type(confirmPasswordInput, 'DifferentPassword123')
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByTestId('confirm-password-error')).toHaveTextContent('Passwords do not match')
      })
      
      // Matching confirmation
      await user.clear(confirmPasswordInput)
      await user.type(confirmPasswordInput, 'Password123')
      
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-password-error')).not.toBeInTheDocument()
      })
    })
    
    it('should disable submit button when form is invalid', () => {
      renderRegisterPage()
      
      const submitButton = screen.getByTestId('register-button')
      expect(submitButton).toBeDisabled()
    })
    
    it('should enable submit button when form is valid', async () => {
      renderRegisterPage()
      
      const firstNameInput = screen.getByTestId('first-name-input')
      const lastNameInput = screen.getByTestId('last-name-input')
      const emailInput = screen.getByTestId('email-input')
      const passwordInput = screen.getByTestId('password-input')
      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      
      await user.type(firstNameInput, 'John')
      await user.type(lastNameInput, 'Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
      
      await waitFor(() => {
        const submitButton = screen.getByTestId('register-button')
        expect(submitButton).not.toBeDisabled()
      })
    })
  })
  
  describe('Password Visibility Toggle', () => {
    it('should toggle password visibility', async () => {
      renderRegisterPage()
      
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
    
    it('should toggle confirm password visibility', async () => {
      renderRegisterPage()
      
      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      const toggleButton = screen.getByTestId('toggle-confirm-password')
      
      // Initially password should be hidden
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
      
      // Click toggle to show password
      await user.click(toggleButton)
      expect(confirmPasswordInput).toHaveAttribute('type', 'text')
      
      // Click toggle to hide password
      await user.click(toggleButton)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })
  })
  
  describe('Form Submission', () => {
    const fillValidForm = async () => {
      const firstNameInput = screen.getByTestId('first-name-input')
      const lastNameInput = screen.getByTestId('last-name-input')
      const emailInput = screen.getByTestId('email-input')
      const departmentInput = screen.getByTestId('department-input')
      const passwordInput = screen.getByTestId('password-input')
      const confirmPasswordInput = screen.getByTestId('confirm-password-input')
      
      await user.type(firstNameInput, 'John')
      await user.type(lastNameInput, 'Doe')
      await user.type(emailInput, 'john@example.com')
      await user.type(departmentInput, 'IT')
      await user.type(passwordInput, 'Password123')
      await user.type(confirmPasswordInput, 'Password123')
    }
    
    it('should call register function with form data', async () => {
      renderRegisterPage()
      
      await fillValidForm()
      
      const submitButton = screen.getByTestId('register-button')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith({
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          department: 'IT',
          password: 'Password123',
          role: 'employee'
        })
      })
    })
    
    it('should not include confirmPassword in API call', async () => {
      renderRegisterPage()
      
      await fillValidForm()
      
      const submitButton = screen.getByTestId('register-button')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalled()
        const callData = mockRegister.mock.calls[0][0]
        expect(callData).not.toHaveProperty('confirmPassword')
      })
    })
    
    it('should show loading state during submission', async () => {
      renderRegisterPage({ isSubmitting: true })
      
      const submitButton = screen.getByTestId('register-button')
      
      expect(submitButton).toHaveTextContent('Creating account...')
      expect(submitButton).toBeDisabled()
    })
    
    it('should show success page after successful registration', async () => {
      mockRegister.mockResolvedValueOnce()
      renderRegisterPage()
      
      await fillValidForm()
      
      const submitButton = screen.getByTestId('register-button')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Registration Successful!')).toBeInTheDocument()
        expect(screen.getByText('Your account has been created successfully. You will be redirected to the login page shortly.')).toBeInTheDocument()
      })
    })
    
    it('should redirect to login after successful registration', async () => {
      vi.useFakeTimers()
      mockRegister.mockResolvedValueOnce()
      
      renderRegisterPage()
      
      await fillValidForm()
      
      const submitButton = screen.getByTestId('register-button')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('Registration Successful!')).toBeInTheDocument()
      })
      
      // Fast-forward time
      vi.advanceTimersByTime(2000)
      
      expect(mockNavigate).toHaveBeenCalledWith('/login')
      
      vi.useRealTimers()
    })
    
    it('should handle registration failure with field errors', async () => {
      const apiError = {
        response: {
          data: {
            details: [
              { field: 'email', message: 'Email already exists' }
            ]
          }
        }
      }
      
      mockRegister.mockRejectedValueOnce(apiError)
      renderRegisterPage()
      
      await fillValidForm()
      
      const submitButton = screen.getByTestId('register-button')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('email-error')).toHaveTextContent('Email already exists')
      })
    })
  })
  
  describe('Navigation', () => {
    it('should have link to login page', () => {
      renderRegisterPage()
      
      const loginLink = screen.getByTestId('login-link')
      expect(loginLink).toHaveAttribute('href', '/login')
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper labels and form associations', () => {
      renderRegisterPage()
      
      expect(screen.getByLabelText('First name')).toBeInTheDocument()
      expect(screen.getByLabelText('Last name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email address')).toBeInTheDocument()
      expect(screen.getByLabelText('Department (Optional)')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm password')).toBeInTheDocument()
    })
  })
})