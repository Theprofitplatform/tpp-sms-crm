import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * usePolling - Smart polling with visibility API support
 * Pauses polling when tab is not visible to save resources
 *
 * @example
 * const { refresh, isPolling } = usePolling(fetchData, {
 *   interval: 30000,
 *   enabled: true,
 *   immediate: true,
 * })
 */

export default function usePolling(callback, options = {}) {
  const {
    interval = 30000,
    enabled = true,
    immediate = true,
    pauseOnHidden = true,
  } = options

  const [isPolling, setIsPolling] = useState(enabled)
  const [lastPolled, setLastPolled] = useState(null)
  const intervalRef = useRef(null)
  const callbackRef = useRef(callback)

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Execute the callback
  const execute = useCallback(async () => {
    try {
      await callbackRef.current()
      setLastPolled(new Date())
    } catch (error) {
      console.error('Polling error:', error)
    }
  }, [])

  // Start polling
  const start = useCallback(() => {
    if (intervalRef.current) return

    intervalRef.current = setInterval(execute, interval)
    setIsPolling(true)
  }, [execute, interval])

  // Stop polling
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setIsPolling(false)
  }, [])

  // Manual refresh
  const refresh = useCallback(() => {
    execute()
  }, [execute])

  // Handle visibility changes
  useEffect(() => {
    if (!pauseOnHidden) return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop()
      } else if (enabled) {
        // Refresh immediately when becoming visible
        execute()
        start()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, pauseOnHidden, start, stop, execute])

  // Main polling effect
  useEffect(() => {
    if (!enabled) {
      stop()
      return
    }

    // Execute immediately if requested
    if (immediate) {
      execute()
    }

    // Start polling
    start()

    return () => {
      stop()
    }
  }, [enabled, immediate, start, stop, execute])

  return {
    isPolling,
    lastPolled,
    refresh,
    start,
    stop,
  }
}

/**
 * useInterval - Simple interval hook
 * For cases where full polling features aren't needed
 */
export function useInterval(callback, delay) {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return

    const tick = () => savedCallback.current()
    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay])
}
