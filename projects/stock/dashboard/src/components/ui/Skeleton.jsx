/**
 * Skeleton loading components for perceived performance
 *
 * @example
 * <Skeleton width="100px" height="24px" />
 * <SkeletonText lines={3} />
 * <SkeletonCard />
 */

// Base skeleton element
export function Skeleton({
  width,
  height = '1rem',
  rounded = 'md',
  className = '',
  ...props
}) {
  const radiusMap = {
    none: 'var(--radius-none)',
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    full: 'var(--radius-full)',
  }

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: radiusMap[rounded] || rounded,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

// Skeleton for text content
export function SkeletonText({ lines = 1, lastLineWidth = '75%', gap = '0.5rem' }) {
  return (
    <div className="skeleton-text" style={{ gap }} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="1rem"
          width={i === lines - 1 ? lastLineWidth : '100%'}
        />
      ))}
    </div>
  )
}

// Skeleton for stat cards
export function SkeletonStatCard() {
  return (
    <div className="stat-card skeleton-stat-card" aria-hidden="true">
      <Skeleton width="24px" height="24px" rounded="md" />
      <div className="stat-content">
        <Skeleton width="80px" height="12px" />
        <Skeleton width="60px" height="24px" />
      </div>
    </div>
  )
}

// Skeleton for a full card
export function SkeletonCard({ showHeader = true, contentRows = 3 }) {
  return (
    <div className="card skeleton-card" aria-hidden="true">
      {showHeader && (
        <div className="skeleton-card-header">
          <Skeleton width="24px" height="24px" rounded="md" />
          <Skeleton width="150px" height="20px" />
        </div>
      )}
      <div className="skeleton-card-content">
        <SkeletonText lines={contentRows} />
      </div>
    </div>
  )
}

// Skeleton for table rows
export function SkeletonTableRow({ columns = 5 }) {
  return (
    <tr className="skeleton-table-row" aria-hidden="true">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i}>
          <Skeleton
            width={i === 0 ? '60px' : i === 1 ? '100px' : '80px'}
            height="16px"
          />
        </td>
      ))}
    </tr>
  )
}

// Skeleton for entire table
export function SkeletonTable({ rows = 5, columns = 5 }) {
  return (
    <div className="skeleton-table-wrapper" aria-hidden="true">
      <table className="skeleton-table">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i}>
                <Skeleton width="70px" height="12px" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Pre-computed random heights for skeleton chart bars (deterministic)
const SKELETON_BAR_HEIGHTS = [65, 42, 78, 55, 88, 45, 72, 38, 82, 50, 68, 58]

// Skeleton for chart area
export function SkeletonChart({ height = '300px' }) {
  return (
    <div
      className="skeleton-chart"
      style={{ height }}
      aria-hidden="true"
    >
      <div className="skeleton-chart-bars">
        {SKELETON_BAR_HEIGHTS.map((barHeight, i) => (
          <div
            key={i}
            className="skeleton-chart-bar"
            style={{ height: `${barHeight}%` }}
          />
        ))}
      </div>
    </div>
  )
}

// CSS for Skeleton components
export const skeletonStyles = `
.skeleton {
  background: var(--bg-skeleton);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  display: flex;
  flex-direction: column;
}

.skeleton-stat-card {
  pointer-events: none;
}

.skeleton-card-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.skeleton-card-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-table-wrapper {
  overflow: hidden;
}

.skeleton-table {
  width: 100%;
}

.skeleton-table th,
.skeleton-table td {
  padding: var(--space-3);
}

.skeleton-chart {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  display: flex;
  align-items: flex-end;
}

.skeleton-chart-bars {
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  width: 100%;
  height: 100%;
}

.skeleton-chart-bar {
  flex: 1;
  background: var(--bg-skeleton);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
}
`

// Default export for backward compatibility
export default Skeleton
