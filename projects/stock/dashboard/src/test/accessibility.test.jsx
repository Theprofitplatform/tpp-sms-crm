import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'

// Mock axios to prevent network requests
vi.mock('axios', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: {} })),
    post: vi.fn(() => Promise.resolve({ data: {} })),
    create: vi.fn(() => ({
      get: vi.fn(() => Promise.resolve({ data: {} })),
      post: vi.fn(() => Promise.resolve({ data: {} })),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

// Test accessibility features added in the UI/UX improvements
describe('Accessibility Tests', () => {
  describe('Skip to main content link', () => {
    it('Layout has skip-to-main link', async () => {
      const { default: Layout } = await import('../components/Layout')

      render(
        <MemoryRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </MemoryRouter>
      )

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink).toBeInTheDocument()
      expect(skipLink.tagName).toBe('A')
      expect(skipLink).toHaveAttribute('href', '#main-content')
    })

    it('skip link has sr-only class for visual hiding', async () => {
      const { default: Layout } = await import('../components/Layout')

      render(
        <MemoryRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </MemoryRouter>
      )

      const skipLink = screen.getByText('Skip to main content')
      expect(skipLink.className).toContain('sr-only')
    })

    it('main content has correct id', async () => {
      const { default: Layout } = await import('../components/Layout')

      const { container } = render(
        <MemoryRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </MemoryRouter>
      )

      const mainContent = container.querySelector('#main-content')
      expect(mainContent).toBeInTheDocument()
    })

    it('main content has role="main"', async () => {
      const { default: Layout } = await import('../components/Layout')

      render(
        <MemoryRouter>
          <Layout>
            <div>Content</div>
          </Layout>
        </MemoryRouter>
      )

      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Sidebar navigation accessibility', () => {
    it('Sidebar exists', async () => {
      const { default: Sidebar } = await import('../components/Sidebar')

      const { container } = render(
        <MemoryRouter initialEntries={['/']}>
          <Sidebar />
        </MemoryRouter>
      )

      expect(container.querySelector('nav, aside')).toBeInTheDocument()
    })
  })

  describe('Component aria-labels', () => {
    it('StatusBadge has role="status"', async () => {
      const { default: StatusBadge } = await import('../components/data-display/StatusBadge')

      render(<StatusBadge status="filled" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('EmptyState has role="status"', async () => {
      const { default: EmptyState } = await import('../components/feedback/EmptyState')

      render(<EmptyState title="No data" />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('StatCard has aria-label', async () => {
      const { default: StatCard } = await import('../components/data-display/StatCard')

      render(<StatCard label="Test" value="100" />)
      expect(screen.getByLabelText('Test: 100')).toBeInTheDocument()
    })
  })

  describe('Interactive elements accessibility', () => {
    it('clickable StatCard is a button', async () => {
      const { default: StatCard } = await import('../components/data-display/StatCard')

      render(<StatCard label="Click" value="100" clickable onClick={() => {}} />)
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('active StatCard has aria-pressed', async () => {
      const { default: StatCard } = await import('../components/data-display/StatCard')

      render(<StatCard label="Active" value="100" clickable active onClick={() => {}} />)
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
    })

    it('KeyboardShortcutsHelp dialog has aria-modal', async () => {
      const { KeyboardShortcutsHelp } = await import('../hooks/useKeyboardShortcuts')

      const { container } = render(<KeyboardShortcutsHelp isOpen={true} onClose={() => {}} />)
      // The overlay div has the aria-modal attribute
      expect(container.firstChild).toHaveAttribute('aria-modal', 'true')
    })
  })

  describe('Icons accessibility', () => {
    it('StatusBadge icon is hidden from screen readers', async () => {
      const { default: StatusBadge } = await import('../components/data-display/StatusBadge')

      const { container } = render(<StatusBadge status="filled" />)
      expect(container.querySelector('.status-badge-icon')).toHaveAttribute('aria-hidden', 'true')
    })

    it('StatCard icon is hidden from screen readers', async () => {
      const MockIcon = () => <svg data-testid="icon" />
      const { default: StatCard } = await import('../components/data-display/StatCard')

      const { container } = render(<StatCard label="Test" value="100" icon={<MockIcon />} />)
      expect(container.querySelector('.stat-icon')).toHaveAttribute('aria-hidden', 'true')
    })

    it('EmptyState icon is hidden from screen readers', async () => {
      const { default: EmptyState } = await import('../components/feedback/EmptyState')

      const { container } = render(<EmptyState title="Empty" />)
      expect(container.querySelector('.empty-state-icon')).toHaveAttribute('aria-hidden', 'true')
    })

    it('PriceDisplay trend icon is hidden from screen readers', async () => {
      const { default: PriceDisplay } = await import('../components/data-display/PriceDisplay')

      const { container } = render(<PriceDisplay value={100} showTrend />)
      expect(container.querySelector('.price-trend-icon')).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Colorblind accessibility', () => {
    it('StatusBadge uses patterns for colorblind users', async () => {
      const { default: StatusBadge } = await import('../components/data-display/StatusBadge')

      // Pending uses dashed pattern
      const { container: pendingContainer } = render(<StatusBadge status="pending" />)
      expect(pendingContainer.querySelector('.pattern-dashed')).toBeInTheDocument()

      // Cancelled uses striped pattern
      const { container: cancelledContainer } = render(<StatusBadge status="cancelled" />)
      expect(cancelledContainer.querySelector('.pattern-striped')).toBeInTheDocument()
    })
  })

  describe('Screen reader announcements', () => {
    it('StatCard trend is announced', async () => {
      const { default: StatCard } = await import('../components/data-display/StatCard')

      render(<StatCard label="Returns" value="$500" trend={{ value: 5.2, direction: 'up' }} />)
      expect(screen.getByLabelText('Increased by 5.2%')).toBeInTheDocument()
    })

    it('StatusBadge has accessible label', async () => {
      const { default: StatusBadge } = await import('../components/data-display/StatusBadge')

      render(<StatusBadge status="filled" />)
      expect(screen.getByLabelText('Filled')).toBeInTheDocument()
    })
  })
})
