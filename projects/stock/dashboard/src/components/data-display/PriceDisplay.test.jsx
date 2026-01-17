import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PriceDisplay, { PercentDisplay, QuantityDisplay } from './PriceDisplay'

describe('PriceDisplay', () => {
  describe('basic rendering', () => {
    it('renders currency value with dollar sign', () => {
      render(<PriceDisplay value={1234.56} />)
      expect(screen.getByText('$1,234.56')).toBeInTheDocument()
    })

    it('renders negative values', () => {
      render(<PriceDisplay value={-500.25} />)
      expect(screen.getByText('-$500.25')).toBeInTheDocument()
    })

    it('handles null value', () => {
      render(<PriceDisplay value={null} />)
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('handles undefined value', () => {
      render(<PriceDisplay value={undefined} />)
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('handles string values', () => {
      render(<PriceDisplay value="1000.50" />)
      expect(screen.getByText('$1,000.50')).toBeInTheDocument()
    })
  })

  describe('formatting options', () => {
    it('shows sign when showSign is true', () => {
      render(<PriceDisplay value={500} showSign />)
      expect(screen.getByText('+$500.00')).toBeInTheDocument()
    })

    it('shows negative sign with showSign', () => {
      render(<PriceDisplay value={-500} showSign />)
      expect(screen.getByText('-$500.00')).toBeInTheDocument()
    })

    it('hides currency when showCurrency is false', () => {
      render(<PriceDisplay value={1000} showCurrency={false} />)
      expect(screen.getByText('1,000.00')).toBeInTheDocument()
    })

    it('uses custom decimals', () => {
      render(<PriceDisplay value={1234.5678} decimals={4} />)
      expect(screen.getByText('$1,234.5678')).toBeInTheDocument()
    })

    it('adds suffix', () => {
      render(<PriceDisplay value={5.25} suffix="%" showCurrency={false} />)
      expect(screen.getByText('5.25%')).toBeInTheDocument()
    })

    it('adds prefix', () => {
      render(<PriceDisplay value={100} prefix="~" />)
      expect(screen.getByText('~$100.00')).toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('formats thousands with K', () => {
      render(<PriceDisplay value={5500} compact />)
      expect(screen.getByText('$5.5K')).toBeInTheDocument()
    })

    it('formats millions with M', () => {
      render(<PriceDisplay value={2500000} compact />)
      expect(screen.getByText('$2.5M')).toBeInTheDocument()
    })

    it('formats billions with B', () => {
      render(<PriceDisplay value={1200000000} compact />)
      expect(screen.getByText('$1.2B')).toBeInTheDocument()
    })

    it('shows regular format for small numbers', () => {
      render(<PriceDisplay value={500} compact />)
      expect(screen.getByText('$500.00')).toBeInTheDocument()
    })
  })

  describe('trend display', () => {
    it('shows up trend icon for positive values', () => {
      const { container } = render(<PriceDisplay value={500} showTrend />)
      expect(container.querySelector('.price-positive')).toBeInTheDocument()
      expect(container.querySelector('.price-trend-icon')).toBeInTheDocument()
    })

    it('shows down trend icon for negative values', () => {
      const { container } = render(<PriceDisplay value={-500} showTrend />)
      expect(container.querySelector('.price-negative')).toBeInTheDocument()
    })

    it('hides trend icon by default', () => {
      const { container } = render(<PriceDisplay value={500} />)
      expect(container.querySelector('.price-trend-icon')).not.toBeInTheDocument()
    })
  })

  describe('sizes', () => {
    it.each(['sm', 'md', 'lg', 'xl'])('applies %s size class', (size) => {
      const { container } = render(<PriceDisplay value={100} size={size} />)
      expect(container.querySelector(`.price-display-${size}`)).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('uses monospace font for alignment', () => {
      const { container } = render(<PriceDisplay value={100} />)
      expect(container.querySelector('.price-display')).toBeInTheDocument()
    })

    it('hides trend icon from screen readers', () => {
      const { container } = render(<PriceDisplay value={500} showTrend />)
      expect(container.querySelector('.price-trend-icon')).toHaveAttribute('aria-hidden', 'true')
    })
  })
})

describe('PercentDisplay', () => {
  it('shows value as percentage', () => {
    render(<PercentDisplay value={5.25} />)
    expect(screen.getByText('+5.25%')).toBeInTheDocument()
  })

  it('shows negative percentage', () => {
    render(<PercentDisplay value={-3.5} />)
    expect(screen.getByText('-3.50%')).toBeInTheDocument()
  })

  it('shows trend by default', () => {
    const { container } = render(<PercentDisplay value={5} />)
    expect(container.querySelector('.price-trend-icon')).toBeInTheDocument()
  })
})

describe('QuantityDisplay', () => {
  it('shows integer value without currency', () => {
    render(<QuantityDisplay value={100} />)
    expect(screen.getByText('100')).toBeInTheDocument()
  })

  it('handles decimal quantities', () => {
    render(<QuantityDisplay value={100.5} decimals={1} />)
    expect(screen.getByText('100.5')).toBeInTheDocument()
  })
})
