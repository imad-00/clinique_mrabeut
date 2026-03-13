const ADMIN_TOKEN_KEY = "clinic_admin_token"
const ADMIN_USER_KEY = "clinic_admin_user"

export type AdminRole = "SUPER_ADMIN" | "SERVICE_ADMIN"

export type AdminSessionUser = {
  id: string
  email: string
  role: AdminRole
  serviceId?: string | null
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem(ADMIN_TOKEN_KEY)
}

export function setAdminToken(token: string): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function clearAdminToken(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ADMIN_TOKEN_KEY)
}

export function getAdminUser(): AdminSessionUser | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(ADMIN_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminSessionUser
  } catch {
    return null
  }
}

export function setAdminUser(user: AdminSessionUser): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user))
}

export function clearAdminUser(): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(ADMIN_USER_KEY)
}

export function clearAdminAuth(): void {
  clearAdminToken()
  clearAdminUser()
}

export { ADMIN_TOKEN_KEY }
