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

const registerSchema = z
  .object({
    email: z.string().email('Bitte eine gültige E-Mail eingeben'),
    password: z
      .string()
      .min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwörter stimmen nicht überein',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  async function onSubmit(values: RegisterFormValues) {
    setError(null)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (authError) {
      if (authError.message.toLowerCase().includes('already registered')) {
        setError('Diese E-Mail ist bereits registriert.')
      } else {
        setError('Registrierung fehlgeschlagen. Bitte versuche es erneut.')
      }
      return
    }

    setSuccess(true)
  }

  async function signInWithOAuth(provider: 'google' | 'apple') {
    setOauthLoading(provider)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4">
        <div className="bg-blue-600 rounded-2xl p-4 mb-6">
          <Truck className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">
          Fast geschafft! 🎉
        </h2>
        <p className="text-gray-500 text-sm text-center max-w-xs">
          Wir haben dir einen Bestätigungslink per E-Mail geschickt. Bitte klicke
          darauf, um dein Konto zu aktivieren.
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
          Starte deine Lernreise noch heute!
        </p>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Konto erstellen
          </h2>

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

            <div className="space-y-1">
              <Label htmlFor="password">Passwort</Label>
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
                'Registrieren'
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">oder</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => signInWithOAuth('google')}
              disabled={oauthLoading !== null}
              className="w-full h-12 rounded-xl font-medium border-gray-200"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Mit Google registrieren
                </>
              )}
            </Button>

            <Button
              type="button"
              onClick={() => signInWithOAuth('apple')}
              disabled={oauthLoading !== null}
              className="w-full h-12 rounded-xl font-medium bg-black hover:bg-gray-900 text-white"
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
                  </svg>
                  Mit Apple registrieren
                </>
              )}
            </Button>
          </div>

          <p className="mt-6 text-sm text-gray-500 text-center">
            Schon ein Konto?{' '}
            <Link href="/login" className="text-blue-600 font-medium hover:underline">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
