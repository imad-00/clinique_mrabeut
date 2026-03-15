"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changeAdminPassword } from "@/src/lib/api/auth"
import { useI18n } from "@/src/lib/i18n/context"

export default function AdminSecurityPage() {
  const { locale } = useI18n()
  const router = useRouter()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const copy = {
    title: locale === "ar" ? "امان الحساب" : "Securite du compte",
    subtitle:
      locale === "ar"
        ? "غيّر كلمة المرور الخاصة بك. سيتم تسجيل خروجك مباشرة بعد الحفظ."
        : "Changez votre mot de passe. Vous serez reconnecte apres la mise a jour.",
    current: locale === "ar" ? "كلمة المرور الحالية" : "Mot de passe actuel",
    next: locale === "ar" ? "كلمة المرور الجديدة" : "Nouveau mot de passe",
    confirm: locale === "ar" ? "تأكيد كلمة المرور" : "Confirmer le mot de passe",
    save: locale === "ar" ? "تحديث كلمة المرور" : "Mettre a jour le mot de passe",
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword !== confirmPassword) {
      setError(locale === "ar" ? "كلمتا المرور غير متطابقتين." : "Les mots de passe ne correspondent pas.")
      return
    }

    setSaving(true)
    const result = await changeAdminPassword(currentPassword, newPassword)
    setSaving(false)

    if (!result.ok) {
      setError(result.error || (locale === "ar" ? "تعذر تحديث كلمة المرور." : "Impossible de mettre a jour le mot de passe."))
      return
    }

    setSuccess(locale === "ar" ? "تم تحديث كلمة المرور. أعد تسجيل الدخول." : "Mot de passe mis a jour. Reconnectez-vous.")
    window.setTimeout(() => router.replace("/admin/login"), 900)
  }

  return (
    <AdminLayout>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl text-foreground">{copy.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="current-password">{copy.current}</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => {
                    setCurrentPassword(event.target.value)
                    setError(null)
                    setSuccess(null)
                  }}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="new-password">{copy.next}</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => {
                    setNewPassword(event.target.value)
                    setError(null)
                    setSuccess(null)
                  }}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="confirm-password">{copy.confirm}</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setError(null)
                    setSuccess(null)
                  }}
                  required
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              {success ? <p className="text-sm text-clinic-deep">{success}</p> : null}
              <Button type="submit" disabled={saving} className="w-full bg-clinic-primary hover:bg-clinic-accent text-primary-foreground">
                {saving ? (locale === "ar" ? "جارٍ الحفظ..." : "Enregistrement...") : copy.save}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
