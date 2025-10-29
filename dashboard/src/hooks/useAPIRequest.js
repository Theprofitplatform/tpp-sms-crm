import { useState, useCallback, useEffect } from 'react'
import { useToast } from '@/hooks/use-toast'
import { handleAPIError, retryWithBackoff } from '@/utils/errorHandler'

/**
 * Custom hook for API requests with built-in loading, error handling, and retry logic
 *
 * @returns {Object} { loading, error, execute, clearError }
 *
 * @example
 * const { loading, error, execute } = useAPIRequest()
 *
 * const handleSubmit = async () => {
 *   await execute(
 *     () => api.submitData(data),
 *     {
 *       showSuccessToast: true,
 *       successMessage: 'Data submitted successfully',
 *       retries: 3
 *     }
 *   )
 * }
 */
export const useAPIRequest = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const { toast } = useToast()

  const execute = useCallback(async (
    apiFunction,
    {
      onSuccess,
      onError,
      showSuccessToast = false,
      successMessage = 'Operation successful',
      showErrorToast = true,
      retries = 0,
      errorMessage = null
    } = {}
  ) => {
    setLoading(true)
    setError(null)

    try {
      // Execute with retry if specified
      const fn = retries > 0
        ? () => retryWithBackoff(apiFunction, retries)
        : apiFunction

      const result = await fn()

      // Show success toast if requested
      if (showSuccessToast) {
        toast({
          title: 'Success',
          description: successMessage
        })
      }

      // Call success callback
      onSuccess?.(result)

      return { success: true, data: result }

    } catch (err) {
      // Convert to AppError
      const appError = handleAPIError(err)
      setError(appError)

      // Show error toast if requested
      if (showErrorToast) {
        toast({
          title: 'Error',
          description: errorMessage || appError.message,
          variant: 'destructive'
        })
      }

      // Call error callback
      onError?.(appError)

      return { success: false, error: appError }

    } finally {
      setLoading(false)
    }
  }, [toast])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { loading, error, execute, clearError }
}

/**
 * Hook for API requests with data state management
 * Automatically fetches data on mount (unless autoFetch is false)
 *
 * @param {Function} apiFunction - Async function that returns data
 * @param {Object} options - Configuration options
 * @returns {Object} { data, loading, error, refetch, setData }
 *
 * @example
 * const { data, loading, error, refetch } = useAPIData(
 *   () => clientAPI.getAll(),
 *   { autoFetch: true }
 * )
 */
export const useAPIData = (apiFunction, options = {}) => {
  const [data, setData] = useState(options.initialData || null)
  const { loading, error, execute } = useAPIRequest()

  const fetch = useCallback(async () => {
    const result = await execute(apiFunction, {
      showErrorToast: options.showErrorToast !== false,
      onSuccess: (data) => {
        setData(data)
        options.onSuccess?.(data)
      }
    })
    return result
  }, [apiFunction, execute, options])

  // Auto-fetch on mount if requested
  useEffect(() => {
    if (options.autoFetch !== false) {
      fetch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Empty deps intentional - only fetch once on mount

  return { data, loading, error, refetch: fetch, setData }
}
