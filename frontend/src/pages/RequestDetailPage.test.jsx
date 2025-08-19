import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, userEvent, setupAuthContextMock } from '../test/test-utils'
import RequestDetailPage from './RequestDetailPage'
import { requestsAPI } from '../services/api'

// Mock API
vi.mock('../services/api', () => ({
  requestsAPI: {
    get: vi.fn(),
    action: vi.fn()
  }
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
const mockUseParams = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => mockUseParams()
  }
})

// Mock react-query
const mockMutateAsync = vi.fn()
const mockInvalidateQueries = vi.fn()
const mockMutation = {
  mutateAsync: mockMutateAsync,
  isLoading: false,
  error: null
}

vi.mock('react-query', async () => {
  const actual = await vi.importActual('react-query')
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: () => ({
      invalidateQueries: mockInvalidateQueries
    })
  }
})

describe('RequestDetailPage', () => {
  const mockEmployee = {
    id: '1',
    email: 'employee@example.com',
    role: 'employee',
    first_name: 'John',
    last_name: 'Doe'
  }

  const mockManager = {
    id: '2',
    email: 'manager@example.com',
    role: 'manager',
    first_name: 'Jane',
    last_name: 'Manager'
  }

  const mockLeaveRequest = {
    id: 'req-123',
    type: 'leave-request',
    status: 'pending',
    submitted_at: '2024-01-15T10:00:00Z',
    created_by: '1',
    creator_first_name: 'John',
    creator_last_name: 'Doe',
    current_step_index: 0,
    steps: [
      {
        role: 'manager',
        sla_hours: 24,
        actions: ['approve', 'reject']
      },
      {
        role: 'hr',
        sla_hours: 48,
        actions: ['approve', 'reject']
      }
    ],
    payload: {
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      leaveType: 'vacation',
      reason: 'Family vacation'
    },
    sla_deadline: '2024-01-16T10:00:00Z',
    history: [
      {
        action: 'submitted',
        user_name: 'John Doe',
        created_at: '2024-01-15T10:00:00Z',
        comment: 'Request submitted'
      }
    ]
  }

  const mockExpenseRequest = {
    id: 'req-124',
    type: 'expense-approval',
    status: 'approved',
    submitted_at: '2024-01-14T09:00:00Z',
    completed_at: '2024-01-15T12:00:00Z',
    created_by: '1',
    creator_first_name: 'John',
    creator_last_name: 'Doe',
    current_step_index: 1,
    steps: [
      {
        role: 'manager',
        sla_hours: 48,
        actions: ['approve', 'reject'],
        completed_at: '2024-01-15T12:00:00Z'
      }
    ],
    payload: {
      amount: '150.50',
      currency: 'USD',
      expenseDate: '2024-01-10',
      category: 'travel',
      description: 'Business trip expenses'
    }
  }

  const mockEquipmentRequest = {
    id: 'req-125',
    type: 'equipment-request',
    status: 'pending',
    submitted_at: '2024-01-15T11:00:00Z',
    created_by: '1',
    creator_first_name: 'John',
    creator_last_name: 'Doe',
    current_step_index: 0,
    steps: [
      {
        role: 'admin',
        sla_hours: 72,
        actions: ['approve', 'reject']
      }
    ],
    payload: {
      equipmentType: 'laptop',
      urgency: 'medium',
      specifications: 'MacBook Pro 16-inch',
      justification: 'Current laptop is outdated'
    }
  }

  const mockGenericRequest = {
    id: 'req-126',
    type: 'other',
    status: 'rejected',
    submitted_at: '2024-01-15T12:00:00Z',
    completed_at: '2024-01-16T10:00:00Z',
    created_by: '1',
    creator_first_name: 'John',
    creator_last_name: 'Doe',
    current_step_index: 0,
    steps: [
      {
        role: 'manager',
        sla_hours: 24,
        actions: ['approve', 'reject'],
        completed_at: '2024-01-16T10:00:00Z'
      }
    ],
    payload: {
      subject: 'Special request',
      details: 'This is a custom request with specific requirements'
    }
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: 'req-123' })

    // Import react-query mocks
    const { useQuery, useMutation } = await import('react-query')

    // Default successful query state
    useQuery.mockReturnValue({
      data: { data: { request: mockLeaveRequest } },
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    // Default mutation state
    useMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isLoading: false,
      error: null
    })

    mockMutateAsync.mockResolvedValue({ data: { success: true } })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })


  const renderRequestDetailPage = async (user = mockEmployee, request = mockLeaveRequest, authOverrides = {}) => {
    // Setup auth context using test utilities
    setupAuthContextMock(user, { isAuthenticated: !!user, ...authOverrides })

    // Mock the API call to return the request data
    requestsAPI.get.mockResolvedValue({
      data: { request }
    })

    // Set up the query mock for this specific request
    const { useQuery } = await import('react-query')
    useQuery.mockReturnValue({
      data: request,
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    return render(<RequestDetailPage />, { user })
  }

  describe('Page Loading', () => {
    it('should show loading spinner while fetching request', async () => {
      // Mock loading state
      const { useQuery } = await import('react-query')
      useQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })
      
      setupAuthContextMock(mockEmployee)
      render(<RequestDetailPage />)

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should show error state when request fails to load', async () => {
      // Mock error state
      const { useQuery } = await import('react-query')
      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: {
          response: { data: { error: 'Request not found' } }
        },
        refetch: vi.fn()
      })
      
      setupAuthContextMock(mockEmployee)
      render(<RequestDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load request')).toBeInTheDocument()
      expect(screen.getByText('Request not found')).toBeInTheDocument()
    })

    it('should show generic error message when error response is malformed', async () => {
      // Mock error state
      const { useQuery } = await import('react-query')
      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: vi.fn()
      })
      
      setupAuthContextMock(mockEmployee)
      render(<RequestDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
      })

      expect(screen.getByText('Request not found')).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate back to requests on back button click', async () => {
      const user = userEvent.setup()
      await renderRequestDetailPage()

      await waitFor(() => {
        expect(screen.getByTestId('back-button')).toBeInTheDocument()
      })

      const backButton = screen.getByTestId('back-button')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/requests')
    })

    it('should navigate back from error state', async () => {
      const user = userEvent.setup()
      // Mock error state
      const { useQuery } = await import('react-query')
      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Not found'),
        refetch: vi.fn()
      })
      
      setupAuthContextMock(mockEmployee)
      render(<RequestDetailPage />)

      await waitFor(() => {
        expect(screen.getByTestId('error-state')).toBeInTheDocument()
      })

      const backButton = screen.getByText('Back to Requests')
      await user.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/requests')
    })
  })

  describe('Request Header', () => {
    it('should display correct request information', async () => {
      await renderRequestDetailPage()

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toHaveTextContent('Leave Request')
        expect(screen.getByTestId('status-badge')).toHaveTextContent('Pending')
        expect(screen.getByText('Request ID: req-123')).toBeInTheDocument()
      })
    })

    it('should show action buttons for managers on pending requests', async () => {
      await renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
        expect(screen.getByTestId('reject-button')).toBeInTheDocument()
      })
    })

    it('should not show action buttons for employees', async () => {
      await renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reject-button')).not.toBeInTheDocument()
    })

    it('should not show action buttons for completed requests', async () => {
      await renderRequestDetailPage(mockManager, mockExpenseRequest)

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reject-button')).not.toBeInTheDocument()
    })
  })

  describe('Leave Request Details', () => {
    it('should render leave request specific fields', async () => {
      await renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      expect(screen.getByTestId('start-date')).toHaveTextContent('2/1/2024')
      expect(screen.getByTestId('end-date')).toHaveTextContent('2/5/2024')
      expect(screen.getByTestId('leave-type')).toHaveTextContent('vacation')
      expect(screen.getByTestId('total-days')).toHaveTextContent('5 days')
      expect(screen.getByTestId('reason')).toHaveTextContent('Family vacation')
    })
  })

  describe('Expense Request Details', () => {
    it('should render expense request specific fields', async () => {
      renderRequestDetailPage(mockEmployee, mockExpenseRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      expect(screen.getByTestId('amount')).toHaveTextContent('USD 150.50')
      expect(screen.getByTestId('expense-date')).toHaveTextContent('1/10/2024')
      expect(screen.getByTestId('category')).toHaveTextContent('travel')
      expect(screen.getByTestId('description')).toHaveTextContent('Business trip expenses')
    })
  })

  describe('Equipment Request Details', () => {
    it('should render equipment request specific fields', async () => {
      renderRequestDetailPage(mockEmployee, mockEquipmentRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      expect(screen.getByTestId('equipment-type')).toHaveTextContent('laptop')
      expect(screen.getByTestId('urgency')).toHaveTextContent('medium')
      expect(screen.getByTestId('specifications')).toHaveTextContent('MacBook Pro 16-inch')
      expect(screen.getByTestId('justification')).toHaveTextContent('Current laptop is outdated')
    })
  })

  describe('Generic Request Details', () => {
    it('should render generic request fields', async () => {
      renderRequestDetailPage(mockEmployee, mockGenericRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      expect(screen.getByTestId('subject')).toHaveTextContent('Special request')
      expect(screen.getByTestId('details')).toHaveTextContent('This is a custom request with specific requirements')
    })
  })

  describe('Workflow Progress', () => {
    it('should display workflow steps correctly', async () => {
      renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('workflow-progress')).toBeInTheDocument()
      })

      expect(screen.getByTestId('workflow-step-0')).toBeInTheDocument()
      expect(screen.getByTestId('workflow-step-1')).toBeInTheDocument()
      expect(screen.getByText('Manager Approval')).toBeInTheDocument()
      expect(screen.getByText('Hr Approval')).toBeInTheDocument()
      expect(screen.getByText('SLA: 24 hours')).toBeInTheDocument()
      expect(screen.getByText('SLA: 48 hours')).toBeInTheDocument()
    })

    it('should show completed steps correctly', async () => {
      renderRequestDetailPage(mockEmployee, mockExpenseRequest)

      await waitFor(() => {
        expect(screen.getByTestId('workflow-progress')).toBeInTheDocument()
      })

      const completedStep = screen.getByTestId('workflow-step-0')
      expect(completedStep).toHaveClass('bg-success-50')
      expect(screen.getByText('Completed:')).toBeInTheDocument()
    })
  })

  describe('Request Information Sidebar', () => {
    it('should display request metadata', async () => {
      renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-info')).toBeInTheDocument()
      })

      expect(screen.getByTestId('creator-name')).toHaveTextContent('John Doe')
      expect(screen.getByTestId('submitted-date')).toBeInTheDocument()
      expect(screen.getByTestId('current-status')).toHaveTextContent('pending')
    })

    it('should show completed date for completed requests', async () => {
      renderRequestDetailPage(mockEmployee, mockExpenseRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-info')).toBeInTheDocument()
      })

      expect(screen.getByTestId('completed-date')).toBeInTheDocument()
    })

    it('should show SLA information when available', async () => {
      renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('sla-info')).toBeInTheDocument()
      })

      expect(screen.getByTestId('sla-deadline')).toBeInTheDocument()
      expect(screen.getByText('⚠️ SLA Deadline Overdue')).toBeInTheDocument()
    })
  })

  describe('Request History', () => {
    it('should display request history when available', async () => {
      renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('request-history')).toBeInTheDocument()
      })

      expect(screen.getByTestId('history-entry-0')).toBeInTheDocument()
      expect(screen.getByText('submitted by John Doe')).toBeInTheDocument()
      expect(screen.getByText('"Request submitted"')).toBeInTheDocument()
    })

    it('should not show history section when no history available', async () => {
      const requestWithoutHistory = { ...mockLeaveRequest, history: [] }
      renderRequestDetailPage(mockEmployee, requestWithoutHistory)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('request-history')).not.toBeInTheDocument()
    })
  })

  describe('Action Modal', () => {
    it('should open approve modal when approve button is clicked', async () => {
      const user = userEvent.setup()
      renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      const approveButton = screen.getByTestId('approve-button')
      await user.click(approveButton)

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      expect(screen.getByText('Approve Request')).toBeInTheDocument()
      expect(screen.getByTestId('action-comment')).toBeInTheDocument()
    })

    it('should open reject modal when reject button is clicked', async () => {
      const user = userEvent.setup()
      renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('reject-button')).toBeInTheDocument()
      })

      const rejectButton = screen.getByTestId('reject-button')
      await user.click(rejectButton)

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      expect(screen.getByText('Reject Request')).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument() // Required field indicator
    })

    it('should close modal when cancel is clicked', async () => {
      const user = userEvent.setup()
      renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const cancelButton = screen.getByTestId('cancel-action')
      await user.click(cancelButton)

      await waitFor(() => {
        expect(screen.queryByTestId('action-modal')).not.toBeInTheDocument()
      })
    })

    it('should handle comment input', async () => {
      const user = userEvent.setup()
      renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const commentField = screen.getByTestId('action-comment')
      await user.type(commentField, 'This looks good to me')

      expect(commentField).toHaveValue('This looks good to me')
    })

    it('should require comment for reject action', async () => {
      const user = userEvent.setup()
      renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('reject-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('reject-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const confirmButton = screen.getByTestId('confirm-action')
      expect(confirmButton).toBeDisabled()

      const commentField = screen.getByTestId('action-comment')
      await user.type(commentField, 'Missing documentation')

      expect(confirmButton).not.toBeDisabled()
    })
  })

  describe('Action Submission', () => {
    it('should submit approve action successfully', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ data: { success: true } })

      await renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const commentField = screen.getByTestId('action-comment')
      await user.type(commentField, 'Approved with conditions')

      const confirmButton = screen.getByTestId('confirm-action')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          action: 'approve',
          comment: 'Approved with conditions'
        })
      })

      expect(mockInvalidateQueries).toHaveBeenCalledWith(['requests'])
    })

    it('should submit reject action successfully', async () => {
      const user = userEvent.setup()
      mockMutateAsync.mockResolvedValue({ data: { success: true } })

      renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('reject-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('reject-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const commentField = screen.getByTestId('action-comment')
      await user.type(commentField, 'Insufficient information')

      const confirmButton = screen.getByTestId('confirm-action')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          action: 'reject',
          comment: 'Insufficient information'
        })
      })
    })

    it('should show loading state during action submission', async () => {
      const user = userEvent.setup()
      
      // Mock loading mutation state
      const { useMutation } = await import('react-query')
      useMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: true,
        error: null
      })
      
      mockMutateAsync.mockImplementation(() => new Promise(() => {})) // Never resolves

      await renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const confirmButton = screen.getByTestId('confirm-action')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Processing...')).toBeInTheDocument()
        expect(confirmButton).toBeDisabled()
      })
    })

    it('should display error message when action fails', async () => {
      const user = userEvent.setup()
      const mockError = {
        response: { data: { error: 'Action failed due to workflow rules' } }
      }
      
      // Mock error mutation state
      const { useMutation } = await import('react-query')
      useMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: mockError
      })
      
      mockMutateAsync.mockRejectedValue(mockError)

      await renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const confirmButton = screen.getByTestId('confirm-action')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Action failed due to workflow rules')).toBeInTheDocument()
      })
    })

    it('should show generic error message when error response is malformed', async () => {
      const user = userEvent.setup()
      const mockError = new Error('Network error')
      
      // Mock error mutation state
      const { useMutation } = await import('react-query')
      useMutation.mockReturnValue({
        mutateAsync: mockMutateAsync,
        isLoading: false,
        error: mockError
      })
      
      mockMutateAsync.mockRejectedValue(mockError)

      await renderRequestDetailPage(mockManager, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('approve-button'))

      await waitFor(() => {
        expect(screen.getByTestId('action-modal')).toBeInTheDocument()
      })

      const confirmButton = screen.getByTestId('confirm-action')
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText('Action failed. Please try again.')).toBeInTheDocument()
      })
    })
  })

  describe('Permission Checks', () => {
    it('should allow admin to take action on any pending request', async () => {
      const adminUser = { ...mockManager, role: 'admin' }
      renderRequestDetailPage(adminUser, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('approve-button')).toBeInTheDocument()
        expect(screen.getByTestId('reject-button')).toBeInTheDocument()
      })
    })

    it('should not show actions for wrong role in current step', async () => {
      // HR user trying to act on manager step
      const hrUser = { ...mockManager, role: 'hr' }
      renderRequestDetailPage(hrUser, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reject-button')).not.toBeInTheDocument()
    })

    it('should not show actions when user role does not match expected step role', async () => {
      const equipmentRequest = {
        ...mockEquipmentRequest,
        steps: [{ role: 'admin', sla_hours: 72 }]
      }
      renderRequestDetailPage(mockManager, equipmentRequest)

      await waitFor(() => {
        expect(screen.getByTestId('page-title')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('approve-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('reject-button')).not.toBeInTheDocument()
    })
  })

  describe('Date Formatting', () => {
    it('should format dates correctly in different sections', async () => {
      renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('submitted-date')).toBeInTheDocument()
      })

      // Check that dates are formatted with full month names
      expect(screen.getByTestId('submitted-date')).toHaveTextContent('January')
    })
  })

  describe('Status Display', () => {
    it('should display correct status colors and icons', async () => {
      renderRequestDetailPage(mockEmployee, mockLeaveRequest)

      await waitFor(() => {
        expect(screen.getByTestId('status-badge')).toBeInTheDocument()
      })

      const statusBadge = screen.getByTestId('status-badge')
      expect(statusBadge).toHaveClass('bg-warning-100')
      expect(statusBadge).toHaveTextContent('Pending')
    })

    it('should show different status for approved requests', async () => {
      renderRequestDetailPage(mockEmployee, mockExpenseRequest)

      await waitFor(() => {
        expect(screen.getByTestId('status-badge')).toBeInTheDocument()
      })

      const statusBadge = screen.getByTestId('status-badge')
      expect(statusBadge).toHaveClass('bg-success-100')
      expect(statusBadge).toHaveTextContent('Approved')
    })
  })

  describe('Edge Cases', () => {
    it('should handle request without payload gracefully', async () => {
      const requestWithoutPayload = { ...mockLeaveRequest, payload: null }
      renderRequestDetailPage(mockEmployee, requestWithoutPayload)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      // Should not crash and show the details section
      expect(screen.getByText('Request Details')).toBeInTheDocument()
    })

    it('should handle request without steps', async () => {
      const requestWithoutSteps = { ...mockLeaveRequest, steps: null }
      renderRequestDetailPage(mockEmployee, requestWithoutSteps)

      await waitFor(() => {
        expect(screen.getByTestId('workflow-progress')).toBeInTheDocument()
      })

      expect(screen.getByText('Approval Progress')).toBeInTheDocument()
    })

    it('should handle equipment request without specifications', async () => {
      const requestWithoutSpecs = {
        ...mockEquipmentRequest,
        payload: {
          ...mockEquipmentRequest.payload,
          specifications: null
        }
      }
      renderRequestDetailPage(mockEmployee, requestWithoutSpecs)

      await waitFor(() => {
        expect(screen.getByTestId('request-details')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('specifications')).not.toBeInTheDocument()
    })
  })
})
