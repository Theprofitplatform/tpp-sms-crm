import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge, { StatusDot } from './StatusBadge'

describe('StatusBadge', () => {
  describe('rendering', () => {
    it('renders status label', () => {
      render(<StatusBadge status="filled" />)
      expect(screen.getByText('Filled')).toBeInTheDocument()
    })

    it('renders icon by default', () => {
      const { container } = render(<StatusBadge status="filled" />)
      expect(container.querySelector('.status-badge-icon')).toBeInTheDocument()
    })

    it('hides icon when showIcon is false', () => {
      const { container } = render(<StatusBadge status="filled" showIcon={false} />)
      expect(container.querySelector('.status-badge-icon')).not.toBeInTheDocument()
    })

    it('hides label when showLabel is false', () => {
      render(<StatusBadge status="filled" showLabel={false} />)
      expect(screen.queryByText('Filled')).not.toBeInTheDocument()
    })

    it('uses custom label when provided', () => {
      render(<StatusBadge status="filled" customLabel="Complete" />)
      expect(screen.getByText('Complete')).toBeInTheDocument()
    })
  })

  describe('order statuses', () => {
    it.each([
      ['filled', 'Filled', 'green'],
      ['pending', 'Pending', 'yellow'],
      ['cancelled', 'Cancelled', 'gray'],
      ['rejected', 'Rejected', 'red'],
      ['expired', 'Expired', 'gray'],
    ])('renders %s status correctly', (status, label, color) => {
      const { container } = render(<StatusBadge status={status} />)

      expect(screen.getByText(label)).toBeInTheDocument()
      expect(container.querySelector(`.status-badge-${color}`)).toBeInTheDocument()
    })
  })

  describe('trading directions', () => {
    it('renders buy status with green color', () => {
      const { container } = render(<StatusBadge status="buy" />)

      expect(screen.getByText('Buy')).toBeInTheDocument()
      expect(container.querySelector('.status-badge-green')).toBeInTheDocument()
    })

    it('renders sell status with red color', () => {
      const { container } = render(<StatusBadge status="sell" />)

      expect(screen.getByText('Sell')).toBeInTheDocument()
      expect(container.querySelector('.status-badge-red')).toBeInTheDocument()
    })
  })

  describe('system statuses', () => {
    it('renders healthy status', () => {
      const { container } = render(<StatusBadge status="healthy" />)
      expect(container.querySelector('.status-badge-green')).toBeInTheDocument()
    })

    it('renders unhealthy status', () => {
      const { container } = render(<StatusBadge status="unhealthy" />)
      expect(container.querySelector('.status-badge-red')).toBeInTheDocument()
    })

    it('renders halted status for kill switch', () => {
      const { container } = render(<StatusBadge status="halted" />)
      expect(screen.getByText('Halted')).toBeInTheDocument()
      expect(container.querySelector('.status-badge-red')).toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it('applies small size class', () => {
      const { container } = render(<StatusBadge status="filled" size="sm" />)
      expect(container.querySelector('.status-badge-sm')).toBeInTheDocument()
    })

    it('applies medium size class by default', () => {
      const { container } = render(<StatusBadge status="filled" />)
      expect(container.querySelector('.status-badge-md')).toBeInTheDocument()
    })

    it('applies large size class', () => {
      const { container } = render(<StatusBadge status="filled" size="lg" />)
      expect(container.querySelector('.status-badge-lg')).toBeInTheDocument()
    })
  })

  describe('unknown status', () => {
    it('handles unknown status gracefully', () => {
      const { container } = render(<StatusBadge status="customstatus" />)

      expect(screen.getByText('customstatus')).toBeInTheDocument()
      expect(container.querySelector('.status-badge-gray')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has role="status"', () => {
      render(<StatusBadge status="filled" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has accessible aria-label', () => {
      render(<StatusBadge status="filled" />)
      expect(screen.getByLabelText('Filled')).toBeInTheDocument()
    })

    it('hides icon from screen readers', () => {
      const { container } = render(<StatusBadge status="filled" />)
      expect(container.querySelector('.status-badge-icon')).toHaveAttribute('aria-hidden', 'true')
    })

    it('uses pattern for colorblind accessibility', () => {
      const { container } = render(<StatusBadge status="pending" />)
      expect(container.querySelector('.pattern-dashed')).toBeInTheDocument()
    })
  })
})

describe('StatusDot', () => {
  it('renders dot with correct color', () => {
    const { container } = render(<StatusDot status="filled" />)
    expect(container.querySelector('.status-dot')).toBeInTheDocument()
    expect(container.querySelector('.status-badge-green')).toBeInTheDocument()
  })

  it('has accessible label', () => {
    render(<StatusDot status="pending" />)
    expect(screen.getByLabelText('Pending')).toBeInTheDocument()
  })

  it('applies size class', () => {
    const { container } = render(<StatusDot status="filled" size="lg" />)
    expect(container.querySelector('.status-dot-lg')).toBeInTheDocument()
  })
})
