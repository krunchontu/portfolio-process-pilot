import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, userEvent } from '@/test/test-utils'
import RequestsPage from './RequestsPage'
import * as AuthContext from '../contexts/AuthContext'
import { requestsAPI } from '../services/api'

// Mock API
vi.mock('../services/api', () => ({
  requestsAPI: {
    list: vi.fn()
  }
}))

// Mock hooks
vi.mock('../hooks/useDebounce', () => ({
  useDebounce: vi.fn((value) => value)
}))

// Mock react-router-dom
const mockSetSearchParams = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
    useSearchParams: () => [new URLSearchParams(), mockSetSearchParams]
  }
})

describe('RequestsPage', () => {
  const mockUser = {
    id: '1',
    email: 'user@example.com',
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
      submitted_at: '2024-01-15T10:00:00Z',
      created_by: '1',
      creator_first_name: 'John',
      creator_last_name: 'Doe',
      current_step_index: 0,
      steps: [{ role: 'manager', actions: ['approve', 'reject'] }]
    },
    {
      id: '2',
      type: 'expense-approval',
      status: 'approved',
      submitted_at: '2024-01-14T09:00:00Z',
      created_by: '2',
      creator_first_name: 'Jane',
      creator_last_name: 'Smith',
      completed_at: '2024-01-15T12:00:00Z'
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderRequestsPage = (user = mockUser) => {
    const mockAuthContext = {
      user,
      isManagerOrAdmin: vi.fn(() => ['manager', 'admin'].includes(user.role)),
      isAuthenticated: true,
      isLoading: false
    }

    vi.spyOn(AuthContext, 'useAuth').mockReturnValue(mockAuthContext)

    requestsAPI.list.mockResolvedValue({
      data: {
        requests: mockRequests,
        total: mockRequests.length
      }
    })

    return render(<RequestsPage />)
  }

  describe('Page Rendering', () => {
    it('should render page header and controls', async () => {
      renderRequestsPage()

      expect(screen.getByTestId('page-title')).toHaveTextContent('Requests')
      expect(screen.getByText('Manage and track all your workflow requests')).toBeInTheDocument()
      expect(screen.getByTestId('create-request-button')).toBeInTheDocument()
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument()
    })

    it('should show export button for managers/admins', () => {
      renderRequestsPage(mockManagerUser)

      expect(screen.getByTestId('export-button')).toBeInTheDocument()
    })

    it('should not show export button for employees', () => {
      renderRequestsPage()

      expect(screen.queryByTestId('export-button')).not.toBeInTheDocument()
    })
  })

  describe('Filter Controls', () => {
    it('should render all filter controls', () => {
      renderRequestsPage()

      expect(screen.getByTestId('search-input')).toBeInTheDocument()
      expect(screen.getByTestId('status-filter')).toBeInTheDocument()
      expect(screen.getByTestId('type-filter')).toBeInTheDocument()
      expect(screen.getByTestId('creator-filter')).toBeInTheDocument()
    })

    it('should show pending-for-me option for managers', () => {
      renderRequestsPage(mockManagerUser)

      const creatorFilter = screen.getByTestId('creator-filter')
      expect(creatorFilter).toHaveDisplayValue('All Requests')

      // Check that the option exists
      const options = Array.from(creatorFilter.options).map(o => o.value)
      expect(options).toContain('pending-for-me')
    })

    it('should not show pending-for-me option for employees', () => {
      renderRequestsPage()

      const creatorFilter = screen.getByTestId('creator-filter')
      const options = Array.from(creatorFilter.options).map(o => o.value)
      expect(options).not.toContain('pending-for-me')
    })
  })

  describe('Search Functionality', () => {
    it('should handle search input', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const searchInput = screen.getByTestId('search-input')

      await user.type(searchInput, 'test search')

      expect(searchInput).toHaveValue('test search')
    })

    it('should handle status filter change', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const statusFilter = screen.getByTestId('status-filter')

      await user.selectOptions(statusFilter, 'pending')

      expect(statusFilter).toHaveValue('pending')
    })

    it('should handle type filter change', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const typeFilter = screen.getByTestId('type-filter')

      await user.selectOptions(typeFilter, 'leave-request')

      expect(typeFilter).toHaveValue('leave-request')
    })

    it('should handle creator filter change', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const creatorFilter = screen.getByTestId('creator-filter')

      await user.selectOptions(creatorFilter, 'mine')

      expect(creatorFilter).toHaveValue('mine')
    })
  })

  describe('View Mode Toggle', () => {
    it('should toggle between card and list view', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      await waitFor(() => {
        expect(screen.getByTestId('requests-list')).toBeInTheDocument()
      })

      const cardViewButton = screen.getByTestId('card-view-button')
      const listViewButton = screen.getByTestId('list-view-button')

      // Should start in card view
      expect(cardViewButton).toHaveClass('bg-white', 'text-primary-600')

      // Switch to list view
      await user.click(listViewButton)

      expect(listViewButton).toHaveClass('bg-white', 'text-primary-600')
      expect(cardViewButton).not.toHaveClass('bg-white', 'text-primary-600')
    })
  })

  describe('Data Loading', () => {
    it('should show loading state', () => {
      requestsAPI.list.mockReturnValue(new Promise(() => {})) // Never resolves
      renderRequestsPage()

      // Should show skeleton loading
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
    })

    it('should display requests when loaded', async () => {
      renderRequestsPage()

      await waitFor(() => {
        expect(screen.getByTestId('requests-list')).toBeInTheDocument()
      })

      expect(screen.getByTestId('request-card-1')).toBeInTheDocument()
      expect(screen.getByTestId('request-card-2')).toBeInTheDocument()
    })

    it('should show results summary', async () => {
      renderRequestsPage()

      await waitFor(() => {
        expect(screen.getByTestId('results-summary')).toHaveTextContent('Showing 2 of 2 requests')
      })
    })

    it('should show error state on API failure', async () => {
      requestsAPI.list.mockRejectedValue(new Error('API Error'))
      renderRequestsPage()

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument()
      })

      expect(screen.getByText('Failed to load requests')).toBeInTheDocument()
    })

    it('should show empty state when no requests', async () => {
      requestsAPI.list.mockResolvedValue({
        data: { requests: [], total: 0 }
      })
      renderRequestsPage()

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      expect(screen.getByText('No requests yet')).toBeInTheDocument()
    })

    it('should show filtered empty state when no matches', async () => {
      requestsAPI.list.mockResolvedValue({
        data: { requests: [], total: 0 }
      })

      const user = userEvent.setup()
      renderRequestsPage()

      // Set a filter first
      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'nonexistent')

      await waitFor(() => {
        expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      })

      expect(screen.getByText('No requests match your filters')).toBeInTheDocument()
    })
  })

  describe('Filter Management', () => {
    it('should show clear filters button when filters are active', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      // Apply a filter
      const statusFilter = screen.getByTestId('status-filter')
      await user.selectOptions(statusFilter, 'pending')

      await waitFor(() => {
        expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument()
      })
    })

    it('should clear all filters when clear button is clicked', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      // Apply filters
      const searchInput = screen.getByTestId('search-input')
      const statusFilter = screen.getByTestId('status-filter')

      await user.type(searchInput, 'test')
      await user.selectOptions(statusFilter, 'pending')

      await waitFor(() => {
        expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument()
      })

      // Clear filters
      const clearButton = screen.getByTestId('clear-filters-button')
      await user.click(clearButton)

      expect(searchInput).toHaveValue('')
      expect(statusFilter).toHaveValue('all')
    })
  })

  describe('Actions', () => {
    it('should handle refresh button click', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const refreshButton = screen.getByTestId('refresh-button')
      await user.click(refreshButton)

      // Should call the API again
      expect(requestsAPI.list).toHaveBeenCalledTimes(2)
    })

    it('should handle export button click for managers', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      const user = userEvent.setup()
      renderRequestsPage(mockManagerUser)

      const exportButton = screen.getByTestId('export-button')
      await user.click(exportButton)

      expect(consoleSpy).toHaveBeenCalledWith('Export requests with params:', expect.any(Object))

      consoleSpy.mockRestore()
    })
  })

  describe('API Integration', () => {
    it('should call API with correct parameters', () => {
      renderRequestsPage()

      expect(requestsAPI.list).toHaveBeenCalledWith(
        expect.objectContaining({
          sort_by: 'submitted_at',
          sort_order: 'desc',
          limit: 20
        })
      )
    })

    it('should call API with search parameters', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const searchInput = screen.getByTestId('search-input')
      await user.type(searchInput, 'test')

      // Wait for debounce and API call
      await waitFor(() => {
        expect(requestsAPI.list).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'test'
          })
        )
      })
    })

    it('should call API with filter parameters', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const statusFilter = screen.getByTestId('status-filter')
      await user.selectOptions(statusFilter, 'pending')

      await waitFor(() => {
        expect(requestsAPI.list).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'pending'
          })
        )
      })
    })

    it('should call API with mine filter', async () => {
      const user = userEvent.setup()
      renderRequestsPage()

      const creatorFilter = screen.getByTestId('creator-filter')
      await user.selectOptions(creatorFilter, 'mine')

      await waitFor(() => {
        expect(requestsAPI.list).toHaveBeenCalledWith(
          expect.objectContaining({
            created_by: mockUser.id
          })
        )
      })
    })

    it('should call API with pending-for-me filter for managers', async () => {
      const user = userEvent.setup()
      renderRequestsPage(mockManagerUser)

      const creatorFilter = screen.getByTestId('creator-filter')
      await user.selectOptions(creatorFilter, 'pending-for-me')

      await waitFor(() => {
        expect(requestsAPI.list).toHaveBeenCalledWith(
          expect.objectContaining({
            pending_for_role: mockManagerUser.role,
            status: 'pending'
          })
        )
      })
    })
  })

  describe('Navigation Links', () => {
    it('should have correct href for create request button', () => {
      renderRequestsPage()

      const createButton = screen.getByTestId('create-request-button')
      expect(createButton).toHaveAttribute('href', '/requests/new')
    })
  })

  describe('Load More', () => {
    it('should show load more button when there are more results', async () => {
      requestsAPI.list.mockResolvedValue({
        data: {
          requests: mockRequests,
          total: 50 // More than current results
        }
      })

      renderRequestsPage()

      await waitFor(() => {
        expect(screen.getByTestId('load-more-button')).toBeInTheDocument()
      })
    })

    it('should not show load more button when all results are shown', async () => {
      renderRequestsPage()

      await waitFor(() => {
        expect(screen.queryByTestId('load-more-button')).not.toBeInTheDocument()
      })
    })
  })
})
