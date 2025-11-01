/**
 * Unit Tests for useAPIRequest Hook
 * Tests API request handling, loading states, error handling, and retry logic
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAPIRequest, useAPIData } from '../../../../dashboard/src/hooks/useAPIRequest.js'
import * as errorHandler from '../../../../dashboard/src/utils/errorHandler.js'

// Mock toast - already mocked via jest.config.js moduleNameMapper
const mockToast = jest.fn()

describe('useAPIRequest Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAPIRequest())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.execute).toBe('function')
    expect(typeof result.current.clearError).toBe('function')
  })

  it('should set loading to true during execution', async () => {
    const mockAPI = jest.fn().mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve('data'), 100))
    )

    const { result } = renderHook(() => useAPIRequest())

    act(() => {
      result.current.execute(mockAPI)
    })

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('should return success result on successful API call', async () => {
    const mockAPI = jest.fn().mockResolvedValue({ id: 1, name: 'Test' })

    const { result } = renderHook(() => useAPIRequest())

    let response
    await act(async () => {
      response = await result.current.execute(mockAPI)
    })

    expect(response.success).toBe(true)
    expect(response.data).toEqual({ id: 1, name: 'Test' })
    expect(result.current.error).toBeNull()
  })

  it('should handle errors and set error state', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() => useAPIRequest())

    let response
    await act(async () => {
      response = await result.current.execute(mockAPI)
    })

    expect(response.success).toBe(false)
    expect(response.error).toBeInstanceOf(errorHandler.AppError)
    expect(result.current.error).toBeInstanceOf(errorHandler.AppError)
  })

  it('should show success toast when requested', async () => {
    const mockAPI = jest.fn().mockResolvedValue('success')

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, {
        showSuccessToast: true,
        successMessage: 'Operation completed'
      })
    })

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Success',
      description: 'Operation completed'
    })
  })

  it('should show error toast by default', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI)
    })

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        variant: 'destructive'
      })
    )
  })

  it('should not show error toast when showErrorToast is false', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, { showErrorToast: false })
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('should call onSuccess callback on success', async () => {
    const mockAPI = jest.fn().mockResolvedValue('result')
    const onSuccess = jest.fn()

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, { onSuccess })
    })

    expect(onSuccess).toHaveBeenCalledWith('result')
  })

  it('should call onError callback on error', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)
    const onError = jest.fn()

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, { onError })
    })

    expect(onError).toHaveBeenCalledWith(
      expect.any(errorHandler.AppError)
    )
  })

  it('should retry on failure when retries specified', async () => {
    const mockAPI = jest.fn()
      .mockRejectedValueOnce(new errorHandler.AppError('Error', 'network'))
      .mockRejectedValueOnce(new errorHandler.AppError('Error', 'network'))
      .mockResolvedValueOnce('success')

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, { retries: 3 })
    })

    expect(mockAPI).toHaveBeenCalledTimes(3)
  })

  it('should use custom error message when provided', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, {
        errorMessage: 'Custom error message'
      })
    })

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'Custom error message'
      })
    )
  })

  it('should clear error when clearError is called', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, { showErrorToast: false })
    })

    expect(result.current.error).not.toBeNull()

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
  })

  it('should reset loading to false after error', async () => {
    const mockError = new Error('API error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    const { result } = renderHook(() => useAPIRequest())

    await act(async () => {
      await result.current.execute(mockAPI, { showErrorToast: false })
    })

    expect(result.current.loading).toBe(false)
  })
})

describe('useAPIData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default values', () => {
    const mockAPI = jest.fn().mockResolvedValue([])

    const { result } = renderHook(() => useAPIData(mockAPI, { autoFetch: false }))

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(typeof result.current.refetch).toBe('function')
    expect(typeof result.current.setData).toBe('function')
  })

  it('should use initialData when provided', () => {
    const mockAPI = jest.fn().mockResolvedValue([])
    const initialData = [{ id: 1 }]

    const { result } = renderHook(() =>
      useAPIData(mockAPI, { autoFetch: false, initialData })
    )

    expect(result.current.data).toEqual(initialData)
  })

  it('should auto-fetch on mount by default', async () => {
    const mockData = [{ id: 1 }, { id: 2 }]
    const mockAPI = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() => useAPIData(mockAPI))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData)
    })

    expect(mockAPI).toHaveBeenCalledTimes(1)
  })

  it('should NOT auto-fetch when autoFetch is false', async () => {
    const mockAPI = jest.fn().mockResolvedValue([])

    renderHook(() => useAPIData(mockAPI, { autoFetch: false }))

    await new Promise(resolve => setTimeout(resolve, 100))

    expect(mockAPI).not.toHaveBeenCalled()
  })

  it('should fetch data when refetch is called', async () => {
    const mockData = [{ id: 1 }]
    const mockAPI = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() => useAPIData(mockAPI, { autoFetch: false }))

    await act(async () => {
      await result.current.refetch()
    })

    expect(result.current.data).toEqual(mockData)
    expect(mockAPI).toHaveBeenCalledTimes(1)
  })

  it('should update data state on successful fetch', async () => {
    const mockData = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const mockAPI = jest.fn().mockResolvedValue(mockData)

    const { result } = renderHook(() => useAPIData(mockAPI))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockData)
    })
  })

  it('should call onSuccess callback when provided', async () => {
    const mockData = [{ id: 1 }]
    const mockAPI = jest.fn().mockResolvedValue(mockData)
    const onSuccess = jest.fn()

    renderHook(() => useAPIData(mockAPI, { onSuccess }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData)
    })
  })

  it('should allow manual data updates with setData', () => {
    const mockAPI = jest.fn().mockResolvedValue([])

    const { result } = renderHook(() => useAPIData(mockAPI, { autoFetch: false }))

    const newData = [{ id: 1 }, { id: 2 }]

    act(() => {
      result.current.setData(newData)
    })

    expect(result.current.data).toEqual(newData)
  })

  it('should show error toast by default on fetch error', async () => {
    const mockError = new Error('Fetch error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    renderHook(() => useAPIData(mockAPI))

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error',
          variant: 'destructive'
        })
      )
    })
  })

  it('should not show error toast when showErrorToast is false', async () => {
    const mockError = new Error('Fetch error')
    const mockAPI = jest.fn().mockRejectedValue(mockError)

    renderHook(() => useAPIData(mockAPI, { showErrorToast: false }))

    await waitFor(() => {
      expect(result.current.error).not.toBeNull()
    })

    expect(mockToast).not.toHaveBeenCalled()
  })

  it('should handle multiple refetch calls', async () => {
    let callCount = 0
    const mockAPI = jest.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve([{ id: callCount }])
    })

    const { result } = renderHook(() => useAPIData(mockAPI, { autoFetch: false }))

    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.data).toEqual([{ id: 1 }])

    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.data).toEqual([{ id: 2 }])

    expect(mockAPI).toHaveBeenCalledTimes(2)
  })
})
