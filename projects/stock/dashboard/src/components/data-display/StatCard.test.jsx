import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatCard from './StatCard'

describe('StatCard', () => {
  describe('rendering', () => {
    it('renders label and value', () => {
      render(<StatCard label="Portfolio Value" value="$125,000" />)

      expect(screen.getByText('Portfolio Value')).toBeInTheDocument()
      expect(screen.getByText('$125,000')).toBeInTheDocument()
    })

    it('renders icon when provided', () => {
      const MockIcon = () => <svg data-testid="mock-icon" />
      render(<StatCard label="Test" value="100" icon={<MockIcon />} />)

      expect(screen.getByTestId('mock-icon')).toBeInTheDocument()
    })

    it('renders trend indicator when provided', () => {
      render(
        <StatCard
          label="Returns"
          value="$5,000"
          trend={{ value: 5.2, direction: 'up' }}
        />
      )

      expect(screen.getByText('5.2%')).toBeInTheDocument()
      expect(screen.getByText('↑')).toBeInTheDocument()
    })

    it('renders down trend correctly', () => {
      render(
        <StatCard
          label="Loss"
          value="$1,000"
          trend={{ value: 2.5, direction: 'down' }}
        />
      )

      expect(screen.getByText('2.5%')).toBeInTheDocument()
      expect(screen.getByText('↓')).toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('shows skeleton when loading', () => {
      const { container } = render(<StatCard label="Test" value="100" loading />)

      // Should render skeleton instead of content
      expect(screen.queryByText('Test')).not.toBeInTheDocument()
      expect(container.querySelector('.skeleton')).toBeInTheDocument()
    })
  })

  describe('variants', () => {
    it('applies positive variant class', () => {
      const { container } = render(
        <StatCard label="Gain" value="$500" variant="positive" />
      )
      expect(container.querySelector('.stat-card-positive')).toBeInTheDocument()
    })

    it('applies negative variant class', () => {
      const { container } = render(
        <StatCard label="Loss" value="$500" variant="negative" />
      )
      expect(container.querySelector('.stat-card-negative')).toBeInTheDocument()
    })

    it('applies danger variant class', () => {
      const { container } = render(
        <StatCard label="Alert" value="High Risk" variant="danger" />
      )
      expect(container.querySelector('.stat-card-danger')).toBeInTheDocument()
    })
  })

  describe('clickable behavior', () => {
    it('renders as button when clickable', () => {
      render(<StatCard label="Click me" value="100" clickable onClick={() => {}} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('renders as div when not clickable', () => {
      render(<StatCard label="Static" value="100" />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('calls onClick when clicked', () => {
      const handleClick = vi.fn()
      render(<StatCard label="Click me" value="100" clickable onClick={handleClick} />)

      fireEvent.click(screen.getByRole('button'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('shows active state when active prop is true', () => {
      const { container } = render(
        <StatCard label="Active" value="100" clickable active onClick={() => {}} />
      )

      expect(container.querySelector('.stat-card-active')).toBeInTheDocument()
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    })
  })

  describe('accessibility', () => {
    it('has accessible label', () => {
      render(<StatCard label="Portfolio Value" value="$125,000" />)

      expect(screen.getByLabelText('Portfolio Value: $125,000')).toBeInTheDocument()
    })

    it('uses custom ariaLabel when provided', () => {
      render(
        <StatCard
          label="Value"
          value="$100"
          ariaLabel="Total portfolio value is one hundred dollars"
        />
      )

      expect(screen.getByLabelText('Total portfolio value is one hundred dollars')).toBeInTheDocument()
    })

    it('hides icon from screen readers', () => {
      const MockIcon = () => <svg data-testid="mock-icon" />
      const { container } = render(
        <StatCard label="Test" value="100" icon={<MockIcon />} />
      )

      expect(container.querySelector('.stat-icon')).toHaveAttribute('aria-hidden', 'true')
    })

    it('announces trend change to screen readers', () => {
      render(
        <StatCard
          label="Returns"
          value="$5,000"
          trend={{ value: 5.2, direction: 'up' }}
        />
      )

      expect(screen.getByLabelText('Increased by 5.2%')).toBeInTheDocument()
    })
  })
})
