'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { ForumEditor } from '@/components/admin/forum-editor'
import { useForumCatalog } from '@/components/admin/use-forum-catalog'
import { LEHRERZIMMER_HREF } from '@/lib/admin-nav'
import {
  FORUM_CATEGORIES,
  FORUM_CATEGORY_LABEL,
  FORUM_LIMITS,
  postInputSchema,
  type ForumCategory,
  type ForumThread,
} from '@/lib/forum'
import { forumJson, forumRequest } from '@/lib/forum-client'
import { cn } from '@/lib/utils'

const NONE = 'none'
const DRAFT_KEY = 'forum-draft-v1'
const CATEGORY_HINT: Record<ForumCategory, string> = {
  tipp: 'Etwas, das bei dir gut funktioniert hat',
  frage: 'Du brauchst die Erfahrung der anderen',
  idee: 'Ein Vorschlag für den Unterricht',
}
const chipClass =
  'min-h-11 flex-1 flex-col items-start gap-0 rounded-xl border border-ws-line px-4 py-2 text-left text-ws-muted hover:bg-ws-raised hover:text-ws-text data-[state=on]:border-ws-green/30 data-[state=on]:bg-ws-green/15 data-[state=on]:text-ws-green'

type FieldErrors = Partial<Record<'category' | 'title' | 'body' | 'form', string>>

interface Draft {
  category: ForumCategory | ''
  title: string
  body: string
  departmentId: string
  subjectId: string
}

function readDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const d = JSON.parse(raw) as Partial<Draft>
    if (!d.title && !d.body) return null
    return {
      category: (FORUM_CATEGORIES as readonly string[]).includes(d.category ?? '') ? (d.category as ForumCategory) : '',
      title: typeof d.title === 'string' ? d.title : '',
      body: typeof d.body === 'string' ? d.body : '',
      departmentId: typeof d.departmentId === 'string' ? d.departmentId : NONE,
      subjectId: typeof d.subjectId === 'string' ? d.subjectId : NONE,
    }
  } catch {
    return null
  }
}

function writeDraft(draft: Draft | null) {
  try {
    if (draft) window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    else window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    /* Speicher gesperrt (privates Fenster): der Entwurf ist nur eine Zugabe */
  }
}

/** Beitrag schreiben oder bearbeiten (PROJ-63). Ein Entwurf wird lokal gemerkt. */
export function ForumPostForm({ postId }: { postId?: string }) {
  const router = useRouter()
  const catalog = useForumCatalog()
  const editing = !!postId

  const [category, setCategory] = useState<ForumCategory | ''>('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [departmentId, setDepartmentId] = useState(NONE)
  const [subjectId, setSubjectId] = useState(NONE)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(editing)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)
  const [initialTitle, setInitialTitle] = useState<string | null>(null)
  const done = useRef(false)
  const departmentTouched = useRef(false)

  // Bearbeiten: vorhandenen Beitrag laden (nur eigene)
  useEffect(() => {
    if (!postId) return
    let cancelled = false
    void (async () => {
      const res = await forumRequest<ForumThread>(`/api/admin/lehrerzimmer/posts/${postId}`)
      if (cancelled) return
      if (!res.ok) {
        setLoadError(res.status === 404 ? 'Dieser Beitrag existiert nicht mehr.' : res.error)
      } else if (!res.data.post.is_mine) {
        setLoadError('Du kannst nur eigene Beiträge bearbeiten.')
      } else {
        const p = res.data.post
        setCategory(p.category)
        setTitle(p.title)
        setBody(p.body)
        setDepartmentId(p.department_id ?? NONE)
        setSubjectId(p.subject_id ?? NONE)
        setInitialTitle(p.title)
        departmentTouched.current = true
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [postId])

  // Neu: gemerkten Entwurf zurückholen
  useEffect(() => {
    if (editing) return
    const draft = readDraft()
    if (!draft) return
    setCategory(draft.category)
    setTitle(draft.title)
    setBody(draft.body)
    setDepartmentId(draft.departmentId)
    setSubjectId(draft.subjectId)
    departmentTouched.current = draft.departmentId !== NONE
    setDraftRestored(true)
    setDirty(true)
  }, [editing])

  // Neu: eigenen Fachbereich vorbelegen, wenn es genau einen gibt
  useEffect(() => {
    if (editing || !catalog.loaded || departmentTouched.current) return
    if (catalog.ownDepartmentIds.length === 1) setDepartmentId(catalog.ownDepartmentIds[0])
  }, [editing, catalog.loaded, catalog.ownDepartmentIds])

  // Neu: Entwurf laufend sichern
  useEffect(() => {
    if (editing || done.current || !dirty) return
    writeDraft({ category, title, body, departmentId, subjectId })
  }, [editing, dirty, category, title, body, departmentId, subjectId])

  // Beim Verlassen des Fensters mit ungespeicherten Änderungen nachfragen
  useEffect(() => {
    if (!dirty) return
    const handler = (e: BeforeUnloadEvent) => {
      if (done.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const touch = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setDirty(true)
  }
  const subjects = catalog.subjects.filter((s) => departmentId === NONE || s.department_id === departmentId)

  function onDepartmentChange(v: string) {
    departmentTouched.current = true
    setDepartmentId(v)
    const subject = catalog.subjects.find((s) => s.id === subjectId)
    if (subject && v !== NONE && subject.department_id !== v) setSubjectId(NONE)
    setDirty(true)
  }

  function onSubjectChange(v: string) {
    setSubjectId(v)
    const subject = catalog.subjects.find((s) => s.id === v)
    if (subject) {
      departmentTouched.current = true
      setDepartmentId(subject.department_id)
    }
    setDirty(true)
  }

  function discardDraft() {
    writeDraft(null)
    setCategory('')
    setTitle('')
    setBody('')
    setSubjectId(NONE)
    setDraftRestored(false)
    setDirty(false)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = postInputSchema.safeParse({
      category: category || undefined,
      title,
      body,
      department_id: departmentId === NONE ? null : departmentId,
      subject_id: subjectId === NONE ? null : subjectId,
    })
    if (!parsed.success) {
      const next: FieldErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0]
        if ((key === 'category' || key === 'title' || key === 'body') && !next[key]) next[key] = issue.message
        // Fachbereich/Fach haben kein eigenes Feld für Fehler: sichtbar im Formular-Fehler statt still verschluckt
        else if (!next.form) next.form = 'Bitte prüfe Fachbereich und Fach und wähle sie neu aus.'
      }
      setErrors(next)
      return
    }
    setErrors({})
    setBusy(true)
    const res = editing
      ? await forumRequest(`/api/admin/lehrerzimmer/posts/${postId}`, forumJson('PATCH', parsed.data))
      : await forumRequest<{ id: string }>('/api/admin/lehrerzimmer/posts', forumJson('POST', parsed.data))
    setBusy(false)
    if (!res.ok) {
      setErrors({ form: res.error })
      return
    }
    done.current = true
    writeDraft(null)
    toast.success(editing ? 'Änderungen gespeichert' : 'Beitrag veröffentlicht')
    const id = editing ? postId : (res.data as { id: string }).id
    router.push(`${LEHRERZIMMER_HREF}/${id}`)
  }

  const heading = editing ? 'Beitrag bearbeiten' : 'Neuer Beitrag'
  const backHref = editing ? `${LEHRERZIMMER_HREF}/${postId}` : LEHRERZIMMER_HREF
  const triggerClass = 'h-11 w-full rounded-xl border-ws-line bg-ws-bg text-ws-text'
  const contentClass = 'border-ws-line bg-ws-surface text-ws-text'

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={heading} breadcrumb={heading} />
        <AdminLoadingState variant="form" rows={4} label="Beitrag wird geladen …" />
      </div>
    )
  }
  if (loadError) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title={heading} breadcrumb={heading} />
        <AdminErrorState message={loadError} />
        <Button asChild variant="outline" className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text">
          <Link href={LEHRERZIMMER_HREF}>Zurück zum Lehrerzimmer</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={heading}
        description={editing ? initialTitle ?? undefined : 'Teile einen Tipp, stelle eine Frage oder bring eine Idee ein.'}
        breadcrumb={heading}
      />

      <form onSubmit={submit} noValidate className="max-w-2xl space-y-6 rounded-2xl border border-ws-line bg-ws-surface p-4 sm:p-6">
        {draftRestored && (
          <p role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ws-blue/30 bg-ws-blue/15 p-3 text-sm text-ws-blue">
            <span>Dein gemerkter Entwurf wurde wiederhergestellt.</span>
            <Button type="button" variant="ghost" onClick={discardDraft} className="min-h-11 rounded-xl text-ws-blue hover:bg-ws-blue/15 hover:text-ws-blue">
              Entwurf verwerfen
            </Button>
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-ws-text">Kategorie</legend>
          <ToggleGroup
            type="single"
            value={category}
            onValueChange={(v) => touch(setCategory)((v as ForumCategory) || '')}
            className="flex flex-col gap-2 sm:flex-row"
            aria-label="Kategorie"
          >
            {FORUM_CATEGORIES.map((c) => (
              <ToggleGroupItem key={c} value={c} className={chipClass}>
                <span className="font-semibold">{FORUM_CATEGORY_LABEL[c]}</span>
                <span className="text-xs font-normal opacity-90">{CATEGORY_HINT[c]}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {errors.category && <p role="alert" className="text-sm text-ws-red">{errors.category}</p>}
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="forum-title">Titel</Label>
          <Input
            id="forum-title"
            value={title}
            onChange={(e) => touch(setTitle)(e.target.value.slice(0, FORUM_LIMITS.titleMax))}
            maxLength={FORUM_LIMITS.titleMax}
            placeholder="Worum geht es?"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'forum-title-error' : undefined}
            className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
          />
          <div className="flex justify-between gap-2">
            <p id="forum-title-error" role={errors.title ? 'alert' : undefined} className="text-sm text-ws-red">{errors.title}</p>
            <p className="text-xs text-ws-faint">{title.length} / {FORUM_LIMITS.titleMax}</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium leading-none text-ws-text">Text</p>
          <ForumEditor
            value={body}
            onChange={touch(setBody)}
            maxLength={FORUM_LIMITS.bodyMax}
            label="Text des Beitrags"
            placeholder="Schreibe hier. Mit den Symbolen oben kannst du Text fett oder kursiv machen, Listen anlegen und Links einfügen."
            invalid={!!errors.body}
            describedBy={errors.body ? 'forum-body-error' : undefined}
          />
          {errors.body && <p id="forum-body-error" role="alert" className="text-sm text-ws-red">{errors.body}</p>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="forum-department">Fachbereich (optional)</Label>
            <Select value={departmentId} onValueChange={onDepartmentChange}>
              <SelectTrigger id="forum-department" className={triggerClass}><SelectValue /></SelectTrigger>
              <SelectContent className={contentClass}>
                <SelectItem value={NONE}>Keiner</SelectItem>
                {catalog.departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="forum-subject">Fach (optional)</Label>
            <Select value={subjectId} onValueChange={onSubjectChange}>
              <SelectTrigger id="forum-subject" className={triggerClass}><SelectValue /></SelectTrigger>
              <SelectContent className={contentClass}>
                <SelectItem value={NONE}>Keines</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {errors.form && <p role="alert" className={cn('rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red')}>{errors.form}</p>}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy} className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover">
            {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {editing ? 'Speichern' : 'Veröffentlichen'}
          </Button>
          <Button asChild type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line bg-transparent text-ws-text hover:bg-ws-raised hover:text-ws-text">
            <Link href={backHref}>Abbrechen</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
