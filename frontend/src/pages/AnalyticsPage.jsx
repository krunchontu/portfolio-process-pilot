import React, { useState } from 'react'
import { useQuery } from 'react-query'
import { toast } from 'react-hot-toast'
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  RefreshCw,
  BarChart3
} from 'lucide-react'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { useAuth } from '../contexts/AuthContext'
import { analyticsAPI } from '../services/api'
import LoadingSpinner from '../components/LoadingSpinner'

const AnalyticsPage = () => {
  const { user: currentUser, isAdmin, isManager } = useAuth()
  const [timeRange, setTimeRange] = useState('30') // days

  // Fetch dashboard metrics
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery(
    ['analytics', 'dashboard', timeRange],
    () => analyticsAPI.getDashboard({ days: timeRange }),
    {
      select: data => data.data || data,
      enabled: !!currentUser && (isAdmin() || isManager())
    }
  )

  // Fetch request trend data
  const {
    data: requestTrendData,
    isLoading: trendLoading
  } = useQuery(
    ['analytics', 'requests', 'trend', timeRange],
    () => analyticsAPI.getRequests({ days: timeRange, type: 'trend' }),
    {
      select: data => data.data?.trend || data.data || [],
      enabled: !!currentUser && (isAdmin() || isManager())
    }
  )

  const metrics = dashboardData?.metrics || {
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    avgApprovalTime: 0
  }

  const requestsByType = dashboardData?.requestsByType || []
  const trend = requestTrendData || []

  // Colors for charts
  const COLORS = {
    pending: '#F59E0B', // warning
    approved: '#10B981', // success
    rejected: '#EF4444', // error
    leave_request: '#3B82F6', // info
    expense_approval: '#F59E0B', // warning
    equipment_request: '#10B981' // success
  }

  const PIE_COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EC4899']

  const MetricCard = ({ title, value, icon: Icon, trend, color = 'primary' }) => {
    const colorClasses = {
      primary: 'bg-primary-100 text-primary-700',
      warning: 'bg-warning-100 text-warning-700',
      success: 'bg-success-100 text-success-700',
      error: 'bg-error-100 text-error-700'
    }

    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-secondary-600">{title}</p>
            <p className="text-3xl font-bold text-secondary-900 mt-2">{value}</p>
            {trend !== undefined && (
              <div className="flex items-center mt-2">
                {trend >= 0 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                    <span className="text-sm text-success-600">+{trend}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-4 h-4 text-error-600 mr-1" />
                    <span className="text-sm text-error-600">{trend}%</span>
                  </>
                )}
                <span className="text-sm text-secondary-500 ml-1">vs last period</span>
              </div>
            )}
          </div>
          <div className={`p-4 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-8 h-8" />
          </div>
        </div>
      </div>
    )
  }

  const formatCategory = (category) => {
    if (!category) return 'Other'
    return category.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  if (!(isAdmin() || isManager())) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-secondary-900 mb-2">
            Access Denied
          </h3>
          <p className="text-secondary-600">
            You need manager or administrator privileges to view analytics.
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
            Failed to load analytics
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
          <h1 className="text-3xl font-bold text-secondary-900">Analytics Dashboard</h1>
          <p className="text-secondary-600 mt-2">
            Request metrics and performance insights
          </p>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-secondary-600" />
            <select
              className="input text-sm py-2"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="btn-outline p-2"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Requests"
          value={metrics.totalRequests || 0}
          icon={FileText}
          color="primary"
          trend={metrics.totalRequestsTrend}
        />
        <MetricCard
          title="Pending"
          value={metrics.pendingRequests || 0}
          icon={Clock}
          color="warning"
        />
        <MetricCard
          title="Approved"
          value={metrics.approvedRequests || 0}
          icon={CheckCircle}
          color="success"
          trend={metrics.approvedTrend}
        />
        <MetricCard
          title="Rejected"
          value={metrics.rejectedRequests || 0}
          icon={XCircle}
          color="error"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Request Trend Chart */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-secondary-900">Request Trends</h3>
            <BarChart3 className="w-5 h-5 text-secondary-400" />
          </div>

          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  stroke="#6B7280"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Approved"
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Rejected"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-secondary-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No trend data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Request Type Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-secondary-900">Requests by Type</h3>
            <BarChart3 className="w-5 h-5 text-secondary-400" />
          </div>

          {requestsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={requestsByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${formatCategory(name)} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="type"
                >
                  {requestsByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '0.5rem'
                  }}
                  formatter={(value, name) => [value, formatCategory(name)]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-secondary-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No request type data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card">
          <h4 className="text-sm font-medium text-secondary-600 mb-2">Average Approval Time</h4>
          <p className="text-2xl font-bold text-secondary-900">
            {metrics.avgApprovalTime ? `${metrics.avgApprovalTime.toFixed(1)} hours` : 'N/A'}
          </p>
        </div>

        <div className="card">
          <h4 className="text-sm font-medium text-secondary-600 mb-2">Approval Rate</h4>
          <p className="text-2xl font-bold text-secondary-900">
            {metrics.totalRequests > 0
              ? `${((metrics.approvedRequests / metrics.totalRequests) * 100).toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>

        <div className="card">
          <h4 className="text-sm font-medium text-secondary-600 mb-2">Rejection Rate</h4>
          <p className="text-2xl font-bold text-secondary-900">
            {metrics.totalRequests > 0
              ? `${((metrics.rejectedRequests / metrics.totalRequests) * 100).toFixed(1)}%`
              : 'N/A'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsPage
