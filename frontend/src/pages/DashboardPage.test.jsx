import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/test-utils'
import DashboardPage from './DashboardPage'
import * as AuthContext from '../contexts/AuthContext'
import { requestsAPI, analyticsAPI } from '../services/api'

// Mock API services
vi.mock('../services/api', () => ({
  requestsAPI: {
    list: vi.fn()
  },
  analyticsAPI: {
    getOverview: vi.fn()
  }
}))

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
  format: vi.fn(() => '2024-01-15')
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
  }
})

describe('DashboardPage', () => {
  const mockUser = {
    id: '1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    role: 'employee'
  }
  
  const mockManagerUser = {
    ...mockUser,
    role: 'manager'
  }
  
  const mockRequests = [
    {
      id: '1',
      type: 'leave-request',
      status: 'pending',
      submitted_at: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      type: 'expense-approval',
      status: 'approved',
      submitted_at: '2024-01-14T09:00:00Z'
    }
  ]
  
  const mockPendingRequests = [
    {
      id: '3',
      type: 'leave-request',
      status: 'pending',
      submitted_at: '2024-01-15T10:00:00Z',
      creator_first_name: 'Jane',
      creator_last_name: 'Smith',
      sla_deadline: '2024-01-17T10:00:00Z'
    }
  ]
  
  const mockAnalytics = {
    total_requests: 50,
    pending_count: 5,
    approved_count: 40,
    rejected_count: 5,
    avg_completion_hours: 24.5
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  const renderDashboard = (user = mockUser) => {
    const mockAuthContext = {
      user,
      isManagerOrAdmin: vi.fn(() => ['manager', 'admin'].includes(user.role)),
      isAuthenticated: true,
      isLoading: false
    }
    
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue(mockAuthContext)
    
    return render(<DashboardPage />)
  }
  
  describe('Rendering', () => {
    it('should render welcome message with user name', () => {
      renderDashboard()
      
      expect(screen.getByRole('heading', { name: `Welcome back, ${mockUser.first_name}!` })).toBeInTheDocument()
      expect(screen.getByText("Here's what's happening with your workflows today.")).toBeInTheDocument()
    })
    
    it('should render quick action cards for all users', () => {
      renderDashboard()
      
      expect(screen.getByTestId('create-request-card')).toBeInTheDocument()
      expect(screen.getByTestId('view-requests-card')).toBeInTheDocument()
      expect(screen.getByText('Create Request')).toBeInTheDocument()
      expect(screen.getByText('My Requests')).toBeInTheDocument()
    })
    
    it('should render analytics card for managers', () => {
      renderDashboard(mockManagerUser)
      
      expect(screen.getByTestId('analytics-card')).toBeInTheDocument()
      expect(screen.getByText('Analytics')).toBeInTheDocument()
    })
    
    it('should not render analytics card for employees', () => {
      renderDashboard()
      
      expect(screen.queryByTestId('analytics-card')).not.toBeInTheDocument()
    })
  })
  
  describe('My Recent Requests', () => {
    beforeEach(() => {
      requestsAPI.list.mockResolvedValue({
        data: { requests: mockRequests }
      })
    })
    
    it('should display loading state', () => {
      renderDashboard()
      
      // Should show loading skeleton
      expect(screen.getByText('My Recent Requests')).toBeInTheDocument()
    })
    
    it('should display user requests when loaded', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByTestId('my-requests-list')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('request-1')).toBeInTheDocument()
      expect(screen.getByTestId('request-2')).toBeInTheDocument()
      expect(screen.getByText('Leave Request')).toBeInTheDocument()
      expect(screen.getByText('Expense Approval')).toBeInTheDocument()
    })
    
    it('should display empty state when no requests', async () => {
      requestsAPI.list.mockResolvedValue({
        data: { requests: [] }
      })
      
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByTestId('no-requests-message')).toBeInTheDocument()
      })
      
      expect(screen.getByText('No requests yet')).toBeInTheDocument()
      expect(screen.getByText('Start by creating your first request')).toBeInTheDocument()
    })
    
    it('should have link to view all requests', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByTestId('view-all-requests')).toBeInTheDocument()
      })
      
      const viewAllLink = screen.getByTestId('view-all-requests')
      expect(viewAllLink).toHaveAttribute('href', '/requests')
    })
  })
  
  describe('Stats Cards (Manager/Admin)', () => {
    beforeEach(() => {
      analyticsAPI.getOverview.mockResolvedValue({
        data: mockAnalytics
      })
    })
    
    it('should not display stats for employees', () => {
      renderDashboard()
      
      expect(screen.queryByTestId('total-requests-stat')).not.toBeInTheDocument()
    })
    
    it('should display loading state for managers', () => {
      renderDashboard(mockManagerUser)
      
      // Should show loading skeleton for stats
      expect(screen.getAllByText('')).toBeTruthy() // Loading skeleton divs
    })
    
    it('should display analytics data for managers', async () => {
      renderDashboard(mockManagerUser)
      
      await waitFor(() => {
        expect(screen.getByTestId('total-requests-stat')).toBeInTheDocument()
      })
      
      expect(screen.getByText('50')).toBeInTheDocument() // total_requests
      expect(screen.getByText('5')).toBeInTheDocument() // pending_count
      expect(screen.getByText('40')).toBeInTheDocument() // approved_count
      expect(screen.getByText('25h')).toBeInTheDocument() // avg_completion_hours
    })
    
    it('should handle missing analytics data gracefully', async () => {
      analyticsAPI.getOverview.mockResolvedValue({
        data: {}
      })
      
      renderDashboard(mockManagerUser)
      
      await waitFor(() => {
        expect(screen.getByTestId('total-requests-stat')).toBeInTheDocument()
      })
      
      expect(screen.getByText('0')).toBeInTheDocument() // fallback values
      expect(screen.getByText('N/A')).toBeInTheDocument() // avg completion fallback
    })
  })
  
  describe('Pending Actions (Manager/Admin)', () => {
    beforeEach(() => {
      requestsAPI.list
        .mockResolvedValueOnce({ data: { requests: mockRequests } }) // my requests
        .mockResolvedValueOnce({ data: { requests: mockPendingRequests } }) // pending requests
      analyticsAPI.getOverview.mockResolvedValue({ data: mockAnalytics })
    })
    
    it('should not display pending actions for employees', () => {
      renderDashboard()
      
      expect(screen.queryByText('Pending Actions')).not.toBeInTheDocument()
    })
    
    it('should display pending requests for managers', async () => {
      renderDashboard(mockManagerUser)
      
      await waitFor(() => {
        expect(screen.getByText('Pending Actions')).toBeInTheDocument()
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('pending-requests-list')).toBeInTheDocument()
      })
      
      expect(screen.getByTestId('pending-request-3')).toBeInTheDocument()
      expect(screen.getByText('From Jane Smith •')).toBeInTheDocument()
    })
    
    it('should display empty state when no pending requests', async () => {
      requestsAPI.list
        .mockResolvedValueOnce({ data: { requests: mockRequests } })
        .mockResolvedValueOnce({ data: { requests: [] } })
      
      renderDashboard(mockManagerUser)
      
      await waitFor(() => {
        expect(screen.getByTestId('no-pending-message')).toBeInTheDocument()
      })
      
      expect(screen.getByText('All caught up!')).toBeInTheDocument()
      expect(screen.getByText('No pending requests require your attention')).toBeInTheDocument()
    })
    
    it('should show overdue indicator for expired SLA', async () => {
      const overdueRequest = {
        ...mockPendingRequests[0],
        sla_deadline: '2024-01-10T10:00:00Z' // Past date
      }
      
      requestsAPI.list
        .mockResolvedValueOnce({ data: { requests: mockRequests } })
        .mockResolvedValueOnce({ data: { requests: [overdueRequest] } })
      
      renderDashboard(mockManagerUser)
      
      await waitFor(() => {
        expect(screen.getByText('Overdue')).toBeInTheDocument()
      })
    })
    
    it('should have link to view all pending requests', async () => {
      renderDashboard(mockManagerUser)
      
      await waitFor(() => {
        expect(screen.getByTestId('view-all-pending')).toBeInTheDocument()
      })
      
      const viewAllLink = screen.getByTestId('view-all-pending')
      expect(viewAllLink).toHaveAttribute('href', '/requests?status=pending')
    })
  })
  
  describe('API Calls', () => {
    it('should fetch user requests on mount', () => {
      renderDashboard()
      
      expect(requestsAPI.list).toHaveBeenCalledWith({
        created_by: mockUser.id,
        limit: 5
      })
    })
    
    it('should fetch pending requests for managers', () => {
      renderDashboard(mockManagerUser)
      
      expect(requestsAPI.list).toHaveBeenCalledWith({
        status: 'pending',
        pending_for_role: mockManagerUser.role,
        limit: 10
      })
    })
    
    it('should fetch analytics for managers', () => {
      renderDashboard(mockManagerUser)
      
      expect(analyticsAPI.getOverview).toHaveBeenCalledWith({
        date_from: expect.any(String),
        date_to: expect.any(String)
      })
    })
    
    it('should not fetch manager-specific data for employees', () => {
      renderDashboard()
      
      // Should only call once for my requests
      expect(requestsAPI.list).toHaveBeenCalledTimes(1)
      expect(analyticsAPI.getOverview).not.toHaveBeenCalled()
    })
  })
  
  describe('Navigation Links', () => {
    it('should have correct href for quick action cards', () => {
      renderDashboard()
      
      expect(screen.getByTestId('create-request-card')).toHaveAttribute('href', '/requests/new')
      expect(screen.getByTestId('view-requests-card')).toHaveAttribute('href', '/requests')
    })
    
    it('should have correct href for analytics card', () => {
      renderDashboard(mockManagerUser)
      
      expect(screen.getByTestId('analytics-card')).toHaveAttribute('href', '/analytics')
    })
  })
  
  describe('Utility Functions', () => {
    it('should format request types correctly', () => {
      renderDashboard()
      
      // The component should transform 'leave-request' to 'Leave Request'
      // This is tested indirectly through the rendered content
      expect(screen.queryByText('leave-request')).not.toBeInTheDocument()
    })
    
    it('should display appropriate status badges', async () => {
      renderDashboard()
      
      await waitFor(() => {
        expect(screen.getByTestId('my-requests-list')).toBeInTheDocument()
      })
      
      // Should show status badges for requests
      expect(document.querySelector('.status-pending')).toBeInTheDocument()
      expect(document.querySelector('.status-approved')).toBeInTheDocument()
    })
  })
})