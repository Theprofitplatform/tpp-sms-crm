import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock axios
const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
}

vi.mock('axios', () => ({
  default: {
    ...mockAxios,
    create: () => ({
      ...mockAxios,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }),
  },
}))

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

describe('SettingsPage Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAxios.get.mockResolvedValue({
      data: {
        tradingMode: 'PAPER',
        maxDailyLossPct: 2.0,
        maxWeeklyLossPct: 5.0,
        maxPositionSizePct: 10.0,
        maxDrawdownPct: 10.0,
        maxOrdersPerDay: 20,
        slippageTolerance: 0.5,
        autoRefreshInterval: 30,
      },
    })
  })

  async function renderSettings() {
    const { default: SettingsPage } = await import('./SettingsPage')
    return render(
      <BrowserRouter>
        <SettingsPage />
      </BrowserRouter>
    )
  }

  describe('validation rules', () => {
    it('validates maxDailyLossPct must be between 0 and 100', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/daily loss/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/daily loss/i)

      // Set invalid value > 100
      fireEvent.change(input, { target: { value: '150' } })

      await waitFor(() => {
        expect(screen.getByText(/must be between 0 and 100/i)).toBeInTheDocument()
      })
    })

    it('validates maxDailyLossPct cannot be negative', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/daily loss/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/daily loss/i)
      fireEvent.change(input, { target: { value: '-5' } })

      await waitFor(() => {
        expect(screen.getByText(/must be between 0 and 100/i)).toBeInTheDocument()
      })
    })

    it('validates maxOrdersPerDay must be positive', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/orders per day/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/orders per day/i)
      await act(async () => {
        fireEvent.change(input, { target: { value: '0' } })
      })

      await waitFor(() => {
        expect(screen.getByText(/must be a positive integer/i)).toBeInTheDocument()
      })
    })

    it('validates slippageTolerance must be between 0 and 10', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/slippage/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/slippage/i)
      fireEvent.change(input, { target: { value: '15' } })

      await waitFor(() => {
        expect(screen.getByText(/must be between 0 and 10/i)).toBeInTheDocument()
      })
    })

    it('validates autoRefreshInterval must be at least 10 seconds', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/auto.*refresh/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/auto.*refresh/i)
      await act(async () => {
        fireEvent.change(input, { target: { value: '5' } })
      })

      await waitFor(() => {
        expect(screen.getByText(/must be at least 10/i)).toBeInTheDocument()
      })
    })
  })

  describe('save button behavior', () => {
    it('disables save button when validation errors exist', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/daily loss/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/daily loss/i)
      fireEvent.change(input, { target: { value: '150' } })

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i })
        expect(saveButton).toBeDisabled()
      })
    })

    it('enables save button when no validation errors', async () => {
      await renderSettings()

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /save/i })
        expect(saveButton).not.toBeDisabled()
      })
    })
  })

  describe('accessibility', () => {
    it('has aria-invalid on invalid inputs', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/daily loss/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/daily loss/i)
      fireEvent.change(input, { target: { value: '150' } })

      await waitFor(() => {
        expect(input).toHaveAttribute('aria-invalid', 'true')
      })
    })

    it('has aria-describedby linking to error message', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/daily loss/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/daily loss/i)
      fireEvent.change(input, { target: { value: '150' } })

      await waitFor(() => {
        const describedById = input.getAttribute('aria-describedby')
        expect(describedById).toBeTruthy()
      })
    })

    it('error messages have role="alert"', async () => {
      await renderSettings()

      await waitFor(() => {
        expect(screen.getByLabelText(/daily loss/i)).toBeInTheDocument()
      })

      const input = screen.getByLabelText(/daily loss/i)
      fireEvent.change(input, { target: { value: '150' } })

      await waitFor(() => {
        const errorMessage = screen.getByText(/must be between 0 and 100/i)
        expect(errorMessage).toHaveAttribute('role', 'alert')
      })
    })
  })
})
