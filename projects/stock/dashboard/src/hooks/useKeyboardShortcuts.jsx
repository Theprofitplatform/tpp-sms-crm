import { useEffect, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * useKeyboardShortcuts - Global keyboard navigation
 *
 * Default shortcuts:
 * g d → Dashboard
 * g p → Positions
 * g o → Orders
 * g s → Signals
 * g , → Settings
 * r   → Refresh
 * ?   → Help modal
 * Esc → Close dialogs
 *
 * @example
 * useKeyboardShortcuts({
 *   onRefresh: fetchData,
 *   onKillSwitch: toggleKillSwitch,
 * })
 */

export default function useKeyboardShortcuts(handlers = {}) {
  const navigate = useNavigate()
  const [showHelp, setShowHelp] = useState(false)
  const [pendingPrefix, setPendingPrefix] = useState(null)

  const handleKeyDown = useCallback((event) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      // Only allow Escape in inputs
      if (event.key !== 'Escape') return
    }

    const key = event.key.toLowerCase()

    // Handle escape
    if (event.key === 'Escape') {
      setPendingPrefix(null)
      setShowHelp(false)
      handlers.onEscape?.()
      return
    }

    // Handle pending 'g' prefix for navigation
    if (pendingPrefix === 'g') {
      setPendingPrefix(null)
      switch (key) {
        // Trading
        case 'd':
          navigate('/')
          return
        case 'p':
          navigate('/positions')
          return
        case 'o':
          navigate('/orders')
          return
        case 's':
          navigate('/signals')
          return
        // Risk & Safety
        case 'r':
          navigate('/risk')
          return
        case 'c':
          navigate('/reconciliation')
          return
        // Monitoring
        case 'e':
          navigate('/reports')
          return
        case 'a':
          navigate('/alerts')
          return
        case 'q':
          navigate('/data-quality')
          return
        // System
        case ',':
          navigate('/settings')
          return
        default:
          return
      }
    }

    // Check for 'g' prefix start
    if (key === 'g' && !event.metaKey && !event.ctrlKey) {
      setPendingPrefix('g')
      // Clear prefix after timeout
      setTimeout(() => setPendingPrefix(null), 1000)
      return
    }

    // Single-key shortcuts
    switch (key) {
      case 'r':
        if (!event.metaKey && !event.ctrlKey) {
          event.preventDefault()
          handlers.onRefresh?.()
        }
        break
      case '?':
        event.preventDefault()
        setShowHelp(prev => !prev)
        break
      case 'k':
        if (event.metaKey || event.ctrlKey) {
          // Cmd/Ctrl+K for command palette (future feature)
          event.preventDefault()
          handlers.onCommandPalette?.()
        } else if (handlers.onKillSwitch) {
          // k for kill switch (requires confirmation)
          handlers.onKillSwitch()
        }
        break
      default:
        break
    }
  }, [navigate, pendingPrefix, handlers])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  return {
    showHelp,
    setShowHelp,
    pendingPrefix,
  }
}

// Keyboard shortcut help data
export const KEYBOARD_SHORTCUTS = [
  // Trading
  { keys: ['g', 'd'], description: 'Go to Dashboard' },
  { keys: ['g', 'p'], description: 'Go to Positions' },
  { keys: ['g', 'o'], description: 'Go to Orders' },
  { keys: ['g', 's'], description: 'Go to Signals' },
  // Risk & Safety
  { keys: ['g', 'r'], description: 'Go to Risk' },
  { keys: ['g', 'c'], description: 'Go to Reconciliation' },
  // Monitoring
  { keys: ['g', 'e'], description: 'Go to Reports' },
  { keys: ['g', 'a'], description: 'Go to Alerts' },
  { keys: ['g', 'q'], description: 'Go to Data Quality' },
  // System
  { keys: ['g', ','], description: 'Go to Settings' },
  // Actions
  { keys: ['r'], description: 'Refresh data' },
  { keys: ['?'], description: 'Toggle help' },
  { keys: ['Esc'], description: 'Close dialogs' },
]

// Help Modal component
export function KeyboardShortcutsHelp({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div
      className="dialog-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyboard-help-title"
    >
      <div
        className="dialog keyboard-help-dialog"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="keyboard-help-title" className="dialog-title">
          Keyboard Shortcuts
        </h3>
        <div className="shortcuts-list">
          {KEYBOARD_SHORTCUTS.map(({ keys, description }) => (
            <div key={keys.join('-')} className="shortcut-item">
              <span className="shortcut-description">{description}</span>
              <span className="shortcut-keys">
                {keys.map((key, i) => (
                  <span key={i}>
                    <kbd className="shortcut-key">{key}</kbd>
                    {i < keys.length - 1 && ' then '}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
        <button
          className="btn btn-secondary"
          onClick={onClose}
          autoFocus
        >
          Close
        </button>
      </div>
    </div>
  )
}

// CSS for keyboard shortcuts help
export const keyboardShortcutsStyles = `
.keyboard-help-dialog {
  max-width: 500px;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-6);
}

.shortcut-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-default);
}

.shortcut-item:last-child {
  border-bottom: none;
}

.shortcut-description {
  color: var(--text-primary);
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.shortcut-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 var(--space-2);
  background: var(--bg-secondary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--text-primary);
}
`
