import { useState, useEffect } from 'react'

/**
 * Persist state to localStorage
 *
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value
 * @returns {[any, Function]} [value, setValue]
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'dark')
 *
 * // Changes are automatically persisted to localStorage
 * setTheme('light')
 */
export const useLocalStorage = (key, initialValue) => {
  // Get initial value from localStorage or use provided initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Update localStorage when value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }, [key, storedValue])

  return [storedValue, setStoredValue]
}
