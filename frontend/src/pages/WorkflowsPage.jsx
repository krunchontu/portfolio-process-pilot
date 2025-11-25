import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  Filter,
  RefreshCw,
  GitBranch,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { workflowsAPI } from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import LoadingSpinner from '../components/LoadingSpinner'
import CreateWorkflowModal from '../components/CreateWorkflowModal'
import EditWorkflowModal from '../components/EditWorkflowModal'

const WorkflowsPage = () => {
  const { user: currentUser, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState(null)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Delete workflow mutation
  const deleteWorkflowMutation = useMutation(
    (workflowId) => workflowsAPI.delete(workflowId),
    {
      onSuccess: () => {
        toast.success('Workflow deleted successfully')
        queryClient.invalidateQueries(['workflows'])
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to delete workflow'
        toast.error(message)
      }
    }
  )

  const handleDeleteWorkflow = (workflow) => {
    if (window.confirm(`Are you sure you want to delete the workflow "${workflow.name}"? This action cannot be undone.`)) {
      deleteWorkflowMutation.mutate(workflow.id)
    }
  }

  // Fetch workflows
  const {
    data: workflowsData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['workflows', 'list'],
    () => workflowsAPI.list(),
    {
      select: data => data.data?.workflows || data.data || [],
      enabled: !!currentUser && isAdmin()
    }
  )

  // Apply client-side filtering (since backend may not support all filters)
  let workflows = workflowsData || []

  if (debouncedSearchTerm) {
    const searchLower = debouncedSearchTerm.toLowerCase()
    workflows = workflows.filter(w =>
      w.name?.toLowerCase().includes(searchLower) ||
      w.description?.toLowerCase().includes(searchLower) ||
      w.category?.toLowerCase().includes(searchLower)
    )
  }

  if (statusFilter !== 'all') {
    const isActive = statusFilter === 'active'
    workflows = workflows.filter(w => w.isActive === isActive)
  }

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'leave_request':
        return 'badge-info'
      case 'expense_approval':
        return 'badge-warning'
      case 'equipment_request':
        return 'badge-success'
      default:
        return 'badge-secondary'
    }
  }

  const formatCategory = (category) => {
    if (!category) return 'N/A'
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (!isAdmin()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            Access Denied
          </h3>
          <p className="text-secondary-600">
            You need administrator privileges to view this page.
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-error-900 mb-2">
            Failed to load workflows
          </h3>
          <p className="text-secondary-600 mb-4">
            {error.response?.data?.error || 'An error occurred'}
          </p>
          <button onClick={() => refetch()} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900">Workflows</h1>
          <p className="text-secondary-600 mt-2">
            Manage approval workflows and process definitions
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-outline p-2"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Workflow
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search workflows by name, category..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <select
              className="input pl-10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workflows Table */}
      <div className="card overflow-hidden">
        {workflows.length === 0 ? (
          <div className="text-center py-12">
            <GitBranch className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <p className="text-secondary-600">
              {searchTerm || statusFilter !== 'all'
                ? 'No workflows found matching your filters'
                : 'No workflows yet. Create your first workflow to get started.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-secondary-200">
              <thead className="bg-secondary-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Steps
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {workflows.map((workflow) => (
                  <tr key={workflow.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <GitBranch className="w-5 h-5 text-primary-700" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-secondary-900">
                            {workflow.name}
                          </div>
                          {workflow.description && (
                            <div className="text-sm text-secondary-500 truncate max-w-md">
                              {workflow.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getCategoryBadgeColor(workflow.category)}`}>
                        {formatCategory(workflow.category)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-900">
                        {workflow.steps?.length || 0} step{workflow.steps?.length !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${workflow.isActive ? 'badge-success' : 'badge-secondary'}`}>
                        {workflow.isActive ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                      {workflow.createdAt ? new Date(workflow.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingWorkflow(workflow)}
                        className="text-info-600 hover:text-info-900 mr-3"
                        title="View/Edit workflow"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingWorkflow(workflow)}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                        title="Edit workflow"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteWorkflow(workflow)}
                        className="text-error-600 hover:text-error-900"
                        title="Delete workflow"
                        disabled={deleteWorkflowMutation.isLoading}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Show count */}
      {workflows.length > 0 && (
        <div className="mt-4 text-sm text-secondary-600 text-center">
          Showing {workflows.length} workflow{workflows.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Modals */}
      <CreateWorkflowModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditWorkflowModal
        isOpen={!!editingWorkflow}
        onClose={() => setEditingWorkflow(null)}
        workflow={editingWorkflow}
      />
    </div>
  )
}

export default WorkflowsPage
