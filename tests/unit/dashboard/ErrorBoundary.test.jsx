/**
 * Unit Tests for ErrorBoundary Component
 * Tests error catching, fallback UI, and recovery
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary, useErrorBoundary } from '../../../dashboard/src/components/ErrorBoundary.jsx'

// Mock child component that can throw errors
const ThrowError = ({ shouldThrow, error }) => {
  if (shouldThrow) {
    throw error || new Error('Test error')
  }
  return <div>Child component</div>
}

// Mock window.location
delete window.location
window.location = { reload: jest.fn(), href: '' }

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Suppress console.error in tests
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    console.error.mockRestore()
  })

  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Test child</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Test child')).toBeInTheDocument()
  })

  it('should catch errors and display fallback UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
  })

  it('should display error message in fallback UI', () => {
    const error = new Error('Custom error message')

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={error} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error message')).toBeInTheDocument()
  })

  it('should display default message when no error message', () => {
    const error = new Error()
    error.message = ''

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={error} />
      </ErrorBoundary>
    )

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
  })

  it('should have "Try Again" button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    expect(tryAgainButton).toBeInTheDocument()
  })

  it('should have "Reload Page" button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    expect(reloadButton).toBeInTheDocument()
  })

  it('should have "Go to Dashboard" button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const dashboardButton = screen.getByRole('button', { name: /go to dashboard/i })
    expect(dashboardButton).toBeInTheDocument()
  })

  it('should reset error state when "Try Again" is clicked', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainButton)

    // Rerender with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Child component')).toBeInTheDocument()
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
  })

  it('should reload page when "Reload Page" is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const reloadButton = screen.getByRole('button', { name: /reload page/i })
    fireEvent.click(reloadButton)

    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('should navigate to dashboard when "Go to Dashboard" is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    const dashboardButton = screen.getByRole('button', { name: /go to dashboard/i })
    fireEvent.click(dashboardButton)

    expect(window.location.href).toBe('/dashboard')
  })

  it('should use custom fallback when provided', () => {
    const customFallback = (error, reset) => (
      <div>
        <p>Custom error UI</p>
        <p>{error.message}</p>
        <button onClick={reset}>Custom Reset</button>
      </div>
    )

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} error={new Error('Test error')} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Custom error UI')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /custom reset/i })).toBeInTheDocument()
  })

  it('should log error to console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Test error')

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={error} />
      </ErrorBoundary>
    )

    expect(consoleErrorSpy).toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Should have details section in development
    expect(screen.getByText(/Error Details/i)).toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })

  it('should NOT show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    // Should NOT have details section in production
    expect(screen.queryByText(/Error Details/i)).not.toBeInTheDocument()

    process.env.NODE_ENV = originalEnv
  })
})

describe('useErrorBoundary Hook', () => {
  it('should throw error programmatically', () => {
    const TestComponent = () => {
      const throwError = useErrorBoundary()

      return (
        <button onClick={() => throwError(new Error('Hook error'))}>
          Throw Error
        </button>
      )
    }

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    const button = screen.getByRole('button', { name: /throw error/i })
    fireEvent.click(button)

    // Should show error boundary fallback
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })

  it('should display error message from hook', () => {
    const TestComponent = () => {
      const throwError = useErrorBoundary()

      return (
        <button onClick={() => throwError(new Error('Custom hook error'))}>
          Throw Error
        </button>
      )
    }

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    )

    const button = screen.getByRole('button', { name: /throw error/i })
    fireEvent.click(button)

    expect(screen.getByText('Custom hook error')).toBeInTheDocument()

    consoleErrorSpy.mockRestore()
  })
})

describe('ErrorBoundary Edge Cases', () => {
  it('should handle multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error('First error')} />
      </ErrorBoundary>
    )

    expect(screen.getByText('First error')).toBeInTheDocument()

    // Reset
    const tryAgainButton = screen.getByRole('button', { name: /try again/i })
    fireEvent.click(tryAgainButton)

    // Throw second error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error('Second error')} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Second error')).toBeInTheDocument()
  })

  it('should handle nested ErrorBoundaries', () => {
    render(
      <ErrorBoundary fallback={(error) => <div>Outer: {error.message}</div>}>
        <div>
          <ErrorBoundary fallback={(error) => <div>Inner: {error.message}</div>}>
            <ThrowError shouldThrow={true} error={new Error('Nested error')} />
          </ErrorBoundary>
        </div>
      </ErrorBoundary>
    )

    // Inner boundary should catch the error
    expect(screen.getByText('Inner: Nested error')).toBeInTheDocument()
    expect(screen.queryByText('Outer: Nested error')).not.toBeInTheDocument()
  })

  it('should handle errors with no message', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} error={new Error()} />
      </ErrorBoundary>
    )

    expect(screen.getByText('An unexpected error occurred')).toBeInTheDocument()
  })
})
