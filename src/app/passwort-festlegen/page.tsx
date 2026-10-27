'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-browser'
import { PASSWORD_MIN_LENGTH } from '@/lib/password-suggestion'
import { CHANGE_PASSWORD_API_PATH, START_PATH } from '@/lib/roles'

const schema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, `Mindestens ${PASSWORD_MIN_LENGTH} Zeichen`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

type FormValues = z.infer<typeof schema>

/**
 * Pflicht-Seite nach „Passwort neu vergeben“ (PROJ-58). Der Proxy schickt
 * markierte Konten hierher, bis sie ein eigenes Passwort festgelegt haben.
 */
export default function PasswortFestlegenPage() {
  const [error, setError] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setError(null)
    try {
      const res = await fetch(CHANGE_PASSWORD_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: values.password }),
      })
      if (res.status === 401) {
        window.location.href = '/login'
        return
      }
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error ?? 'Passwort konnte nicht gesetzt werden. Bitte versuche es erneut.')
        return
      }
      window.location.href = START_PATH
    } catch {
      setError('Keine Verbindung. Bitte versuche es erneut.')
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await createClient().auth.signOut()
    } finally {
      window.location.href = '/login'
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#111827] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-[#58CC02]/20">
          <KeyRound className="size-8 text-[#58CC02]" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-[#F9FAFB] text-center">Lege dein eigenes Passwort fest</h1>
        <p className="mt-2 mb-8 text-base leading-relaxed text-[#9CA3AF] text-center">
          Du hast ein Passwort von deiner Lehrkraft bekommen. Wähle jetzt eins, das nur du kennst.
        </p>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-[#FF4B4B]/40 bg-[#FF4B4B]/10 px-4 py-3 text-sm text-[#FF4B4B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1">
            <Label htmlFor="password" className="text-[#9CA3AF]">Neues Passwort</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...register('password')}
              className="rounded-xl h-12 bg-[#374151] border-[#4B5563] text-[#F9FAFB] focus-visible:ring-[#58CC02]"
            />
            {errors.password && <p className="text-sm text-[#FF4B4B]">{errors.password.message}</p>}
          </div>
          <div className="space-y-1">
            <Label htmlFor="confirmPassword" className="text-[#9CA3AF]">Passwort wiederholen</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              {...register('confirmPassword')}
              className="rounded-xl h-12 bg-[#374151] border-[#4B5563] text-[#F9FAFB] focus-visible:ring-[#58CC02]"
            />
            {errors.confirmPassword && <p className="text-sm text-[#FF4B4B]">{errors.confirmPassword.message}</p>}
          </div>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-[#58CC02] hover:bg-[#4CAD02] text-white font-semibold text-base active:scale-95 transition-all duration-200"
          >
            {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            Speichern und weiter
          </Button>
        </form>

        <Button
          type="button"
          variant="ghost"
          onClick={handleLogout}
          disabled={loggingOut}
          className="mt-4 w-full min-h-11 rounded-xl text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#F9FAFB]"
        >
          Abmelden
        </Button>
      </div>
    </div>
  )
}
