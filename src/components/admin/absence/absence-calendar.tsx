'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Search, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { AdminEmptyState, AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { AbsenceCard, ABSENCE_TINT, AbsenceIcon } from '@/components/admin/absence/absence-ui'
import { AbsenceDetailSheet } from '@/components/admin/absence/absence-detail-sheet'
import { AbsenceFormDialog } from '@/components/admin/absence/absence-form-dialog'
import { useIsMobile } from '@/hooks/use-mobile'
import { createClient } from '@/lib/supabase-browser'
import {
  ABSENCE_API,
  ABSENCE_LIST_PAGE,
  DEFAULT_FILTERS,
  DEPARTMENTS,
  absencesOnDay,
  applyFilters,
  emptyForm,
  formFromAbsence,
  formatLongDay,
  groupByStartDay,
  isWeekend,
  monthGrid,
  periodTitle,
  shiftAnchor,
  todayIso,
  visibleRange,
  weekDays,
  type Absence,
  type AbsenceFilters,
  type AbsenceFormValues,
  type AbsenceType,
  type CalendarView,
  type DepartmentFilter,
  type SubstituteFilter,
  type SubstituteStatus,
  type TeacherOption,
} from '@/lib/absence'
import { absenceFromApi, formToInput, statusToApi, typeFromApi } from '@/lib/absence-api'
import type { Abwesenheit, AbwesenheitsArt, KalenderIch } from '@/lib/kalender'
import { cn } from '@/lib/utils'

interface Meta {
  ich: KalenderIch
  arten: AbwesenheitsArt[]
  lehrkraefte: TeacherOption[]
}

const STORAGE_KEY = 'absence-calendar-prefs'
const POLL_MS = 60_000
const RELOAD_MIN_GAP_MS = 1_000
const HIGHLIGHT_MS = 1_800
const MAX_PAGES = 6
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONTH_CHIPS = 3

interface Prefs {
  view?: CalendarView
  filters?: Partial<AbsenceFilters>
}

function readPrefs(): Prefs {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as Prefs
  } catch {
    return {}
  }
}

function writePrefs(prefs: Prefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* Speicher gesperrt: Kalender funktioniert ohne Merken */
  }
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string }
    return body.error ?? fallback
  } catch {
    return fallback
  }
}

/** Alle Seiten des sichtbaren Zeitraums holen (höchstens 6 × 499 Einträge) */
async function fetchRange(from: string, to: string): Promise<Absence[]> {
  const items: Absence[] = []
  for (let page = 0; page < MAX_PAGES; page++) {
    const params = new URLSearchParams({ von: from, bis: to, limit: String(ABSENCE_LIST_PAGE), offset: String(page * ABSENCE_LIST_PAGE) })
    const res = await fetch(`${ABSENCE_API}?${params}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('load')
    const body = (await res.json()) as { items: Abwesenheit[]; hasMore: boolean }
    items.push(...body.items.map(absenceFromApi))
    if (!body.hasMore) break
  }
  return items
}

/**
 * Abwesenheitskalender (PROJ-120): Monat, Woche, Liste mit Filtern, Detail-
 * Schublade und Formular. Lädt nur den sichtbaren Zeitraum.
 *
 * Aktualisierung: Supabase Realtime auf `abwesenheiten` löst ein gesammeltes
 * Neuladen aus (höchstens etwa einmal pro Sekunde); die Daten kommen immer über
 * die Schnittstelle, damit Rechte und Filter gelten. Fehlt die Live-Verbindung,
 * lädt der Kalender beim Zurückkehren in den Tab und einmal pro Minute neu.
 */
export function AbsenceCalendar({ initialSubstitute }: { initialSubstitute?: SubstituteFilter }) {
  const isMobile = useIsMobile()
  const [prefs, setPrefs] = useState<Prefs>({})
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [anchor, setAnchor] = useState(() => todayIso())
  const [items, setItems] = useState<Absence[] | null>(null)
  const [meta, setMeta] = useState<Meta | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const [offlineSince, setOfflineSince] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [dayListFor, setDayListFor] = useState<string | null>(null)
  const [form, setForm] = useState<{ editing: Absence | null; initial: AbsenceFormValues } | null>(null)
  const [busy, setBusy] = useState(false)
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set())
  const versions = useRef<Map<string, number>>(new Map())
  const lastLoad = useRef(0)
  const reloadTimer = useRef<number | null>(null)

  useEffect(() => {
    const stored = readPrefs()
    // Ein Link aus „Zu erledigen“ (?vertretung=offen) gilt vor der gemerkten Auswahl
    if (initialSubstitute) stored.filters = { ...stored.filters, substitute: initialSubstitute }
    setPrefs(stored)
    setPrefsLoaded(true)
  }, [initialSubstitute])

  const view: CalendarView = prefs.view ?? (isMobile ? 'list' : 'month')
  const prefFilters = prefs.filters
  const filters = useMemo<AbsenceFilters>(() => ({ ...DEFAULT_FILTERS, ...prefFilters }), [prefFilters])

  function updatePrefs(next: Prefs) {
    const merged = { ...prefs, ...next }
    setPrefs(merged)
    writePrefs(merged)
  }

  function setFilter<K extends keyof AbsenceFilters>(key: K, value: AbsenceFilters[K]) {
    updatePrefs({ filters: { ...filters, [key]: value } })
  }

  const range = useMemo(() => visibleRange(view, anchor), [view, anchor])

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      lastLoad.current = Date.now()
      try {
        const next = await fetchRange(range.from, range.to)
        // Neue oder geänderte Einträge kurz hervorheben (nur bei stillem Nachladen)
        const seen = versions.current
        const changed = new Set<string>()
        for (const a of next) {
          if (silent && seen.has(a.id) && seen.get(a.id) !== a.version) changed.add(a.id)
          if (silent && seen.size > 0 && !seen.has(a.id)) changed.add(a.id)
          seen.set(a.id, a.version)
        }
        setItems(next)
        setFailed(false)
        setOfflineSince(null)
        if (changed.size > 0) {
          setHighlighted(changed)
          window.setTimeout(() => setHighlighted(new Set()), HIGHLIGHT_MS)
        }
      } catch {
        if (silent) {
          setOfflineSince((cur) => cur ?? new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }))
        } else {
          setFailed(true)
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [range.from, range.to],
  )

  useEffect(() => {
    if (!prefsLoaded) return
    void load()
  }, [load, prefsLoaded])

  // Meta (Ich, Arten, Lehrkräfte) einmal holen; Arten laden bei Bedarf nach
  const loadMeta = useCallback(async () => {
    try {
      const res = await fetch(`${ABSENCE_API}/meta`, { cache: 'no-store' })
      if (res.ok) setMeta((await res.json()) as Meta)
    } catch {
      /* Kalender zeigt Einträge auch ohne Meta; Eintragen wartet darauf */
    }
  }, [])
  useEffect(() => {
    void loadMeta()
  }, [loadMeta])

  // Gesammeltes Neuladen: höchstens etwa einmal pro Sekunde
  const scheduleReload = useCallback(() => {
    if (reloadTimer.current !== null) return
    const wait = Math.max(0, RELOAD_MIN_GAP_MS - (Date.now() - lastLoad.current))
    reloadTimer.current = window.setTimeout(() => {
      reloadTimer.current = null
      void load(true)
    }, wait)
  }, [load])

  // Live-Verbindung (Realtime); Rückfall: Tab-Wechsel, Netz zurück, Minutentakt ohne Verbindung
  useEffect(() => {
    if (!prefsLoaded) return
    let removeChannel: () => void = () => {}
    try {
      const sb = createClient()
      const channel = sb
        .channel('kalender-abwesenheiten')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'abwesenheiten' }, () => scheduleReload())
        .subscribe((status) => setLive(status === 'SUBSCRIBED'))
      removeChannel = () => void sb.removeChannel(channel)
    } catch {
      setLive(false) // ohne Live-Verbindung greift die Rückfallebene (Tab-Wechsel, Minutentakt)
    }
    const refresh = () => {
      if (document.visibilityState === 'visible') void load(true)
    }
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('online', refresh)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('online', refresh)
      removeChannel()
      if (reloadTimer.current !== null) {
        window.clearTimeout(reloadTimer.current)
        reloadTimer.current = null
      }
    }
  }, [load, scheduleReload, prefsLoaded])

  useEffect(() => {
    if (live) return
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(true)
    }, POLL_MS)
    return () => window.clearInterval(timer)
  }, [live, load])

  // Nach Mitternacht springt „Heute“ weiter
  const [today, setToday] = useState(() => todayIso())
  useEffect(() => {
    const timer = window.setInterval(() => setToday(todayIso()), POLL_MS)
    return () => window.clearInterval(timer)
  }, [])

  const me = meta?.ich
  const types = useMemo<AbsenceType[]>(() => (meta?.arten ?? []).map(typeFromApi), [meta])
  const teachers = meta?.lehrkraefte ?? []
  const visible = useMemo(() => applyFilters(items ?? [], filters), [items, filters])
  const opened = items?.find((a) => a.id === openId) ?? null
  const isPlanner = !!me && (me.ist_planer || me.ist_super_admin)

  // Hat jemand anderes den Eintrag geändert, den man gerade im Formular offen hat?
  const editingId = form?.editing?.id
  const editingVersion = form?.editing?.version
  const externalChange = useMemo(() => {
    if (!editingId || !items) return null
    const fresh = items.find((a) => a.id === editingId)
    if (!fresh) return 'Dieser Eintrag wurde gerade gelöscht.'
    if (fresh.version !== editingVersion) {
      return `Dieser Eintrag wurde gerade von ${fresh.updatedByName ?? 'jemand anderem'} geändert.`
    }
    return null
  }, [editingId, editingVersion, items])

  function openCreate(day = today) {
    if (!me) return
    const firstActive = types.find((t) => t.active)
    setForm({ editing: null, initial: emptyForm(me.id, day, firstActive?.id ?? '') })
  }

  function openEdit(a: Absence) {
    setForm({ editing: a, initial: formFromAbsence(a) })
  }

  async function submitForm(values: AbsenceFormValues, personIds: string[]) {
    const editing = form?.editing ?? null
    const send = (input: ReturnType<typeof formToInput>) =>
      fetch(editing ? `${ABSENCE_API}/${editing.id}` : ABSENCE_API, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { ...input, version: editing.version } : input),
      })
    try {
      if (editing) {
        const res = await send(formToInput(values))
        if (res.status === 409) {
          return { ok: false as const, message: 'Dieser Eintrag wurde gerade geändert. Bitte neu laden und noch einmal speichern.' }
        }
        if (!res.ok) return { ok: false as const, message: await errorMessage(res, 'Das Speichern hat nicht geklappt. Bitte versuche es noch einmal.') }
        toast.success('Änderung gespeichert')
        setForm(null)
        await load(true)
        return { ok: true as const }
      }

      // Neuanlage: je Person ein Eintrag. Klappt einer nicht, bleiben nur die offenen Personen im Formular.
      const failed: string[] = []
      let lastMessage = ''
      for (const id of personIds) {
        const res = await send(formToInput({ ...values, personId: id }))
        if (!res.ok) {
          failed.push(id)
          lastMessage = await errorMessage(res, 'Das Speichern hat nicht geklappt.')
        }
      }
      const saved = personIds.length - failed.length
      if (saved > 0) {
        toast.success(saved === 1 ? 'Abwesenheit eingetragen' : `${saved} Abwesenheiten eingetragen`)
        await load(true)
      }
      if (failed.length === 0) {
        setForm(null)
        return { ok: true as const }
      }
      const names = failed.map((id) => teachers.find((t) => t.id === id)?.name ?? 'Unbekannt').join(', ')
      return { ok: false as const, message: `Nicht gespeichert für: ${names}. ${lastMessage}`, remaining: failed }
    } catch {
      return { ok: false as const, message: 'Keine Verbindung. Deine Eingaben bleiben erhalten, bitte versuche es gleich noch einmal.' }
    }
  }

  async function setStatus(a: Absence, status: SubstituteStatus) {
    setBusy(true)
    try {
      const res = await fetch(`${ABSENCE_API}/${a.id}/vertretung`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: statusToApi(status), version: a.version }),
      })
      if (res.status === 409) {
        toast.error('Status wurde gerade geändert. Die Ansicht wird neu geladen.')
      } else if (!res.ok) {
        toast.error(await errorMessage(res, 'Der Status konnte nicht gespeichert werden.'))
      }
      await load(true)
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(a: Absence) {
    setBusy(true)
    try {
      const res = await fetch(`${ABSENCE_API}/${a.id}?version=${a.version}`, { method: 'DELETE' })
      if (res.status === 409) {
        toast.error('Der Eintrag wurde gerade geändert. Bitte prüfe ihn noch einmal.')
        await load(true)
        return
      }
      if (!res.ok) {
        toast.error(await errorMessage(res, 'Der Eintrag konnte nicht gelöscht werden.'))
        return
      }
      setOpenId(null)
      await load(true)
      toast.success('Abwesenheit gelöscht', {
        duration: 10_000,
        action: {
          label: 'Rückgängig',
          onClick: () => {
            void (async () => {
              const back = await fetch(`${ABSENCE_API}/${a.id}/wiederherstellen`, { method: 'POST' })
              if (back.ok) {
                toast.success('Eintrag wiederhergestellt')
                await load(true)
              } else {
                toast.error(await errorMessage(back, 'Wiederherstellen hat nicht geklappt.'))
              }
            })()
          },
        },
      })
    } catch {
      toast.error('Keine Verbindung. Bitte versuche es noch einmal.')
    } finally {
      setBusy(false)
    }
  }

  const departmentOptions = [{ value: 'alle', label: 'Alle Abteilungen' }, ...DEPARTMENTS.map((d) => ({ value: d.code, label: d.name }))]

  return (
    <div className="mx-auto w-full max-w-screen-2xl space-y-5">
      <AdminPageHeader
        title="Kalender"
        description="Wer fehlt wann? Trag Fortbildungen, Dienstreisen und andere Abwesenheiten ein, damit eine Vertretung geplant werden kann."
        actions={
          <Button
            onClick={() => openCreate()}
            disabled={!me}
            className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
          >
            <Plus className="mr-2 size-4" aria-hidden />
            Abwesenheit eintragen
          </Button>
        }
      />

      {/* Werkzeugleiste */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Zurück" onClick={() => setAnchor(shiftAnchor(view, anchor, -1))}>
            <ChevronLeft className="size-5" aria-hidden />
          </Button>
          <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => setAnchor(today)}>
            Heute
          </Button>
          <Button variant="outline" size="icon" className="size-11 rounded-xl" aria-label="Vor" onClick={() => setAnchor(shiftAnchor(view, anchor, 1))}>
            <ChevronRight className="size-5" aria-hidden />
          </Button>
          <h2 className="mx-2 text-lg font-semibold capitalize text-ws-text" aria-live="polite">
            {periodTitle(view, anchor)}
          </h2>
          <div className="ml-auto">
            <AdminSegmented<CalendarView>
              ariaLabel="Ansicht"
              value={view}
              onChange={(v) => updatePrefs({ view: v })}
              options={[
                { value: 'month', label: 'Monat' },
                { value: 'week', label: 'Woche' },
                { value: 'list', label: 'Liste' },
              ]}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.department} onValueChange={(v) => setFilter('department', v as DepartmentFilter)}>
            <SelectTrigger aria-label="Abteilung" className="min-h-11 w-full rounded-xl border-ws-line bg-ws-surface text-ws-text sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departmentOptions.map((o) => (
                <SelectItem key={o.value} value={o.value} className="min-h-11">
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <AdminSegmented<SubstituteFilter>
            ariaLabel="Vertretung"
            value={filters.substitute}
            onChange={(v) => setFilter('substitute', v)}
            options={[
              { value: 'alle', label: 'Alle' },
              { value: 'open', label: 'Offen' },
              { value: 'entered', label: 'In Untis erfasst' },
            ]}
          />
          <Select value={filters.typeId} onValueChange={(v) => setFilter('typeId', v)}>
            <SelectTrigger aria-label="Art" className="min-h-11 w-full rounded-xl border-ws-line bg-ws-surface text-ws-text sm:w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle" className="min-h-11">Alle Arten</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={t.id} className="min-h-11">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-full sm:w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ws-muted" aria-hidden />
            <Input
              type="search"
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Name suchen …"
              aria-label="Nach Name suchen"
              className="min-h-11 rounded-xl border-ws-line bg-ws-surface pl-9 text-ws-text"
            />
          </div>
        </div>

        {offlineSince && (
          <p role="status" className="flex items-center gap-2 text-sm text-ws-muted">
            <WifiOff className="size-4" aria-hidden />
            Offline – Stand von {offlineSince}
          </p>
        )}
      </div>

      {/* Inhalt */}
      {loading && !items ? (
        <AdminLoadingState variant="list" rows={6} />
      ) : failed && !items ? (
        <AdminErrorState onRetry={() => void load()} />
      ) : visible.length === 0 ? (
        <AdminEmptyState
          icon={CalendarDays}
          title="Keine Abwesenheiten in diesem Zeitraum"
          description="Sobald jemand eine Fortbildung oder Dienstreise einträgt, steht sie hier."
          action={
            <Button onClick={() => openCreate()} disabled={!me} className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover">
              <Plus className="mr-2 size-4" aria-hidden />
              Abwesenheit eintragen
            </Button>
          }
        />
      ) : view === 'list' ? (
        <ListView items={visible} highlighted={highlighted} onOpen={(a) => setOpenId(a.id)} />
      ) : view === 'week' ? (
        <WeekView anchor={anchor} items={visible} today={today} highlighted={highlighted} onOpen={(a) => setOpenId(a.id)} />
      ) : (
        <MonthView
          anchor={anchor}
          items={visible}
          today={today}
          highlighted={highlighted}
          onOpen={(a) => setOpenId(a.id)}
          onMore={(day) => setDayListFor(day)}
          dayListFor={dayListFor}
        />
      )}

      {/* Tagesliste („+N weitere“) */}
      {dayListFor && (
        <section aria-label={`Einträge am ${formatLongDay(dayListFor)}`} className="space-y-3 rounded-2xl border border-ws-line bg-ws-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-ws-text">{formatLongDay(dayListFor)}</h3>
            <Button variant="outline" className="min-h-11 rounded-xl" onClick={() => setDayListFor(null)}>
              Schließen
            </Button>
          </div>
          {absencesOnDay(visible, dayListFor).map((a) => (
            <AbsenceCard key={a.id} absence={a} onOpen={(x) => setOpenId(x.id)} highlighted={highlighted.has(a.id)} />
          ))}
        </section>
      )}

      <AbsenceDetailSheet
        open={openId !== null}
        onOpenChange={(o) => !o && setOpenId(null)}
        absence={opened}
        isMobile={isMobile}
        canEdit={!!opened?.canEdit}
        canSetStatus={isPlanner}
        busy={busy}
        onEdit={() => opened && openEdit(opened)}
        onDelete={() => opened && void remove(opened)}
        onSetStatus={(s) => opened && void setStatus(opened, s)}
      />

      {form && (
        <AbsenceFormDialog
          key={form.editing?.id ?? 'neu'}
          open
          onOpenChange={(o) => !o && setForm(null)}
          initial={form.initial}
          editing={form.editing}
          types={types}
          teachers={teachers}
          externalChange={externalChange}
          onReload={() => {
            const fresh = items?.find((a) => a.id === form.editing?.id)
            if (fresh) setForm({ editing: fresh, initial: formFromAbsence(fresh) })
            else setForm(null)
          }}
          onSubmit={submitForm}
          onShowExisting={(id) => {
            setForm(null)
            setOpenId(id)
          }}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------- Ansichten */

function ListView({ items, highlighted, onOpen }: { items: Absence[]; highlighted: Set<string>; onOpen: (a: Absence) => void }) {
  const groups = groupByStartDay(items)
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.day} aria-label={formatLongDay(g.day)} className="space-y-2">
          <h3 className="text-sm font-semibold text-ws-muted">{formatLongDay(g.day)}</h3>
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {g.items.map((a) => (
              <AbsenceCard key={a.id} absence={a} onOpen={onOpen} highlighted={highlighted.has(a.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

/** Kompakte Marke für Monats- und Wochenraster: Icon, Name, Vertretungsstatus als Text */
function Chip({ absence, day, highlighted, onOpen }: { absence: Absence; day: string; highlighted?: boolean; onOpen: (a: Absence) => void }) {
  const starts = absence.dateFrom === day
  const ends = absence.dateTo === day
  const open = absence.substituteStatus === 'open'
  return (
    <button
      type="button"
      onClick={() => onOpen(absence)}
      title={`${absence.personName}: ${absence.typeName}${open ? ', Vertretung offen' : ''}`}
      className={cn(
        'flex min-h-11 w-full items-center gap-1 border px-1.5 text-left text-xs font-medium sm:min-h-7',
        ABSENCE_TINT[absence.typeColor],
        starts ? 'rounded-l-lg' : 'rounded-l-none border-l-0',
        ends ? 'rounded-r-lg' : 'rounded-r-none border-r-0',
        open && 'border-b-2 border-b-ws-red',
        absence.substituteStatus === 'entered' && 'border-b-2 border-b-ws-green',
        highlighted && 'ring-2 ring-ws-green/70',
        'transition-shadow duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
      )}
    >
      <AbsenceIcon name={absence.typeIcon} className="size-3.5 shrink-0" />
      <span className="truncate">{absence.personName}</span>
      {open && <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase text-ws-red">offen</span>}
      {absence.substituteStatus === 'entered' && <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase text-ws-green">Untis</span>}
    </button>
  )
}

function MonthView({
  anchor,
  items,
  today,
  highlighted,
  onOpen,
  onMore,
  dayListFor,
}: {
  anchor: string
  items: Absence[]
  today: string
  highlighted: Set<string>
  onOpen: (a: Absence) => void
  onMore: (day: string) => void
  dayListFor: string | null
}) {
  const days = monthGrid(anchor)
  const month = anchor.slice(0, 7)
  return (
    <div className="overflow-hidden rounded-2xl border border-ws-line bg-ws-surface" role="grid" aria-label="Monatsübersicht">
      <div className="grid grid-cols-7 border-b border-ws-line bg-ws-raised/50" role="row">
        {WEEKDAYS.map((d) => (
          <div key={d} role="columnheader" className="px-2 py-2 text-center text-xs font-semibold text-ws-muted">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7" role="rowgroup">
        {days.map((day) => {
          const list = absencesOnDay(items, day)
          const inMonth = day.startsWith(month)
          return (
            <div
              key={day}
              role="gridcell"
              aria-label={formatLongDay(day)}
              className={cn(
                'min-h-24 space-y-1 border-b border-r border-ws-line p-1 last:border-r-0 [&:nth-child(7n)]:border-r-0',
                !inMonth && 'bg-ws-bg/40',
                isWeekend(day) && 'bg-ws-raised/30',
              )}
            >
              <span
                className={cn(
                  'inline-flex size-6 items-center justify-center rounded-full text-xs',
                  inMonth ? 'text-ws-text' : 'text-ws-faint',
                  day === today && 'bg-ws-green font-bold text-ws-on-accent',
                )}
              >
                {Number(day.slice(8))}
              </span>
              {list.slice(0, MONTH_CHIPS).map((a) => (
                <Chip key={a.id} absence={a} day={day} highlighted={highlighted.has(a.id)} onOpen={onOpen} />
              ))}
              {list.length > MONTH_CHIPS && (
                <button
                  type="button"
                  onClick={() => onMore(day)}
                  aria-pressed={dayListFor === day}
                  className="min-h-11 w-full rounded-lg px-1 text-left text-xs font-medium text-ws-blue hover:bg-ws-raised sm:min-h-7"
                >
                  +{list.length - MONTH_CHIPS} weitere
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function WeekView({ anchor, items, today, highlighted, onOpen }: { anchor: string; items: Absence[]; today: string; highlighted: Set<string>; onOpen: (a: Absence) => void }) {
  const days = weekDays(anchor)
  return (
    <div className="grid gap-2 md:grid-cols-7">
      {days.map((day, i) => {
        const list = absencesOnDay(items, day)
        return (
          <section
            key={day}
            aria-label={formatLongDay(day)}
            className={cn('min-h-32 space-y-1.5 rounded-2xl border bg-ws-surface p-2', day === today ? 'border-ws-green' : 'border-ws-line', isWeekend(day) && 'bg-ws-raised/30')}
          >
            <h3 className={cn('text-xs font-semibold', day === today ? 'text-ws-green' : 'text-ws-muted')}>
              {WEEKDAYS[i]}, {Number(day.slice(8))}.{day.slice(5, 7)}.
            </h3>
            {list.length === 0 && <p className="text-xs text-ws-faint">Keine Einträge</p>}
            {list.map((a) => (
              <div key={a.id} className="space-y-0.5">
                <Chip absence={a} day={day} highlighted={highlighted.has(a.id)} onOpen={onOpen} />
                {!a.allDay && a.timeFrom && a.timeTo && (
                  <p className="px-1 text-[11px] text-ws-muted">
                    {a.timeFrom}–{a.timeTo} Uhr
                  </p>
                )}
              </div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
