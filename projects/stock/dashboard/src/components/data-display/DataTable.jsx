import { useState, useMemo } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { SkeletonTable } from '../ui/Skeleton'
import EmptyState from '../feedback/EmptyState'

/**
 * DataTable - Sortable, responsive table component
 * Transforms to cards on mobile
 *
 * @example
 * <DataTable
 *   columns={[
 *     { key: 'symbol', label: 'Symbol', sortable: true },
 *     { key: 'price', label: 'Price', align: 'right' },
 *   ]}
 *   data={positions}
 *   keyField="id"
 * />
 */

export default function DataTable({
  columns,
  data,
  keyField = 'id',
  loading = false,
  emptyMessage = 'No data available',
  emptyIcon,
  emptyAction,
  sortable = true,
  defaultSort,
  onRowClick,
  rowClassName,
  stickyHeader = false,
  compact = false,
  className = '',
  ariaLabel,
  ...props
}) {
  const [sortConfig, setSortConfig] = useState(defaultSort || null)

  // Handle sorting
  const handleSort = (columnKey) => {
    if (!sortable) return

    const column = columns.find((c) => c.key === columnKey)
    if (!column?.sortable) return

    setSortConfig((prev) => {
      if (prev?.key !== columnKey) {
        return { key: columnKey, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key: columnKey, direction: 'desc' }
      }
      return null // Reset sort
    })
  }

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig || !data) return data

    return [...data].sort((a, b) => {
      const aVal = a[sortConfig.key]
      const bVal = b[sortConfig.key]

      // Handle null/undefined
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Compare
      let comparison = 0
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal
      } else {
        comparison = String(aVal).localeCompare(String(bVal))
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }, [data, sortConfig])

  // Loading state
  if (loading) {
    return <SkeletonTable rows={5} columns={columns.length} />
  }

  // Empty state
  if (!sortedData || sortedData.length === 0) {
    return (
      <EmptyState
        title={emptyMessage}
        icon={emptyIcon}
        action={emptyAction}
      />
    )
  }

  const tableClasses = [
    'data-table',
    stickyHeader && 'data-table-sticky',
    compact && 'data-table-compact',
    onRowClick && 'data-table-clickable',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="table-container" role="region" aria-label={ariaLabel}>
      <table className={tableClasses} {...props}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  column.align && `text-${column.align}`,
                  column.sortable && 'sortable',
                  sortConfig?.key === column.key && 'sorted',
                ]
                  .filter(Boolean)
                  .join(' ')}
                scope="col"
                onClick={() => column.sortable && handleSort(column.key)}
                onKeyDown={(e) => {
                  if (column.sortable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    handleSort(column.key)
                  }
                }}
                tabIndex={column.sortable ? 0 : undefined}
                aria-sort={
                  sortConfig?.key === column.key
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : undefined
                }
                style={{ width: column.width }}
              >
                <span className="th-content">
                  {column.label}
                  {column.sortable && (
                    <span className="sort-icon" aria-hidden="true">
                      {sortConfig?.key === column.key ? (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp size={14} />
                        ) : (
                          <ChevronDown size={14} />
                        )
                      ) : (
                        <ChevronsUpDown size={14} />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, rowIndex) => (
            <tr
              key={row[keyField] || rowIndex}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  onRowClick(row)
                }
              }}
              tabIndex={onRowClick ? 0 : undefined}
              className={typeof rowClassName === 'function' ? rowClassName(row) : rowClassName}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={column.align && `text-${column.align}`}
                  data-label={column.label}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// CSS for DataTable
export const dataTableStyles = `
.table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--space-3);
  text-align: left;
  border-bottom: 1px solid var(--border-default);
}

.data-table th {
  font-size: var(--text-sm);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--text-secondary);
  font-weight: var(--font-medium);
  background: var(--bg-secondary);
  position: relative;
}

.data-table td {
  font-size: var(--text-base);
}

/* Alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* Sortable headers */
.data-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.data-table th.sortable:hover {
  color: var(--text-primary);
}

.data-table th.sortable:focus-visible {
  outline: 2px solid var(--color-blue-500);
  outline-offset: -2px;
}

.data-table th.sorted {
  color: var(--color-blue-500);
}

.th-content {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.sort-icon {
  display: flex;
  color: var(--text-muted);
}

.data-table th.sorted .sort-icon {
  color: var(--color-blue-500);
}

/* Sticky header */
.data-table-sticky {
  position: relative;
}

.data-table-sticky thead th {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
}

/* Compact mode */
.data-table-compact th,
.data-table-compact td {
  padding: var(--space-2);
}

/* Clickable rows */
.data-table-clickable tbody tr {
  cursor: pointer;
  transition: var(--transition-colors);
}

.data-table-clickable tbody tr:hover {
  background: var(--bg-card-hover);
}

.data-table-clickable tbody tr:focus-visible {
  outline: 2px solid var(--color-blue-500);
  outline-offset: -2px;
}

/* Row hover */
.data-table tbody tr:hover {
  background: var(--bg-card-hover);
}

/* Common cell styles */
.data-table .cell-symbol {
  font-weight: var(--font-semibold);
  color: var(--color-blue-500);
}

.data-table .cell-muted {
  color: var(--text-secondary);
}

.data-table .cell-mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

/* Mobile card view */
@media (max-width: 640px) {
  .data-table thead {
    display: none;
  }

  .data-table tbody tr {
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    margin-bottom: var(--space-2);
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-default);
  }

  .data-table td {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2) 0;
    border-bottom: 1px solid var(--border-default);
  }

  .data-table td:last-child {
    border-bottom: none;
  }

  .data-table td::before {
    content: attr(data-label);
    font-weight: var(--font-medium);
    color: var(--text-secondary);
    text-transform: uppercase;
    font-size: var(--text-sm);
  }

  .data-table td.text-right {
    text-align: right;
  }
}
`
