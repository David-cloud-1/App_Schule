'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Truck, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase-browser'

const forgotPasswordSchema = z.object({
  email: z.string().email('Bitte eine gültige E-Mail eingeben'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      values.email,
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    )

    if (authError) {
      setError('Etwas ist schiefgelaufen. Bitte versuche es erneut.')
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
          E-Mail verschickt! ✉️
        </h2>
        <p className="text-gray-500 text-sm text-center max-w-xs">
          Wir haben dir einen Link zum Zurücksetzen deines Passworts geschickt.
          Bitte prüfe dein Postfach.
        </p>
        <Link href="/login" className="mt-6 text-blue-600 font-medium hover:underline text-sm">
          Zurück zum Login
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
          Kein Problem – wir helfen dir!
        </p>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <Link
            href="/login"
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück zum Login
          </Link>

          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Passwort vergessen?
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Gib deine E-Mail ein und wir schicken dir einen Reset-Link.
          </p>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">E-Mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="deine@email.de"
                autoComplete="email"
                {...register('email')}
                className="rounded-xl h-12"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
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
                'Reset-Link senden'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
