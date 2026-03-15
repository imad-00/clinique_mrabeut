"use client"

import { useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"

import { BrandLogo } from "@/components/BrandLogo"
import { LanguageSwitcher } from "@/components/clinic/language-switcher"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { resetAdminPassword } from "@/src/lib/api/auth"
import { useI18n } from "@/src/lib/i18n/context"

export default function AdminResetPasswordPage() {
  const { locale } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialToken = useMemo(() => searchParams.get("token") || "", [searchParams])
  const [token, setToken] = useState(initialToken)
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const copy = {
    title: locale === "ar" ? "إعادة تعيين كلمة المرور" : "Reinitialisation du mot de passe",
    token: locale === "ar" ? "رمز إعادة التعيين" : "Jeton de reinitialisation",
    password: locale === "ar" ? "كلمة المرور الجديدة" : "Nouveau mot de passe",
    confirm: locale === "ar" ? "تأكيد كلمة المرور" : "Confirmer le mot de passe",
    submit: locale === "ar" ? "حفظ كلمة المرور" : "Enregistrer le mot de passe",
    back: locale === "ar" ? "العودة إلى تسجيل الدخول" : "Retour a la connexion",
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
    const result = await resetAdminPassword(token, newPassword)
    setSaving(false)

    if (!result.ok) {
      setError(result.error || (locale === "ar" ? "فشل إعادة التعيين." : "La reinitialisation a echoue."))
      return
    }

    setSuccess(locale === "ar" ? "تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن." : "Mot de passe mis a jour. Vous pouvez vous connecter.")
    window.setTimeout(() => router.replace("/admin/login"), 900)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-soft p-4">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <BrandLogo size="md" variant="default" className="mx-auto mb-4" priority />
          <CardTitle className="text-foreground">{copy.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="reset-token">{copy.token}</Label>
              <Input
                id="reset-token"
                value={token}
                onChange={(event) => {
                  setToken(event.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reset-password">{copy.password}</Label>
              <Input
                id="reset-password"
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
              <Label htmlFor="reset-password-confirm">{copy.confirm}</Label>
              <Input
                id="reset-password-confirm"
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
              {saving ? (locale === "ar" ? "جارٍ الحفظ..." : "Enregistrement...") : copy.submit}
            </Button>
            <Link href="/admin/login" className="text-center text-sm text-clinic-accent underline underline-offset-4">
              {copy.back}
            </Link>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
