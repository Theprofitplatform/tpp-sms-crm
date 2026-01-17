import {
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  MinusCircle,
} from 'lucide-react'

/**
 * StatusBadge - Accessible status indicator with icon + color + text
 * Fixes WCAG color-only status indication issue
 *
 * @example
 * <StatusBadge status="filled" />
 * <StatusBadge status="pending" size="lg" showLabel />
 */

const statusConfig = {
  // Order statuses
  filled: {
    icon: CheckCircle,
    label: 'Filled',
    color: 'green',
    pattern: 'solid',
  },
  pending: {
    icon: Clock,
    label: 'Pending',
    color: 'yellow',
    pattern: 'dashed',
  },
  cancelled: {
    icon: XCircle,
    label: 'Cancelled',
    color: 'gray',
    pattern: 'striped',
  },
  rejected: {
    icon: AlertCircle,
    label: 'Rejected',
    color: 'red',
    pattern: 'cross',
  },
  expired: {
    icon: MinusCircle,
    label: 'Expired',
    color: 'gray',
    pattern: 'faded',
  },

  // Signal statuses
  executed: {
    icon: CheckCircle,
    label: 'Executed',
    color: 'green',
    pattern: 'solid',
  },

  // System statuses
  healthy: {
    icon: CheckCircle,
    label: 'Healthy',
    color: 'green',
    pattern: 'solid',
  },
  unhealthy: {
    icon: AlertTriangle,
    label: 'Unhealthy',
    color: 'red',
    pattern: 'cross',
  },
  unknown: {
    icon: AlertCircle,
    label: 'Unknown',
    color: 'gray',
    pattern: 'dashed',
  },

  // Trading direction
  buy: {
    icon: CheckCircle,
    label: 'Buy',
    color: 'green',
    pattern: 'solid',
  },
  sell: {
    icon: XCircle,
    label: 'Sell',
    color: 'red',
    pattern: 'solid',
  },

  // Boolean states
  active: {
    icon: CheckCircle,
    label: 'Active',
    color: 'green',
    pattern: 'solid',
  },
  inactive: {
    icon: MinusCircle,
    label: 'Inactive',
    color: 'gray',
    pattern: 'dashed',
  },

  // Kill switch
  halted: {
    icon: AlertTriangle,
    label: 'Halted',
    color: 'red',
    pattern: 'cross',
  },
  trading: {
    icon: CheckCircle,
    label: 'Trading',
    color: 'green',
    pattern: 'solid',
  },
}

const colorClasses = {
  green: 'status-badge-green',
  yellow: 'status-badge-yellow',
  red: 'status-badge-red',
  gray: 'status-badge-gray',
  blue: 'status-badge-blue',
  purple: 'status-badge-purple',
}

const sizeClasses = {
  sm: 'status-badge-sm',
  md: 'status-badge-md',
  lg: 'status-badge-lg',
}

export default function StatusBadge({
  status,
  showLabel = true,
  showIcon = true,
  size = 'md',
  className = '',
  customLabel,
  ...props
}) {
  const config = statusConfig[status.toLowerCase()] || {
    icon: AlertCircle,
    label: status,
    color: 'gray',
    pattern: 'dashed',
  }

  const Icon = config.icon
  const label = customLabel || config.label

  const classes = [
    'status-badge',
    colorClasses[config.color],
    sizeClasses[size],
    `pattern-${config.pattern}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14

  return (
    <span
      className={classes}
      role="status"
      aria-label={label}
      {...props}
    >
      {showIcon && (
        <Icon
          size={iconSize}
          className="status-badge-icon"
          aria-hidden="true"
        />
      )}
      {showLabel && <span className="status-badge-text">{label}</span>}
    </span>
  )
}

// Dot-only indicator for compact spaces
export function StatusDot({ status, size = 'md', className = '', ...props }) {
  const config = statusConfig[status.toLowerCase()] || {
    label: status,
    color: 'gray',
    pattern: 'dashed',
  }

  const classes = [
    'status-dot',
    colorClasses[config.color],
    `status-dot-${size}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span
      className={classes}
      role="status"
      aria-label={config.label}
      {...props}
    />
  )
}

// CSS for StatusBadge
export const statusBadgeStyles = `
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  border-radius: var(--radius-md);
  white-space: nowrap;
}

/* Sizes */
.status-badge-sm {
  font-size: var(--text-xs);
  padding: 2px var(--space-1);
}

.status-badge-md {
  font-size: var(--text-sm);
  padding: var(--space-1) var(--space-2);
}

.status-badge-lg {
  font-size: var(--text-base);
  padding: var(--space-2) var(--space-3);
}

/* Colors */
.status-badge-green {
  color: var(--color-green-500);
  background: var(--status-success-bg);
}

.status-badge-yellow {
  color: var(--color-yellow-500);
  background: var(--status-warning-bg);
}

.status-badge-red {
  color: var(--color-red-500);
  background: var(--status-error-bg);
}

.status-badge-gray {
  color: var(--text-muted);
  background: rgba(107, 114, 128, 0.1);
}

.status-badge-blue {
  color: var(--color-blue-500);
  background: var(--status-info-bg);
}

.status-badge-purple {
  color: var(--color-purple-500);
  background: rgba(139, 92, 246, 0.1);
}

/* Pattern overlays for colorblind accessibility */
.pattern-solid .status-badge-icon {
  opacity: 1;
}

.pattern-dashed {
  border: 1px dashed currentColor;
  background: transparent;
}

.pattern-striped {
  background-image: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 2px,
    currentColor 2px,
    currentColor 3px
  );
  background-size: 8px 8px;
  -webkit-background-clip: padding-box;
  background-clip: padding-box;
}

.pattern-cross .status-badge-icon {
  opacity: 0.9;
}

/* Status Dot */
.status-dot {
  display: inline-block;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.status-dot-sm {
  width: 6px;
  height: 6px;
}

.status-dot-md {
  width: 8px;
  height: 8px;
}

.status-dot-lg {
  width: 10px;
  height: 10px;
}

.status-dot.status-badge-green { background: var(--color-green-500); }
.status-dot.status-badge-yellow { background: var(--color-yellow-500); }
.status-dot.status-badge-red { background: var(--color-red-500); }
.status-dot.status-badge-gray { background: var(--text-muted); }
.status-dot.status-badge-blue { background: var(--color-blue-500); }
`
