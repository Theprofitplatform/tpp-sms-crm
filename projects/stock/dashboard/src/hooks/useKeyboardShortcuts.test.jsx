import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { BrowserRouter, useLocation } from 'react-router-dom'
import useKeyboardShortcuts, { KeyboardShortcutsHelp, KEYBOARD_SHORTCUTS } from './useKeyboardShortcuts'

// Test component that uses the hook
function TestComponent({ handlers = {} }) {
  const { showHelp, setShowHelp, pendingPrefix } = useKeyboardShortcuts(handlers)
  const location = useLocation()

  return (
    <div>
      <span data-testid="location">{location.pathname}</span>
      <span data-testid="show-help">{showHelp ? 'true' : 'false'}</span>
      <span data-testid="pending-prefix">{pendingPrefix || 'none'}</span>
      <button onClick={() => setShowHelp(false)}>Close Help</button>
      <input data-testid="input" />
      <textarea data-testid="textarea" />
    </div>
  )
}

function renderWithRouter(ui, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route)
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('navigation shortcuts', () => {
    it('navigates to dashboard with g then d', async () => {
      renderWithRouter(<TestComponent />, { route: '/orders' })

      fireEvent.keyDown(document, { key: 'g' })
      fireEvent.keyDown(document, { key: 'd' })

      expect(screen.getByTestId('location').textContent).toBe('/')
    })

    it('navigates to positions with g then p', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: 'g' })
      fireEvent.keyDown(document, { key: 'p' })

      expect(screen.getByTestId('location').textContent).toBe('/positions')
    })

    it('navigates to orders with g then o', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: 'g' })
      fireEvent.keyDown(document, { key: 'o' })

      expect(screen.getByTestId('location').textContent).toBe('/orders')
    })

    it('navigates to signals with g then s', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: 'g' })
      fireEvent.keyDown(document, { key: 's' })

      expect(screen.getByTestId('location').textContent).toBe('/signals')
    })

    it('navigates to settings with g then ,', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: 'g' })
      fireEvent.keyDown(document, { key: ',' })

      expect(screen.getByTestId('location').textContent).toBe('/settings')
    })

    it('clears pending prefix after timeout', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: 'g' })
      expect(screen.getByTestId('pending-prefix').textContent).toBe('g')

      act(() => {
        vi.advanceTimersByTime(1100)
      })

      expect(screen.getByTestId('pending-prefix').textContent).toBe('none')
    })

    it('does not navigate with g followed by wrong key', () => {
      renderWithRouter(<TestComponent />, { route: '/orders' })

      fireEvent.keyDown(document, { key: 'g' })
      fireEvent.keyDown(document, { key: 'x' })

      expect(screen.getByTestId('location').textContent).toBe('/orders')
    })
  })

  describe('help modal shortcut', () => {
    it('toggles help with ? key', () => {
      renderWithRouter(<TestComponent />)

      expect(screen.getByTestId('show-help').textContent).toBe('false')

      fireEvent.keyDown(document, { key: '?' })
      expect(screen.getByTestId('show-help').textContent).toBe('true')

      fireEvent.keyDown(document, { key: '?' })
      expect(screen.getByTestId('show-help').textContent).toBe('false')
    })

    it('closes help with Escape', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: '?' })
      expect(screen.getByTestId('show-help').textContent).toBe('true')

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByTestId('show-help').textContent).toBe('false')
    })
  })

  describe('refresh shortcut', () => {
    it('calls onRefresh handler with r key', () => {
      const onRefresh = vi.fn()
      renderWithRouter(<TestComponent handlers={{ onRefresh }} />)

      fireEvent.keyDown(document, { key: 'r' })
      expect(onRefresh).toHaveBeenCalledTimes(1)
    })

    it('does not call refresh with Ctrl+R', () => {
      const onRefresh = vi.fn()
      renderWithRouter(<TestComponent handlers={{ onRefresh }} />)

      fireEvent.keyDown(document, { key: 'r', ctrlKey: true })
      expect(onRefresh).not.toHaveBeenCalled()
    })

    it('does not call refresh with Cmd+R', () => {
      const onRefresh = vi.fn()
      renderWithRouter(<TestComponent handlers={{ onRefresh }} />)

      fireEvent.keyDown(document, { key: 'r', metaKey: true })
      expect(onRefresh).not.toHaveBeenCalled()
    })
  })

  describe('escape handler', () => {
    it('calls onEscape handler', () => {
      const onEscape = vi.fn()
      renderWithRouter(<TestComponent handlers={{ onEscape }} />)

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(onEscape).toHaveBeenCalledTimes(1)
    })

    it('clears pending prefix on Escape', () => {
      renderWithRouter(<TestComponent />)

      fireEvent.keyDown(document, { key: 'g' })
      expect(screen.getByTestId('pending-prefix').textContent).toBe('g')

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.getByTestId('pending-prefix').textContent).toBe('none')
    })
  })

  describe('input element handling', () => {
    it('ignores shortcuts when typing in input', () => {
      renderWithRouter(<TestComponent />, { route: '/orders' })

      const input = screen.getByTestId('input')
      fireEvent.keyDown(input, { key: 'g' })
      fireEvent.keyDown(input, { key: 'd' })

      // Should still be on orders, not navigated
      expect(screen.getByTestId('location').textContent).toBe('/orders')
    })

    it('ignores shortcuts when typing in textarea', () => {
      renderWithRouter(<TestComponent />, { route: '/orders' })

      const textarea = screen.getByTestId('textarea')
      fireEvent.keyDown(textarea, { key: 'g' })
      fireEvent.keyDown(textarea, { key: 'd' })

      expect(screen.getByTestId('location').textContent).toBe('/orders')
    })

    it('allows Escape in inputs', () => {
      const onEscape = vi.fn()
      renderWithRouter(<TestComponent handlers={{ onEscape }} />)

      const input = screen.getByTestId('input')
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(onEscape).toHaveBeenCalled()
    })
  })
})

describe('KeyboardShortcutsHelp', () => {
  it('returns null when not open', () => {
    const { container } = render(
      <KeyboardShortcutsHelp isOpen={false} onClose={() => {}} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders when open', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={() => {}} />)
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument()
  })

  it('renders all shortcuts', () => {
    render(<KeyboardShortcutsHelp isOpen={true} onClose={() => {}} />)

    KEYBOARD_SHORTCUTS.forEach(({ description }) => {
      expect(screen.getByText(description)).toBeInTheDocument()
    })
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />)

    // Click on the overlay (first child which has the click handler)
    fireEvent.click(container.firstChild)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not call onClose when dialog content clicked', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsHelp isOpen={true} onClose={onClose} />)

    fireEvent.click(screen.getByText('Keyboard Shortcuts'))
    expect(onClose).not.toHaveBeenCalled()
  })

  describe('accessibility', () => {
    it('has role="dialog"', () => {
      render(<KeyboardShortcutsHelp isOpen={true} onClose={() => {}} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-modal="true"', () => {
      const { container } = render(<KeyboardShortcutsHelp isOpen={true} onClose={() => {}} />)
      // The overlay div has the aria-modal attribute
      expect(container.firstChild).toHaveAttribute('aria-modal', 'true')
    })

    it('has aria-labelledby pointing to title', () => {
      const { container } = render(<KeyboardShortcutsHelp isOpen={true} onClose={() => {}} />)
      // The overlay div has the aria-labelledby attribute
      expect(container.firstChild).toHaveAttribute(
        'aria-labelledby',
        'keyboard-help-title'
      )
    })
  })
})

describe('KEYBOARD_SHORTCUTS constant', () => {
  it('has all expected shortcuts defined', () => {
    const expectedShortcuts = [
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'p'], description: 'Go to Positions' },
      { keys: ['g', 'o'], description: 'Go to Orders' },
      { keys: ['g', 's'], description: 'Go to Signals' },
      { keys: ['g', 'r'], description: 'Go to Risk' },
      { keys: ['g', 'c'], description: 'Go to Reconciliation' },
      { keys: ['g', 'e'], description: 'Go to Reports' },
      { keys: ['g', 'a'], description: 'Go to Alerts' },
      { keys: ['g', 'q'], description: 'Go to Data Quality' },
      { keys: ['g', ','], description: 'Go to Settings' },
      { keys: ['r'], description: 'Refresh data' },
      { keys: ['?'], description: 'Toggle help' },
      { keys: ['Esc'], description: 'Close dialogs' },
    ]

    expect(KEYBOARD_SHORTCUTS).toEqual(expectedShortcuts)
  })
})
