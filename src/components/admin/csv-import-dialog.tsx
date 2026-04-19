'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  XCircle,
} from 'lucide-react'

export type AdminSubject = { id: string; code: string; name: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjects: AdminSubject[]
  onSuccess: () => void
}

type ParsedRow = {
  question_text?: string
  antwort_a?: string
  antwort_b?: string
  antwort_c?: string
  antwort_d?: string
  korrekte_antwort?: string
  erklaerung?: string
  fach_code?: string
  schwierigkeit?: string
}

type ValidatedRow = {
  index: number
  status: 'valid' | 'invalid'
  errors: string[]
  normalized?: {
    question_text: string
    antwort_a: string
    antwort_b: string
    antwort_c: string
    antwort_d: string
    korrekte_antwort: 'A' | 'B' | 'C' | 'D'
    erklaerung: string | null
    fach_code: string
    schwierigkeit: 'leicht' | 'mittel' | 'schwer'
  }
  raw: ParsedRow
}

const MAX_FILE_BYTES = 500 * 1024
const TEMPLATE = [
  'question_text,antwort_a,antwort_b,antwort_c,antwort_d,korrekte_antwort,erklaerung,fach_code,schwierigkeit',
  '"Was ist ein CMR-Frachtbrief?","Ein Dokument für Straßentransport","Ein Zollbescheid","Eine Rechnung","Ein Lagerschein",A,"Begleitpapier für grenzüberschreitenden Straßentransport",STG,leicht',
].join('\n')

export function CsvImportDialog({ open, onOpenChange, subjects, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ValidatedRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const subjectCodes = new Set(subjects.map((s) => s.code.toUpperCase()))
  const validRows = rows.filter((r) => r.status === 'valid')

  function reset() {
    setFile(null)
    setRows([])
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleDialogChange(nextOpen: boolean) {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  function downloadTemplate() {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fragen-vorlage.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function onFileSelected(selected: File | null) {
    if (!selected) return
    if (!selected.name.toLowerCase().endsWith('.csv')) {
      toast.error('Bitte eine .csv-Datei auswählen.')
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      toast.error('Datei zu groß (max. 500 KB).')
      return
    }
    setFile(selected)
    setParsing(true)
    Papa.parse<ParsedRow>(selected, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = validate(result.data)
        setRows(parsed)
        setParsing(false)
      },
      error: (err) => {
        console.error(err)
        toast.error('CSV konnte nicht gelesen werden.')
        setParsing(false)
      },
    })
  }

  function validate(rawRows: ParsedRow[]): ValidatedRow[] {
    return rawRows.map((raw, idx) => {
      const errors: string[] = []
      const qt = (raw.question_text ?? '').trim()
      const a = (raw.antwort_a ?? '').trim()
      const b = (raw.antwort_b ?? '').trim()
      const c = (raw.antwort_c ?? '').trim()
      const d = (raw.antwort_d ?? '').trim()
      const ka = (raw.korrekte_antwort ?? '').trim().toUpperCase()
      const fc = (raw.fach_code ?? '').trim().toUpperCase()
      const sw = (raw.schwierigkeit ?? '').trim().toLowerCase()
      const erkl = (raw.erklaerung ?? '').trim()

      if (!qt) errors.push('fragetext fehlt')
      if (qt.length > 1000) errors.push('fragetext > 1000 Zeichen')
      if (!a) errors.push('antwort_a fehlt')
      if (!b) errors.push('antwort_b fehlt')
      if (!c) errors.push('antwort_c fehlt')
      if (!d) errors.push('antwort_d fehlt')
      if (!['A', 'B', 'C', 'D'].includes(ka)) errors.push('korrekte_antwort muss A/B/C/D sein')
      if (!fc) errors.push('fach_code fehlt')
      else if (!subjectCodes.has(fc)) errors.push(`fach_code "${fc}" unbekannt`)
      if (!['leicht', 'mittel', 'schwer'].includes(sw))
        errors.push('schwierigkeit muss leicht/mittel/schwer sein')

      if (errors.length > 0) {
        return { index: idx, status: 'invalid', errors, raw }
      }

      return {
        index: idx,
        status: 'valid',
        errors: [],
        raw,
        normalized: {
          question_text: qt,
          antwort_a: a,
          antwort_b: b,
          antwort_c: c,
          antwort_d: d,
          korrekte_antwort: ka as 'A' | 'B' | 'C' | 'D',
          erklaerung: erkl ? erkl : null,
          fach_code: fc,
          schwierigkeit: sw as 'leicht' | 'mittel' | 'schwer',
        },
      }
    })
  }

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error('Keine gültigen Zeilen zum Import.')
      return
    }
    if (validRows.length > 500) {
      toast.error('Maximale Importgröße (500 Zeilen) überschritten.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        rows: validRows.map((r) => r.normalized!),
      }
      const res = await fetch('/api/admin/questions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error ?? 'Import fehlgeschlagen')
        return
      }
      toast.success(
        `${data.imported ?? 0} Fragen importiert, ${data.skipped ?? 0} übersprungen.`
      )
      onSuccess()
      handleDialogChange(false)
    } catch (err) {
      console.error(err)
      toast.error('Netzwerkfehler')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV-Import</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Lade eine CSV-Datei hoch. Zeilen werden validiert, nur gültige werden importiert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={downloadTemplate}
              className="rounded-xl"
            >
              <Download className="w-4 h-4 mr-2" />
              Vorlage herunterladen
            </Button>
            <label className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#4B5563] bg-[#111827] cursor-pointer hover:border-[#58CC02] transition-colors">
              <FileUp className="w-4 h-4" />
              <span className="text-sm">
                {file ? file.name : 'CSV auswählen (max. 500 KB)'}
              </span>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Zurücksetzen
              </Button>
            )}
          </div>

          {parsing && (
            <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
              <Loader2 className="w-4 h-4 animate-spin" />
              CSV wird geparst…
            </div>
          )}

          {!parsing && rows.length > 0 && (
            <>
              <Alert className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validRows.length} gültig · {rows.length - validRows.length} ungültig ·{' '}
                  {rows.length} gesamt
                </AlertDescription>
              </Alert>

              <div className="border border-[#4B5563] rounded-xl overflow-hidden max-h-[320px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
                      <TableHead className="w-12 text-[#9CA3AF]">#</TableHead>
                      <TableHead className="w-16 text-[#9CA3AF]">Status</TableHead>
                      <TableHead className="text-[#9CA3AF]">Frage</TableHead>
                      <TableHead className="text-[#9CA3AF]">Fach</TableHead>
                      <TableHead className="text-[#9CA3AF]">Meldung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.index} className="border-[#4B5563]">
                        <TableCell className="text-[#9CA3AF]">{r.index + 2}</TableCell>
                        <TableCell>
                          {r.status === 'valid' ? (
                            <CheckCircle2 className="w-4 h-4 text-[#58CC02]" />
                          ) : (
                            <XCircle className="w-4 h-4 text-[#FF4B4B]" />
                          )}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-[#F9FAFB]">
                          {r.raw.question_text ?? <span className="text-[#9CA3AF]">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="border-[#4B5563] text-[#9CA3AF]"
                          >
                            {r.raw.fach_code ?? '—'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#FF4B4B] whitespace-normal">
                          {r.errors.length > 0 ? r.errors.join(', ') : ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => handleDialogChange(false)} disabled={submitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || validRows.length === 0}
            className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
          >
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {validRows.length > 0
              ? `${validRows.length} importieren`
              : 'Importieren'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
