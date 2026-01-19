import { Inbox, FileQuestion, Search, AlertCircle } from 'lucide-react'
import Button from '../ui/Button'

/**
 * EmptyState - Display when no data is available
 *
 * @example
 * <EmptyState
 *   title="No positions yet"
 *   description="Execute a signal to open your first position"
 *   action={{ label: "View Signals", onClick: goToSignals }}
 * />
 */

const defaultIcons = {
  empty: Inbox,
  notFound: FileQuestion,
  search: Search,
  error: AlertCircle,
}

export function EmptyState({
  title = 'No data available',
  description,
  icon,
  iconType = 'empty',
  action,
  secondaryAction,
  size = 'md',
  className = '',
  ...props
}) {
  const Icon = icon || defaultIcons[iconType] || Inbox

  const sizeClasses = {
    sm: 'empty-state-sm',
    md: 'empty-state-md',
    lg: 'empty-state-lg',
  }

  const iconSizes = {
    sm: 32,
    md: 48,
    lg: 64,
  }

  return (
    <div
      className={`empty-state ${sizeClasses[size]} ${className}`}
      role="status"
      aria-label={title}
      {...props}
    >
      <div className="empty-state-icon" aria-hidden="true">
        <Icon size={iconSizes[size]} />
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && (
        <p className="empty-state-description">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <Button
              variant="primary"
              onClick={action.onClick}
              icon={action.icon}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              icon={secondaryAction.icon}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

// Preset empty states for common scenarios
export function EmptyPositions({ onAction }) {
  return (
    <EmptyState
      title="No open positions"
      description="Execute a signal to open your first position"
      icon={Inbox}
      action={onAction && { label: 'View Signals', onClick: onAction }}
    />
  )
}

export function EmptyOrders({ onAction }) {
  return (
    <EmptyState
      title="No orders yet"
      description="Place your first order from the Signals page"
      icon={FileQuestion}
      action={onAction && { label: 'View Signals', onClick: onAction }}
    />
  )
}

export function EmptySignals() {
  return (
    <EmptyState
      title="Waiting for signals"
      description="Trading signals will appear here when strategies generate them"
      icon={Search}
    />
  )
}

export function NoSearchResults({ query, onClear }) {
  return (
    <EmptyState
      title={`No results for "${query}"`}
      description="Try adjusting your search or filter criteria"
      iconType="search"
      action={onClear && { label: 'Clear Search', onClick: onClear }}
    />
  )
}

// CSS for EmptyState
export const emptyStateStyles = `
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-8);
}

.empty-state-sm {
  padding: var(--space-4);
}

.empty-state-lg {
  padding: var(--space-12);
}

.empty-state-icon {
  color: var(--text-muted);
  margin-bottom: var(--space-4);
}

.empty-state-sm .empty-state-icon {
  margin-bottom: var(--space-2);
}

.empty-state-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0 0 var(--space-2);
}

.empty-state-sm .empty-state-title {
  font-size: var(--text-base);
}

.empty-state-lg .empty-state-title {
  font-size: var(--text-xl);
}

.empty-state-description {
  color: var(--text-secondary);
  margin: 0 0 var(--space-4);
  max-width: 400px;
  line-height: var(--leading-relaxed);
}

.empty-state-sm .empty-state-description {
  font-size: var(--text-sm);
  margin-bottom: var(--space-2);
}

.empty-state-actions {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  justify-content: center;
}
`

// Default export for backward compatibility
export default EmptyState
