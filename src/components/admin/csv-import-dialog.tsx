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
  Info,
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
  antwort_e?: string
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
    antwort_e: string
    korrekte_antwort: 'A' | 'B' | 'C' | 'D' | 'E'
    erklaerung: string | null
    fach_code: string
    schwierigkeit: 'leicht' | 'mittel' | 'schwer'
  }
  raw: ParsedRow
}

const MAX_FILE_BYTES = 500 * 1024

// Template mit allen 5 Antworten (A–E) wie die API erwartet
const TEMPLATE = [
  'question_text,antwort_a,antwort_b,antwort_c,antwort_d,antwort_e,korrekte_antwort,erklaerung,fach_code,schwierigkeit',
  '"Was ist ein CMR-Frachtbrief?","Begleitpapier für Straßentransport","Ein Zollbescheid","Eine Rechnung","Ein Lagerschein","Ein Lieferschein",A,"Pflichtdokument für grenzüberschreitenden Straßengüterverkehr",STG,leicht',
].join('\n')

const DIFFICULTY_LABEL: Record<string, string> = {
  leicht: 'Leicht',
  mittel: 'Mittel',
  schwer: 'Schwer',
}

export function CsvImportDialog({ open, onOpenChange, subjects, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<ValidatedRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const subjectCodes = new Set(subjects.map((s) => s.code.toUpperCase()))
  const validRows = rows.filter((r) => r.status === 'valid')
  const invalidRows = rows.filter((r) => r.status === 'invalid')

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
      toast.error('Bitte eine .csv-Datei auswählen (z. B. fragen.csv)')
      return
    }
    if (selected.size > MAX_FILE_BYTES) {
      toast.error('Die Datei ist zu groß. Maximal 500 KB erlaubt.')
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
      error: () => {
        toast.error('Die CSV-Datei konnte nicht gelesen werden. Bitte Vorlage verwenden.')
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
      const e = (raw.antwort_e ?? '').trim()
      const ka = (raw.korrekte_antwort ?? '').trim().toUpperCase()
      const fc = (raw.fach_code ?? '').trim().toUpperCase()
      const sw = (raw.schwierigkeit ?? '').trim().toLowerCase()
      const erkl = (raw.erklaerung ?? '').trim()

      if (!qt) errors.push('Spalte question_text ist leer')
      if (qt.length > 1000) errors.push('Fragetext ist zu lang (max. 1000 Zeichen)')
      if (!a) errors.push('Spalte antwort_a ist leer')
      if (!b) errors.push('Spalte antwort_b ist leer')
      if (!c) errors.push('Spalte antwort_c ist leer')
      if (!d) errors.push('Spalte antwort_d ist leer')
      if (!e) errors.push('Spalte antwort_e ist leer')
      if (!['A', 'B', 'C', 'D', 'E'].includes(ka)) {
        if (ka.length > 1)
          errors.push(`korrekte_antwort: Nur ein Buchstabe erlaubt (A–E), nicht den Antworttext eintragen`)
        else if (!ka)
          errors.push('korrekte_antwort ist leer — trage A, B, C, D oder E ein')
        else
          errors.push(`korrekte_antwort "${ka}" ungültig — erlaubt: A, B, C, D oder E`)
      }
      if (!fc) errors.push('fach_code ist leer — erlaubt: ' + [...subjectCodes].join(', '))
      else if (!subjectCodes.has(fc)) {
        const truncated = fc.length > 20 ? fc.slice(0, 20) + '…' : fc
        errors.push(`fach_code "${truncated}" unbekannt — erlaubt: ${[...subjectCodes].join(', ')}`)
      }
      if (!['leicht', 'mittel', 'schwer'].includes(sw)) {
        const truncated = sw.length > 15 ? sw.slice(0, 15) + '…' : sw
        errors.push(sw ? `schwierigkeit "${truncated}" ungültig — nur: leicht, mittel, schwer` : 'schwierigkeit ist leer — trage leicht, mittel oder schwer ein')
      }

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
          antwort_e: e,
          korrekte_antwort: ka as 'A' | 'B' | 'C' | 'D' | 'E',
          erklaerung: erkl ? erkl : null,
          fach_code: fc,
          schwierigkeit: sw as 'leicht' | 'mittel' | 'schwer',
        },
      }
    })
  }

  async function handleImport() {
    if (validRows.length === 0) {
      toast.error('Keine gültigen Zeilen zum Import vorhanden.')
      return
    }
    if (validRows.length > 500) {
      toast.error('Zu viele Zeilen. Maximal 500 Fragen pro Import erlaubt.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/questions/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validRows.map((r) => r.normalized!) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = data?.error === 'Invalid payload'
          ? 'Die Datei hat ein ungültiges Format. Bitte Vorlage verwenden.'
          : (data?.error ?? 'Import fehlgeschlagen')
        toast.error(msg)
        return
      }
      toast.success(
        `Fertig! ${data.imported ?? 0} Fragen importiert${data.skipped ? `, ${data.skipped} übersprungen` : ''}.`
      )
      onSuccess()
      handleDialogChange(false)
    } catch {
      toast.error('Netzwerkfehler — bitte Internetverbindung prüfen.')
    } finally {
      setSubmitting(false)
    }
  }

  const step = !file ? 1 : rows.length === 0 && !parsing ? 1 : 2

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fragen per CSV importieren</DialogTitle>
          <DialogDescription className="text-[#9CA3AF]">
            Mehrere Fragen auf einmal hochladen — einfach Vorlage ausfüllen und hochladen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">

          {/* Schritt 1 — Vorlage & Datei */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#F9FAFB]">
              Schritt 1 — Vorlage herunterladen und ausfüllen
            </p>

            <Alert className="bg-[#111827] border-[#4B5563] text-[#F9FAFB]">
              <Info className="h-4 w-4 text-[#1CB0F6] flex-shrink-0" />
              <AlertDescription className="text-sm text-[#9CA3AF] space-y-1">
                <p>Jede Zeile = eine Frage. Pflichtfelder:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5">
                  <li><span className="text-[#F9FAFB] font-medium">question_text</span> — Die Frage</li>
                  <li><span className="text-[#F9FAFB] font-medium">antwort_a bis antwort_e</span> — 5 Antwortmöglichkeiten (als Text)</li>
                  <li>
                    <span className="text-[#F9FAFB] font-medium">korrekte_antwort</span> — Nur ein Buchstabe:{' '}
                    <code className="bg-[#374151] px-1 rounded text-[#58CC02]">A</code>,{' '}
                    <code className="bg-[#374151] px-1 rounded text-[#58CC02]">B</code>,{' '}
                    <code className="bg-[#374151] px-1 rounded text-[#58CC02]">C</code>,{' '}
                    <code className="bg-[#374151] px-1 rounded text-[#58CC02]">D</code> oder{' '}
                    <code className="bg-[#374151] px-1 rounded text-[#58CC02]">E</code>
                    <span className="text-[#FF4B4B]"> — NICHT den Antworttext!</span>
                  </li>
                  <li><span className="text-[#F9FAFB] font-medium">fach_code</span> — Kürzel: <code className="bg-[#374151] px-1 rounded text-[#58CC02]">{[...subjectCodes].join(', ') || 'BGP, STG, …'}</code></li>
                  <li><span className="text-[#F9FAFB] font-medium">schwierigkeit</span> — <code className="bg-[#374151] px-1 rounded text-[#58CC02]">leicht</code>, <code className="bg-[#374151] px-1 rounded text-[#58CC02]">mittel</code> oder <code className="bg-[#374151] px-1 rounded text-[#58CC02]">schwer</code></li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
                className="rounded-xl border-[#1CB0F6] text-[#1CB0F6] hover:bg-[#1CB0F6]/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Vorlage herunterladen (.csv)
              </Button>
            </div>
          </div>

          {/* Schritt 2 — Datei hochladen */}
          <div className="space-y-3">
            <p className="text-sm font-semibold text-[#F9FAFB]">
              Schritt 2 — Ausgefüllte CSV-Datei hochladen
            </p>

            <label className={`flex items-center gap-3 px-4 py-4 rounded-xl border-2 cursor-pointer transition-colors ${
              file
                ? 'border-[#58CC02] bg-[#58CC02]/5'
                : 'border-dashed border-[#4B5563] hover:border-[#9CA3AF] bg-[#111827]'
            }`}>
              <FileUp className={`w-6 h-6 flex-shrink-0 ${file ? 'text-[#58CC02]' : 'text-[#9CA3AF]'}`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-[#F9FAFB]">
                  {file ? file.name : 'CSV-Datei auswählen'}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  {file ? `${(file.size / 1024).toFixed(0)} KB` : 'Nur .csv-Dateien · max. 500 KB'}
                </p>
              </div>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => { e.preventDefault(); reset() }}
                  className="text-[#9CA3AF] hover:text-[#FF4B4B] rounded-lg"
                >
                  Zurücksetzen
                </Button>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => onFileSelected(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {/* Ladeindikator */}
          {parsing && (
            <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
              <Loader2 className="w-4 h-4 animate-spin" />
              Datei wird geprüft…
            </div>
          )}

          {/* Ergebnis-Vorschau */}
          {!parsing && rows.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#F9FAFB]">
                Schritt 3 — Ergebnis prüfen und importieren
              </p>

              {/* Zusammenfassung */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#58CC02]/10 border border-[#58CC02]/30">
                  <CheckCircle2 className="w-4 h-4 text-[#58CC02]" />
                  <span className="text-sm font-medium text-[#58CC02]">
                    {validRows.length} {validRows.length === 1 ? 'Frage bereit' : 'Fragen bereit'}
                  </span>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FF4B4B]/10 border border-[#FF4B4B]/30">
                    <XCircle className="w-4 h-4 text-[#FF4B4B]" />
                    <span className="text-sm font-medium text-[#FF4B4B]">
                      {invalidRows.length} {invalidRows.length === 1 ? 'Fehler' : 'Fehler'} — werden übersprungen
                    </span>
                  </div>
                )}
              </div>

              {/* Fehlerdetails zuerst */}
              {invalidRows.length > 0 && (
                <Alert className="bg-[#FF4B4B]/5 border-[#FF4B4B]/30">
                  <AlertCircle className="h-4 w-4 text-[#FF4B4B]" />
                  <AlertDescription className="text-sm text-[#F9FAFB]">
                    <p className="font-medium mb-1">Zeilen mit Fehlern (werden nicht importiert):</p>
                    <ul className="space-y-1">
                      {invalidRows.map((r) => (
                        <li key={r.index} className="text-xs text-[#9CA3AF]">
                          <span className="text-[#FF4B4B] font-medium">Zeile {r.index + 2}:</span>{' '}
                          {r.errors.join(' · ')}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Vorschau gültige Zeilen */}
              {validRows.length > 0 && (
                <div className="border border-[#4B5563] rounded-xl overflow-hidden max-h-[280px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#111827] hover:bg-[#111827] border-[#4B5563]">
                        <TableHead className="w-10 text-[#9CA3AF]">#</TableHead>
                        <TableHead className="text-[#9CA3AF]">Frage</TableHead>
                        <TableHead className="w-20 text-[#9CA3AF]">Fach</TableHead>
                        <TableHead className="w-24 text-[#9CA3AF]">Schwierigkeit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validRows.map((r) => (
                        <TableRow key={r.index} className="border-[#4B5563]">
                          <TableCell className="text-[#9CA3AF] text-xs">{r.index + 2}</TableCell>
                          <TableCell className="max-w-[300px] truncate text-[#F9FAFB] text-sm">
                            {r.raw.question_text ?? '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[#4B5563] text-[#9CA3AF] text-xs">
                              {r.raw.fach_code ?? '—'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-[#9CA3AF]">
                            {r.normalized?.schwierigkeit
                              ? DIFFICULTY_LABEL[r.normalized.schwierigkeit]
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => handleDialogChange(false)} disabled={submitting}>
            Abbrechen
          </Button>
          <Button
            onClick={handleImport}
            disabled={submitting || validRows.length === 0 || step < 2}
            className="bg-[#58CC02] hover:bg-[#4CAD02] text-white rounded-xl"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird importiert…
              </>
            ) : validRows.length > 0 ? (
              `${validRows.length} ${validRows.length === 1 ? 'Frage' : 'Fragen'} importieren`
            ) : (
              'Importieren'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
