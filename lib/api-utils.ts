/**
 * API Utilities for Test Case Generator
 * Helper functions for making API calls with proper error handling and retries
 */

import { API_CONFIG, createFetchOptions } from "./api-config"

/**
 * Enhanced fetch wrapper with retry logic and better error handling
 */
export async function apiCall<T = any>(
  url: string,
  options: RequestInit = {},
  retries: number = API_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetchOptions = createFetchOptions(options)
      const response = await fetch(url, fetchOptions)

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      // Try to parse as JSON, fallback to text
      const contentType = response.headers.get("content-type")
      if (contentType && contentType.includes("application/json")) {
        return await response.json()
      } else {
        return await response.text() as unknown as T
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // Handle specific error types
      if (lastError.name === 'AbortError') {
        // Check if it's a timeout vs user cancellation
        if (lastError.message.includes('timeout') || lastError.message === '') {
          throw new Error(`Request timeout - the operation took too long to complete. Please try again with a smaller file or check your network connection.`)
        }
        throw lastError
      }

      // Don't retry on final attempt
      if (attempt === retries) {
        break
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, API_CONFIG.RETRY_DELAY * (attempt + 1)))
      console.warn(`API call failed, retrying (${attempt + 1}/${retries})...`, lastError.message)
    }
  }

  throw lastError || new Error('Unknown API error')
}

/**
 * Helper function for multipart form data uploads
 */
export async function uploadFile(
  url: string,
  file: File | Blob,
  filename: string,
  additionalFields?: Record<string, string>
): Promise<any> {
  const formData = new FormData()
  formData.append('file', file, filename)
  
  if (additionalFields) {
    Object.entries(additionalFields).forEach(([key, value]) => {
      formData.append(key, value)
    })
  }

  return apiCall(url, {
    method: 'POST',
    body: formData,
  })
}

/**
 * Type-safe API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status?: number
}

/**
 * Wrapper for API calls that return structured responses
 */
export async function safeApiCall<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const data = await apiCall<T>(url, options)
    return {
      success: true,
      data,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Helper for logging API requests in development
 */
export function logApiRequest(url: string, options: RequestInit, description?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.group(`🌐 API Call${description ? `: ${description}` : ''}`)
    console.log('URL:', url)
    console.log('Method:', options.method || 'GET')
    if (options.body) {
      console.log('Body:', options.body instanceof FormData ? 'FormData' : options.body)
    }
    console.groupEnd()
  }
}