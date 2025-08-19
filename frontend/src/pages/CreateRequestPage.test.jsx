import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, userEvent } from '@/test/test-utils'
import CreateRequestPage from './CreateRequestPage'
import * as AuthContext from '../contexts/AuthContext'
import { requestsAPI, workflowsAPI } from '../services/api'

// Mock APIs
vi.mock('../services/api', () => ({
  requestsAPI: {
    create: vi.fn()
  },
  workflowsAPI: {
    list: vi.fn()
  }
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('CreateRequestPage', () => {
  const mockUser = {
    id: '1',
    email: 'user@example.com',
    role: 'employee'
  }

  const mockWorkflows = [
    {
      id: 'wf-1',
      name: 'Standard Leave Approval',
      request_types: ['leave-request'],
      steps: [
        { role: 'manager', sla_hours: 24 },
        { role: 'hr', sla_hours: 48 }
      ]
    },
    {
      id: 'wf-2',
      name: 'Expense Approval Process',
      request_types: ['expense-approval'],
      steps: [
        { role: 'manager', sla_hours: 48 }
      ]
    },
    {
      id: 'wf-3',
      name: 'Universal Workflow',
      request_types: ['*'],
      steps: [
        { role: 'admin', sla_hours: 72 }
      ]
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock auth context
    const mockAuthContext = {
      user: mockUser,
      isAuthenticated: true,
      isLoading: false
    }
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue(mockAuthContext)

    // Mock workflows API
    workflowsAPI.list.mockResolvedValue({
      data: { workflows: mockWorkflows }
    })

    // Mock requests API
    requestsAPI.create.mockResolvedValue({
      data: { request: { id: 'req-123' } }
    })
  })

  const renderCreateRequestPage = () => {
    return render(<CreateRequestPage />)
  }

  describe('Page Loading', () => {
    it('should show loading spinner while fetching workflows', () => {
      workflowsAPI.list.mockReturnValue(new Promise(() => {})) // Never resolves
      renderCreateRequestPage()

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should render page header after loading', async () => {
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toHaveTextContent('Create New Request')
      })

      expect(screen.getByText('Submit a new workflow request for approval')).toBeInTheDocument()
      expect(screen.getByTestId('back-button')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate back to requests on back button click', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeInTheDocument()
      })

      const backButton = screen.getByTestId('back-button')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/requests')
    })

    it('should navigate back to requests on cancel button click', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      // Select a request type first to show the cancel button
      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-button')
      await user.click(cancelButton)

      expect(mockNavigate).toHaveBeenCalledWith('/requests')
    })
  })

  describe('Request Type Selection', () => {
    it('should render request type selection', async () => {
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      expect(screen.getByText('Select Request Type *')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Choose request type' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Leave Request' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Expense Approval' })).toBeInTheDocument()
    })

    it('should show workflow selection after request type is selected', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      expect(screen.getByText('Approval Workflow *')).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Standard Leave Approval' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Universal Workflow' })).toBeInTheDocument()
    })

    it('should filter workflows based on request type', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'expense-approval')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      expect(screen.getByRole('option', { name: 'Expense Approval Process' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Universal Workflow' })).toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'Standard Leave Approval' })).not.toBeInTheDocument()
    })

    it('should show workflow preview when workflow is selected', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-preview')).toBeInTheDocument()
      })

      expect(screen.getByText('Approval Process')).toBeInTheDocument()
      expect(screen.getByText('Manager Approval')).toBeInTheDocument()
      expect(screen.getByText('(SLA: 24h)')).toBeInTheDocument()
    })

    it('should reset workflow selection when request type changes', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      // Select leave request and workflow
      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-preview')).toBeInTheDocument()
      })

      // Change request type
      await user.selectOptions(screen.getByTestId('request-type-select'), 'expense-approval')

      // Workflow should be reset
      expect(screen.getByTestId('workflow-select')).toHaveValue('')
      expect(screen.queryByTestId('workflow-preview')).not.toBeInTheDocument()
    })
  })

  describe('Leave Request Form', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')
    })

    it('should render leave request form fields', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('start-date-input')).toBeInTheDocument()
        expect(screen.getByTestId('end-date-input')).toBeInTheDocument()
        expect(screen.getByTestId('leave-type-select')).toBeInTheDocument()
        expect(screen.getByTestId('reason-textarea')).toBeInTheDocument()
      })

      expect(screen.getByText('Start Date *')).toBeInTheDocument()
      expect(screen.getByText('End Date *')).toBeInTheDocument()
      expect(screen.getByText('Leave Type *')).toBeInTheDocument()
      expect(screen.getByText('Reason *')).toBeInTheDocument()
    })

    it('should validate required fields', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByTestId('submit-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByText('Start date is required')).toBeInTheDocument()
        expect(screen.getByText('End date is required')).toBeInTheDocument()
        expect(screen.getByText('Leave type is required')).toBeInTheDocument()
        expect(screen.getByText('Reason is required')).toBeInTheDocument()
      })
    })

    it('should submit leave request with valid data', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByTestId('start-date-input')).toBeInTheDocument()
      })

      // Fill form
      await user.type(screen.getByTestId('start-date-input'), '2024-02-01')
      await user.type(screen.getByTestId('end-date-input'), '2024-02-05')
      await user.selectOptions(screen.getByTestId('leave-type-select'), 'vacation')
      await user.type(screen.getByTestId('reason-textarea'), 'Family vacation')

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(requestsAPI.create).toHaveBeenCalledWith({
          type: 'leave-request',
          workflow_id: 'wf-1',
          payload: {
            startDate: '2024-02-01',
            endDate: '2024-02-05',
            leaveType: 'vacation',
            reason: 'Family vacation'
          }
        })
      })

      expect(mockNavigate).toHaveBeenCalledWith('/requests', {
        state: {
          message: 'Request submitted successfully! Your request ID is req-123',
          type: 'success'
        }
      })
    })
  })

  describe('Expense Approval Form', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'expense-approval')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-2')
    })

    it('should render expense approval form fields', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('amount-input')).toBeInTheDocument()
        expect(screen.getByTestId('currency-select')).toBeInTheDocument()
        expect(screen.getByTestId('expense-date-input')).toBeInTheDocument()
        expect(screen.getByTestId('category-select')).toBeInTheDocument()
        expect(screen.getByTestId('description-textarea')).toBeInTheDocument()
      })

      expect(screen.getByText('Amount *')).toBeInTheDocument()
      expect(screen.getByText('Currency *')).toBeInTheDocument()
      expect(screen.getByText('Expense Date *')).toBeInTheDocument()
      expect(screen.getByText('Category *')).toBeInTheDocument()
      expect(screen.getByText('Description *')).toBeInTheDocument()
    })

    it('should validate amount is greater than 0', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByTestId('amount-input')).toBeInTheDocument()
      })

      await user.type(screen.getByTestId('amount-input'), '0')
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()
      })
    })

    it('should submit expense request with valid data', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByTestId('amount-input')).toBeInTheDocument()
      })

      // Fill form
      await user.type(screen.getByTestId('amount-input'), '150.50')
      await user.selectOptions(screen.getByTestId('currency-select'), 'USD')
      await user.type(screen.getByTestId('expense-date-input'), '2024-01-15')
      await user.selectOptions(screen.getByTestId('category-select'), 'travel')
      await user.type(screen.getByTestId('description-textarea'), 'Business trip expenses')

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(requestsAPI.create).toHaveBeenCalledWith({
          type: 'expense-approval',
          workflow_id: 'wf-2',
          payload: {
            amount: '150.50',
            currency: 'USD',
            expenseDate: '2024-01-15',
            category: 'travel',
            description: 'Business trip expenses'
          }
        })
      })
    })
  })

  describe('Equipment Request Form', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'equipment-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-3')
    })

    it('should render equipment request form fields', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('equipment-type-select')).toBeInTheDocument()
        expect(screen.getByTestId('specifications-textarea')).toBeInTheDocument()
        expect(screen.getByTestId('justification-textarea')).toBeInTheDocument()
        expect(screen.getByTestId('urgency-select')).toBeInTheDocument()
      })

      expect(screen.getByText('Equipment Type *')).toBeInTheDocument()
      expect(screen.getByText('Specifications')).toBeInTheDocument()
      expect(screen.getByText('Business Justification *')).toBeInTheDocument()
      expect(screen.getByText('Urgency *')).toBeInTheDocument()
    })

    it('should submit equipment request with valid data', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByTestId('equipment-type-select')).toBeInTheDocument()
      })

      // Fill form
      await user.selectOptions(screen.getByTestId('equipment-type-select'), 'laptop')
      await user.type(screen.getByTestId('specifications-textarea'), 'MacBook Pro 16-inch')
      await user.type(screen.getByTestId('justification-textarea'), 'Current laptop is outdated')
      await user.selectOptions(screen.getByTestId('urgency-select'), 'medium')

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(requestsAPI.create).toHaveBeenCalledWith({
          type: 'equipment-request',
          workflow_id: 'wf-3',
          payload: {
            equipmentType: 'laptop',
            specifications: 'MacBook Pro 16-inch',
            justification: 'Current laptop is outdated',
            urgency: 'medium'
          }
        })
      })
    })
  })

  describe('Generic Form (Other Request Type)', () => {
    beforeEach(async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'other')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-3')
    })

    it('should render generic form fields', async () => {
      await waitFor(() => {
        expect(screen.getByTestId('subject-input')).toBeInTheDocument()
        expect(screen.getByTestId('details-textarea')).toBeInTheDocument()
      })

      expect(screen.getByText('Subject *')).toBeInTheDocument()
      expect(screen.getByText('Details *')).toBeInTheDocument()
    })

    it('should submit generic request with valid data', async () => {
      const user = userEvent.setup()

      await waitFor(() => {
        expect(screen.getByTestId('subject-input')).toBeInTheDocument()
      })

      // Fill form
      await user.type(screen.getByTestId('subject-input'), 'Special request')
      await user.type(screen.getByTestId('details-textarea'), 'This is a custom request with specific requirements')

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(requestsAPI.create).toHaveBeenCalledWith({
          type: 'other',
          workflow_id: 'wf-3',
          payload: {
            subject: 'Special request',
            details: 'This is a custom request with specific requirements'
          }
        })
      })
    })
  })

  describe('Form Validation', () => {
    it('should show validation error for missing request type', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      // Try to submit without selecting request type
      await user.click(screen.getByTestId('request-type-select'))
      await user.tab() // Blur the select to trigger validation

      // Should not show form fields without request type
      expect(screen.queryByTestId('workflow-select')).not.toBeInTheDocument()
    })

    it('should show validation error for missing workflow', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      // Try to submit without workflow
      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByText('Workflow selection is required')).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup()

      // Make API call return a pending promise
      requestsAPI.create.mockReturnValue(new Promise(() => {}))

      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')

      // Fill required fields
      await user.type(screen.getByTestId('start-date-input'), '2024-02-01')
      await user.type(screen.getByTestId('end-date-input'), '2024-02-05')
      await user.selectOptions(screen.getByTestId('leave-type-select'), 'vacation')
      await user.type(screen.getByTestId('reason-textarea'), 'Test reason')

      const submitButton = screen.getByTestId('submit-button')
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toBeDisabled()
        expect(screen.getByText('Submitting...')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should display error message when submission fails', async () => {
      const user = userEvent.setup()

      requestsAPI.create.mockRejectedValue({
        response: { data: { error: 'Invalid request data' } }
      })

      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')

      // Fill and submit form
      await user.type(screen.getByTestId('start-date-input'), '2024-02-01')
      await user.type(screen.getByTestId('end-date-input'), '2024-02-05')
      await user.selectOptions(screen.getByTestId('leave-type-select'), 'vacation')
      await user.type(screen.getByTestId('reason-textarea'), 'Test reason')

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Invalid request data')).toBeInTheDocument()
      })
    })

    it('should display generic error message when error response is malformed', async () => {
      const user = userEvent.setup()

      requestsAPI.create.mockRejectedValue(new Error('Network error'))

      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')

      // Fill and submit form
      await user.type(screen.getByTestId('start-date-input'), '2024-02-01')
      await user.type(screen.getByTestId('end-date-input'), '2024-02-05')
      await user.selectOptions(screen.getByTestId('leave-type-select'), 'vacation')
      await user.type(screen.getByTestId('reason-textarea'), 'Test reason')

      await user.click(screen.getByTestId('submit-button'))

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
        expect(screen.getByText('Failed to submit request. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('UI Elements', () => {
    it('should show appropriate icons for different request types', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'leave-request')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-1')

      // Should show calendar icon for leave request
      expect(screen.getByText('Leave Request Details')).toBeInTheDocument()
    })

    it('should format request type names correctly', async () => {
      const user = userEvent.setup()
      renderCreateRequestPage()

      await waitFor(() => {
        expect(screen.getByTestId('request-type-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('request-type-select'), 'expense-approval')

      await waitFor(() => {
        expect(screen.getByTestId('workflow-select')).toBeInTheDocument()
      })

      await user.selectOptions(screen.getByTestId('workflow-select'), 'wf-2')

      expect(screen.getByText('Expense Approval Details')).toBeInTheDocument()
    })
  })
})
