import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import EmptyState, { EmptyPositions, EmptyOrders, EmptySignals, NoSearchResults } from './EmptyState'

// Mock the Button component
vi.mock('../ui/Button', () => ({
  default: ({ children, onClick, variant }) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}))

describe('EmptyState', () => {
  describe('rendering', () => {
    it('renders title', () => {
      render(<EmptyState title="No data found" />)
      expect(screen.getByText('No data found')).toBeInTheDocument()
    })

    it('renders default title when none provided', () => {
      render(<EmptyState />)
      expect(screen.getByText('No data available')).toBeInTheDocument()
    })

    it('renders description when provided', () => {
      render(<EmptyState title="Empty" description="Nothing here yet" />)
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    })

    it('renders icon', () => {
      const { container } = render(<EmptyState title="Empty" />)
      expect(container.querySelector('.empty-state-icon')).toBeInTheDocument()
    })

    it('uses custom icon when provided', () => {
      const CustomIcon = () => <svg data-testid="custom-icon" />
      render(<EmptyState title="Custom" icon={CustomIcon} />)
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
    })
  })

  describe('actions', () => {
    it('renders primary action button', () => {
      const handleClick = vi.fn()
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Add Item', onClick: handleClick }}
        />
      )

      const button = screen.getByText('Add Item')
      expect(button).toBeInTheDocument()

      fireEvent.click(button)
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('renders secondary action button', () => {
      const handleClick = vi.fn()
      render(
        <EmptyState
          title="Empty"
          secondaryAction={{ label: 'Learn More', onClick: handleClick }}
        />
      )

      expect(screen.getByText('Learn More')).toBeInTheDocument()
    })

    it('renders both actions', () => {
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Primary', onClick: () => {} }}
          secondaryAction={{ label: 'Secondary', onClick: () => {} }}
        />
      )

      expect(screen.getByText('Primary')).toBeInTheDocument()
      expect(screen.getByText('Secondary')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it.each(['sm', 'md', 'lg'])('applies %s size class', (size) => {
      const { container } = render(<EmptyState title="Empty" size={size} />)
      expect(container.querySelector(`.empty-state-${size}`)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<EmptyState title="Empty" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible label from title', () => {
      render(<EmptyState title="No items found" />)
      expect(screen.getByLabelText('No items found')).toBeInTheDocument()
    })

    it('hides icon from screen readers', () => {
      const { container } = render(<EmptyState title="Empty" />)
      expect(container.querySelector('.empty-state-icon')).toHaveAttribute('aria-hidden', 'true')
    })
  })
})

describe('EmptyPositions', () => {
  it('renders positions-specific message', () => {
    render(<EmptyPositions />)
    expect(screen.getByText('No open positions')).toBeInTheDocument()
    expect(screen.getByText('Execute a signal to open your first position')).toBeInTheDocument()
  })

  it('renders action button when onAction provided', () => {
    const handleAction = vi.fn()
    render(<EmptyPositions onAction={handleAction} />)

    expect(screen.getByText('View Signals')).toBeInTheDocument()
  })

  it('does not render action when onAction not provided', () => {
    render(<EmptyPositions />)
    expect(screen.queryByText('View Signals')).not.toBeInTheDocument()
  })
})

describe('EmptyOrders', () => {
  it('renders orders-specific message', () => {
    render(<EmptyOrders />)
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
    expect(screen.getByText('Place your first order from the Signals page')).toBeInTheDocument()
  })
})

describe('EmptySignals', () => {
  it('renders signals-specific message', () => {
    render(<EmptySignals />)
    expect(screen.getByText('Waiting for signals')).toBeInTheDocument()
    expect(screen.getByText('Trading signals will appear here when strategies generate them')).toBeInTheDocument()
  })
})

describe('NoSearchResults', () => {
  it('renders search query in message', () => {
    render(<NoSearchResults query="AAPL" />)
    expect(screen.getByText('No results for "AAPL"')).toBeInTheDocument()
  })

  it('renders clear action when onClear provided', () => {
    const handleClear = vi.fn()
    render(<NoSearchResults query="test" onClear={handleClear} />)

    const clearButton = screen.getByText('Clear Search')
    expect(clearButton).toBeInTheDocument()

    fireEvent.click(clearButton)
    expect(handleClear).toHaveBeenCalledTimes(1)
  })
})
