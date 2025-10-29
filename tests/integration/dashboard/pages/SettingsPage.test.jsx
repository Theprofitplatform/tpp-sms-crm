/**
 * Integration Tests for SettingsPage Component
 * Tests full state management, form validation, API integration, and user interactions
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from '../../../../dashboard/src/pages/SettingsPage.jsx'
import * as api from '../../../../dashboard/src/services/api.js'

// Mock API
jest.mock('../../../../dashboard/src/services/api.js')
jest.mock('../../../../dashboard/src/components/ui/use-toast')

// Mock window.confirm and window.addEventListener
global.confirm = jest.fn(() => true)
const mockAddEventListener = jest.fn()
const mockRemoveEventListener = jest.fn()
global.addEventListener = mockAddEventListener
global.removeEventListener = mockRemoveEventListener

describe('SettingsPage Component', () => {
  const mockSettings = {
    general: {
      platformName: 'SEO Expert',
      adminEmail: 'admin@example.com',
      language: 'en',
      timezone: 'UTC'
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      discordNotifications: true,
      slackNotifications: false
    },
    api: {
      apiKey: 'test-api-key-12345',
      webhookUrl: 'https://example.com/webhook'
    },
    appearance: {
      theme: 'system',
      primaryColor: 'blue'
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    api.settingsAPI.getAll.mockResolvedValue(mockSettings)
    api.settingsAPI.update.mockResolvedValue({ success: true })
    api.settingsAPI.regenerateAPIKey.mockResolvedValue({ apiKey: 'new-api-key-67890' })
  })

  it('should render settings page', () => {
    render(<SettingsPage />)

    expect(screen.getByText(/Settings/i)).toBeInTheDocument()
  })

  it('should load settings on mount', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(api.settingsAPI.getAll).toHaveBeenCalledTimes(1)
    })
  })

  it('should display loaded settings', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
      expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument()
    })
  })

  it('should show loading state initially', () => {
    render(<SettingsPage />)

    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it('should hide loading state after data loads', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument()
    })
  })

  it('should update general settings field', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.clear(input)
    await user.type(input, 'New Platform Name')

    expect(input.value).toBe('New Platform Name')
  })

  it('should validate email format', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument()
    })

    const emailInput = screen.getByDisplayValue('admin@example.com')
    await user.clear(emailInput)
    await user.type(emailInput, 'invalid-email')

    // Trigger validation
    fireEvent.blur(emailInput)

    await waitFor(() => {
      expect(screen.getByText(/Invalid email/i)).toBeInTheDocument()
    })
  })

  it('should validate URL format', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('https://example.com/webhook')).toBeInTheDocument()
    })

    const urlInput = screen.getByDisplayValue('https://example.com/webhook')
    await user.clear(urlInput)
    await user.type(urlInput, 'not-a-url')

    fireEvent.blur(urlInput)

    await waitFor(() => {
      expect(screen.getByText(/Invalid URL/i)).toBeInTheDocument()
    })
  })

  it('should mark form as dirty when changes made', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.type(input, ' Updated')

    // Save button should be enabled
    const saveButton = screen.getByRole('button', { name: /save/i })
    expect(saveButton).not.toBeDisabled()
  })

  it('should save settings successfully', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.clear(input)
    await user.type(input, 'Updated Name')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(api.settingsAPI.update).toHaveBeenCalled()
    })
  })

  it('should show success toast after save', async () => {
    const user = userEvent.setup()
    const mockToast = jest.fn()
    require('../../../../dashboard/src/components/ui/use-toast').useToast.mockReturnValue({ toast: mockToast })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.type(input, ' Updated')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Success')
        })
      )
    })
  })

  it('should discard changes when requested', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.clear(input)
    await user.type(input, 'Changed')

    const discardButton = screen.getByRole('button', { name: /discard/i })
    await user.click(discardButton)

    await waitFor(() => {
      expect(input.value).toBe('SEO Expert') // Reverted to original
    })
  })

  it('should show unsaved changes warning', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.type(input, ' Changed')

    // Check for unsaved changes indicator
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
  })

  it('should toggle notification settings', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      const emailToggle = screen.getByRole('switch', { name: /email notifications/i })
      expect(emailToggle).toBeChecked()
    })

    const emailToggle = screen.getByRole('switch', { name: /email notifications/i })
    await user.click(emailToggle)

    expect(emailToggle).not.toBeChecked()
  })

  it('should display API key masked by default', async () => {
    render(<SettingsPage />)

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText(/API Key/i)
      expect(apiKeyInput.type).toBe('password')
    })
  })

  it('should toggle API key visibility', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      const apiKeyInput = screen.getByLabelText(/API Key/i)
      expect(apiKeyInput.type).toBe('password')
    })

    const toggleButton = screen.getByRole('button', { name: /show api key/i })
    await user.click(toggleButton)

    const apiKeyInput = screen.getByLabelText(/API Key/i)
    expect(apiKeyInput.type).toBe('text')
  })

  it('should regenerate API key', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument()
    })

    const regenerateButton = screen.getByRole('button', { name: /regenerate/i })
    await user.click(regenerateButton)

    await waitFor(() => {
      expect(api.settingsAPI.regenerateAPIKey).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(screen.getByDisplayValue('new-api-key-67890')).toBeInTheDocument()
    })
  })

  it('should copy API key to clipboard', async () => {
    const user = userEvent.setup()
    const mockClipboard = { writeText: jest.fn().mockResolvedValue() }
    Object.assign(navigator, { clipboard: mockClipboard })

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText(/API Key/i)).toBeInTheDocument()
    })

    const copyButton = screen.getByRole('button', { name: /copy/i })
    await user.click(copyButton)

    expect(mockClipboard.writeText).toHaveBeenCalledWith('test-api-key-12345')
  })

  it('should handle API errors', async () => {
    api.settingsAPI.getAll.mockRejectedValueOnce(new Error('API Error'))

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })

  it('should show error toast on save failure', async () => {
    const user = userEvent.setup()
    const mockToast = jest.fn()
    require('../../../../dashboard/src/components/ui/use-toast').useToast.mockReturnValue({ toast: mockToast })

    api.settingsAPI.update.mockRejectedValueOnce(new Error('Save failed'))

    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.type(input, ' Changed')

    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive'
        })
      )
    })
  })

  it('should persist tab selection', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByText(/General/i)).toBeInTheDocument()
    })

    const notificationsTab = screen.getByRole('tab', { name: /Notifications/i })
    await user.click(notificationsTab)

    // Tab should be active
    expect(notificationsTab).toHaveAttribute('aria-selected', 'true')
  })

  it('should register beforeunload listener when dirty', async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue('SEO Expert')).toBeInTheDocument()
    })

    const input = screen.getByDisplayValue('SEO Expert')
    await user.type(input, ' Changed')

    // Should have registered beforeunload listener
    expect(mockAddEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('should cleanup beforeunload listener on unmount', async () => {
    const { unmount } = render(<SettingsPage />)

    await waitFor(() => {
      expect(api.settingsAPI.getAll).toHaveBeenCalled()
    })

    unmount()

    expect(mockRemoveEventListener).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })
})
