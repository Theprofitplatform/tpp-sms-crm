/**
 * Unit Tests for useDebounce Hook
 * Tests debouncing values and callbacks
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useDebounce, useDebouncedCallback } from '../../../../dashboard/src/hooks/useDebounce.js'

describe('useDebounce Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500))

    expect(result.current).toBe('initial')
  })

  it('should not update value before delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 500 })

    // Value should still be initial (not enough time passed)
    expect(result.current).toBe('initial')
  })

  it('should update value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated', delay: 500 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe('updated')
  })

  it('should cancel previous timeout on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    // Change value multiple times
    rerender({ value: 'first', delay: 500 })
    act(() => { jest.advanceTimersByTime(200) })

    rerender({ value: 'second', delay: 500 })
    act(() => { jest.advanceTimersByTime(200) })

    rerender({ value: 'third', delay: 500 })
    act(() => { jest.advanceTimersByTime(200) })

    // Should still be initial (not enough time for any to complete)
    expect(result.current).toBe('initial')

    // After full delay, should be the latest value
    act(() => { jest.advanceTimersByTime(300) })
    expect(result.current).toBe('third')
  })

  it('should work with different data types', () => {
    // Test with number
    const { result: numResult, rerender: numRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 0, delay: 300 } }
    )

    numRerender({ value: 42, delay: 300 })
    act(() => { jest.advanceTimersByTime(300) })
    expect(numResult.current).toBe(42)

    // Test with object
    const { result: objResult, rerender: objRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: { count: 0 }, delay: 300 } }
    )

    objRerender({ value: { count: 10 }, delay: 300 })
    act(() => { jest.advanceTimersByTime(300) })
    expect(objResult.current).toEqual({ count: 10 })

    // Test with array
    const { result: arrResult, rerender: arrRerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: [], delay: 300 } }
    )

    arrRerender({ value: [1, 2, 3], delay: 300 })
    act(() => { jest.advanceTimersByTime(300) })
    expect(arrResult.current).toEqual([1, 2, 3])
  })

  it('should cleanup timeout on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'updated', delay: 500 })
    unmount()

    // Advance timers after unmount
    act(() => { jest.advanceTimersByTime(500) })

    // Should not have updated (was cleaned up)
    expect(result.current).toBe('initial')
  })

  it('should handle zero delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 0 } }
    )

    rerender({ value: 'updated', delay: 0 })

    act(() => { jest.advanceTimersByTime(0) })

    expect(result.current).toBe('updated')
  })

  it('should update immediately when delay changes', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 500 } }
    )

    rerender({ value: 'updated', delay: 1000 })

    // Fast forward to old delay (500ms) - should not update
    act(() => { jest.advanceTimersByTime(500) })
    expect(result.current).toBe('initial')

    // Fast forward to new delay (additional 500ms = 1000ms total)
    act(() => { jest.advanceTimersByTime(500) })
    expect(result.current).toBe('updated')
  })
})

describe('useDebouncedCallback Hook', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should return a function', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    expect(typeof result.current).toBe('function')
  })

  it('should not call callback before delay', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('arg1', 'arg2')
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should call callback after delay', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('arg1', 'arg2')
    })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(callback).toHaveBeenCalledWith('arg1', 'arg2')
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('should cancel previous call on rapid invocations', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 500))

    // Call multiple times rapidly
    act(() => {
      result.current('first')
    })
    act(() => { jest.advanceTimersByTime(200) })

    act(() => {
      result.current('second')
    })
    act(() => { jest.advanceTimersByTime(200) })

    act(() => {
      result.current('third')
    })

    // Callback should not have been called yet
    expect(callback).not.toHaveBeenCalled()

    // After full delay, should call with latest arguments
    act(() => { jest.advanceTimersByTime(500) })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith('third')
  })

  it('should work with no arguments', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current()
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledWith()
  })

  it('should work with multiple arguments', () => {
    const callback = jest.fn()
    const { result } = renderHook(() => useDebouncedCallback(callback, 300))

    act(() => {
      result.current('a', 'b', 'c', 1, 2, 3)
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(callback).toHaveBeenCalledWith('a', 'b', 'c', 1, 2, 3)
  })

  it('should cleanup timeout on unmount', () => {
    const callback = jest.fn()
    const { result, unmount } = renderHook(() => useDebouncedCallback(callback, 500))

    act(() => {
      result.current('test')
    })

    unmount()

    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should not have been called (cleaned up on unmount)
    expect(callback).not.toHaveBeenCalled()
  })

  it('should handle callback updates', () => {
    let callback = jest.fn()
    const { result, rerender } = renderHook(
      ({ cb, delay }) => useDebouncedCallback(cb, delay),
      { initialProps: { cb: callback, delay: 500 } }
    )

    act(() => {
      result.current('test')
    })

    // Update callback
    const newCallback = jest.fn()
    rerender({ cb: newCallback, delay: 500 })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    // New callback should be called, not old one
    expect(callback).not.toHaveBeenCalled()
    expect(newCallback).toHaveBeenCalledWith('test')
  })

  it('should use latest delay when delay changes', () => {
    const callback = jest.fn()
    const { result, rerender } = renderHook(
      ({ delay }) => useDebouncedCallback(callback, delay),
      { initialProps: { delay: 500 } }
    )

    act(() => {
      result.current('test')
    })

    // Change delay
    rerender({ delay: 1000 })

    // Advance to old delay
    act(() => { jest.advanceTimersByTime(500) })
    expect(callback).not.toHaveBeenCalled()

    // Advance to new delay
    act(() => { jest.advanceTimersByTime(500) })
    expect(callback).toHaveBeenCalledWith('test')
  })

  it('should handle async callbacks', async () => {
    const asyncCallback = jest.fn().mockResolvedValue('done')
    const { result } = renderHook(() => useDebouncedCallback(asyncCallback, 300))

    act(() => {
      result.current('test')
    })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(asyncCallback).toHaveBeenCalledWith('test')
  })
})

describe('Search Input Debounce Use Case', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should simulate real search input behavior', () => {
    const searchAPI = jest.fn()
    const { result: searchTerm, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: '' } }
    )

    const { result: debouncedSearch } = renderHook(() =>
      useDebouncedCallback(searchAPI, 300)
    )

    // User types "hello" character by character
    rerender({ value: 'h' })
    act(() => { jest.advanceTimersByTime(100) })

    rerender({ value: 'he' })
    act(() => { jest.advanceTimersByTime(100) })

    rerender({ value: 'hel' })
    act(() => { jest.advanceTimersByTime(100) })

    rerender({ value: 'hell' })
    act(() => { jest.advanceTimersByTime(100) })

    rerender({ value: 'hello' })

    // Before debounce completes
    expect(searchTerm.current).toBe('')

    // After debounce completes
    act(() => { jest.advanceTimersByTime(300) })
    expect(searchTerm.current).toBe('hello')

    // Trigger search
    act(() => {
      debouncedSearch.current(searchTerm.current)
    })

    act(() => { jest.advanceTimersByTime(300) })
    expect(searchAPI).toHaveBeenCalledWith('hello')
    expect(searchAPI).toHaveBeenCalledTimes(1)
  })
})
