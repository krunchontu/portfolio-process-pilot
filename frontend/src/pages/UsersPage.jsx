import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { toast } from 'react-hot-toast'
import {
  Search,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Filter,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usersAPI } from '../services/api'
import { useDebounce } from '../hooks/useDebounce'
import LoadingSpinner from '../components/LoadingSpinner'
import CreateUserModal from '../components/CreateUserModal'
import EditUserModal from '../components/EditUserModal'

const UsersPage = () => {
  const { user: currentUser, isAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const debouncedSearchTerm = useDebounce(searchTerm, 300)

  // Delete user mutation
  const deleteUserMutation = useMutation(
    (userId) => usersAPI.delete(userId),
    {
      onSuccess: () => {
        toast.success('User deleted successfully')
        queryClient.invalidateQueries(['users'])
      },
      onError: (error) => {
        const message = error.response?.data?.error || 'Failed to delete user'
        toast.error(message)
      }
    }
  )

  const handleDeleteUser = (user) => {
    if (user.id === currentUser?.id) {
      toast.error('You cannot delete your own account')
      return
    }

    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}? This action cannot be undone.`)) {
      deleteUserMutation.mutate(user.id)
    }
  }

  // Build query params
  const queryParams = {
    search: debouncedSearchTerm || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    isActive: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    limit: 100
  }

  // Fetch users
  const {
    data: usersData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['users', 'list', queryParams],
    () => usersAPI.list(queryParams),
    {
      select: data => data.data,
      enabled: !!currentUser && isAdmin()
    }
  )

  const users = usersData?.users || []

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin':
        return 'badge-error'
      case 'manager':
        return 'badge-warning'
      case 'employee':
        return 'badge-info'
      default:
        return 'badge-secondary'
    }
  }

  const getStatusBadgeColor = (isActive) => {
    return isActive ? 'badge-success' : 'badge-secondary'
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
            Failed to load users
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
          <h1 className="text-3xl font-bold text-secondary-900">Users</h1>
          <p className="text-secondary-600 mt-2">
            Manage user accounts and permissions
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
            Create User
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-secondary-400" />
            <select
              className="input pl-10"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">All Roles</option>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              className="input"
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

      {/* Users Table */}
      <div className="card overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-secondary-600">
              {searchTerm || roleFilter !== 'all' || statusFilter !== 'all'
                ? 'No users found matching your filters'
                : 'No users yet'}
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
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Department
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-secondary-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-secondary-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-secondary-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium text-sm">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-secondary-900">
                            {user.firstName} {user.lastName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-secondary-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`badge ${getStatusBadgeColor(user.isActive)}`}>
                        {user.isActive ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                      {user.managerName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-600">
                      {user.department || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        title="Edit user"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="text-error-600 hover:text-error-900"
                          title="Delete user"
                          disabled={deleteUserMutation.isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Show count */}
      {users.length > 0 && (
        <div className="mt-4 text-sm text-secondary-600 text-center">
          Showing {users.length} user{users.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
      />
    </div>
  )
}

export default UsersPage
