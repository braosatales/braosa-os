'use client'
import { useState, useEffect } from 'react'

export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const handler = () => {
      setKeyboardHeight(window.innerHeight - window.visualViewport!.height)
    }
    window.visualViewport.addEventListener('resize', handler)
    return () => window.visualViewport!.removeEventListener('resize', handler)
  }, [])
  return keyboardHeight
}
