'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-browser'

const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.updateUser({
      password: values.password,
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('expired') ||
          authError.message.toLowerCase().includes('invalid')) {
        setError('Dieser Reset-Link ist abgelaufen.')
      } else {
        setError('Passwort konnte nicht gesetzt werden. Bitte versuche es erneut.')
      }
      return
    }

    setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-blue-600 rounded-2xl p-4 mb-6">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          Passwort gesetzt! 🎉
        </h2>
        <p className="text-gray-500 text-sm text-center max-w-xs">
          Dein neues Passwort wurde erfolgreich gespeichert. Du kannst dich jetzt damit anmelden.
        </p>
        <Link
          href="/"
          className="mt-6 w-full max-w-xs"
        >
          <Button className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
            Weiter lernen →
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top hero section */}
      <div className="bg-blue-600 flex flex-col items-center justify-center py-12 px-4 text-white">
        <div className="bg-white/20 rounded-2xl p-4 mb-4">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight">SpediLern</h1>
        <p className="mt-2 text-blue-100 text-sm text-center">
          Neues Passwort festlegen
        </p>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Neues Passwort
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Wähle ein sicheres Passwort mit mindestens 8 Zeichen.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
              {error.includes('abgelaufen') && (
                <div className="mt-2">
                  <Link
                    href="/forgot-password"
                    className="font-medium underline hover:no-underline"
                  >
                    Neuen Link anfordern →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="password">Neues Passwort</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mindestens 8 Zeichen"
                autoComplete="new-password"
                {...register('password')}
                className="rounded-xl h-12"
              />
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Passwort wiederholen</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className="rounded-xl h-12"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Passwort speichern'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
