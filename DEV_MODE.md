# Development Mode Guide

## Overview

The Test Case Generator now includes a **Development Mode** feature that allows you to test the application without making actual API calls to the backend services. This is perfect for:

- Testing the UI/UX without requiring a backend server
- Demonstrating the application flow 
- Development and debugging
- Offline testing

## How to Use Dev Mode

### 1. Toggle Dev Mode
- Look for the **Dev Mode Toggle** in the top-right corner of the application
- Click the button to switch between "Production" and "Dev Mode"
- When enabled, you'll see an orange "🚀 Dev Mode" button and "Mock APIs" badges

### 2. What Gets Mocked

#### File Conversion (Step 2)
- Instead of calling the real HTML-to-Markdown conversion API
- Generates realistic mock markdown content with test scenarios, API endpoints, and expected results
- Simulates API delays (800ms) for realistic UX testing

#### File Regeneration
- Mock regeneration with timestamped content
- Simulates longer API delays (1200ms) as regeneration typically takes more time

#### Test Case Generation (Step 3)
- **Validation Stream**: Generates mock CSV with technical test cases (TC001-TC005)
- **Business Stream**: Generates mock CSV with business scenario test cases (BTC001-BTC005)
- Simulates realistic API delays (1.5s for validation, 2s for business)

### 3. Visual Indicators

When dev mode is active, you'll see:
- Orange "🚀 Dev Mode" button in the header
- "🚀 Mock APIs" badges in relevant steps
- Console logs prefixed with "🚀 Dev Mode:" showing which operations are being mocked

## Data Persistence

**Important**: Dev mode only affects API calls. All other functionality remains the same:

- ✅ **Stream selection** is persisted 
- ✅ **File uploads** work normally
- ✅ **Local storage** functions normally
- ✅ **Navigation** between steps works
- ✅ **File management** (delete, modify) works
- ✅ **History panel** works
- ✅ **CSV downloads** work with mock data

## Benefits

1. **No Backend Required**: Test the full application flow without running backend services
2. **Consistent Testing**: Same mock data every time for predictable testing
3. **Fast Iteration**: No waiting for real API responses
4. **Offline Development**: Work without internet connectivity to backend services
5. **Demo Ready**: Perfect for demonstrations and presentations

## Switching Back to Production

Simply click the "Dev Mode" button again to switch back to "Production" mode. The application will:
- Resume making real API calls
- Maintain all your current data and state
- Continue working from where you left off

## Console Output

When dev mode is active, check the browser console for helpful debug messages:
```
🚀 Development mode enabled - API calls will be mocked
🚀 Dev Mode: Mocking conversion for filename.html
🚀 Dev Mode: Mocking validation test generation for filename.html
```

This helps you understand which operations are being mocked during testing.