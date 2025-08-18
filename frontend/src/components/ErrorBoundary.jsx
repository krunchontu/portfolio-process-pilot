import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }
  
  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    if (import.meta.env.DEV) {
      console.error('Error Boundary caught an error:', error, errorInfo)
    }
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    })
    
    // In production, you might want to send this to a logging service
    if (import.meta.env.PROD) {
      this.logErrorToService(error, errorInfo)
    }
  }
  
  logErrorToService = (error, errorInfo) => {
    // This would integrate with a service like Sentry, LogRocket, etc.
    console.error('Production error logged:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    })
  }
  
  handleReload = () => {
    window.location.reload()
  }
  
  handleGoHome = () => {
    window.location.href = '/'
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-secondary-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-error-100 rounded-full flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-error-600" />
                </div>
                
                <h1 className="text-2xl font-bold text-secondary-900 mb-2">
                  Oops! Something went wrong
                </h1>
                
                <p className="text-secondary-600 mb-6">
                  We're sorry for the inconvenience. An unexpected error occurred while loading this page.
                </p>
              </div>
              
              {/* Error details (development only) */}
              {import.meta.env.DEV && this.state.error && (
                <div className="mb-6 p-4 bg-error-50 rounded-lg text-left">
                  <h3 className="font-medium text-error-800 mb-2">Error Details:</h3>
                  <p className="text-sm text-error-700 font-mono mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="text-xs text-error-600">
                      <summary className="cursor-pointer hover:text-error-800">
                        Component Stack
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReload}
                  className="btn-primary flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </button>
                
                <button
                  onClick={this.handleGoHome}
                  className="btn-outline flex-1"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </button>
              </div>
              
              <p className="text-xs text-secondary-500 mt-4">
                If this problem persists, please contact support.
              </p>
            </div>
          </div>
        </div>
      )
    }
    
    return this.props.children
  }
}

export default ErrorBoundary