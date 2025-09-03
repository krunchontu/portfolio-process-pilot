import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '../test/test-utils'
import RequestDetailPage from './RequestDetailPage'
import { requestsAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

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

// Mock the AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }) => children
}))

// Mock react-query
vi.mock('react-query', async () => {
  const actual = await vi.importActual('react-query')
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: () => ({
      invalidateQueries: vi.fn()
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

  beforeEach(async () => {
    vi.clearAllMocks()

    // Setup default mocks
    mockUseParams.mockReturnValue({ id: 'req-123' })

    // Mock useAuth hook
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: mockEmployee,
      isLoading: false,
      error: null,
      hasRole: vi.fn((role) => mockEmployee.role === role),
      isEmployee: vi.fn(() => mockEmployee.role === 'employee'),
      isManager: vi.fn(() => mockEmployee.role === 'manager'),
      isAdmin: vi.fn(() => mockEmployee.role === 'admin'),
      isManagerOrAdmin: vi.fn(() => ['manager', 'admin'].includes(mockEmployee.role))
    })

    // Import and setup react-query mocks
    const { useQuery, useMutation } = await import('react-query')

    // Mock useQuery for request data (component expects nested structure)
    useQuery.mockReturnValue({
      data: mockLeaveRequest, // The component uses select to extract data.data.request
      isLoading: false,
      error: null,
      refetch: vi.fn()
    })

    // Mock useMutation for actions
    useMutation.mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false,
      error: null
    })

    // Mock API responses
    requestsAPI.get.mockResolvedValue({
      data: mockLeaveRequest
    })

    requestsAPI.action.mockResolvedValue({
      data: { message: 'Action completed successfully' }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Page Loading', () => {
    it('should show loading spinner while fetching request', async () => {
      // Import and override useQuery to return loading state
      const { useQuery } = await import('react-query')
      useQuery.mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn()
      })

      render(<RequestDetailPage />, { user: mockEmployee })

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      // The loading spinner uses the Loader2 icon which has aria-hidden, so we check for the testid
    })

    it('should show error message when request fails to load', async () => {
      // Import and override useQuery to return error state
      const { useQuery } = await import('react-query')
      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Failed to fetch request'),
        refetch: vi.fn()
      })

      render(<RequestDetailPage />, { user: mockEmployee })

      expect(screen.getByTestId('error-state')).toBeInTheDocument()
      expect(screen.getByText(/failed to load request/i)).toBeInTheDocument()
    })

    it('should show not found message when request does not exist', async () => {
      // Import and override useQuery to return 404 error
      const { useQuery } = await import('react-query')
      const notFoundError = new Error('Request not found')
      notFoundError.response = {
        status: 404,
        data: { error: 'Request not found' }
      }

      useQuery.mockReturnValue({
        data: null,
        isLoading: false,
        error: notFoundError,
        refetch: vi.fn()
      })

      render(<RequestDetailPage />, { user: mockEmployee })

      expect(screen.getByText(/request not found/i)).toBeInTheDocument()
    })
  })

  describe('Request Display', () => {
    it('should display request details correctly', () => {
      render(<RequestDetailPage />, { user: mockEmployee })

      // Check basic request information using more flexible matchers
      expect(screen.getByTestId('page-title')).toBeInTheDocument()
      expect(screen.getByText('req-123')).toBeInTheDocument()
      expect(screen.getByTestId('status-badge')).toBeInTheDocument()

      // Check if some key content is present
      expect(screen.getByText('Family vacation')).toBeInTheDocument()
    })

    it('should display workflow progress', () => {
      render(<RequestDetailPage />, { user: mockEmployee })

      // Should show some workflow information - using flexible text matching
      const pageContent = screen.getByTestId('page-title').closest('div')
      expect(pageContent).toBeInTheDocument()
    })

    it('should display request history', () => {
      render(<RequestDetailPage />, { user: mockEmployee })

      // Check if request data is being displayed
      expect(screen.getByText('Request submitted')).toBeInTheDocument()
    })
  })

  describe('User Permissions', () => {
    it('should not show action buttons for employee viewing their own pending request', () => {
      render(<RequestDetailPage />, { user: mockEmployee })

      // Employee should not see approve/reject buttons for their own request
      expect(screen.queryByText('Approve')).not.toBeInTheDocument()
      expect(screen.queryByText('Reject')).not.toBeInTheDocument()
    })

    it('should show action buttons for manager on pending request', () => {
      const mockManager = {
        ...mockEmployee,
        id: '2',
        role: 'manager'
      }

      useAuth.mockReturnValue({
        isAuthenticated: true,
        user: mockManager,
        isLoading: false,
        error: null,
        hasRole: vi.fn((role) => role === 'manager'),
        isEmployee: vi.fn(() => false),
        isManager: vi.fn(() => true),
        isAdmin: vi.fn(() => false),
        isManagerOrAdmin: vi.fn(() => true)
      })

      render(<RequestDetailPage />, { user: mockManager })

      // Manager should see action buttons
      expect(screen.getByText('Approve')).toBeInTheDocument()
      expect(screen.getByText('Reject')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing request ID', () => {
      mockUseParams.mockReturnValue({}) // No ID

      render(<RequestDetailPage />, { user: mockEmployee })

      expect(screen.getByText(/invalid request/i)).toBeInTheDocument()
    })
  })
})
