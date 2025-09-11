import { useState, useEffect } from "react"

// Custom hook for localStorage with SSR safety
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Try to get from localStorage immediately if we're in the browser
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key)
        return item ? JSON.parse(item) : initialValue
      } catch (error) {
        console.error(`Error reading localStorage key "${key}":`, error)
        return initialValue
      }
    }
    return initialValue
  })

  useEffect(() => {
    // Double-check localStorage on mount in case the initial value wasn't loaded properly
    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        const parsedItem = JSON.parse(item)
        setStoredValue(parsedItem)
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error)
    }
  }, [key])

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error)
    }
  }

  return [storedValue, setValue] as const
}

// Custom hook for API status checking
export function useAPIStatus(endpoint: string, interval: number = 30000) {
  const [status, setStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [lastChecked, setLastChecked] = useState<Date | null>(null)

  const checkStatus = async () => {
    setStatus('checking')
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'test', fileName: 'test.html' }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      setStatus(response.ok || response.status === 400 ? 'connected' : 'disconnected')
      setLastChecked(new Date())
    } catch (error) {
      setStatus('disconnected')
      setLastChecked(new Date())
    }
  }

  useEffect(() => {
    checkStatus()
    const intervalId = setInterval(checkStatus, interval)
    return () => clearInterval(intervalId)
  }, [endpoint, interval])

  return { status, lastChecked, checkStatus }
}

// Custom hook for debounced values
export function useDebounce<T>(value: T, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
