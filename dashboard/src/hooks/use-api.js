import { useState, useEffect } from 'react'

/**
 * Custom hook for API calls with loading and error states
 */
export function useApi(url, options = {}) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url, options)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err.message)
      console.error('API Error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (url) {
      fetchData()
    }
  }, [url])

  const refetch = () => {
    fetchData()
  }

  return { data, loading, error, refetch }
}

/**
 * Hook for making POST requests
 */
export function useApiMutation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const mutate = async (url, data, options = {}) => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: JSON.stringify(data),
        ...options,
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return result
    } catch (err) {
      setError(err.message)
      console.error('API Error:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { mutate, loading, error }
}

/**
 * Example usage:
 *
 * // GET request
 * const { data, loading, error, refetch } = useApi('/api/dashboard')
 *
 * // POST request
 * const { mutate, loading } = useApiMutation()
 * await mutate('/api/clients', { name: 'New Client' })
 */
