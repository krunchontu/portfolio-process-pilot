import React, { createContext, useContext, useReducer, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import io from 'socket.io-client'
import { useAuth } from './AuthContext'

// Notification context
const NotificationContext = createContext(null)

// Notification reducer
const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, 50), // Keep only last 50
        unreadCount: state.unreadCount + 1
      }
    
    case 'MARK_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, read: true } : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }
    
    case 'MARK_ALL_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, read: true })),
        unreadCount: 0
      }
    
    case 'CLEAR_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
        unreadCount: 0
      }
    
    case 'SET_SOCKET_CONNECTED':
      return {
        ...state,
        socketConnected: action.payload
      }
    
    default:
      return state
  }
}

const initialState = {
  notifications: [],
  unreadCount: 0,
  socketConnected: false
}

// Notification provider
export const NotificationProvider = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState)
  const { user, isAuthenticated } = useAuth()
  
  useEffect(() => {
    let socket = null
    
    if (isAuthenticated && user) {
      // Initialize socket connection
      socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('access_token')
        },
        transports: ['websocket', 'polling']
      })
      
      // Connection events
      socket.on('connect', () => {
        console.log('🔌 WebSocket connected')
        dispatch({ type: 'SET_SOCKET_CONNECTED', payload: true })
      })
      
      socket.on('disconnect', () => {
        console.log('🔌 WebSocket disconnected')
        dispatch({ type: 'SET_SOCKET_CONNECTED', payload: false })
      })
      
      // Notification events
      socket.on('notification', (notification) => {
        console.log('🔔 New notification:', notification)
        
        const notificationData = {
          id: notification.id || Date.now().toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          timestamp: new Date().toISOString(),
          read: false
        }
        
        // Add to state
        dispatch({ type: 'ADD_NOTIFICATION', payload: notificationData })
        
        // Show toast notification
        showToastNotification(notificationData)
      })
      
      // Request-specific events
      socket.on('request:created', (data) => {
        if (data.assignedTo === user.id || user.role === 'admin') {
          const notification = {
            id: `request-created-${data.requestId}`,
            type: 'request_created',
            title: 'New Request',
            message: `${data.creatorName} submitted a new ${data.type} request`,
            data: { requestId: data.requestId },
            timestamp: new Date().toISOString(),
            read: false
          }
          
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
          showToastNotification(notification)
        }
      })
      
      socket.on('request:updated', (data) => {
        if (data.userId === user.id) {
          const notification = {
            id: `request-updated-${data.requestId}`,
            type: 'request_updated',
            title: 'Request Updated',
            message: `Your ${data.type} request has been ${data.status}`,
            data: { requestId: data.requestId },
            timestamp: new Date().toISOString(),
            read: false
          }
          
          dispatch({ type: 'ADD_NOTIFICATION', payload: notification })
          showToastNotification(notification)
        }
      })
    }
    
    return () => {
      if (socket) {
        socket.disconnect()
      }
    }
  }, [isAuthenticated, user])
  
  const showToastNotification = (notification) => {
    const toastConfig = {
      duration: 5000,
      position: 'top-right'
    }
    
    switch (notification.type) {
      case 'request_created':
        toast.success(notification.message, toastConfig)
        break
      case 'request_updated':
        if (notification.message.includes('approved')) {
          toast.success(notification.message, toastConfig)
        } else if (notification.message.includes('rejected')) {
          toast.error(notification.message, toastConfig)
        } else {
          toast(notification.message, toastConfig)
        }
        break
      case 'sla_warning':
        toast.error(notification.message, { ...toastConfig, duration: 8000 })
        break
      default:
        toast(notification.message, toastConfig)
    }
  }
  
  const markAsRead = (notificationId) => {
    dispatch({ type: 'MARK_READ', payload: notificationId })
  }
  
  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_READ' })
  }
  
  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' })
  }
  
  const value = {
    ...state,
    markAsRead,
    markAllAsRead,
    clearNotifications
  }
  
  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

// Hook to use notification context
export const useNotifications = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

export default NotificationContext