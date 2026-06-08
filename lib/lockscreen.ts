const LOCK_PW_KEY = "braosa-lock-pw"
const UNLOCKED_KEY = "braosa-unlocked"

export function getLockPassword(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(LOCK_PW_KEY)
}

export function setLockPassword(pw: string): void {
  localStorage.setItem(LOCK_PW_KEY, pw)
}

export function isLocked(): boolean {
  if (typeof window === "undefined") return false
  if (getLockPassword() === null) return false
  return sessionStorage.getItem(UNLOCKED_KEY) !== "1"
}

export function unlock(pw: string): boolean {
  const stored = getLockPassword()
  if (stored === null) return false
  if (pw !== stored) return false
  sessionStorage.setItem(UNLOCKED_KEY, "1")
  return true
}

export function lock(): void {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(UNLOCKED_KEY)
}
