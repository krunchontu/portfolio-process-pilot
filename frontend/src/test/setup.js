import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock environment variables
vi.mock('import.meta.env', () => ({
  DEV: false,
  PROD: true,
  VITE_API_URL: 'http://localhost:5000/api'
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
})

// Mock window.location
delete window.location
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: vi.fn(),
  reload: vi.fn(),
  replace: vi.fn()
}

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn()
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn()
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock fetch
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
const originalError = console.error
console.error = (...args) => {
  // Suppress React Router warnings in tests
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning: React Router')
  ) {
    return
  }
  originalError.call(console, ...args)
}

// Global test utilities
global.testUtils = {
  // Mock user data
  mockUser: {
    id: '1',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'employee',
    department: 'IT',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Mock admin user
  mockAdmin: {
    id: '2',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    department: 'IT',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Mock manager user
  mockManager: {
    id: '3',
    email: 'manager@example.com',
    firstName: 'Manager',
    lastName: 'User',
    role: 'manager',
    department: 'HR',
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },

  // Mock request data
  mockRequest: {
    id: '1',
    type: 'leave-request',
    status: 'pending',
    currentStepIndex: 0,
    payload: {
      startDate: '2024-02-01',
      endDate: '2024-02-05',
      reason: 'Vacation'
    },
    submittedAt: '2024-01-15T10:00:00Z',
    creatorFirstName: 'Test',
    creatorLastName: 'User',
    creatorEmail: 'test@example.com',
    workflowName: 'Leave Request Approval'
  },

  // Mock workflow data
  mockWorkflow: {
    id: '1',
    name: 'Leave Request',
    flowId: 'leave-request',
    description: 'Standard leave request workflow',
    isActive: true,
    steps: [
      {
        stepId: 'manager-approval',
        order: 1,
        role: 'manager',
        actions: ['approve', 'reject'],
        slaHours: 48
      }
    ],
    notifications: {
      onSubmit: ['manager'],
      onApprove: ['employee'],
      onReject: ['employee']
    }
  }
}

export default undefined
