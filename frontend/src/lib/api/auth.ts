import {
  clearAdminAuth,
  getAdminToken,
  setAdminToken,
  setAdminUser,
  clearAdminUser,
} from "@/src/lib/auth-storage"
import { resolveApiUrl } from "@/src/lib/apiBase"
import type { AdminRole, AdminSessionUser } from "@/src/lib/auth-storage"

type SessionUser = AdminSessionUser & { role: AdminRole }

type LoginResponse = {
  token: string
  user: SessionUser
}

type SessionResponse = {
  user: SessionUser
}

type AuthErrorPayload = {
  error?: string
  code?: string
}

type LoginResult = {
  ok: boolean
  error?: string
  code?: string
}

type PasswordResult = {
  ok: boolean
  error?: string
  code?: string
}

async function parseError(response: Response): Promise<AuthErrorPayload> {
  const payload = (await response.json().catch(() => null)) as AuthErrorPayload | null
  return payload || {}
}

export async function signInAdmin(email: string, password: string): Promise<LoginResult> {
  try {
    const response = await fetch(resolveApiUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "omit",
    })

    if (!response.ok) {
      const payload = await parseError(response)
      clearAdminAuth()
      return {
        ok: false,
        error: payload.error || "Email ou mot de passe invalide.",
        code: payload.code,
      }
    }

    const data = (await response.json()) as LoginResponse
    if (!data.token) return { ok: false, error: "Email ou mot de passe invalide." }
    setAdminToken(data.token)
    setAdminUser(data.user)
    return { ok: true }
  } catch {
    clearAdminAuth()
    return { ok: false, error: "Impossible de joindre le serveur API." }
  }
}

export async function signOutAdmin(): Promise<void> {
  const token = getAdminToken()
  clearAdminAuth()

  if (!token) return

  await fetch(resolveApiUrl("/api/auth/logout"), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
  }).catch(() => null)
}

export async function getAdminSession(): Promise<SessionResponse | null> {
  const token = getAdminToken()
  if (!token) return null

  const response = await fetch(resolveApiUrl("/api/auth/session"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
  })

  if (!response.ok) {
    clearAdminAuth()
    return null
  }

  const data = (await response.json()) as SessionResponse
  if (data.user) {
    setAdminUser(data.user)
  } else {
    clearAdminUser()
  }
  return data
}

export async function changeAdminPassword(currentPassword: string, newPassword: string): Promise<PasswordResult> {
  const token = getAdminToken()
  if (!token) {
    return { ok: false, error: "Session invalide." }
  }

  const response = await fetch(resolveApiUrl("/api/auth/change-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
    credentials: "omit",
  })

  if (!response.ok) {
    const payload = await parseError(response)
    return { ok: false, error: payload.error || "Impossible de modifier le mot de passe.", code: payload.code }
  }

  clearAdminAuth()
  return { ok: true }
}

export async function resetAdminPassword(token: string, newPassword: string): Promise<PasswordResult> {
  const response = await fetch(resolveApiUrl("/api/auth/reset-password"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, newPassword }),
    credentials: "omit",
  })

  if (!response.ok) {
    const payload = await parseError(response)
    return { ok: false, error: payload.error || "Impossible de reinitialiser le mot de passe.", code: payload.code }
  }

  return { ok: true }
}
