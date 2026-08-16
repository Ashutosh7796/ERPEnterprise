import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import { Result, Button } from 'antd'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled UI Exception caught by ErrorBoundary:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div style={{ padding: 48, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Result
            status="error"
            title="Module Error Encountered"
            subTitle={this.state.error?.message || 'An unexpected error occurred while rendering this module.'}
            extra={[
              <Button type="primary" key="reload" onClick={this.handleReset}>
                Try Again
              </Button>,
              <Button key="home" onClick={() => (window.location.href = '/')}>
                Return to Dashboard
              </Button>,
            ]}
          />
        </div>
      )
    }

    return this.props.children
  }
}
