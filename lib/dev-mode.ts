// Development mode utilities for testing without API calls

export const DEV_MODE_KEY = 'dev-mode-enabled'

export const isDevMode = (): boolean => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(DEV_MODE_KEY) === 'true'
}

export const setDevMode = (enabled: boolean): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(DEV_MODE_KEY, enabled.toString())
}

export const toggleDevMode = (): boolean => {
  const newState = !isDevMode()
  setDevMode(newState)
  return newState
}

// Mock data generators for testing
export const generateMockMarkdownContent = (fileName: string, fileType: string, streamType: string): string => {
  return `# Converted ${fileName}

This is a mock conversion result for **development testing**.

## File Information
- **Original file:** ${fileName}
- **File type:** ${fileType}
- **Stream:** ${streamType}
- **Generated:** ${new Date().toISOString()}

## Mock Content

### Test Scenarios

| Test Case ID | Description | Input | Expected Output | Priority |
|-------------|-------------|--------|-----------------|----------|
| TC001 | Valid input test | Sample input data | Success response | High |
| TC002 | Invalid input test | Invalid data | Error response | Medium |
| TC003 | Edge case test | Boundary values | Handled gracefully | Low |

### API Endpoints

\`\`\`json
{
  "endpoint": "/api/test",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "testData": "sample"
  }
}
\`\`\`

### Expected Results

This mock content simulates the actual conversion process but allows for testing without making API calls to the conversion service.

---
*Generated in development mode for testing purposes*`
}

export const simulateAsyncOperation = async (duration: number = 1000): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, duration))
}