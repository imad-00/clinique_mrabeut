"use client"

import { useEffect, useMemo, useState } from "react"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createAdminUser, listAdminUsers, setAdminPassword, updateAdminUser } from "@/src/lib/api/admin-users"
import { getServices } from "@/src/lib/api/services"
import { useI18n } from "@/src/lib/i18n/context"
import type { AdminManagedUser, Service } from "@/src/lib/types"
import { KeyRound, Pencil, Plus, Power, Shield } from "lucide-react"

type FormState = {
  email: string
  password: string
  role: "SUPER_ADMIN" | "SERVICE_ADMIN"
  serviceId: string
  isActive: boolean
}

const EMPTY_FORM: FormState = {
  email: "",
  password: "",
  role: "SERVICE_ADMIN",
  serviceId: "",
  isActive: true,
}

function formatDate(value: string | null, locale: "fr" | "ar") {
  if (!value) return "-"
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

export default function AdminUsersPage() {
  const { locale } = useI18n()
  const [users, setUsers] = useState<AdminManagedUser[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AdminManagedUser | null>(null)
  const [passwordTarget, setPasswordTarget] = useState<AdminManagedUser | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const text = useMemo(
    () => ({
      title: locale === "ar" ? "إدارة المشرفين" : "Gestion des administrateurs",
      subtitle:
        locale === "ar"
          ? "إنشاء الحسابات الإدارية، تعديل البريد، تعيين كلمة مرور جديدة مباشرة، وتعطيل الوصول دون حذف الحساب."
          : "Creation, mise a jour, changement direct de mot de passe et desactivation des comptes admin sans suppression.",
      add: locale === "ar" ? "إضافة مشرف" : "Ajouter un admin",
      edit: locale === "ar" ? "تعديل المشرف" : "Modifier l'admin",
      create: locale === "ar" ? "إنشاء المشرف" : "Creer l'admin",
      email: locale === "ar" ? "البريد الإلكتروني" : "Email",
      password: locale === "ar" ? "كلمة المرور" : "Mot de passe",
      confirmPassword: locale === "ar" ? "تأكيد كلمة المرور" : "Confirmer le mot de passe",
      role: locale === "ar" ? "الدور" : "Role",
      service: locale === "ar" ? "الخدمة" : "Service",
      status: locale === "ar" ? "الحالة" : "Statut",
      actions: locale === "ar" ? "الإجراءات" : "Actions",
      active: locale === "ar" ? "نشط" : "Actif",
      inactive: locale === "ar" ? "معطل" : "Desactive",
      lastLogin: locale === "ar" ? "آخر تسجيل دخول" : "Derniere connexion",
      failedLogins: locale === "ar" ? "محاولات فاشلة" : "Echecs",
      lockout: locale === "ar" ? "القفل" : "Blocage",
      setPassword: locale === "ar" ? "تعيين كلمة مرور جديدة" : "Definir un nouveau mot de passe",
      setPasswordHelp:
        locale === "ar"
          ? "المشرف الأعلى يحدد كلمة المرور الجديدة مباشرة. سيتم قطع أي جلسة قديمة لذلك الحساب."
          : "Le super admin definit directement le nouveau mot de passe. Les anciennes sessions seront invalidees.",
      serviceRequired: locale === "ar" ? "اختر خدمة لهذا المشرف." : "Selectionnez un service pour cet admin.",
      passwordMismatch: locale === "ar" ? "كلمتا المرور غير متطابقتين." : "Les mots de passe ne correspondent pas.",
      passwordUpdated: locale === "ar" ? "تم تحديث كلمة المرور." : "Mot de passe mis a jour.",
    }),
    [locale]
  )

  const loadData = async () => {
    const [loadedUsers, loadedServices] = await Promise.all([listAdminUsers(), getServices("admin")])
    setUsers(loadedUsers)
    setServices(loadedServices)
  }

  useEffect(() => {
    loadData().catch((error) => {
      setFormError(error instanceof Error ? error.message : "Failed to load admin users.")
    })
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setDialogOpen(true)
  }

  const openEdit = (user: AdminManagedUser) => {
    setEditing(user)
    setForm({
      email: user.email,
      password: "",
      role: user.role,
      serviceId: user.serviceId || "",
      isActive: user.isActive,
    })
    setFormError(null)
    setDialogOpen(true)
  }

  const openPasswordDialog = (user: AdminManagedUser) => {
    setPasswordTarget(user)
    setNewPassword("")
    setConfirmPassword("")
    setPasswordError(null)
    setPasswordSuccess(null)
    setPasswordDialogOpen(true)
  }

  const handleSave = async () => {
    setFormError(null)
    if (form.role === "SERVICE_ADMIN" && !form.serviceId) {
      setFormError(text.serviceRequired)
      return
    }

    try {
      if (editing) {
        await updateAdminUser(editing.id, {
          email: form.email.trim().toLowerCase(),
          role: form.role,
          serviceId: form.role === "SERVICE_ADMIN" ? form.serviceId : null,
          isActive: form.isActive,
        })
      } else {
        await createAdminUser({
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
          serviceId: form.role === "SERVICE_ADMIN" ? form.serviceId : null,
          isActive: form.isActive,
        })
      }
      setDialogOpen(false)
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save admin user.")
    }
  }

  const handleToggleActive = async (user: AdminManagedUser) => {
    setBusyId(user.id)
    try {
      await updateAdminUser(user.id, { isActive: !user.isActive })
      await loadData()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to update admin user.")
    } finally {
      setBusyId(null)
    }
  }

  const handleSetPassword = async () => {
    if (!passwordTarget) return
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword !== confirmPassword) {
      setPasswordError(text.passwordMismatch)
      return
    }

    try {
      await setAdminPassword(passwordTarget.id, newPassword)
      setPasswordSuccess(text.passwordUpdated)
      await loadData()
      window.setTimeout(() => setPasswordDialogOpen(false), 800)
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to update password.")
    }
  }

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{text.title}</h1>
            <p className="text-sm text-muted-foreground">{text.subtitle}</p>
          </div>
          <Button onClick={openCreate} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
            <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
            {text.add}
          </Button>
        </div>

        {formError ? (
          <Card className="border-destructive/30">
            <CardContent className="py-4 text-sm text-destructive">{formError}</CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-foreground">{text.title}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.email}</TableHead>
                  <TableHead>{text.role}</TableHead>
                  <TableHead>{text.service}</TableHead>
                  <TableHead>{text.status}</TableHead>
                  <TableHead>{text.lastLogin}</TableHead>
                  <TableHead>{text.failedLogins}</TableHead>
                  <TableHead>{text.lockout}</TableHead>
                  <TableHead className="text-right">{text.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      {locale === "ar" ? "لا يوجد مشرفون." : "Aucun admin."}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-foreground">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-clinic-soft text-clinic-deep">
                          {user.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "SERVICE_ADMIN"}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.service ? (locale === "ar" ? user.service.nameAr : user.service.nameFr) : "-"}</TableCell>
                      <TableCell>
                        <Badge className={user.isActive ? "bg-clinic-mint text-clinic-deep" : "bg-slate-200 text-slate-700"}>
                          {user.isActive ? text.active : text.inactive}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(user.lastLoginAt, locale)}</TableCell>
                      <TableCell>{user.failedLoginAttempts}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(user.lockedUntil, locale)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={busyId === user.id} onClick={() => openPasswordDialog(user)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" disabled={busyId === user.id} onClick={() => handleToggleActive(user)}>
                            <Power className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-foreground">{editing ? text.edit : text.create}</DialogTitle>
              <DialogDescription className="sr-only">{editing ? text.edit : text.create}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
              <div className="flex flex-col gap-2">
                <Label>{text.email}</Label>
                <Input
                  type="email"
                  dir="ltr"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </div>
              {!editing ? (
                <div className="flex flex-col gap-2">
                  <Label>{text.password}</Label>
                  <Input
                    type="password"
                    dir="ltr"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </div>
              ) : null}
              <div className="flex flex-col gap-2">
                <Label>{text.role}</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      role: value as FormState["role"],
                      serviceId: value === "SUPER_ADMIN" ? "" : current.serviceId,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SUPER_ADMIN">SUPER_ADMIN</SelectItem>
                    <SelectItem value="SERVICE_ADMIN">SERVICE_ADMIN</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.role === "SERVICE_ADMIN" ? (
                <div className="flex flex-col gap-2">
                  <Label>{text.service}</Label>
                  <Select value={form.serviceId} onValueChange={(value) => setForm((current) => ({ ...current, serviceId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={text.service} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {locale === "ar" ? service.name_ar : service.name_fr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Shield className="h-4 w-4 text-clinic-accent" />
                  {text.active}
                </div>
                <Button
                  type="button"
                  variant={form.isActive ? "default" : "outline"}
                  className={form.isActive ? "bg-clinic-primary hover:bg-clinic-accent text-primary-foreground" : ""}
                  onClick={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}
                >
                  {form.isActive ? text.active : text.inactive}
                </Button>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  {locale === "ar" ? "إلغاء" : "Annuler"}
                </Button>
                <Button onClick={handleSave} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                  {locale === "ar" ? "حفظ" : "Enregistrer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground">{text.setPassword}</DialogTitle>
              <DialogDescription>{text.setPasswordHelp}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="rounded-lg bg-clinic-soft p-3 text-sm text-foreground">
                <p className="font-medium">{passwordTarget?.email || "-"}</p>
                <p className="mt-1 text-muted-foreground">
                  {passwordTarget?.service ? (locale === "ar" ? passwordTarget.service.nameAr : passwordTarget.service.nameFr) : passwordTarget?.role || ""}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{text.password}</Label>
                <Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{text.confirmPassword}</Label>
                <Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
              </div>
              {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
              {passwordSuccess ? <p className="text-sm text-clinic-deep">{passwordSuccess}</p> : null}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                  {locale === "ar" ? "إلغاء" : "Annuler"}
                </Button>
                <Button onClick={handleSetPassword} className="bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                  {text.setPassword}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
