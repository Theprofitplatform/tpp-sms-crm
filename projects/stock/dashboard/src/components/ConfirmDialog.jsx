import { useEffect, useRef, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'

/**
 * ConfirmDialog - Accessible modal dialog with focus trap
 * WCAG 2.1 AA compliant
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  danger = false,
}) {
  const dialogRef = useRef(null)
  const confirmButtonRef = useRef(null)
  const cancelButtonRef = useRef(null)
  const previousActiveElement = useRef(null)

  // Store the previously focused element and focus the dialog when opening
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement
      // Focus the cancel button by default (safer choice)
      setTimeout(() => {
        cancelButtonRef.current?.focus()
      }, 0)
    } else if (previousActiveElement.current) {
      // Restore focus when closing
      previousActiveElement.current.focus()
    }
  }, [isOpen])

  // Handle keyboard events for focus trap and escape
  const handleKeyDown = useCallback((event) => {
    if (!isOpen) return

    // Close on Escape
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }

    // Focus trap
    if (event.key === 'Tab') {
      const focusableElements = dialogRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault()
          firstElement.focus()
        }
      }
    }
  }, [isOpen, onCancel])

  // Add keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll when dialog is open
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      className="dialog-overlay"
      onClick={onCancel}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className="dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`dialog-icon ${danger ? 'danger' : ''}`} aria-hidden="true">
          <AlertTriangle size={32} />
        </div>

        <h2 id="dialog-title" className="dialog-title">
          {title}
        </h2>

        <p id="dialog-message" className="dialog-message">
          {message}
        </p>

        <div className="dialog-buttons">
          <button
            ref={cancelButtonRef}
            className="btn-cancel"
            onClick={onCancel}
            type="button"
          >
            {cancelText || 'Cancel'}
          </button>
          <button
            ref={confirmButtonRef}
            className={`btn-confirm ${danger ? 'danger' : ''}`}
            onClick={onConfirm}
            type="button"
          >
            {confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Dialog styles (included in components.css)
export const dialogStyles = `
/* Dialog Overlay */
.dialog-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  animation: fadeIn var(--duration-fast) var(--ease-out);
}

/* Dialog Box */
.dialog {
  background: var(--bg-card);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-2xl);
  padding: var(--space-8);
  max-width: 400px;
  width: 90%;
  text-align: center;
  animation: slideInUp var(--duration-normal) var(--ease-out);
}

.dialog-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto var(--space-5);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--status-warning-bg);
  border-radius: var(--radius-full);
  color: var(--color-yellow-500);
}

.dialog-icon.danger {
  background: var(--status-error-bg);
  color: var(--color-red-500);
}

.dialog-title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin: 0 0 var(--space-3);
  color: var(--text-primary);
}

.dialog-message {
  color: var(--text-secondary);
  margin: 0 0 var(--space-6);
  line-height: var(--leading-relaxed);
}

.dialog-buttons {
  display: flex;
  gap: var(--space-3);
}

.dialog-buttons button {
  flex: 1;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-lg);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: var(--transition-all);
}

.btn-cancel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-card-hover);
}

.btn-cancel:focus-visible {
  box-shadow: var(--focus-ring);
}

.btn-confirm {
  background: var(--color-blue-500);
  border: none;
  color: white;
}

.btn-confirm:hover {
  background: var(--color-blue-600);
}

.btn-confirm:focus-visible {
  box-shadow: var(--focus-ring);
}

.btn-confirm.danger {
  background: var(--color-red-500);
}

.btn-confirm.danger:hover {
  background: var(--color-red-600);
}
`
