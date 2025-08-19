import React, { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import {
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  SortAsc,
  SortDesc,
  Grid,
  List,
  ChevronDown
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { requestsAPI } from '../services/api'
import RequestCard from '../components/RequestCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { Menu, Transition } from '@headlessui/react'
import { clsx } from 'clsx'
import { useDebounce } from '../hooks/useDebounce'

const RequestsPage = () => {
  const { user, isManagerOrAdmin } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [viewMode, setViewMode] = useState('card') // 'card' | 'list'

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all')
  const [typeFilter, setTypeFilter] = useState(searchParams.get('type') || 'all')
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'submitted_at')
  const [sortOrder, setSortOrder] = useState(searchParams.get('order') || 'desc')
  const [createdByFilter, setCreatedByFilter] = useState(searchParams.get('created_by') || 'all')

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Update URL params when filters change
  React.useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedSearchTerm) params.set('search', debouncedSearchTerm)
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (sortBy !== 'submitted_at') params.set('sort', sortBy)
    if (sortOrder !== 'desc') params.set('order', sortOrder)
    if (createdByFilter !== 'all') params.set('created_by', createdByFilter)

    setSearchParams(params, { replace: true })
  }, [debouncedSearchTerm, statusFilter, typeFilter, sortBy, sortOrder, createdByFilter, setSearchParams])

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = {}

    // Search
    if (debouncedSearchTerm) {
      params.search = debouncedSearchTerm
    }

    // Status filter
    if (statusFilter !== 'all') {
      params.status = statusFilter
    }

    // Type filter
    if (typeFilter !== 'all') {
      params.type = typeFilter
    }

    // Creator filter
    if (createdByFilter === 'mine') {
      params.created_by = user?.id
    } else if (createdByFilter === 'pending-for-me' && isManagerOrAdmin()) {
      params.pending_for_role = user?.role
      params.status = 'pending'
    }

    // Sorting
    params.sort_by = sortBy
    params.sort_order = sortOrder

    // Pagination
    params.limit = 20

    return params
  }, [debouncedSearchTerm, statusFilter, typeFilter, sortBy, sortOrder, createdByFilter, user, isManagerOrAdmin])

  // Fetch requests
  const {
    data: requestsData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['requests', 'list', queryParams],
    () => requestsAPI.list(queryParams),
    {
      select: data => data.data,
      keepPreviousData: true,
      staleTime: 30000 // 30 seconds
    }
  )

  const requests = requestsData?.requests || []
  const totalCount = requestsData?.total || 0

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setTypeFilter('all')
    setCreatedByFilter('all')
    setSortBy('submitted_at')
    setSortOrder('desc')
  }

  // Toggle sort order
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  // Export requests (placeholder)
  const exportRequests = () => {
    // TODO: Implement export functionality
    console.log('Export requests with params:', queryParams)
  }

  // Get unique request types for filter
  const requestTypes = useMemo(() => {
    const types = new Set()
    requests.forEach(request => types.add(request.type))
    return Array.from(types).sort()
  }, [requests])

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || typeFilter !== 'all' || createdByFilter !== 'all'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900" data-testid="page-title">
            Requests
          </h1>
          <p className="text-secondary-600 mt-2">
            Manage and track all your workflow requests
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-outline p-2"
            data-testid="refresh-button"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          {isManagerOrAdmin() && (
            <button
              onClick={exportRequests}
              className="btn-outline"
              data-testid="export-button"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          )}

          <Link to="/requests/new" className="btn-primary" data-testid="create-request-button">
            <Plus className="w-4 h-4 mr-2" />
            New Request
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
              data-testid="search-input"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input"
            data-testid="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input"
            data-testid="type-filter"
          >
            <option value="all">All Types</option>
            {requestTypes.map(type => (
              <option key={type} value={type}>
                {type.split('-').map(word =>
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </option>
            ))}
          </select>

          {/* Creator Filter */}
          <select
            value={createdByFilter}
            onChange={(e) => setCreatedByFilter(e.target.value)}
            className="input"
            data-testid="creator-filter"
          >
            <option value="all">All Requests</option>
            <option value="mine">My Requests</option>
            {isManagerOrAdmin() && (
              <option value="pending-for-me">Pending for Me</option>
            )}
          </select>
        </div>

        {/* Secondary Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4 mb-4 sm:mb-0">
            {/* Sort Controls */}
            <Menu as="div" className="relative">
              <Menu.Button className="btn-outline text-sm">
                <Filter className="w-4 h-4 mr-2" />
                Sort by: {sortBy.replace('_', ' ')}
                {sortOrder === 'asc' ?
                  <SortAsc className="w-4 h-4 ml-2" /> :
                  <SortDesc className="w-4 h-4 ml-2" />
                }
              </Menu.Button>

              <Transition
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
              >
                <Menu.Items className="absolute left-0 z-10 mt-2 w-48 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {[
                      { key: 'submitted_at', label: 'Date Submitted' },
                      { key: 'status', label: 'Status' },
                      { key: 'type', label: 'Request Type' },
                      { key: 'sla_deadline', label: 'SLA Deadline' }
                    ].map(option => (
                      <Menu.Item key={option.key}>
                        {({ active }) => (
                          <button
                            onClick={() => toggleSort(option.key)}
                            className={clsx(
                              'block w-full text-left px-4 py-2 text-sm',
                              active ? 'bg-secondary-100' : '',
                              sortBy === option.key ? 'text-primary-600 font-medium' : 'text-secondary-700'
                            )}
                          >
                            {option.label}
                          </button>
                        )}
                      </Menu.Item>
                    ))}
                  </div>
                </Menu.Items>
              </Transition>
            </Menu>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-secondary-600 hover:text-secondary-800"
                data-testid="clear-filters-button"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary-600">View:</span>
            <div className="flex bg-secondary-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('card')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'card'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-800'
                )}
                data-testid="card-view-button"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list'
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-secondary-600 hover:text-secondary-800'
                )}
                data-testid="list-view-button"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      {!isLoading && (
        <div className="mb-6 text-sm text-secondary-600" data-testid="results-summary">
          Showing {requests.length} of {totalCount} requests
          {hasActiveFilters && <span> (filtered)</span>}
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 bg-secondary-200 rounded w-1/4 mb-4"></div>
                <div className="h-3 bg-secondary-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-secondary-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12" data-testid="error-message">
            <div className="text-error-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              Failed to load requests
            </h3>
            <p className="text-secondary-600 mb-4">
              {error.response?.data?.error || 'An unexpected error occurred'}
            </p>
            <button onClick={() => refetch()} className="btn-primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-state">
            <div className="text-secondary-300 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">
              {hasActiveFilters ? 'No requests match your filters' : 'No requests yet'}
            </h3>
            <p className="text-secondary-600 mb-4">
              {hasActiveFilters
                ? 'Try adjusting your search criteria or clearing filters'
                : 'Get started by creating your first request'
              }
            </p>
            {hasActiveFilters ? (
              <button onClick={clearFilters} className="btn-outline">
                Clear Filters
              </button>
            ) : (
              <Link to="/requests/new" className="btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Link>
            )}
          </div>
        ) : (
          <div
            className={
              viewMode === 'card'
                ? 'grid grid-cols-1 lg:grid-cols-2 gap-6'
                : 'space-y-4'
            }
            data-testid="requests-list"
          >
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                showCreator={createdByFilter !== 'mine'}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Load More Button (if pagination needed) */}
      {requests.length > 0 && requests.length < totalCount && (
        <div className="text-center mt-8">
          <button
            className="btn-outline"
            onClick={() => {
              // TODO: Implement load more functionality
              console.log('Load more requests')
            }}
            data-testid="load-more-button"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}

export default RequestsPage
