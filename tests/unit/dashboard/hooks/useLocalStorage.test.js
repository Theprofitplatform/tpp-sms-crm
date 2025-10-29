/**
 * Unit Tests for useLocalStorage Hook
 * Tests localStorage persistence with automatic serialization
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../../../../dashboard/src/hooks/useLocalStorage.js'

// Mock localStorage
const localStorageMock = (() => {
  let store = {}

  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString()
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    window.localStorage.clear()
    jest.clearAllMocks()
  })

  it('should initialize with default value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))

    expect(result.current[0]).toBe('defaultValue')
  })

  it('should initialize with value from localStorage if exists', () => {
    window.localStorage.setItem('testKey', JSON.stringify('storedValue'))

    const { result } = renderHook(() => useLocalStorage('testKey', 'defaultValue'))

    expect(result.current[0]).toBe('storedValue')
  })

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'))

    act(() => {
      const setValue = result.current[1]
      setValue('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(JSON.parse(window.localStorage.getItem('testKey'))).toBe('updated')
  })

  it('should work with string values', () => {
    const { result } = renderHook(() => useLocalStorage('stringKey', 'hello'))

    act(() => {
      result.current[1]('world')
    })

    expect(result.current[0]).toBe('world')
    expect(JSON.parse(window.localStorage.getItem('stringKey'))).toBe('world')
  })

  it('should work with number values', () => {
    const { result } = renderHook(() => useLocalStorage('numberKey', 0))

    act(() => {
      result.current[1](42)
    })

    expect(result.current[0]).toBe(42)
    expect(JSON.parse(window.localStorage.getItem('numberKey'))).toBe(42)
  })

  it('should work with boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('boolKey', false))

    act(() => {
      result.current[1](true)
    })

    expect(result.current[0]).toBe(true)
    expect(JSON.parse(window.localStorage.getItem('boolKey'))).toBe(true)
  })

  it('should work with object values', () => {
    const initialObj = { name: 'John', age: 30 }
    const { result } = renderHook(() => useLocalStorage('objKey', initialObj))

    const updatedObj = { name: 'Jane', age: 25 }
    act(() => {
      result.current[1](updatedObj)
    })

    expect(result.current[0]).toEqual(updatedObj)
    expect(JSON.parse(window.localStorage.getItem('objKey'))).toEqual(updatedObj)
  })

  it('should work with array values', () => {
    const { result } = renderHook(() => useLocalStorage('arrKey', []))

    act(() => {
      result.current[1]([1, 2, 3])
    })

    expect(result.current[0]).toEqual([1, 2, 3])
    expect(JSON.parse(window.localStorage.getItem('arrKey'))).toEqual([1, 2, 3])
  })

  it('should support functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('counterKey', 0))

    act(() => {
      result.current[1](prev => prev + 1)
    })

    expect(result.current[0]).toBe(1)

    act(() => {
      result.current[1](prev => prev + 1)
    })

    expect(result.current[0]).toBe(2)
  })

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage('nullKey', 'initial'))

    act(() => {
      result.current[1](null)
    })

    expect(result.current[0]).toBeNull()
    expect(JSON.parse(window.localStorage.getItem('nullKey'))).toBeNull()
  })

  it('should handle undefined by using default value', () => {
    const { result } = renderHook(() => useLocalStorage('undefinedKey', 'default'))

    act(() => {
      result.current[1](undefined)
    })

    // undefined should be treated as setting to default
    expect(result.current[0]).toBe('default')
  })

  it('should persist across re-renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage('persistKey', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    rerender()

    expect(result.current[0]).toBe('updated')
  })

  it('should persist across hook instances with same key', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('sharedKey', 'initial'))

    act(() => {
      result1.current[1]('shared')
    })

    const { result: result2 } = renderHook(() => useLocalStorage('sharedKey', 'initial'))

    expect(result2.current[0]).toBe('shared')
  })

  it('should handle localStorage errors gracefully', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Mock setItem to throw error (quota exceeded)
    const originalSetItem = window.localStorage.setItem
    window.localStorage.setItem = jest.fn(() => {
      throw new Error('QuotaExceededError')
    })

    const { result } = renderHook(() => useLocalStorage('errorKey', 'initial'))

    act(() => {
      result.current[1]('new value')
    })

    // Should still update state even if localStorage fails
    expect(result.current[0]).toBe('new value')

    window.localStorage.setItem = originalSetItem
    consoleErrorSpy.mockRestore()
  })

  it('should handle corrupted localStorage data', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    // Set invalid JSON in localStorage
    window.localStorage.setItem('corruptKey', '{invalid json}')

    const { result } = renderHook(() => useLocalStorage('corruptKey', 'default'))

    // Should fall back to default value
    expect(result.current[0]).toBe('default')

    consoleErrorSpy.mockRestore()
  })

  it('should handle complex nested objects', () => {
    const complexObj = {
      user: {
        name: 'John',
        preferences: {
          theme: 'dark',
          notifications: {
            email: true,
            sms: false
          }
        },
        tags: ['admin', 'user']
      }
    }

    const { result } = renderHook(() => useLocalStorage('complexKey', null))

    act(() => {
      result.current[1](complexObj)
    })

    expect(result.current[0]).toEqual(complexObj)
    expect(JSON.parse(window.localStorage.getItem('complexKey'))).toEqual(complexObj)
  })

  it('should work with Date objects (as ISO strings)', () => {
    const date = new Date('2025-01-01')
    const { result } = renderHook(() => useLocalStorage('dateKey', null))

    act(() => {
      result.current[1](date)
    })

    // Date will be serialized to ISO string
    const stored = JSON.parse(window.localStorage.getItem('dateKey'))
    expect(stored).toBe(date.toISOString())
  })

  it('should handle updates from other tabs/windows (storage event)', () => {
    const { result } = renderHook(() => useLocalStorage('syncKey', 'initial'))

    // Simulate storage event from another tab
    const newValue = 'updated from another tab'
    window.localStorage.setItem('syncKey', JSON.stringify(newValue))

    const storageEvent = new StorageEvent('storage', {
      key: 'syncKey',
      newValue: JSON.stringify(newValue),
      oldValue: JSON.stringify('initial'),
      storageArea: window.localStorage
    })

    act(() => {
      window.dispatchEvent(storageEvent)
    })

    expect(result.current[0]).toBe(newValue)
  })

  it('should ignore storage events for other keys', () => {
    const { result } = renderHook(() => useLocalStorage('myKey', 'myValue'))

    // Storage event for different key
    const storageEvent = new StorageEvent('storage', {
      key: 'otherKey',
      newValue: JSON.stringify('otherValue'),
      storageArea: window.localStorage
    })

    act(() => {
      window.dispatchEvent(storageEvent)
    })

    // Value should remain unchanged
    expect(result.current[0]).toBe('myValue')
  })

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useLocalStorage('cleanupKey', 'value'))

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('storage', expect.any(Function))

    removeEventListenerSpy.mockRestore()
  })
})

describe('useLocalStorage Real-World Use Cases', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('should handle theme persistence', () => {
    const { result } = renderHook(() => useLocalStorage('theme', 'light'))

    expect(result.current[0]).toBe('light')

    act(() => {
      result.current[1]('dark')
    })

    expect(result.current[0]).toBe('dark')

    // New hook instance should remember theme
    const { result: result2 } = renderHook(() => useLocalStorage('theme', 'light'))
    expect(result2.current[0]).toBe('dark')
  })

  it('should handle user preferences', () => {
    const defaultPrefs = {
      language: 'en',
      notifications: true,
      autoSave: false
    }

    const { result } = renderHook(() => useLocalStorage('userPreferences', defaultPrefs))

    act(() => {
      result.current[1]({
        ...result.current[0],
        language: 'es',
        autoSave: true
      })
    })

    expect(result.current[0]).toEqual({
      language: 'es',
      notifications: true,
      autoSave: true
    })
  })

  it('should handle form draft persistence', () => {
    const { result } = renderHook(() => useLocalStorage('formDraft', {}))

    // User types in form
    act(() => {
      result.current[1]({ title: 'My Draft', content: 'Lorem ipsum' })
    })

    // Simulate page reload
    const { result: afterReload } = renderHook(() => useLocalStorage('formDraft', {}))

    expect(afterReload.current[0]).toEqual({
      title: 'My Draft',
      content: 'Lorem ipsum'
    })
  })

  it('should handle recent searches', () => {
    const { result } = renderHook(() => useLocalStorage('recentSearches', []))

    // Add searches
    act(() => {
      result.current[1](prev => [...prev, 'search 1'])
    })

    act(() => {
      result.current[1](prev => [...prev, 'search 2'])
    })

    act(() => {
      result.current[1](prev => [...prev, 'search 3'])
    })

    expect(result.current[0]).toEqual(['search 1', 'search 2', 'search 3'])

    // Limit to last 5 searches
    act(() => {
      result.current[1](prev => prev.slice(-5))
    })

    expect(result.current[0].length).toBeLessThanOrEqual(5)
  })
})
