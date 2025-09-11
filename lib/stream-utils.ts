import { useState, useEffect } from "react"
import type { StreamType } from "@/app/page"

export const getStreamFromStorage = (): StreamType | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem('selectedStream')
    console.log('getStreamFromStorage - raw value:', stored)
    if (stored && stored !== 'null' && stored !== '""' && stored !== 'undefined') {
      const parsed = JSON.parse(stored) as StreamType
      console.log('getStreamFromStorage - parsed value:', parsed)
      return parsed
    }
  } catch (error) {
    console.error('Error loading selectedStream from localStorage:', error)
  }
  
  return null
}

export const useEffectiveStream = (selectedStream: StreamType | null): StreamType | null => {
  const [effectiveStream, setEffectiveStream] = useState<StreamType | null>(selectedStream)

  useEffect(() => {
    console.log('useEffectiveStream - prop selectedStream:', selectedStream)
    
    if (selectedStream) {
      setEffectiveStream(selectedStream)
    } else {
      // Try to get from localStorage
      const storedStream = getStreamFromStorage()
      console.log('useEffectiveStream - from storage:', storedStream)
      setEffectiveStream(storedStream)
    }
  }, [selectedStream])

  // Also listen for storage events (when localStorage is updated in other tabs/components)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedStream') {
        const newValue = e.newValue
        if (newValue && newValue !== 'null' && newValue !== '""') {
          try {
            const parsed = JSON.parse(newValue) as StreamType
            setEffectiveStream(parsed)
          } catch (error) {
            console.error('Error parsing selectedStream from storage event:', error)
          }
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  console.log('useEffectiveStream - returning:', effectiveStream)
  return effectiveStream
}