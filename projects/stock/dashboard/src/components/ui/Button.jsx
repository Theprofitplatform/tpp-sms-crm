import { forwardRef } from 'react'

/**
 * Button component with multiple variants and sizes
 *
 * @example
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 * <Button variant="danger" size="sm" icon={<Trash />}>Delete</Button>
 * <Button variant="ghost" loading>Processing...</Button>
 */

const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  danger: 'btn-danger',
  ghost: 'btn-ghost',
  success: 'btn-success',
}

const sizes = {
  sm: 'btn-sm',
  md: 'btn-md',
  lg: 'btn-lg',
}

const Button = forwardRef(function Button(
  {
    children,
    variant = 'secondary',
    size = 'md',
    icon,
    iconPosition = 'left',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const classes = [
    'btn',
    variants[variant],
    sizes[size],
    fullWidth && 'btn-full',
    loading && 'btn-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg
          className="btn-spinner animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="btn-icon" aria-hidden="true">{icon}</span>
      )}
      <span className="btn-text">{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className="btn-icon" aria-hidden="true">{icon}</span>
      )}
    </button>
  )
})

export default Button

// CSS to be added to component styles
export const buttonStyles = `
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-weight: var(--font-medium);
  border-radius: var(--radius-lg);
  transition: var(--transition-colors);
  cursor: pointer;
  white-space: nowrap;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn:focus-visible {
  box-shadow: var(--focus-ring);
}

/* Sizes */
.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--text-sm);
}

.btn-md {
  padding: var(--space-2) var(--space-5);
  font-size: var(--text-base);
}

.btn-lg {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-md);
}

/* Variants */
.btn-primary {
  background: var(--color-blue-500);
  color: white;
  border: 1px solid var(--color-blue-500);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-blue-600);
  border-color: var(--color-blue-600);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--bg-card-hover);
  border-color: var(--color-blue-500);
}

.btn-danger {
  background: var(--color-red-500);
  color: white;
  border: 1px solid var(--color-red-500);
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-red-600);
  border-color: var(--color-red-600);
}

.btn-success {
  background: var(--color-green-500);
  color: white;
  border: 1px solid var(--color-green-500);
}

.btn-success:hover:not(:disabled) {
  background: var(--color-green-600);
  border-color: var(--color-green-600);
}

.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid transparent;
}

.btn-ghost:hover:not(:disabled) {
  background: var(--bg-card);
  color: var(--text-primary);
}

/* Modifiers */
.btn-full {
  width: 100%;
}

.btn-loading {
  pointer-events: none;
}

.btn-spinner {
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
`
