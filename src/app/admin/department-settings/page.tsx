'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Copy, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'

type DepartmentSettings = {
  id: string
  name: string
  appName: string
  domain: string | null
  promptNotes: string | null
  currencyName: string
  hofName: string
  hofShortName: string
}

export default function DepartmentSettingsPage() {
  const [settings, setSettings] = useState<DepartmentSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ promptNotes: '', currencyName: '', hofName: '', hofShortName: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/department-settings')
      if (!res.ok) {
        toast.error('Fachbereich-Einstellungen konnten nicht geladen werden.')
        return
      }
      const json: DepartmentSettings = await res.json()
      setSettings(json)
      setForm({
        promptNotes: json.promptNotes ?? '',
        currencyName: json.currencyName,
        hofName: json.hofName,
        hofShortName: json.hofShortName,
      })
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/department-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_notes: form.promptNotes.trim() || null,
          currency_name: form.currencyName.trim(),
          hof_name: form.hofName.trim(),
          hof_short_name: form.hofShortName.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Speichern fehlgeschlagen')
        return
      }
      toast.success('Gespeichert')
      load()
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  function copyDomain() {
    if (!settings?.domain) return
    navigator.clipboard.writeText(`https://${settings.domain}`).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  if (loading || !settings) {
    return (
      <div className="space-y-6 max-w-xl">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[#F9FAFB] tracking-tight">Fachbereich-Einstellungen</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">{settings.name} ({settings.appName})</p>
      </div>

      {settings.domain && (
        <div className="space-y-2">
          <Label>Eigene Adresse</Label>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={`https://${settings.domain}`}
              className="bg-[#111827] border-[#4B5563] text-[#9CA3AF] font-mono text-sm"
            />
            <Button type="button" variant="outline" size="icon" onClick={copyDomain} className="border-[#4B5563] shrink-0">
              {copied ? <Check className="w-4 h-4 text-[#58CC02]" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="promptNotes">Zusatzhinweise für den Fragen-Prompt</Label>
          <Textarea
            id="promptNotes"
            rows={5}
            value={form.promptNotes}
            onChange={(e) => setForm({ ...form, promptNotes: e.target.value })}
            placeholder="Wird an das Ende des kopierbaren Prompts angehängt, z. B. besondere Schwerpunkte oder Formatwünsche."
            className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
            maxLength={2000}
          />
          <p className="text-xs text-[#9CA3AF]">{form.promptNotes.length}/2000 Zeichen</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="currencyName">Name der Münzen</Label>
            <Input
              id="currencyName"
              value={form.currencyName}
              onChange={(e) => setForm({ ...form, currencyName: e.target.value })}
              className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
              maxLength={40}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hofName">Name des Hofs</Label>
            <Input
              id="hofName"
              value={form.hofName}
              onChange={(e) => setForm({ ...form, hofName: e.target.value })}
              className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
              maxLength={40}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hofShortName">Kurzform des Hofs (z. B. „Mein Hof")</Label>
          <Input
            id="hofShortName"
            value={form.hofShortName}
            onChange={(e) => setForm({ ...form, hofShortName: e.target.value })}
            className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB]"
            maxLength={20}
          />
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Speichern
        </Button>
      </form>
    </div>
  )
}
