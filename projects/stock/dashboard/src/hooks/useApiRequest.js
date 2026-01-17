import { useState, useCallback, useRef, useEffect } from 'react'
import axios from 'axios'

/**
 * useApiRequest - Centralized API request handling with loading/error states
 *
 * @example
 * const { data, loading, error, execute, reset } = useApiRequest()
 *
 * useEffect(() => {
 *   execute(() => axios.get('/api/positions'))
 * }, [])
 */

export default function useApiRequest(options = {}) {
  const {
    onSuccess,
    onError,
    initialData = null,
  } = options

  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(async (requestFn) => {
    setLoading(true)
    setError(null)

    try {
      const response = await requestFn()
      const responseData = response.data

      if (mountedRef.current) {
        setData(responseData)
        onSuccess?.(responseData)
      }

      return { data: responseData, error: null }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred'

      if (mountedRef.current) {
        setError(errorMessage)
        onError?.(errorMessage, err)
      }

      return { data: null, error: errorMessage }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [onSuccess, onError])

  const reset = useCallback(() => {
    setData(initialData)
    setLoading(false)
    setError(null)
  }, [initialData])

  return {
    data,
    loading,
    error,
    execute,
    reset,
    setData,
  }
}

/**
 * useFetch - Simple fetch hook with automatic execution
 *
 * @example
 * const { data, loading, error, refetch } = useFetch('/api/positions')
 */
export function useFetch(url, options = {}) {
  const {
    immediate = true,
    transform,
    ...requestOptions
  } = options

  const { data, loading, error, execute, setData } = useApiRequest(options)

  const fetchData = useCallback(async () => {
    return execute(async () => {
      const response = await axios.get(url, requestOptions)
      if (transform) {
        response.data = transform(response.data)
      }
      return response
    })
  }, [url, execute, requestOptions, transform])

  useEffect(() => {
    if (immediate && url) {
      fetchData()
    }
  }, [immediate, url, fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    setData,
  }
}

/**
 * useMutation - For POST/PUT/DELETE operations
 *
 * @example
 * const { mutate, loading, error } = useMutation()
 * await mutate(() => axios.post('/api/orders', orderData))
 */
export function useMutation(options = {}) {
  const { data, loading, error, execute, reset } = useApiRequest(options)

  const mutate = useCallback(async (requestFn) => {
    return execute(requestFn)
  }, [execute])

  return {
    data,
    loading,
    error,
    mutate,
    reset,
  }
}

/**
 * useMultipleRequests - Execute multiple requests in parallel
 *
 * @example
 * const { data, loading, error, execute } = useMultipleRequests([
 *   () => axios.get('/api/positions'),
 *   () => axios.get('/api/orders'),
 * ])
 */
export function useMultipleRequests(requestFns, options = {}) {
  const { keys = [] } = options
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const execute = useCallback(async () => {
    setLoading(true)
    setErrors({})

    try {
      const results = await Promise.allSettled(requestFns.map(fn => fn()))

      if (mountedRef.current) {
        const newData = {}
        const newErrors = {}

        results.forEach((result, index) => {
          const key = keys[index] || index
          if (result.status === 'fulfilled') {
            newData[key] = result.value.data
          } else {
            newErrors[key] = result.reason?.response?.data?.error || result.reason?.message
          }
        })

        setData(newData)
        setErrors(newErrors)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [requestFns, keys])

  return {
    data,
    loading,
    errors,
    execute,
    hasErrors: Object.keys(errors).length > 0,
  }
}
