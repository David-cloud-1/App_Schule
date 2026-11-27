'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ArrowDown, ArrowUp, CalendarDays, Loader2, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { TypeBadge } from '@/components/admin/absence/absence-ui'
import { ABSENCE_API } from '@/lib/absence'
import {
  ART_FARBEN,
  ART_ICONS,
  KALENDER_LIMITS,
  type AbwesenheitsArt,
  type ArtFarbe,
  type ArtIcon,
} from '@/lib/kalender'

const COLOR_LABEL: Record<ArtFarbe, string> = {
  green: 'Grün',
  blue: 'Blau',
  orange: 'Orange',
  gold: 'Gold',
  red: 'Rot',
  faint: 'Grau',
}

const ICON_LABEL: Record<ArtIcon, string> = {
  'graduation-cap': 'Doktorhut',
  footprints: 'Fußspuren',
  briefcase: 'Aktentasche',
  'clipboard-check': 'Klemmbrett',
  bus: 'Bus',
  'calendar-x': 'Termin durchgestrichen',
  calendar: 'Termin',
  users: 'Gruppe',
  'map-pin': 'Ort',
  plane: 'Flugzeug',
  'book-open': 'Buch',
  school: 'Schule',
  presentation: 'Präsentation',
  building: 'Gebäude',
}

interface Draft {
  id: string | null
  name: string
  farbe: ArtFarbe
  icon: ArtIcon
  aktiv: boolean
  mit_freitext: boolean
  fest: boolean
}

const emptyDraft: Draft = { id: null, name: '', farbe: 'blue', icon: 'calendar', aktiv: true, mit_freitext: false, fest: false }

async function message(res: Response, fallback: string) {
  try {
    return ((await res.json()) as { error?: string }).error ?? fallback
  } catch {
    return fallback
  }
}

/**
 * Verwaltung der Abwesenheitsarten (PROJ-120, nur Super-Admin): hinzufügen,
 * umbenennen, Farbe und Symbol ändern, umsortieren und deaktivieren. Eine Art mit
 * Einträgen wird nur deaktiviert, „Sonstige Abwesenheit“ ist fest. Die Reihenfolge
 * ändert man mit Pfeil-Knöpfen (per Tastatur und Touch bedienbar).
 */
export function AbsenceTypesManager() {
  const [types, setTypes] = useState<AbwesenheitsArt[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const res = await fetch(`${ABSENCE_API}/meta`, { cache: 'no-store' })
      if (!res.ok) throw new Error('load')
      const body = (await res.json()) as { arten: AbwesenheitsArt[] }
      setTypes(body.arten)
    } catch {
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save() {
    if (!draft) return
    const name = draft.name.trim()
    if (name.length < KALENDER_LIMITS.artNameMin) {
      setError(`Der Name braucht mindestens ${KALENDER_LIMITS.artNameMin} Zeichen.`)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(draft.id ? `${ABSENCE_API}/arten/${draft.id}` : `${ABSENCE_API}/arten`, {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, farbe: draft.farbe, icon: draft.icon, aktiv: draft.aktiv, mit_freitext: draft.mit_freitext }),
      })
      if (!res.ok) {
        setError(await message(res, 'Das Speichern hat nicht geklappt.'))
        return
      }
      toast.success(draft.id ? 'Art gespeichert' : 'Art angelegt')
      setDraft(null)
      await load()
    } catch {
      setError('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(t: AbwesenheitsArt, aktiv: boolean) {
    const res = await fetch(`${ABSENCE_API}/arten/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: t.name, farbe: t.farbe, icon: t.icon, aktiv, mit_freitext: t.mit_freitext }),
    }).catch(() => null)
    if (!res?.ok) toast.error(res ? await message(res, 'Das hat nicht geklappt.') : 'Keine Verbindung.')
    await load()
  }

  async function move(index: number, delta: -1 | 1) {
    if (!types) return
    const next = [...types]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setTypes(next)
    const res = await fetch(`${ABSENCE_API}/arten`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: next.map((t) => t.id) }),
    }).catch(() => null)
    if (!res?.ok) toast.error(res ? await message(res, 'Die Reihenfolge konnte nicht gespeichert werden.') : 'Keine Verbindung.')
    await load()
  }

  return (
    <div className="mx-auto w-full max-w-screen-lg space-y-6">
      <AdminPageHeader
        title="Abwesenheitsarten"
        description="Lege fest, welche Arten von Abwesenheit es gibt – eine Art mit Einträgen kannst du nur ausblenden."
        breadcrumb="Abwesenheitsarten"
        actions={
          <Button
            onClick={() => {
              setError(null)
              setDraft(emptyDraft)
            }}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            <Plus className="mr-2 size-4" aria-hidden />
            Art hinzufügen
          </Button>
        }
      />

      {failed && !types ? (
        <AdminErrorState onRetry={() => void load()} />
      ) : !types ? (
        <AdminLoadingState variant="list" rows={6} />
      ) : types.length === 0 ? (
        <AdminEmptyState icon={CalendarDays} title="Noch keine Arten" description="Lege die erste Art an." />
      ) : (
        <ul className="divide-y divide-ws-line overflow-hidden rounded-2xl border border-ws-line bg-ws-surface">
          {types.map((t, i) => (
            <li key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex shrink-0 flex-col">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`${t.name} nach oben`}
                  disabled={i === 0 || t.fest}
                  onClick={() => void move(i, -1)}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`${t.name} nach unten`}
                  disabled={i === types.length - 1 || t.fest}
                  onClick={() => void move(i, 1)}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <TypeBadge absence={{ typeName: t.name, typeColor: t.farbe, typeIcon: t.icon }} />
                <p className="text-sm text-ws-muted">
                  {t.anzahl === 1 ? '1 Eintrag' : `${t.anzahl} Einträge`}
                  {t.mit_freitext && ' · mit Freitext'}
                  {t.fest && ' · fest'}
                  {!t.aktiv && ' · ausgeblendet'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex min-h-11 items-center gap-2">
                  <Switch
                    id={`art-aktiv-${t.id}`}
                    checked={t.aktiv}
                    disabled={t.fest}
                    onCheckedChange={(on) => void toggleActive(t, on)}
                    aria-label={`${t.name} aktiv`}
                  />
                  <Label htmlFor={`art-aktiv-${t.id}`} className="text-sm text-ws-muted">
                    Aktiv
                  </Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`${t.name} bearbeiten`}
                  onClick={() => {
                    setError(null)
                    setDraft({ id: t.id, name: t.name, farbe: t.farbe, icon: t.icon, aktiv: t.aktiv, mit_freitext: t.mit_freitext, fest: t.fest })
                  }}
                >
                  <Pencil className="size-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={draft !== null} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="border-ws-line bg-ws-surface text-ws-text sm:max-w-md">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? 'Art bearbeiten' : 'Art hinzufügen'}</DialogTitle>
                <DialogDescription className="text-ws-muted">Name, Farbe und Symbol erscheinen überall in den Abwesenheiten.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="art-name">Name</Label>
                  <Input
                    id="art-name"
                    value={draft.name}
                    maxLength={KALENDER_LIMITS.artNameMax}
                    disabled={draft.fest}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    className="mt-1.5 min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
                  />
                  {draft.fest && <p className="mt-1 text-xs text-ws-muted">Diese Art ist fest und lässt sich nicht umbenennen.</p>}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="art-farbe">Farbe</Label>
                    <Select value={draft.farbe} onValueChange={(v) => setDraft({ ...draft, farbe: v as ArtFarbe })}>
                      <SelectTrigger id="art-farbe" className="mt-1.5 min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ART_FARBEN.map((c) => (
                          <SelectItem key={c} value={c} className="min-h-11">
                            {COLOR_LABEL[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="art-icon">Symbol</Label>
                    <Select value={draft.icon} onValueChange={(v) => setDraft({ ...draft, icon: v as ArtIcon })}>
                      <SelectTrigger id="art-icon" className="mt-1.5 min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ART_ICONS.map((ic) => (
                          <SelectItem key={ic} value={ic} className="min-h-11">
                            {ICON_LABEL[ic]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-ws-line px-3">
                  <Label htmlFor="art-freitext" className="flex-1 cursor-pointer py-3">
                    Mit optionalem Freitext
                  </Label>
                  <Switch id="art-freitext" checked={draft.mit_freitext} disabled={draft.fest} onCheckedChange={(on) => setDraft({ ...draft, mit_freitext: on })} />
                </div>
                <div>
                  <p className="mb-1.5 text-sm text-ws-muted">So sieht die Art in den Abwesenheiten aus:</p>
                  <TypeBadge absence={{ typeName: draft.name.trim() || 'Beispiel', typeColor: draft.farbe, typeIcon: draft.icon }} />
                </div>
                {error && (
                  <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 px-3 py-2 text-sm text-ws-red">
                    {error}
                  </p>
                )}
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => setDraft(null)}>
                  Abbrechen
                </Button>
                <Button disabled={saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
                  {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                  Speichern
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
