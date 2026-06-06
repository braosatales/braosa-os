import Cookies from 'js-cookie'

const COOKIE_KEY = 'braosa_device_trust'
const TRUST_DAYS = 30

export function setDeviceTrusted(): void {
  Cookies.set(COOKIE_KEY, 'true', { expires: TRUST_DAYS, secure: true, sameSite: 'strict' })
}

export function isDeviceTrusted(): boolean {
  return Cookies.get(COOKIE_KEY) === 'true'
}

export function clearDeviceTrust(): void {
  Cookies.remove(COOKIE_KEY)
}
