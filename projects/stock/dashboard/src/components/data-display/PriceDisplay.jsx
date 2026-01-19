import { TrendingUp, TrendingDown } from 'lucide-react'

/**
 * PriceDisplay - Consistent price/currency formatting
 * Uses monospace font and proper alignment
 *
 * @example
 * <PriceDisplay value={125000.50} />
 * <PriceDisplay value={-500.25} showSign showTrend />
 * <PriceDisplay value={5.25} suffix="%" />
 */

export function PriceDisplay({
  value,
  currency = 'USD',
  decimals = 2,
  showSign = false,
  showTrend = false,
  showCurrency = true,
  compact = false,
  suffix = '',
  prefix = '',
  size = 'md',
  className = '',
  ...props
}) {
  if (value === null || value === undefined) {
    return <span className={`price-display ${className}`}>-</span>
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value
  const isPositive = numValue >= 0
  const absValue = Math.abs(numValue)

  // Format based on compact mode
  let displayValue
  if (compact) {
    if (absValue >= 1e9) {
      displayValue = (absValue / 1e9).toFixed(1) + 'B'
    } else if (absValue >= 1e6) {
      displayValue = (absValue / 1e6).toFixed(1) + 'M'
    } else if (absValue >= 1e3) {
      displayValue = (absValue / 1e3).toFixed(1) + 'K'
    } else {
      displayValue = absValue.toFixed(decimals)
    }
  } else {
    displayValue = absValue.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  // Build the display string
  const currencySymbol = showCurrency && currency === 'USD' ? '$' : ''
  const signSymbol = showSign ? (isPositive ? '+' : '-') : (isPositive ? '' : '-')
  const fullDisplay = `${prefix}${signSymbol}${currencySymbol}${displayValue}${suffix}`

  const classes = [
    'price-display',
    `price-display-${size}`,
    showTrend && (isPositive ? 'price-positive' : 'price-negative'),
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...props}>
      {showTrend && (
        <span className="price-trend-icon" aria-hidden="true">
          {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </span>
      )}
      <span className="price-value">{fullDisplay}</span>
    </span>
  )
}

// Percentage display helper
export function PercentDisplay({
  value,
  decimals = 2,
  showSign = true,
  showTrend = true,
  ...props
}) {
  return (
    <PriceDisplay
      value={value}
      decimals={decimals}
      showSign={showSign}
      showTrend={showTrend}
      showCurrency={false}
      suffix="%"
      {...props}
    />
  )
}

// Quantity display (no currency, integer)
export function QuantityDisplay({
  value,
  decimals = 0,
  ...props
}) {
  return (
    <PriceDisplay
      value={value}
      decimals={decimals}
      showCurrency={false}
      {...props}
    />
  )
}

// CSS for PriceDisplay
export const priceDisplayStyles = `
.price-display {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

/* Sizes */
.price-display-sm {
  font-size: var(--text-sm);
}

.price-display-md {
  font-size: var(--text-base);
}

.price-display-lg {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.price-display-xl {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
}

/* Colors */
.price-positive {
  color: var(--color-positive);
}

.price-negative {
  color: var(--color-negative);
}

.price-trend-icon {
  display: flex;
  flex-shrink: 0;
}

/* For table cells - right align prices */
td .price-display {
  justify-content: flex-end;
}
`

// Default export for backward compatibility
export default PriceDisplay
