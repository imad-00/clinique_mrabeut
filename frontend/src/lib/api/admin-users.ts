import { apiClient } from "@/src/lib/apiClient"
import type { AdminManagedUser } from "@/src/lib/types"
import type { ApiAdminUser } from "@/src/types/api"

function mapAdminUser(user: ApiAdminUser): AdminManagedUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    serviceId: user.serviceId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    lastLoginIp: user.lastLoginIp,
    failedLoginAttempts: user.failedLoginAttempts,
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    service: user.service || null,
  }
}

export async function listAdminUsers(): Promise<AdminManagedUser[]> {
  const response = await apiClient.get<{ users: ApiAdminUser[] }>("/api/admin/users")
  return response.users.map(mapAdminUser)
}

type CreateAdminUserInput = {
  email: string
  password: string
  role: "SUPER_ADMIN" | "SERVICE_ADMIN"
  serviceId?: string | null
  isActive?: boolean
}

export async function createAdminUser(input: CreateAdminUserInput): Promise<AdminManagedUser> {
  const response = await apiClient.post<{ user: ApiAdminUser }>("/api/admin/users", input)
  return mapAdminUser(response.user)
}

type UpdateAdminUserInput = {
  email?: string
  role?: "SUPER_ADMIN" | "SERVICE_ADMIN"
  serviceId?: string | null
  isActive?: boolean
}

export async function updateAdminUser(userId: string, input: UpdateAdminUserInput): Promise<AdminManagedUser> {
  const response = await apiClient.patch<{ user: ApiAdminUser }>(`/api/admin/users/${userId}`, input)
  return mapAdminUser(response.user)
}

export async function issueAdminResetToken(userId: string): Promise<{ token: string; expiresAt: string }> {
  const response = await apiClient.post<{ token: string; expiresAt: string }>(`/api/admin/users/${userId}/issue-reset-token`)
  return { token: response.token, expiresAt: response.expiresAt }
}

export async function setAdminPassword(userId: string, newPassword: string): Promise<void> {
  await apiClient.post<{ ok: boolean }>(`/api/admin/users/${userId}/set-password`, { newPassword })
}
