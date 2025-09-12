/**
 * API Configuration for Test Case Generator
 * Centralized configuration for all API endpoints and base URLs
 */

// Base URLs for different services
export const API_BASE_URLS = {
  // Main conversion and test generation service
  MAIN_API: "https://testcase-gen.app.n8n.cloud",
  
  // UML image processing service
  UML_API: "https://img2uml.app.n8n.cloud",
  
  // Fallback URLs for redundancy
  FALLBACK_API: "https://testcase-gen.app.n8n.cloud",
} as const

// API Endpoints
export const API_ENDPOINTS = {
  // HTML to Markdown conversion
  HTML_TO_MD: "/webhook/html-to-md",
  
  // Test case generation
  GENERATE_VALIDATION_TESTS: "/webhook/generate-test-validate",
  GENERATE_BUSINESS_TESTS: "/webhook/gen-test-case-business",
  
  // UML processing
  UML_EXTRACTION: "/webhook/bd5a247d-bdb5-47ca-a4b8-308bb9d8460c",
  
  // Fallback endpoints
  HTML_TO_MD_FALLBACK: "/webhook-test/html-to-md",
} as const

// Complete API URLs
export const API_URLS = {
  // Main conversion service
  HTML_TO_MD: `${API_BASE_URLS.MAIN_API}${API_ENDPOINTS.HTML_TO_MD}`,
  
  // Test generation services
  GENERATE_VALIDATION_TESTS: `${API_BASE_URLS.MAIN_API}${API_ENDPOINTS.GENERATE_VALIDATION_TESTS}`,
  GENERATE_BUSINESS_TESTS: `${API_BASE_URLS.MAIN_API}${API_ENDPOINTS.GENERATE_BUSINESS_TESTS}`,
  
  // UML processing
  UML_EXTRACTION: `${API_BASE_URLS.UML_API}${API_ENDPOINTS.UML_EXTRACTION}`,
  
  // Fallback URLs
  HTML_TO_MD_FALLBACK: `${API_BASE_URLS.FALLBACK_API}${API_ENDPOINTS.HTML_TO_MD_FALLBACK}`,
} as const

// API Configuration options
export const API_CONFIG = {
  // Default timeout for API calls (60 seconds for HTML conversion)
  DEFAULT_TIMEOUT: 60000,
  
  // Specific timeouts for different operations
  HTML_CONVERSION_TIMEOUT: 200000, // 200 seconds for HTML conversion
  TEST_GENERATION_TIMEOUT: 1200000, // 20 minutes for test generation
  UML_PROCESSING_TIMEOUT: 600000, // 10 minutes for UML processing
  
  // Default headers for API calls
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  
  // Retry configuration
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second
} as const

/**
 * Get all available endpoints for HTML to Markdown conversion
 * Used for fallback logic
 */
export const getHtmlToMdEndpoints = (): string[] => {
  return [
    API_URLS.HTML_TO_MD,
    API_URLS.HTML_TO_MD_FALLBACK,
  ]
}

/**
 * Create fetch options with default configuration
 */
export const createFetchOptions = (
  options: RequestInit = {},
  timeout: number = API_CONFIG.DEFAULT_TIMEOUT
): RequestInit & { signal: AbortSignal } => {
  const controller = new AbortController()
  
  // Set timeout with proper cleanup
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)
  
  // Create a new signal that combines the timeout and any existing signal
  const combinedSignal = controller.signal
  
  // Listen for abort on the original signal if provided
  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId)
      controller.abort()
    })
  }
  
  // Clean up timeout when request completes or aborts
  combinedSignal.addEventListener('abort', () => {
    clearTimeout(timeoutId)
  })

  return {
    ...options,
    headers: {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...options.headers,
    },
    signal: combinedSignal,
  }
}

/**
 * Create fetch options specifically for HTML to Markdown conversion
 */
export const createHtmlConversionOptions = (options: RequestInit = {}): RequestInit & { signal: AbortSignal } => {
  return createFetchOptions(options, API_CONFIG.HTML_CONVERSION_TIMEOUT)
}

/**
 * Create fetch options specifically for test generation
 */
export const createTestGenerationOptions = (options: RequestInit = {}): RequestInit & { signal: AbortSignal } => {
  return createFetchOptions(options, API_CONFIG.TEST_GENERATION_TIMEOUT)
}

/**
 * Create fetch options specifically for UML processing
 */
export const createUmlProcessingOptions = (options: RequestInit = {}): RequestInit & { signal: AbortSignal } => {
  return createFetchOptions(options, API_CONFIG.UML_PROCESSING_TIMEOUT)
}

/**
 * Environment-based configuration
 * Allows different URLs for development, staging, and production
 */
export const getEnvironmentConfig = () => {
  const env = process.env.NODE_ENV || 'development'
  
  switch (env) {
    case 'production':
      return {
        MAIN_API: "https://0b54763f73a1.ngrok-free.app",
        UML_API: "https://img2uml.app.n8n.cloud",
        FALLBACK_API: "https://testcase-gen.app.n8n.cloud:5678",
      }
    case 'development':
    default:
      return API_BASE_URLS
  }
}