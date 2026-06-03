'use client'

import { useState, useEffect, useRef } from 'react'

interface LockScreenProps {
  onUnlock: () => void
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const [password, setPassword] = useState('')
  const [shaking, setShaking] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    inputRef.current?.focus()
  }, [])

  function attempt() {
    if (password === 'admin') {
      onUnlock()
    } else {
      setShaking(true)
      setPassword('')
      setTimeout(() => setShaking(false), 300)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') attempt()
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-xl bg-black/60">
      <div
        className={`max-w-xs w-full bg-[#111117] border border-[#1E1E2A] rounded-2xl p-8 shadow-2xl${
          shaking ? ' animate-shake' : ''
        }`}
      >
        <p className="font-semibold text-xl text-[#F0F0F5] text-center mb-6">Braosa OS</p>
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="············"
          className="bg-transparent border-b border-[#1E1E2A] text-[#F0F0F5] text-center focus:outline-none focus:border-[#A0A0B5] w-full py-2"
        />
        {isTouchDevice && (
          <button
            onClick={attempt}
            className="bg-[#7B5EA7] text-white rounded-lg px-6 py-2 mt-4 w-full"
          >
            Unlock
          </button>
        )}
      </div>
    </div>
  )
}
