import { useEffect, useRef, useCallback } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in-0"
      onClick={onCancel}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        className="relative w-[90%] max-w-md rounded-lg border bg-card p-6 shadow-lg animate-in zoom-in-95 fade-in-0 duration-200"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby="dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full",
            danger ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"
          )}
          aria-hidden="true"
        >
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h2
          id="dialog-title"
          className="mb-2 text-center text-xl font-semibold text-foreground"
        >
          {title}
        </h2>

        <p
          id="dialog-message"
          className="mb-6 text-center text-muted-foreground"
        >
          {message}
        </p>

        <div className="flex gap-3">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            type="button"
          >
            {cancelText || 'Cancel'}
          </Button>
          <Button
            ref={confirmButtonRef}
            variant={danger ? "destructive" : "default"}
            className="flex-1"
            onClick={onConfirm}
            type="button"
          >
            {confirmText || 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  )
}
