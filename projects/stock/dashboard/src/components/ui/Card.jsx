/**
 * Card component - base container for dashboard content
 *
 * @example
 * <Card>Content here</Card>
 * <Card title="Services Health" icon={<Database />}>...</Card>
 * <Card variant="danger" active>Kill Switch Active</Card>
 */

export default function Card({
  children,
  title,
  icon,
  headerAction,
  variant = 'default',
  active = false,
  padding = true,
  className = '',
  ...props
}) {
  const classes = [
    'card',
    variant !== 'default' && `card-${variant}`,
    active && 'card-active',
    !padding && 'card-no-padding',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {(title || headerAction) && (
        <div className="card-header">
          {title && (
            <h2 className="card-title">
              {icon && <span className="card-icon" aria-hidden="true">{icon}</span>}
              {title}
            </h2>
          )}
          {headerAction && <div className="card-actions">{headerAction}</div>}
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  )
}

// Card Body - for structured content
export function CardBody({ children, className = '' }) {
  return <div className={`card-body ${className}`}>{children}</div>
}

// Card Footer - for actions
export function CardFooter({ children, className = '' }) {
  return <div className={`card-footer ${className}`}>{children}</div>
}

// CSS for Card components
export const cardStyles = `
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--card-padding);
  margin-bottom: var(--space-5);
  transition: var(--transition-colors);
}

.card-no-padding {
  padding: 0;
}

.card-no-padding .card-header {
  padding: var(--card-padding);
  padding-bottom: 0;
}

.card-no-padding .card-content {
  padding: var(--card-padding);
  padding-top: var(--space-4);
}

.card:hover {
  border-color: var(--border-hover);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.card-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--text-primary);
  margin: 0;
}

.card-icon {
  display: flex;
  color: var(--color-blue-500);
}

.card-actions {
  display: flex;
  gap: var(--space-2);
}

.card-footer {
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-default);
  margin-top: var(--space-4);
}

/* Variants */
.card-danger {
  border-color: var(--color-red-500);
}

.card-danger.card-active {
  background: var(--status-error-bg);
}

.card-success {
  border-color: var(--color-green-500);
}

.card-success.card-active {
  background: var(--status-success-bg);
}

.card-warning {
  border-color: var(--color-yellow-500);
}

.card-warning.card-active {
  background: var(--status-warning-bg);
}

/* Active state */
.card-active {
  border-color: var(--color-blue-500);
  background: var(--status-info-bg);
}
`
