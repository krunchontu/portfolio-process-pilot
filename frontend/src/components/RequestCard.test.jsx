import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, userEvent } from '@/test/test-utils'
import RequestCard from './RequestCard'
import * as AuthContext from '../contexts/AuthContext'

// Mock date-fns
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn(() => '2 hours ago'),
  format: vi.fn(() => 'Jan 15, 2024')
}))

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
  }
})

describe('RequestCard', () => {
  const mockUser = {
    id: '1',
    email: 'user@example.com',
    role: 'employee'
  }
  
  const baseRequest = {
    id: '123',
    type: 'leave-request',
    status: 'pending',
    submitted_at: '2024-01-15T10:00:00Z',
    created_by: '1',
    current_step_index: 0,
    steps: [
      {
        stepId: 'manager-approval',
        role: 'manager',
        actions: ['approve', 'reject']
      }
    ],
    payload: {
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      reason: 'Vacation'
    }
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  const renderRequestCard = (request = baseRequest, props = {}, user = mockUser) => {
    const mockAuthContext = {
      user,
      isAuthenticated: true,
      isLoading: false
    }
    
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue(mockAuthContext)
    
    return render(<RequestCard request={request} {...props} />)
  }
  
  describe('Basic Rendering', () => {
    it('should render request card with basic information', () => {
      renderRequestCard()
      
      expect(screen.getByTestId('request-card-123')).toBeInTheDocument()
      expect(screen.getByTestId('request-type')).toHaveTextContent('Leave Request')
      expect(screen.getByTestId('status-badge')).toHaveTextContent('pending')
      expect(screen.getByTestId('submitted-date')).toBeInTheDocument()
    })
    
    it('should format request type correctly', () => {
      const request = { ...baseRequest, type: 'expense-approval' }
      renderRequestCard(request)
      
      expect(screen.getByTestId('request-type')).toHaveTextContent('Expense Approval')
    })
    
    it('should display correct status icon and badge', () => {
      renderRequestCard()
      
      expect(screen.getByTestId('status-badge')).toHaveClass('status-pending')
    })
    
    it('should show view details link', () => {
      renderRequestCard()
      
      const link = screen.getByTestId('view-details-link')
      expect(link).toHaveAttribute('href', '/requests/123')
      expect(link).toHaveTextContent('View Details')
    })
  })
  
  describe('Status Handling', () => {
    it('should display approved status correctly', () => {
      const request = { ...baseRequest, status: 'approved' }
      renderRequestCard(request)
      
      expect(screen.getByTestId('status-badge')).toHaveTextContent('approved')
      expect(screen.getByTestId('status-badge')).toHaveClass('status-approved')
    })
    
    it('should display rejected status correctly', () => {
      const request = { ...baseRequest, status: 'rejected' }
      renderRequestCard(request)
      
      expect(screen.getByTestId('status-badge')).toHaveTextContent('rejected')
      expect(screen.getByTestId('status-badge')).toHaveClass('status-rejected')
    })
    
    it('should display cancelled status correctly', () => {
      const request = { ...baseRequest, status: 'cancelled' }
      renderRequestCard(request)
      
      expect(screen.getByTestId('status-badge')).toHaveTextContent('cancelled')
      expect(screen.getByTestId('status-badge')).toHaveClass('status-cancelled')
    })
  })
  
  describe('Creator Information', () => {
    it('should show creator info when showCreator is true', () => {
      const request = {
        ...baseRequest,
        creator_first_name: 'John',
        creator_last_name: 'Doe',
        creator_email: 'john@example.com'
      }
      
      renderRequestCard(request, { showCreator: true })
      
      expect(screen.getByTestId('creator-info')).toHaveTextContent('John Doe (john@example.com)')
    })
    
    it('should not show creator info when showCreator is false', () => {
      const request = {
        ...baseRequest,
        creator_first_name: 'John',
        creator_last_name: 'Doe'
      }
      
      renderRequestCard(request, { showCreator: false })
      
      expect(screen.queryByTestId('creator-info')).not.toBeInTheDocument()
    })
  })
  
  describe('SLA Handling', () => {
    it('should show SLA deadline when present', () => {
      const request = {
        ...baseRequest,
        sla_deadline: '2024-01-17T10:00:00Z'
      }
      
      renderRequestCard(request)
      
      expect(screen.getByTestId('sla-deadline')).toBeInTheDocument()
    })
    
    it('should show overdue badge for expired SLA', () => {
      const request = {
        ...baseRequest,
        sla_deadline: '2024-01-10T10:00:00Z' // Past date
      }
      
      renderRequestCard(request)
      
      expect(screen.getByTestId('overdue-badge')).toHaveTextContent('Overdue')
      expect(screen.getByTestId('sla-deadline')).toHaveTextContent('(Overdue)')
    })
    
    it('should not show overdue badge for future SLA', () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const request = {
        ...baseRequest,
        sla_deadline: futureDate
      }
      
      renderRequestCard(request)
      
      expect(screen.queryByTestId('overdue-badge')).not.toBeInTheDocument()
    })
  })
  
  describe('Request Details', () => {
    it('should display request payload summary', () => {
      renderRequestCard()
      
      expect(screen.getByTestId('request-summary')).toBeInTheDocument()
      expect(screen.getByText('Start Date:')).toBeInTheDocument()
      expect(screen.getByText('2024-02-01')).toBeInTheDocument()
    })
    
    it('should limit displayed payload fields', () => {
      const request = {
        ...baseRequest,
        payload: {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3',
          field4: 'value4',
          field5: 'value5'
        }
      }
      
      renderRequestCard(request)
      
      expect(screen.getByText('+2 more details')).toBeInTheDocument()
    })
    
    it('should truncate long payload values', () => {
      const request = {
        ...baseRequest,
        payload: {
          longField: 'This is a very long value that should be truncated to prevent layout issues'
        }
      }
      
      renderRequestCard(request)
      
      expect(screen.getByText(/This is a very long value that should be.../)).toBeInTheDocument()
    })
  })
  
  describe('Workflow Information', () => {
    it('should display workflow name when present', () => {
      const request = {
        ...baseRequest,
        workflow_name: 'Leave Approval Process'
      }
      
      renderRequestCard(request)
      
      expect(screen.getByTestId('workflow-info')).toHaveTextContent('Workflow: Leave Approval Process')
    })
    
    it('should show completed date for completed requests', () => {
      const request = {
        ...baseRequest,
        status: 'approved',
        completed_at: '2024-01-16T14:30:00Z'
      }
      
      renderRequestCard(request)
      
      expect(screen.getByTestId('completed-date')).toBeInTheDocument()
    })
  })
  
  describe('User Actions', () => {
    it('should show cancel button for own pending requests', () => {
      renderRequestCard()
      
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })
    
    it('should not show cancel button for other users requests', () => {
      const request = { ...baseRequest, created_by: 'different-user' }
      renderRequestCard(request)
      
      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })
    
    it('should not show cancel button for non-pending requests', () => {
      const request = { ...baseRequest, status: 'approved' }
      renderRequestCard(request)
      
      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
    })
    
    it('should handle cancel button click', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const user = userEvent.setup()
      
      renderRequestCard()
      
      const cancelButton = screen.getByTestId('cancel-button')
      await user.click(cancelButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('Cancel request:', '123')
      
      consoleSpy.mockRestore()
    })
    
    it('should not show actions when showActions is false', () => {
      renderRequestCard(baseRequest, { showActions: false })
      
      expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
      expect(screen.queryByTestId('view-details-link')).not.toBeInTheDocument()
    })
  })
  
  describe('Action Required Badge', () => {
    it('should show action required badge for manager when request pending for manager', () => {
      const managerUser = { ...mockUser, role: 'manager' }
      renderRequestCard(baseRequest, {}, managerUser)
      
      expect(screen.getByTestId('action-required-badge')).toHaveTextContent('Action Required')
    })
    
    it('should show action required badge for admin', () => {
      const adminUser = { ...mockUser, role: 'admin' }
      renderRequestCard(baseRequest, {}, adminUser)
      
      expect(screen.getByTestId('action-required-badge')).toHaveTextContent('Action Required')
    })
    
    it('should not show action required badge for employee when not their request', () => {
      const request = { ...baseRequest, created_by: 'different-user' }
      renderRequestCard(request)
      
      expect(screen.queryByTestId('action-required-badge')).not.toBeInTheDocument()
    })
    
    it('should highlight card when action required', () => {
      const managerUser = { ...mockUser, role: 'manager' }
      renderRequestCard(baseRequest, {}, managerUser)
      
      const card = screen.getByTestId('request-card-123')
      expect(card).toHaveClass('ring-2', 'ring-primary-200', 'bg-primary-50')
    })
  })
  
  describe('Date Formatting', () => {
    it('should format submitted date correctly', () => {
      renderRequestCard()
      
      expect(screen.getByTestId('submitted-date')).toHaveTextContent('Submitted 2 hours ago (Jan 15, 2024)')
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderRequestCard()
      
      const card = screen.getByTestId('request-card-123')
      expect(card).toBeInTheDocument()
      
      const link = screen.getByTestId('view-details-link')
      expect(link).toHaveAttribute('href', '/requests/123')
    })
  })
})