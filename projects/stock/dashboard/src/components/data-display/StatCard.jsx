import { SkeletonStatCard } from '../ui/Skeleton'

/**
 * StatCard - Reusable statistics display card
 * Used 20+ times across dashboard pages
 *
 * @example
 * <StatCard
 *   icon={<DollarSign />}
 *   label="Portfolio Value"
 *   value="$125,000"
 *   trend={{ value: 5.2, direction: 'up' }}
 * />
 */

export function StatCard({
  icon,
  label,
  value,
  trend,
  variant = 'default', // default, positive, negative, danger, safe
  loading = false,
  clickable = false,
  active = false,
  onClick,
  className = '',
  ariaLabel,
  ...props
}) {
  if (loading) {
    return <SkeletonStatCard />
  }

  const classes = [
    'stat-card',
    variant !== 'default' && `stat-card-${variant}`,
    clickable && 'stat-card-clickable',
    active && 'stat-card-active',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const valueClasses = [
    'stat-value',
    variant === 'positive' && 'text-positive',
    variant === 'negative' && 'text-negative',
    variant === 'danger' && 'text-danger',
    variant === 'safe' && 'text-safe',
  ]
    .filter(Boolean)
    .join(' ')

  const Component = clickable ? 'button' : 'div'
  const componentProps = clickable
    ? {
        onClick,
        type: 'button',
        'aria-pressed': active,
      }
    : {}

  return (
    <Component
      className={classes}
      aria-label={ariaLabel || `${label}: ${value}`}
      {...componentProps}
      {...props}
    >
      {icon && (
        <span className="stat-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className={valueClasses}>{value}</span>
        {trend && (
          <span
            className={`stat-trend ${trend.direction === 'up' ? 'trend-up' : 'trend-down'}`}
            aria-label={`${trend.direction === 'up' ? 'Increased' : 'Decreased'} by ${trend.value}%`}
          >
            <span className="trend-arrow" aria-hidden="true">
              {trend.direction === 'up' ? '↑' : '↓'}
            </span>
            {trend.value}%
          </span>
        )}
      </div>
    </Component>
  )
}

// CSS for StatCard
export const statCardStyles = `
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  padding: var(--card-padding);
  display: flex;
  align-items: center;
  gap: var(--space-4);
  transition: var(--transition-all);
}

.stat-card:hover {
  border-color: var(--color-blue-500);
}

/* Clickable variant */
.stat-card-clickable {
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.stat-card-clickable:hover {
  background: var(--bg-card-hover);
}

.stat-card-clickable:focus-visible {
  box-shadow: var(--focus-ring);
}

/* Active state */
.stat-card-active {
  border-color: var(--color-blue-500);
  background: var(--status-info-bg);
}

/* Icon */
.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-blue-500);
  flex-shrink: 0;
}

/* Content */
.stat-content {
  display: flex;
  flex-direction: column;
  min-width: 0; /* Allow text truncation */
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  font-variant-numeric: tabular-nums;
  line-height: var(--leading-tight);
}

/* Value variants */
.stat-value.text-positive { color: var(--color-positive); }
.stat-value.text-negative { color: var(--color-negative); }
.stat-value.text-danger { color: var(--color-red-500); }
.stat-value.text-safe { color: var(--color-green-500); }

/* Trend indicator */
.stat-trend {
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.trend-up {
  color: var(--color-green-500);
}

.trend-down {
  color: var(--color-red-500);
}

.trend-arrow {
  font-size: var(--text-xs);
}

/* Variant-specific styling */
.stat-card-positive .stat-icon { color: var(--color-green-500); }
.stat-card-negative .stat-icon { color: var(--color-red-500); }
.stat-card-danger .stat-icon { color: var(--color-red-500); }
.stat-card-safe .stat-icon { color: var(--color-green-500); }
`

// Default export for backward compatibility
export default StatCard
