import { AlertTriangle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from 'lucide-react'
import Button from '../ui/Button'

/**
 * ErrorState - Display error messages with retry action
 *
 * @example
 * <ErrorState
 *   error="Failed to load positions"
 *   onRetry={fetchPositions}
 * />
 */

const errorIcons = {
  generic: AlertTriangle,
  network: WifiOff,
  server: ServerCrash,
  auth: ShieldAlert,
}

export default function ErrorState({
  title,
  error,
  errorType = 'generic',
  icon,
  onRetry,
  onDismiss,
  fullPage = false,
  className = '',
  ...props
}) {
  const Icon = icon || errorIcons[errorType] || AlertTriangle

  // Derive title from error type if not provided
  const displayTitle = title || getDefaultTitle(errorType)

  // Get error message string
  const errorMessage = typeof error === 'string'
    ? error
    : error?.message || 'An unexpected error occurred'

  const classes = [
    'error-state',
    fullPage && 'error-state-fullpage',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={classes}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <div className="error-state-icon" aria-hidden="true">
        <Icon size={fullPage ? 64 : 48} />
      </div>
      <h3 className="error-state-title">{displayTitle}</h3>
      <p className="error-state-message">{errorMessage}</p>
      <div className="error-state-actions">
        {onRetry && (
          <Button
            variant="primary"
            onClick={onRetry}
            icon={<RefreshCw size={16} />}
          >
            Try Again
          </Button>
        )}
        {onDismiss && (
          <Button variant="ghost" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>
    </div>
  )
}

function getDefaultTitle(errorType) {
  switch (errorType) {
    case 'network':
      return 'Connection Error'
    case 'server':
      return 'Server Error'
    case 'auth':
      return 'Authentication Error'
    default:
      return 'Something went wrong'
  }
}

// Error Banner - inline error display
export function ErrorBanner({
  error,
  onDismiss,
  onRetry,
  className = '',
  ...props
}) {
  const errorMessage = typeof error === 'string'
    ? error
    : error?.message || 'An error occurred'

  return (
    <div
      className={`error-banner ${className}`}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <AlertTriangle size={20} aria-hidden="true" />
      <span className="error-banner-message">{errorMessage}</span>
      <div className="error-banner-actions">
        {onRetry && (
          <button
            className="error-banner-btn"
            onClick={onRetry}
            aria-label="Retry"
          >
            <RefreshCw size={16} />
          </button>
        )}
        {onDismiss && (
          <button
            className="error-banner-btn"
            onClick={onDismiss}
            aria-label="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}

// CSS for ErrorState
export const errorStateStyles = `
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
}

.error-state-fullpage {
  min-height: 60vh;
}

.error-state-icon {
  color: var(--color-red-500);
  margin-bottom: var(--space-4);
}

.error-state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.error-state-fullpage .error-state-title {
  font-size: var(--text-xl);
}

.error-state-message {
  color: var(--text-secondary);
  margin: 0 0 var(--space-4);
  max-width: 400px;
  line-height: var(--leading-relaxed);
}

.error-state-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}

/* Error Banner */
.error-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: var(--status-error-bg);
  border: 1px solid var(--color-red-500);
  border-radius: var(--radius-lg);
  color: var(--color-red-500);
  margin-bottom: var(--space-6);
}

.error-banner-message {
  flex: 1;
  text-align: left;
}

.error-banner-actions {
  display: flex;
  gap: var(--space-1);
}

.error-banner-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  color: var(--color-red-500);
  transition: var(--transition-colors);
}

.error-banner-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.error-banner-btn:focus-visible {
  box-shadow: var(--focus-ring-error);
}
`
