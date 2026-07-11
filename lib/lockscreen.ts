export async function hasLockPassword(): Promise<boolean> {
  const res = await fetch('/api/user/lock-password')
  if (!res.ok) return false
  const data = await res.json()
  return data.hasPassword ?? false
}

export async function setLockPassword(pw: string): Promise<void> {
  await fetch('/api/user/lock-password', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
}

export async function removeLockPassword(): Promise<void> {
  await fetch('/api/user/lock-password', { method: 'DELETE' })
}

export function isLockedSync(): boolean {
  if (typeof window === 'undefined') return false
  return sessionStorage.getItem('braosa-unlocked') !== '1'
}

export async function isLocked(): Promise<boolean> {
  const has = await hasLockPassword()
  if (!has) return false
  return isLockedSync()
}

export function unlockSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('braosa-unlocked', '1')
  }
}

export function lockSession(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('braosa-unlocked')
  }
}

export async function verifyAndUnlock(pw: string): Promise<boolean> {
  const res = await fetch('/api/user/lock-password/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
  })
  const data = await res.json()
  if (data.valid) {
    unlockSession()
    return true
  }
  return false
}

// ─── Inactivity auto-lock ────────────────────────────────────────────────────
// Works on mobile (where background JS is throttled/suspended) and desktop by
// tracking a wall-clock timestamp and re-checking elapsed time on resume,
// rather than relying solely on a setTimeout firing while backgrounded.

const INACTIVITY_MS = 5 * 60 * 1000 // 5 minutes

let lastActivityAt = Date.now()
let inactivityTimer: ReturnType<typeof setTimeout> | null = null
let onInactivityLock: (() => void) | null = null

async function maybeLock() {
  if (onInactivityLock && (await hasLockPassword())) {
    onInactivityLock()
  }
}

function resetInactivityTimer() {
  lastActivityAt = Date.now()
  if (inactivityTimer) clearTimeout(inactivityTimer)
  inactivityTimer = setTimeout(maybeLock, INACTIVITY_MS)
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    // App resumed from background — check elapsed time
    const elapsed = Date.now() - lastActivityAt
    if (elapsed >= INACTIVITY_MS) {
      maybeLock()
    } else {
      // Reset timer for remaining time
      if (inactivityTimer) clearTimeout(inactivityTimer)
      const remaining = Math.max(0, INACTIVITY_MS - elapsed)
      inactivityTimer = setTimeout(maybeLock, remaining)
    }
  } else {
    // App going to background — clear the running timer (JS may be suspended)
    // lastActivityAt stays set so we can check elapsed time on resume
    if (inactivityTimer) {
      clearTimeout(inactivityTimer)
      inactivityTimer = null
    }
  }
}

export function startInactivityWatcher(onLock: () => void): void {
  if (typeof window === 'undefined') return
  onInactivityLock = onLock
  const events = ['touchstart', 'pointerdown', 'keydown', 'scroll'] as const
  events.forEach(e => window.addEventListener(e, resetInactivityTimer, { passive: true }))
  document.addEventListener('visibilitychange', handleVisibilityChange)
  resetInactivityTimer() // start the initial timer
}

export function stopInactivityWatcher(): void {
  if (typeof window === 'undefined') return
  onInactivityLock = null
  const events = ['touchstart', 'pointerdown', 'keydown', 'scroll'] as const
  events.forEach(e => window.removeEventListener(e, resetInactivityTimer))
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (inactivityTimer) {
    clearTimeout(inactivityTimer)
    inactivityTimer = null
  }
}
