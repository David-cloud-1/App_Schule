'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Download,
  FileSpreadsheet,
  Loader2,
  Printer,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { AdminPageHeader } from '@/components/admin/admin-page-header'
import { AccessSlipsPrint } from '@/components/admin/access-slips'
import { useAdminRole } from '@/components/admin/admin-role-provider'
import {
  BULK_MAX_ROWS,
  TEMPLATE_FILENAME,
  RETRY_FILENAME,
  accessCsvFilename,
  buildAccessCsv,
  buildRetryCsv,
  buildTable,
  buildTemplateCsv,
  chunkRows,
  columnsComplete,
  detectColumns,
  mapRecords,
  readAccountCsv,
  roleLabelOf,
  summarizePreview,
  unusedHeaders,
  type BulkCreateResponse,
  type ColumnMap,
  type CreatedAccount,
  type CsvSource,
  type CsvTable,
  type FailedRow,
  type PreviewResponse,
  type PreviewRow,
  type RawAccountRow,
  type RowStatus,
} from '@/lib/account-create'

type Step = 'datei' | 'vorschau' | 'ergebnis'

type CreatedRow = CreatedAccount & { line: number }

const NO_COLUMN = '__keine'

const STEP_LABEL: Record<Step, string> = {
  datei: '1 · Datei wählen',
  vorschau: '2 · Vorschau prüfen',
  ergebnis: '3 · Zugangsdaten',
}

const STATUS_STYLE: Record<RowStatus, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'border-ws-green/30 bg-ws-green/15 text-ws-green' },
  warning: { label: 'Warnung', className: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange' },
  error: { label: 'Fehler', className: 'border-ws-red/30 bg-ws-red/15 text-ws-red' },
}

function StatusBadge({ status }: { status: RowStatus }) {
  const { label, className } = STATUS_STYLE[status]
  const Icon = status === 'ok' ? CheckCircle2 : status === 'warning' ? TriangleAlert : XCircle
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}

function downloadCsv(content: string, filename: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * „Konten aus Liste anlegen“ (PROJ-62, nur Super-Admin) in drei Schritten:
 * Datei wählen → Vorschau mit Fehlern → Zugangsdaten (einmalig sichtbar).
 *
 * Die Datei wird nur im Browser gelesen und nie gespeichert. Der Server
 * bekommt die erkannten Zeilen, prüft sie (Vorschau) und legt erst nach
 * dem Klick auf „Konten anlegen“ an, in kleinen Päckchen. Die Start-Passwörter
 * stehen nur im Arbeitsspeicher dieser Seite.
 */
export function BulkAccountImport() {
  const router = useRouter()
  const { scope } = useAdminRole()
  const departments = useMemo(() => (scope?.departments ?? []).filter((d) => d.isActive !== false), [scope])

  const [step, setStep] = useState<Step>('datei')
  const [fileName, setFileName] = useState<string | null>(null)
  const [source, setSource] = useState<CsvSource | null>(null)
  const [table, setTable] = useState<CsvTable | null>(null)
  const [showMapping, setShowMapping] = useState(false)
  const [map, setMap] = useState<ColumnMap>({ name: null, email: null, department: null, role: null })
  const [fileError, setFileError] = useState<string | null>(null)
  const [defaultDepartmentId, setDefaultDepartmentId] = useState('')

  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [rows, setRows] = useState<RawAccountRow[]>([])
  const [preview, setPreview] = useState<PreviewRow[]>([])

  const [creating, setCreating] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [created, setCreated] = useState<CreatedRow[]>([])
  const [failed, setFailed] = useState<FailedRow[]>([])
  const [retryRows, setRetryRows] = useState<RawAccountRow[]>([])
  const [abortMessage, setAbortMessage] = useState<string | null>(null)

  const [printing, setPrinting] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  // Ziel, das ein Klick auf einen Link während der offenen Zugangsdaten ansteuern wollte (BUG-2)
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const appUrl = typeof window === 'undefined' ? '' : window.location.origin
  const departmentInitialized = useRef(false)

  // Voreingestellt ist der Bereich, in dem der Super-Admin gerade arbeitet (PROJ-29)
  useEffect(() => {
    if (departmentInitialized.current) return
    departmentInitialized.current = true
    const current = scope?.current ?? null
    setDefaultDepartmentId(
      current && departments.some((d) => d.id === current) ? current : departments.length === 1 ? departments[0].id : '',
    )
  }, [scope, departments])

  // Reload oder Tab schließen, solange Passwörter nur hier stehen
  const hasSecrets = step === 'ergebnis' && created.length > 0
  useEffect(() => {
    if (!hasSecrets) return
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [hasSecrets])

  // Klicks auf Links im Rahmen (Seitenleiste, Kopfzeile) wechseln die Seite ohne Neuladen: abfangen und nachfragen
  useEffect(() => {
    if (!hasSecrets) return
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      // Fremde Adressen lädt der Browser neu: dafür warnt `beforeunload`
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      e.preventDefault()
      e.stopPropagation()
      setPendingHref(`${url.pathname}${url.search}${url.hash}`)
      setLeaveOpen(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [hasSecrets])

  const hasDepartmentColumn = map.department !== null
  const needsMapping = !columnsComplete(map)
  const mappingVisible = needsMapping || showMapping
  const unused = table ? unusedHeaders(table, map) : []
  const canPreview = table !== null && columnsComplete(map) && (hasDepartmentColumn || defaultDepartmentId !== '')
  const summary = useMemo(() => summarizePreview(preview), [preview])

  async function handleFile(file: File | null) {
    setFileError(null)
    setPreviewError(null)
    setSource(null)
    setTable(null)
    setShowMapping(false)
    setFileName(null)
    if (!file) return
    setFileName(file.name)
    const result = readAccountCsv(await file.arrayBuffer())
    if ('error' in result) {
      setFileError(result.error)
      return
    }
    setSource(result.source)
    setTable(result.table)
    setMap(result.map)
  }

  /** Die Schätzung „Zeile 1 ist die Kopfzeile“ kann falsch liegen: dann läge eine Person unbemerkt in der Kopfzeile */
  function applyHeader(hasHeader: boolean) {
    if (!source) return
    const next = buildTable(source, hasHeader)
    if ('error' in next) {
      setFileError(next.error)
      return
    }
    setFileError(null)
    setTable(next)
    setMap(detectColumns(next))
    setShowMapping(false)
  }

  function setColumn(field: keyof ColumnMap, value: string) {
    setMap((prev) => ({ ...prev, [field]: value === NO_COLUMN ? null : Number(value) }))
  }

  async function handlePreview() {
    if (!table || !canPreview) return
    setPreviewing(true)
    setPreviewError(null)
    const mapped = mapRecords(table, map)
    try {
      const res = await fetch('/api/admin/users/create/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mapped, defaultDepartmentId: defaultDepartmentId || null }),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<PreviewResponse> & { error?: string }
      if (!res.ok || !data.rows) {
        setPreviewError(data.error ?? 'Die Liste konnte nicht geprüft werden.')
        return
      }
      setRows(mapped)
      setPreview(data.rows)
      setStep('vorschau')
    } catch {
      setPreviewError('Keine Verbindung. Bitte erneut versuchen.')
    } finally {
      setPreviewing(false)
    }
  }

  const handleCreate = useCallback(async () => {
    const okLines = new Set(preview.filter((r) => r.status === 'ok').map((r) => r.line))
    const toSend = rows.filter((r) => okLines.has(r.line))
    if (toSend.length === 0) return
    const chunks = chunkRows(toSend)
    const batchId = crypto.randomUUID()

    setCreating(true)
    setProgress({ done: 0, total: toSend.length })
    const createdAll: CreatedRow[] = []
    const failedAll: FailedRow[] = []
    let notSent: RawAccountRow[] = []
    let message: string | null = null

    for (let i = 0; i < chunks.length; i++) {
      try {
        const res = await fetch('/api/admin/users/create/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunks[i],
            defaultDepartmentId: defaultDepartmentId || null,
            batchId,
            batchIndex: i,
            batchCount: chunks.length,
            // Fürs Protokoll „Sammel-Anlage“: Zahlen aus der Vorschau, nur im letzten Päckchen
            ...(i === chunks.length - 1
              ? { summary: { skipped: summary.warning, invalid: summary.error, failed: failedAll.length } }
              : {}),
          }),
        })
        const data = (await res.json().catch(() => ({}))) as Partial<BulkCreateResponse> & { error?: string }
        if (!res.ok || !data.created) {
          message = data.error ?? 'Das Anlegen wurde unterbrochen.'
          notSent = chunks.slice(i).flat()
          break
        }
        createdAll.push(...data.created)
        failedAll.push(...(data.failed ?? []))
        setProgress({ done: Math.min(toSend.length, (i + 1) * chunks[0].length), total: toSend.length })
      } catch {
        message = 'Die Verbindung ist abgebrochen.'
        notSent = chunks.slice(i).flat()
        break
      }
    }

    // Nicht angelegte Zeilen (Fehler beim Anlegen oder Abbruch) zum erneuten Hochladen
    const failedLines = new Set(failedAll.map((f) => f.line))
    setRetryRows([...rows.filter((r) => failedLines.has(r.line)), ...notSent])
    setCreated(createdAll)
    setFailed(failedAll)
    setAbortMessage(message)
    setCreating(false)
    setStep('ergebnis')
    if (message) toast.error('Nicht alle Konten wurden angelegt.')
    else toast.success(`${createdAll.length} Konten angelegt`)
  }, [preview, rows, defaultDepartmentId, summary])

  function handleLeave() {
    if (created.length > 0) {
      setPendingHref('/admin/users')
      setLeaveOpen(true)
    } else router.push('/admin/users')
  }

  const okCount = summary.ok

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Konten aus Liste anlegen"
        description="CSV-Datei hochladen, Vorschau prüfen, Zugangszettel drucken."
        breadcrumb="Aus Liste anlegen"
        actions={
          <Button
            variant="outline"
            onClick={handleLeave}
            disabled={creating}
            className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
          >
            <ArrowLeft className="size-5" />
            Zur Nutzerliste
          </Button>
        }
      />

      <ol className="flex flex-wrap gap-2" aria-label="Schritte">
        {(Object.keys(STEP_LABEL) as Step[]).map((s) => (
          <li
            key={s}
            aria-current={s === step ? 'step' : undefined}
            className={
              s === step
                ? 'rounded-full border border-ws-green/30 bg-ws-green/15 px-3 py-1.5 text-sm font-semibold text-ws-green'
                : 'rounded-full border border-ws-line px-3 py-1.5 text-sm text-ws-muted'
            }
          >
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>

      {step === 'datei' && (
        <section className="max-w-3xl space-y-5 rounded-2xl border border-ws-line bg-ws-surface p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="konten-datei">CSV-Datei</Label>
            <Input
              id="konten-datei"
              type="file"
              accept=".csv,.txt,text/csv"
              onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
              className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text"
            />
            <p className="max-w-prose text-sm text-ws-muted">
              Spalten <strong className="text-ws-text">Name</strong> und <strong className="text-ws-text">E-Mail</strong>,
              optional <strong className="text-ws-text">Bereich</strong> und <strong className="text-ws-text">Rolle</strong>{' '}
              (Azubi oder Lehrkraft). Höchstens {BULK_MAX_ROWS} Zeilen. Die Datei wird nicht gespeichert. Speichere sie in
              Excel am besten als „CSV UTF-8“, dann stimmen die Umlaute.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadCsv(buildTemplateCsv(), TEMPLATE_FILENAME)}
              className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
            >
              <Download className="size-4" />
              Vorlage herunterladen
            </Button>
          </div>

          {fileError && (
            <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red">
              {fileError}
            </p>
          )}

          {table && (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm text-ws-text">
                <FileSpreadsheet className="size-4 text-ws-muted" aria-hidden="true" />
                <span className="font-medium" title={fileName ?? undefined}>
                  {fileName}
                </span>
                <span className="text-ws-muted">· {table.records.length} Zeilen gelesen</span>
              </p>

              <div className="flex items-center gap-3">
                <Switch id="konten-kopfzeile" checked={table.hasHeader} onCheckedChange={applyHeader} />
                <Label htmlFor="konten-kopfzeile" className="min-h-11 cursor-pointer items-center text-sm font-normal text-ws-text">
                  Erste Zeile ist die Kopfzeile (Überschriften)
                </Label>
              </div>

              {!mappingVisible && (
                <div className="space-y-2 rounded-xl border border-ws-line bg-ws-bg p-3 text-sm">
                  <p className="text-ws-text">Erkannt: {describeMap(table, map)}</p>
                  {unused.length > 0 && (
                    <p className="rounded-lg border border-ws-orange/30 bg-ws-orange/15 p-2 text-ws-orange">
                      Nicht verwendet: {unused.join(', ')}. Enthält eine davon Bereich oder Rolle, ordne sie zu.
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowMapping(true)}
                    className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
                  >
                    Spalten anpassen
                  </Button>
                </div>
              )}

              {mappingVisible && (
                <div
                  className={
                    needsMapping
                      ? 'space-y-3 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3'
                      : 'space-y-3 rounded-xl border border-ws-line bg-ws-bg p-3'
                  }
                >
                  <p className={needsMapping ? 'flex items-start gap-2 text-sm text-ws-orange' : 'text-sm text-ws-text'}>
                    {needsMapping && <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
                    {needsMapping
                      ? 'Die Spalten konnten nicht eindeutig erkannt werden. Bitte ordne sie zu.'
                      : 'Spalten zuordnen'}
                  </p>
                  <ColumnSelect
                    label="Spalte für den Namen"
                    value={map.name}
                    headers={table.headers}
                    onChange={(v) => setColumn('name', v)}
                    required
                  />
                  <ColumnSelect
                    label="Spalte für die E-Mail"
                    value={map.email}
                    headers={table.headers}
                    onChange={(v) => setColumn('email', v)}
                    required
                  />
                  <ColumnSelect
                    label="Spalte für den Bereich"
                    value={map.department}
                    headers={table.headers}
                    onChange={(v) => setColumn('department', v)}
                  />
                  <ColumnSelect
                    label="Spalte für die Rolle"
                    value={map.role}
                    headers={table.headers}
                    onChange={(v) => setColumn('role', v)}
                  />
                  {!needsMapping && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowMapping(false)}
                      className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
                    >
                      Zuordnung übernehmen
                    </Button>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="konten-bereich">
                  {hasDepartmentColumn ? 'Bereich für Zeilen ohne eigene Angabe' : 'Bereich für alle Zeilen'}
                </Label>
                <Select value={defaultDepartmentId} onValueChange={setDefaultDepartmentId}>
                  <SelectTrigger id="konten-bereich" className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text sm:max-w-sm">
                    <SelectValue placeholder="Bereich wählen" />
                  </SelectTrigger>
                  <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {previewError && (
                <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red">
                  {previewError}
                </p>
              )}

              <Button
                type="button"
                onClick={() => void handlePreview()}
                disabled={!canPreview || previewing}
                className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              >
                {previewing && <Loader2 className="mr-2 size-4 animate-spin" />}
                Weiter zur Vorschau
              </Button>
            </div>
          )}
        </section>
      )}

      {step === 'vorschau' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-ws-text" aria-live="polite">
              <strong>{summary.ok}</strong> OK · <strong>{summary.warning}</strong> Warnungen ·{' '}
              <strong>{summary.error}</strong> Fehler
            </p>
            <div className="ml-auto flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('datei')}
                disabled={creating}
                className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
              >
                Zurück
              </Button>
              <Button
                type="button"
                onClick={() => void handleCreate()}
                disabled={creating || okCount === 0}
                className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
              >
                {creating && <Loader2 className="mr-2 size-4 animate-spin" />}
                {okCount} {okCount === 1 ? 'Konto' : 'Konten'} anlegen
              </Button>
            </div>
          </div>

          {creating && (
            <div className="space-y-1" role="status">
              <Progress value={progress.total ? (progress.done / progress.total) * 100 : 0} />
              <p className="text-sm text-ws-muted">
                {progress.done} von {progress.total} angelegt …
              </p>
            </div>
          )}

          {okCount === 0 && (
            <p className="rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange">
              Keine Zeile ist bereit zum Anlegen. Bitte die Datei korrigieren und erneut hochladen.
            </p>
          )}

          <div className="ws-table-scroll rounded-2xl border border-ws-line bg-ws-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zeile</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>E-Mail</TableHead>
                  <TableHead>Bereich</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Begründung</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview.map((row) => (
                  <TableRow key={row.line}>
                    <TableCell className="text-ws-muted">{row.line}</TableCell>
                    <TableCell className="max-w-48 truncate" title={row.name}>
                      {row.name || '–'}
                    </TableCell>
                    <TableCell className="max-w-56 truncate" title={row.email}>
                      {row.email || '–'}
                    </TableCell>
                    <TableCell>{row.departmentName ?? '–'}</TableCell>
                    <TableCell>{roleLabelOf(row.role)}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="min-w-56 text-sm text-ws-muted">{row.reason ?? ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {step === 'ergebnis' && (
        <section className="space-y-5">
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-ws-orange/30 bg-ws-orange/15 p-3 text-sm text-ws-orange"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            Diese Seite ist die einzige Gelegenheit, die Passwörter zu sehen. Drucke oder speichere sie jetzt.
          </p>

          {abortMessage && (
            <p role="alert" className="rounded-xl border border-ws-red/30 bg-ws-red/15 p-3 text-sm text-ws-red">
              {abortMessage} Die bisher angelegten Konten bleiben bestehen. Die fehlenden Zeilen kannst du unten als
              Liste laden und erneut hochladen; vorhandene Konten werden dann übersprungen.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-ws-text">
              <strong>{created.length}</strong> angelegt
              {retryRows.length > 0 && (
                <>
                  {' '}
                  · <strong>{retryRows.length}</strong> nicht angelegt
                </>
              )}
            </p>
            <Button
              type="button"
              onClick={() => setPrinting(true)}
              disabled={created.length === 0}
              className="min-h-11 bg-ws-green text-ws-on-accent hover:bg-ws-green-hover"
            >
              <Printer className="size-4" />
              Zugangszettel drucken
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadCsv(buildAccessCsv(created), accessCsvFilename())}
              disabled={created.length === 0}
              className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
            >
              <Download className="size-4" />
              Liste als CSV
            </Button>
            {retryRows.length > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => downloadCsv(buildRetryCsv(retryRows), RETRY_FILENAME)}
                className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
              >
                <Download className="size-4" />
                Nicht angelegte Zeilen als CSV
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={handleLeave}
              className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised"
            >
              Fertig
            </Button>
          </div>

          {created.length > 0 && (
            <div className="ws-table-scroll rounded-2xl border border-ws-line bg-ws-surface">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>E-Mail</TableHead>
                    <TableHead>Bereich</TableHead>
                    <TableHead>Start-Passwort</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {created.map((a) => (
                    <TableRow key={a.line}>
                      <TableCell className="max-w-48 truncate" title={a.name}>
                        {a.name}
                      </TableCell>
                      <TableCell className="max-w-56 truncate" title={a.email}>
                        {a.email}
                      </TableCell>
                      <TableCell>{a.departmentName ?? '–'}</TableCell>
                      <TableCell className="font-mono font-semibold">{a.password}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {failed.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-ws-text">Nicht angelegt</h2>
              <ul className="space-y-1 text-sm">
                {failed.map((f) => (
                  <li key={f.line} className="rounded-xl border border-ws-line bg-ws-surface p-3">
                    <span className="font-medium text-ws-text">
                      Zeile {f.line}: {f.name || f.email}
                    </span>
                    <span className="text-ws-muted"> – {f.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-ws-muted">
            Weiter zur{' '}
            <Link href="/admin/users" className="underline">
              Nutzerliste
            </Link>
            .
          </p>
        </section>
      )}

      {printing && <AccessSlipsPrint accounts={created} appUrl={appUrl} onDone={() => setPrinting(false)} />}

      <AlertDialog
        open={leaveOpen}
        onOpenChange={(open) => {
          setLeaveOpen(open)
          if (!open) setPendingHref(null)
        }}
      >
        <AlertDialogContent className="bg-ws-surface border-ws-line text-ws-text">
          <AlertDialogHeader>
            <AlertDialogTitle>Zugangsdaten wirklich verwerfen?</AlertDialogTitle>
            <AlertDialogDescription className="text-ws-muted">
              Danach sind die Start-Passwörter nicht mehr abrufbar. Falls du sie noch nicht gedruckt oder gespeichert
              hast, bleibt nur „Passwort neu vergeben“ für jedes Konto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 border-ws-line bg-ws-surface text-ws-text hover:bg-ws-raised">
              Zurück zu den Zugangsdaten
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => router.push(pendingHref ?? '/admin/users')}
              className="min-h-11 bg-ws-red text-ws-on-accent hover:bg-ws-red-hover"
            >
              Verwerfen und schließen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function ColumnSelect({
  label,
  value,
  headers,
  onChange,
  required = false,
}: {
  label: string
  value: number | null
  headers: string[]
  onChange: (value: string) => void
  required?: boolean
}) {
  const id = `spalte-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-ws-text">
        {label}
        {required ? '' : ' (optional)'}
      </Label>
      <Select value={value === null ? NO_COLUMN : String(value)} onValueChange={onChange}>
        <SelectTrigger id={id} className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text sm:max-w-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-ws-surface border-ws-line text-ws-text">
          <SelectItem value={NO_COLUMN}>{required ? 'Bitte wählen' : 'Keine'}</SelectItem>
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h || `Spalte ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** „Name = Wer · E-Mail = Adresse · Bereich = – · Rolle = –“: zeigt, was erkannt wurde und was nicht */
function describeMap(table: CsvTable, map: ColumnMap): string {
  const label = (column: number | null) => (column === null ? '–' : table.headers[column] || `Spalte ${column + 1}`)
  return [
    `Name = ${label(map.name)}`,
    `E-Mail = ${label(map.email)}`,
    `Bereich = ${label(map.department)}`,
    `Rolle = ${label(map.role)}`,
  ].join(' · ')
}
