# API Configuration Documentation

This document explains how to use the centralized API configuration system for the Test Case Generator application.

## Overview

The API configuration system provides:
- Centralized base URLs and endpoints
- Environment-based configuration
- Retry logic and error handling
- Consistent fetch options
- Type-safe API wrappers

## Files

### `/lib/api-config.ts`
Central configuration file containing:
- `API_BASE_URLS`: Base URLs for different services
- `API_ENDPOINTS`: Endpoint paths
- `API_URLS`: Complete URLs (base + endpoint)
- `API_CONFIG`: Common configuration options
- Helper functions for environment-specific configs

### `/lib/api-utils.ts`
Utility functions for making API calls:
- `apiCall()`: Enhanced fetch with retry logic
- `safeApiCall()`: Type-safe wrapper
- `uploadFile()`: Helper for file uploads
- `logApiRequest()`: Development logging

## Usage Examples

### Basic API Call

```typescript
import { API_URLS, createFetchOptions } from "@/lib/api-config"

// Simple usage
const response = await fetch(API_URLS.HTML_TO_MD, createFetchOptions({
  method: "POST",
  body: JSON.stringify({ content: "..." })
}))
```

### Using API Utilities

```typescript
import { apiCall, safeApiCall } from "@/lib/api-utils"
import { API_URLS } from "@/lib/api-config"

// With automatic retry and error handling
const data = await apiCall(API_URLS.GENERATE_VALIDATION_TESTS, {
  method: "POST",
  body: JSON.stringify({ content: "..." })
})

// Type-safe wrapper
const result = await safeApiCall<ValidationResult>(API_URLS.GENERATE_VALIDATION_TESTS, {
  method: "POST",
  body: JSON.stringify({ content: "..." })
})

if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error)
}
```

### Environment Configuration

Set environment variables in `.env.local`:

```env
NEXT_PUBLIC_MAIN_API_URL=https://your-production-api.com
NEXT_PUBLIC_UML_API_URL=https://your-uml-service.com
NEXT_PUBLIC_FALLBACK_API_URL=https://your-fallback-api.com
```

### Available Endpoints

| Purpose | Constant | URL |
|---------|----------|-----|
| HTML to Markdown | `API_URLS.HTML_TO_MD` | `${MAIN_API}/webhook/html-to-md` |
| Validation Tests | `API_URLS.GENERATE_VALIDATION_TESTS` | `${MAIN_API}/webhook/generate-test-validate` |
| Business Tests | `API_URLS.GENERATE_BUSINESS_TESTS` | `${MAIN_API}/webhook/gen-test-case-bussiness` |
| UML Extraction | `API_URLS.UML_EXTRACTION` | `${UML_API}/webhook/bd5a247d-bdb5-47ca-a4b8-308bb9d8460c` |

### Fallback URLs

For HTML to Markdown conversion, use `getHtmlToMdEndpoints()` to get an array of fallback URLs:

```typescript
import { getHtmlToMdEndpoints } from "@/lib/api-config"

const endpoints = getHtmlToMdEndpoints()
// Try each endpoint in order until one succeeds
```

### Configuration Options

```typescript
API_CONFIG = {
  DEFAULT_TIMEOUT: 30000,     // 30 seconds
  DEFAULT_HEADERS: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  MAX_RETRIES: 2,             // Retry failed requests twice
  RETRY_DELAY: 1000,          // 1 second delay between retries
}
```

## Migration Guide

### Before (Hardcoded URLs)
```typescript
const response = await fetch("https://ccc6d7501344.ngrok-free.app/webhook/generate-test-validate", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data)
})
```

### After (Using Configuration)
```typescript
import { API_URLS, createFetchOptions } from "@/lib/api-config"

const response = await fetch(API_URLS.GENERATE_VALIDATION_TESTS, createFetchOptions({
  method: "POST",
  body: JSON.stringify(data)
}))
```

## Benefits

1. **Centralized Management**: All API URLs in one place
2. **Environment Support**: Easy switching between dev/staging/prod
3. **Consistency**: Same headers and options across all calls
4. **Error Handling**: Built-in timeout and retry logic
5. **Type Safety**: TypeScript support for API responses
6. **Debugging**: Automatic request logging in development
7. **Fallback Support**: Multiple endpoints for reliability

## Best Practices

1. Always use the centralized configuration instead of hardcoded URLs
2. Use `createFetchOptions()` for consistent headers and timeout
3. Consider using `apiCall()` or `safeApiCall()` for enhanced error handling
4. Set environment variables for production deployments
5. Log API requests in development for debugging
6. Handle different response types (JSON, CSV, text) appropriately

## Troubleshooting

### Common Issues

1. **Network Errors**: Check if the base URL is accessible
2. **Timeout Errors**: Consider increasing `DEFAULT_TIMEOUT`
3. **CORS Issues**: Ensure API servers have proper CORS headers
4. **Environment Variables**: Verify they're properly set with `NEXT_PUBLIC_` prefix

### Debug Mode

Enable debug logging:
```typescript
import { logApiRequest } from "@/lib/api-utils"

logApiRequest(API_URLS.HTML_TO_MD, options, "Converting HTML to Markdown")
```