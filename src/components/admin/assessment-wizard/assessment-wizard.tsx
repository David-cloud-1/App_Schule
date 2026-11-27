'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AdminLoadingState } from '@/components/admin/admin-states'
import { useOptionalAdminRole } from '@/components/admin/admin-role-provider'
import { DEFAULT_FOCUS_FORM, focusFormToPayload, validateFocusForm, type FocusFormValue } from '@/components/admin/focus-settings-fields'
import { IHK_DEFAULT_SCALE, validateGradingScale, type GradeBoundary } from '@/components/admin/grading-scale-editor'
import type { SwapState } from '@/components/admin/assessment-suggest-preview'
import { schoolYearFor } from '@/lib/assessment-category'
import {
  defaultClosesAt,
  fromSchoolInputValue,
  toSchoolInputValue,
} from '@/lib/assessment-deadline'
import {
  classNameForApi,
  initialWhat,
  mixFor,
  parseCount,
  readHandoff,
  reviewState,
  suggestTitle,
  validateWhat,
  validateWhen,
  hitToCandidate,
  type WhatErrors,
  type WhatValues,
  type WhenErrors,
  type WhenValues,
  type WizardStep,
} from '@/lib/assessment-draft'
import type { Facets, SearchHit } from '@/lib/assessment-question-search'
import { summarize, type Candidate } from '@/lib/assessment-suggest'
import { QuestionSearchSheet } from './question-search-sheet'
import { WizardStepReview, type SuggestMeta } from './wizard-step-review'
import { WizardStepWhat, type DepartmentChoice } from './wizard-step-what'
import { WizardStepWhen } from './wizard-step-when'
import { STEP_LABELS, WizardSteps } from './wizard-steps'

const SUGGEST = '/api/admin/assessments/suggest'
const SEARCH = '/api/admin/assessments/questions/search'
/** Markiert in der Rückfrage „Zurück-Taste“ statt eines Links */
const BACK = '__back__'
const FAIL = 'Das hat nicht geklappt. Bitte versuche es erneut.'

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

/**
 * Nachweis anlegen in drei Schritten (PROJ-133). Alle Angaben leben nur in dieser
 * Seite; in der Datenbank entsteht erst mit „Entwurf speichern“ etwas.
 */
export function AssessmentWizard() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const role = useOptionalAdminRole()
  const scopeCurrent = role?.scope?.current

  // --- Bereich ---
  const [departments, setDepartments] = useState<DepartmentChoice[]>([])
  const [departmentsLoading, setDepartmentsLoading] = useState(true)
  const [departmentId, setDepartmentId] = useState('')
  const [departmentError, setDepartmentError] = useState<string | null>(null)
  const [facets, setFacets] = useState<Facets | null>(null)
  const [facetsLoading, setFacetsLoading] = useState(false)
  const [facetsFailed, setFacetsFailed] = useState(false)
  const [classes, setClasses] = useState<string[]>([])

  // --- Ablauf ---
  const [step, setStep] = useState<WizardStep>(1)
  const [reached, setReached] = useState<WizardStep>(1)
  const [what, setWhat] = useState<WhatValues>(initialWhat)
  const [whatErrors, setWhatErrors] = useState<WhatErrors>({})
  const [items, setItems] = useState<Candidate[]>([])
  const [locked, setLocked] = useState<Set<string>>(new Set())
  const [swap, setSwap] = useState<SwapState | null>(null)
  const [meta, setMeta] = useState<SuggestMeta | null>(null)
  const [suggested, setSuggested] = useState(false)
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const [when, setWhen] = useState<WhenValues>({
    title: '',
    classChoice: { kind: 'unset' },
    opensAt: '',
    closesAt: '',
    durationMinutes: '45',
  })
  const [whenErrors, setWhenErrors] = useState<WhenErrors>({})
  const [schoolYear, setSchoolYear] = useState(() => schoolYearFor(new Date()))
  const [scale, setScale] = useState<GradeBoundary[]>(IHK_DEFAULT_SCALE)
  const [scaleError, setScaleError] = useState<string | undefined>()
  const [focus, setFocus] = useState<FocusFormValue>(DEFAULT_FOCUS_FORM)
  const [focusError, setFocusError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const titleTouched = useRef(false)
  const durationTouched = useRef(false)
  const done = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const now = useCallback(() => new Date(), [])
  const currentSchoolYear = useMemo(() => schoolYearFor(new Date()), [])

  // Sobald etwas eingegeben wurde, bleibt die Rückfrage aktiv, auch wenn man alles wieder zurückstellt
  const dirtyNow = items.length > 0 || reached > 1 || JSON.stringify(what) !== JSON.stringify(initialWhat())
  const dirtyLatch = useRef(false)
  if (dirtyNow) dirtyLatch.current = true
  const dirty = dirtyLatch.current
  const sentinelPushed = useRef(false)

  // Bereiche laden; ein Bereich: fest, sonst der Bereich aus dem Umschalter (PROJ-130)
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/assessments/departments')
      .then((res) => (res.ok ? res.json() : { departments: [], suggestedDepartmentId: null }))
      .then((data) => {
        if (cancelled) return
        const list: DepartmentChoice[] = (data.departments ?? []).map((d: DepartmentChoice) => ({ id: d.id, name: d.name }))
        setDepartments(list)
        if (list.length === 1) setDepartmentId(list[0].id)
        else if (scopeCurrent && list.some((d) => d.id === scopeCurrent)) setDepartmentId(scopeCurrent)
        else if (scopeCurrent === undefined && data.suggestedDepartmentId) setDepartmentId(data.suggestedDepartmentId)
      })
      .catch(() => !cancelled && setDepartments([]))
      .finally(() => !cancelled && setDepartmentsLoading(false))
    return () => {
      cancelled = true
    }
    // Der Bereich gilt ab dem Start des Ablaufs; ein späterer Wechsel im Umschalter ändert ihn nicht (Edge Case Bereichswechsel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadFacets = useCallback(async (id: string) => {
    setFacetsLoading(true)
    setFacetsFailed(false)
    try {
      const [f, c] = await Promise.all([
        postJson(SEARCH, { action: 'facets', departmentId: id }),
        fetch(`/api/admin/assessments/category-options?departmentId=${id}`).then((r) => (r.ok ? r.json() : { classes: [] })),
      ])
      if (!f.ok) throw new Error()
      setFacets(f.data as Facets)
      setClasses(c.classes ?? [])
    } catch {
      setFacetsFailed(true)
    } finally {
      setFacetsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!departmentId) {
      setFacets(null)
      return
    }
    void loadFacets(departmentId)
  }, [departmentId, loadFacets])

  // Start bei Schritt 2: aus „Schwierig“ (markierte Fragen) oder aus einer Übungsprüfung (?set=)
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current || departmentsLoading || departments.length === 0) return
    const fromDifficult = searchParams.get('aus') === 'schwierig'
    const setId = searchParams.get('set')
    if (!fromDifficult && !setId) return
    startedRef.current = true

    void (async () => {
      let ids: string[] = []
      let dept = departmentId
      let duration: number | null = null
      let title: string | null = null
      let cutOff = 0
      if (fromDifficult) {
        const handoff = readHandoff(window.sessionStorage)
        if (handoff) {
          ids = handoff.questionIds
          if (handoff.departmentId && departments.some((d) => d.id === handoff.departmentId)) dept = handoff.departmentId
        }
      } else if (setId) {
        const res = await fetch('/api/admin/exam-sets')
        const json = res.ok ? await res.json() : { sets: [] }
        const found = (json.sets ?? []).find((s: { id: string }) => s.id === setId) as
          | { name: string; question_ids: string[]; duration_minutes: number | null; department_id?: string }
          | undefined
        if (found) {
          ids = found.question_ids.slice(0, 60)
          if (found.question_ids.length > 60) cutOff = found.question_ids.length - 60
          duration = found.duration_minutes
          title = `${found.name} – Leistungsnachweis`
          if (found.department_id && departments.some((d) => d.id === found.department_id)) dept = found.department_id
        }
      }
      if (ids.length === 0 || !dept) {
        setNotice('Die übergebenen Fragen konnten nicht übernommen werden. Du kannst von vorn beginnen.')
        return
      }
      const { ok, data } = await postJson(SEARCH, { action: 'lookup', departmentId: dept, ids: ids.slice(0, 60) })
      if (!ok) {
        setNotice('Die übergebenen Fragen konnten nicht geladen werden. Du kannst von vorn beginnen.')
        return
      }
      const found = (data.items as SearchHit[]).map(hitToCandidate)
      // Reihenfolge der Übergabe behalten
      found.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      setDepartmentId(dept)
      setItems(found)
      setWhat((w) => ({ ...w, subjects: [...new Set(found.flatMap((q) => q.subject_codes))], topics: [...new Set(found.map((q) => q.topic).filter((t): t is string => !!t))] }))
      if (title) {
        setWhen((v) => ({ ...v, title }))
        titleTouched.current = true
      }
      if (duration) {
        setWhen((v) => ({ ...v, durationMinutes: String(duration) }))
        durationTouched.current = true
      }
      const missing = (data.missing as string[]).length
      const notes: string[] = []
      if (missing > 0) {
        notes.push(
          `${missing} ${missing === 1 ? 'Frage gehört' : 'Fragen gehören'} nicht zu diesem Bereich oder ${missing === 1 ? 'ist' : 'sind'} nicht für Nachweise zulässig und bleiben außen vor.`,
        )
      }
      if (cutOff > 0) {
        notes.push(`Ein Nachweis aus einer Übungsprüfung nimmt höchstens 60 Fragen auf. ${cutOff} ${cutOff === 1 ? 'Frage wurde' : 'Fragen wurden'} nicht übernommen.`)
      }
      if (notes.length > 0) setNotice(notes.join(' '))
      setReached(2)
      setStep(2)
    })()
  }, [departmentsLoading, departments, departmentId, searchParams])

  // Fokus beim Schrittwechsel auf die Überschrift
  useEffect(() => {
    headingRef.current?.focus()
  }, [step])

  // Rückfrage beim Verlassen: Schließen/Neuladen über den Browser, Seitenwechsel in der App über eigene Abfrage
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (done.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    const onClick = (e: MouseEvent) => {
      if (done.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const href = a.getAttribute('href') ?? ''
      if (!href.startsWith('/') || href.startsWith('//')) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(href)
    }
    // Zurück-Taste und Wischgeste: Ein Zwischeneintrag im Verlauf fängt sie ab und fragt nach
    if (!sentinelPushed.current) {
      sentinelPushed.current = true
      window.history.pushState({ nachweisNeu: true }, '', window.location.href)
    }
    const onPopState = () => {
      if (done.current) return
      window.history.pushState({ nachweisNeu: true }, '', window.location.href)
      setPendingHref(BACK)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('popstate', onPopState)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('popstate', onPopState)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  // --- Vorschlag ---
  function criteria() {
    return {
      departmentId,
      subjects: what.subjects,
      topics: what.topics.filter((t) => (facets?.topics ?? []).some((x) => x.name === t)),
      classLevel: what.classLevel === 'all' ? null : Number(what.classLevel),
      exclude: { blocked: what.exBlocked, reported: what.exReported, recent: Number(what.recent) as 0 | 1 | 3 | 5 },
      alreadyChosenIds: [] as string[],
    }
  }

  async function generate(keep: Set<string>, previous: Candidate[]): Promise<boolean> {
    setBusy(true)
    setSwap(null)
    try {
      const { ok, data } = await postJson(SUGGEST, {
        action: 'suggest',
        ...criteria(),
        count: parseCount(what.countText),
        mix: mixFor(what),
        keepIds: [...keep],
        preferNotIds: previous.map((q) => q.id).filter((id) => !keep.has(id)),
      })
      if (!ok) throw new Error(data?.error ?? FAIL)
      setItems(data.items)
      setMeta({
        shortages: data.shortages,
        emptyTopics: data.emptyTopics,
        poolSize: data.poolSize,
        hiddenByRecent: data.hiddenByRecent ?? 0,
        statsAvailable: data.statsAvailable,
      })
      setLocked(new Set([...keep].filter((id) => (data.items as Candidate[]).some((q) => q.id === id))))
      setSuggested(true)
      setRejectedIds(new Set())
      return true
    } catch (e) {
      toast.error(e instanceof Error ? e.message : FAIL)
      return false
    } finally {
      setBusy(false)
    }
  }

  // Ein anderer Bereich hat andere Fragen: Auswahl und Vorschlag beginnen von vorn (BUG-2)
  function onDepartmentChange(id: string) {
    if (id === departmentId) return
    const hadQuestions = items.length > 0
    setDepartmentId(id)
    setDepartmentError(null)
    setWhat((w) => ({ ...w, subjects: [], topics: [] }))
    setItems([])
    setLocked(new Set())
    setRejectedIds(new Set())
    setSwap(null)
    setMeta(null)
    setSuggested(false)
    setReached(1)
    setNotice(hadQuestions ? 'Du hast den Bereich gewechselt. Die bisher gewählten Fragen gehören zum anderen Bereich und wurden entfernt.' : null)
  }

  function goTo(next: WizardStep) {
    setStep(next)
    setReached((r) => (next > r ? next : r))
  }

  async function onSuggest() {
    if (!departmentId) return setDepartmentError('Bitte wähle einen Bereich.')
    const errors = validateWhat(what)
    setWhatErrors(errors)
    if (Object.keys(errors).length > 0) return
    setNotice(null)
    if (await generate(new Set(), [])) goTo(2)
  }

  function onStartEmpty() {
    if (!departmentId) return setDepartmentError('Bitte wähle einen Bereich.')
    setNotice(null)
    setItems([])
    setMeta(null)
    setSuggested(false)
    setLocked(new Set())
    goTo(2)
    // „Selbst erstellen“: gleich die Suche öffnen, damit man sofort Fragen wählen kann
    setSearchOpen(true)
  }

  async function openSwap(id: string) {
    setSwap({ forId: id, alternatives: null })
    const { ok, data } = await postJson(SUGGEST, {
      action: 'alternatives',
      ...criteria(),
      questionId: id,
      excludeIds: items.map((q) => q.id),
    })
    if (!ok) {
      setSwap(null)
      return toast.error(data?.error ?? 'Alternativen konnten nicht geladen werden.')
    }
    setSwap((cur) => (cur?.forId === id ? { forId: id, alternatives: data.alternatives } : cur))
  }

  const removeItem = (id: string) => {
    setItems((cur) => cur.filter((q) => q.id !== id))
    setLocked((cur) => {
      const n = new Set(cur)
      n.delete(id)
      return n
    })
    setRejectedIds((cur) => {
      const n = new Set(cur)
      n.delete(id)
      return n
    })
    setSwap((cur) => (cur?.forId === id ? null : cur))
  }

  function pickAlternative(forId: string, alt: Candidate) {
    setItems((cur) => cur.map((q) => (q.id === forId ? alt : q)))
    setLocked((cur) => {
      const n = new Set(cur)
      n.delete(forId)
      return n
    })
    setRejectedIds((cur) => {
      const n = new Set(cur)
      n.delete(forId)
      return n
    })
    setSwap(null)
  }

  function toggleLock(id: string) {
    setLocked((cur) => {
      const n = new Set(cur)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function reorder(ids: string[]) {
    setItems((cur) => {
      const byId = new Map(cur.map((q) => [q.id, q]))
      return ids.map((id) => byId.get(id)).filter((q): q is Candidate => !!q)
    })
  }

  // --- Schritt 3 vorbereiten ---
  function continueToWhen() {
    if (!reviewState(items.length).canContinue) return
    // Titel und Dauer folgen den Angaben, solange die Lehrkraft sie nicht von Hand geändert hat.
    // „Beitritt bis“ wird nur vorbelegt, nie überschrieben.
    const minutes = summarize(items).minutes
    setWhen((v) => ({
      ...v,
      title: titleTouched.current && v.title ? v.title : suggestTitle(what.subjects, what.topics, new Date()),
      closesAt: v.closesAt || toSchoolInputValue(defaultClosesAt(new Date())),
      durationMinutes: durationTouched.current ? v.durationMinutes : String(Math.max(5, Math.ceil(minutes / 5) * 5)),
    }))
    goTo(3)
  }

  function onWhenChange(next: WhenValues) {
    if (next.title !== when.title) titleTouched.current = true
    if (next.durationMinutes !== when.durationMinutes) durationTouched.current = true
    setWhen(next)
  }

  const classOptions = useMemo(() => {
    if (what.classLevel === 'all') return classes
    const matching = classes.filter((c) => c.includes(what.classLevel))
    return matching.length > 0 ? matching : classes
  }, [classes, what.classLevel])

  // --- Speichern ---
  async function save() {
    if (saving) return
    const errors = validateWhen(when, new Date(), fromSchoolInputValue, classes)
    const sErr = validateGradingScale(scale)
    const fErr = validateFocusForm(focus)
    setWhenErrors(errors)
    setScaleError(sErr ?? undefined)
    setFocusError(fErr ?? undefined)
    if (Object.keys(errors).length > 0 || sErr || fErr) return

    setSaving(true)
    setSaveError(null)
    try {
      const closes = fromSchoolInputValue(when.closesAt)!
      const opens = when.opensAt ? fromSchoolInputValue(when.opensAt)! : new Date()
      const { ok, status, data } = await postJson('/api/admin/assessments', {
        departmentId,
        questionIds: items.map((q) => q.id),
        title: when.title.trim(),
        opensAt: opens.toISOString(),
        closesAt: closes.toISOString(),
        durationMinutes: Number(when.durationMinutes),
        gradingScale: scale,
        ...focusFormToPayload(focus),
        className: classNameForApi(when.classChoice),
        schoolYear,
      })
      if (!ok) {
        if (Array.isArray(data.invalidQuestionIds) && data.invalidQuestionIds.length > 0) {
          setRejectedIds(new Set(data.invalidQuestionIds as string[]))
          setStep(2)
          toast.error(data.error ?? 'Einige Fragen sind nicht mehr zulässig.')
        } else {
          setSaveError(status >= 500 || !data.error ? 'Der Entwurf konnte nicht gespeichert werden. Deine Angaben sind noch da.' : data.error)
        }
        return
      }
      done.current = true
      toast.success('Entwurf gespeichert')
      // Den Zwischeneintrag der Zurück-Taste ersetzen statt einen weiteren Eintrag anzulegen
      if (sentinelPushed.current) router.replace(`/admin/leistungsnachweise/${data.id}`)
      else router.push(`/admin/leistungsnachweise/${data.id}`)
    } catch {
      setSaveError('Keine Verbindung. Deine Angaben sind noch da, versuche es gleich noch einmal.')
    } finally {
      setSaving(false)
    }
  }

  const summaryData = summarize(items)
  const whenSummary = {
    subjects: what.subjects.join(' / '),
    topics: what.topics.length === 1 ? what.topics[0] : what.topics.length > 1 ? `${what.topics.length} Themen` : '',
    count: items.length,
    minutes: summaryData.minutes,
  }
  const review = reviewState(items.length)

  if (departmentsLoading) return <AdminLoadingState variant="form" />

  return (
    <div className="space-y-6">
      <WizardSteps current={step} reached={reached} onGo={(s) => (s === 3 ? continueToWhen() : goTo(s))} />

      <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-ws-text outline-none">
        <span className="text-ws-muted">Schritt {step} von 3: </span>
        {STEP_LABELS[step]}
      </h2>

      {notice && (
        <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange" role="status">{notice}</p>
      )}

      {step === 1 && (
        <WizardStepWhat
          values={what}
          onChange={(v) => {
            setWhat(v)
            if (Object.keys(whatErrors).length > 0) setWhatErrors({})
          }}
          errors={whatErrors}
          facets={facets}
          facetsLoading={facetsLoading}
          facetsFailed={facetsFailed}
          onRetryFacets={() => void loadFacets(departmentId)}
          departments={departments}
          departmentId={departmentId}
          onDepartmentChange={onDepartmentChange}
          departmentError={departmentError}
          busy={busy}
          onSuggest={onSuggest}
          onStartEmpty={onStartEmpty}
        />
      )}

      {step === 2 && (
        <>
          <WizardStepReview
            items={items}
            locked={locked}
            swap={swap}
            busy={busy}
            suggested={suggested}
            meta={meta}
            rejectedIds={rejectedIds}
            onToggleLock={toggleLock}
            onRemove={removeItem}
            onOpenSwap={openSwap}
            onCloseSwap={() => setSwap(null)}
            onPickAlternative={pickAlternative}
            onReorder={reorder}
            onReroll={() => void generate(locked, items)}
            onOpenSearch={() => setSearchOpen(true)}
            canReroll={Object.keys(validateWhat(what)).length === 0}
          />
          <QuestionSearchSheet
            open={searchOpen}
            onOpenChange={setSearchOpen}
            departmentId={departmentId}
            facets={facets}
            chosenIds={new Set(items.map((q) => q.id))}
            chosenCount={items.length}
            onAdd={(q) => setItems((cur) => (cur.some((x) => x.id === q.id) ? cur : [...cur, q]))}
            onRemove={removeItem}
          />
        </>
      )}

      {step === 3 && (
        <WizardStepWhen
          values={when}
          onChange={onWhenChange}
          errors={whenErrors}
          schoolYear={schoolYear}
          onSchoolYearChange={setSchoolYear}
          usedSchoolYears={[]}
          currentSchoolYear={currentSchoolYear}
          classOptions={classOptions}
          scale={scale}
          onScaleChange={(s) => {
            setScale(s)
            setScaleError(undefined)
          }}
          scaleError={scaleError}
          focus={focus}
          onFocusChange={(f) => {
            setFocus(f)
            setFocusError(undefined)
          }}
          focusError={focusError}
          summary={whenSummary}
          onEditWhat={() => goTo(1)}
          onEditReview={() => goTo(2)}
          now={now}
          disabled={saving}
        />
      )}

      {saveError && (
        <p className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red" role="alert">{saveError}</p>
      )}

      {step > 1 && (
        <div className="flex flex-col-reverse gap-2 border-t border-ws-line pt-4 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" className="min-h-11 rounded-xl border-ws-line" onClick={() => goTo((step - 1) as WizardStep)} disabled={saving || busy}>
            <ArrowLeft className="mr-2 size-4" aria-hidden /> Zurück
          </Button>
          {step === 2 ? (
            <Button
              type="button"
              onClick={continueToWhen}
              disabled={busy || !review.canContinue}
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              Weiter <ArrowRight className="ml-2 size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="min-h-11 rounded-xl bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {saveError ? 'Erneut versuchen' : 'Entwurf speichern'}
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={pendingHref !== null} onOpenChange={(o) => !o && setPendingHref(null)}>
        <AlertDialogContent className="rounded-2xl border-ws-line bg-ws-surface text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Angaben gehen verloren</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Der Nachweis ist noch nicht gespeichert. Wenn du die Seite verlässt, sind deine Angaben weg.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">Hier bleiben</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
              onClick={() => {
                done.current = true
                const href = pendingHref
                setPendingHref(null)
                if (href === BACK) window.history.go(-2)
                else if (href) router.push(href)
              }}
            >
              Verlassen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
