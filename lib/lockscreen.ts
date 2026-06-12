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
