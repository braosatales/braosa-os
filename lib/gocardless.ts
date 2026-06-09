export const GC_BASE = "https://bankaccountdata.gocardless.com/api/v2"

export type GCToken = {
  access: string
  access_expires: number
  refresh: string
  refresh_expires: number
}

export type GCInstitution = {
  id: string
  name: string
  bic: string
  logo: string
  countries: string[]
}

export type GCRequisition = {
  id: string
  status: string
  link: string
  accounts: string[]
  reference: string
}

export type GCAccount = {
  id: string
  iban: string
  name: string
  currency: string
}

export type GCBalance = {
  balanceAmount: { amount: string; currency: string }
  balanceType: string
}

export type GCTransaction = {
  transactionId: string
  bookingDate: string
  valueDate: string
  transactionAmount: { amount: string; currency: string }
  creditorName?: string
  debtorName?: string
  remittanceInformationUnstructured?: string
}

// Module-level token cache (server-side only)
let _cachedToken: { access: string; expiresAt: number } | null = null

export async function getGCAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)

  if (_cachedToken && _cachedToken.expiresAt - now > 60) {
    return _cachedToken.access
  }

  const res = await fetch(`${GC_BASE}/token/new/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      secret_id: process.env.GC_SECRET_ID,
      secret_key: process.env.GC_SECRET_KEY,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GoCardless auth failed: ${res.status} ${text}`)
  }

  const token: GCToken = await res.json()
  _cachedToken = {
    access: token.access,
    expiresAt: now + token.access_expires,
  }

  return _cachedToken.access
}

export async function gcFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getGCAccessToken()

  const doRequest = async (accessToken: string) =>
    fetch(`${GC_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        ...(options.headers ?? {}),
      },
    })

  let res = await doRequest(token)

  if (res.status === 401) {
    // Force refresh
    _cachedToken = null
    const fresh = await getGCAccessToken()
    res = await doRequest(fresh)
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GoCardless ${path} → ${res.status}: ${text}`)
  }

  return res.json()
}
