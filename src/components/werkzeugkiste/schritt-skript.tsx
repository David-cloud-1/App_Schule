'use client'

import { useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, FileText, Info, Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  auswahlArt,
  formatiereGroesse,
  istAltesFormat,
  pruefeSkriptDatei,
  type Ablauf,
  type AblaufAuswahl,
} from '@/lib/werkzeugkiste'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/**
 * Ablagefläche für das Skript (PROJ-51): ziehen oder auswählen. Prüft Format
 * und Größe sofort im Browser, damit nichts Unpassendes hochgeladen wird.
 */
export function DateiAblage({ onDatei, deaktiviert }: { onDatei: (datei: File) => void; deaktiviert?: boolean }) {
  const eingabe = useRef<HTMLInputElement>(null)
  const [drueber, setDrueber] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  function nimm(dateien: FileList | null) {
    const datei = dateien?.[0]
    if (!datei) return
    const problem = pruefeSkriptDatei(datei)
    setFehler(problem)
    if (!problem) onDatei(datei)
    if (eingabe.current) eingabe.current.value = ''
  }

  return (
    <div className="space-y-3">
      <label
        onDragOver={(e) => {
          e.preventDefault()
          if (!deaktiviert) setDrueber(true)
        }}
        onDragLeave={() => setDrueber(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDrueber(false)
          if (!deaktiviert) nimm(e.dataTransfer.files)
        }}
        className={cn(
          'flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-ws-line bg-ws-surface px-6 py-10 text-center transition-colors duration-200',
          'focus-within:ring-2 focus-within:ring-ws-green hover:bg-ws-raised/50',
          drueber && 'border-ws-green bg-ws-green/10',
          deaktiviert && 'pointer-events-none opacity-60',
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-2xl bg-ws-green/15 text-ws-green">
          <Upload className="size-7" aria-hidden />
        </span>
        <span className="text-base font-semibold text-ws-text">Datei hierher ziehen oder auswählen</span>
        <span className="text-sm text-ws-faint">.docx empfohlen · auch PDF und PowerPoint · bis 50 MB</span>
        <input
          ref={eingabe}
          type="file"
          className="sr-only"
          accept=".docx,.pdf,.pptx,.doc,.ppt,.txt"
          disabled={deaktiviert}
          onChange={(e) => nimm(e.target.files)}
          aria-label="Skript auswählen"
        />
      </label>
      {fehler && (
        <p role="alert" className="flex items-start gap-2 text-sm text-ws-red">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {fehler}
        </p>
      )}
    </div>
  )
}

/** Fortschritt während Hochladen und Einlesen */
export function HochladeFortschritt({
  datei,
  phase,
  prozent,
}: {
  datei: { name: string; size: number }
  phase: 'hochladen' | 'lesen'
  prozent: number
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-ws-line bg-ws-surface p-5" role="status" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ws-raised text-ws-muted">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="grid min-w-0">
          <span className="truncate font-semibold" title={datei.name}>
            {datei.name}
          </span>
          <span className="text-sm text-ws-muted">{formatiereGroesse(datei.size)}</span>
        </div>
      </div>
      {phase === 'hochladen' ? (
        <div className="space-y-2">
          <p className="text-sm text-ws-muted">Wird hochgeladen … {prozent} %</p>
          <Progress value={prozent} className="h-2 bg-ws-raised [&>div]:bg-ws-green" aria-label="Hochladen" />
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-ws-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Wird gelesen … Lösungen, Tabellen und Bilder werden erkannt.
        </p>
      )}
    </div>
  )
}

/**
 * Ergebnis des Einlesens: Kennzahlen, ruhige Hinweise und die optionale
 * Eingrenzung auf Seiten bzw. Word-Abschnitte.
 */
export function SkriptErgebnis({
  ablauf,
  auswahl,
  setAuswahl,
  andereDatei,
}: {
  ablauf: Ablauf
  auswahl: AblaufAuswahl
  setAuswahl: (a: AblaufAuswahl) => void
  andereDatei?: () => void
}) {
  const k = ablauf.kennzahlen
  const name = ablauf.datei?.name ?? 'Skript'
  const art = auswahlArt(name)
  const eingegrenzt = !!auswahl.seiten.trim() || auswahl.abschnitte.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-ws-green/30 bg-ws-green/10 p-5 sm:flex-row sm:items-center">
        <CheckCircle2 className="size-6 shrink-0 text-ws-green" aria-hidden />
        <div className="grid min-w-0 flex-1 gap-1">
          <span className="truncate font-semibold" title={name}>
            {name} gelesen
          </span>
          {k && (
            <span className="text-sm text-ws-muted">
              {k.seiten} {k.seiten === 1 ? 'Seite' : 'Seiten'} · {k.loesungen} {k.loesungen === 1 ? 'Lösung' : 'Lösungen'} ·{' '}
              {k.bilder} {k.bilder === 1 ? 'Bild' : 'Bilder'} · {k.tabellen} {k.tabellen === 1 ? 'Tabelle' : 'Tabellen'}
            </span>
          )}
        </div>
        {andereDatei && (
          <Button variant="outline" onClick={andereDatei} className={NEBENAKTION}>
            Andere Datei
          </Button>
        )}
      </div>

      {istAltesFormat(name) && (
        <Hinweis>
          Altes Format: Nur der Text wird gelesen. Speichere die Datei in Word bzw. PowerPoint einmal als .docx oder .pptx,
          dann kommen auch Lösungen, Tabellen und Bilder mit.
        </Hinweis>
      )}
      {k && k.loesungen === 0 && !istAltesFormat(name) && (
        <Hinweis>Keine Lösungen gefunden. Lösungen bitte rot oder als versteckten Text markieren. Weiter geht es trotzdem.</Hinweis>
      )}

      {art && (
        <Collapsible defaultOpen={eingegrenzt} className="rounded-2xl border border-ws-line bg-ws-surface">
          <CollapsibleTrigger className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-medium text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green">
            <span>
              Auswahl eingrenzen{' '}
              <span className="font-normal text-ws-faint">
                · {eingegrenzt ? 'eingegrenzt' : art === 'abschnitte' ? 'nur bestimmte Abschnitte' : 'nur bestimmte Seiten'}
              </span>
            </span>
            <ChevronDown className="size-4 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
          </CollapsibleTrigger>
          <CollapsibleContent className="border-t border-ws-line px-4 py-4">
            {art === 'seiten' ? (
              <div className="space-y-2">
                <Label htmlFor="wk-seiten" className="text-ws-text">
                  {name.toLowerCase().endsWith('.pdf') ? 'Seiten' : 'Folien'}
                </Label>
                <Input
                  id="wk-seiten"
                  value={auswahl.seiten}
                  onChange={(e) => setAuswahl({ ...auswahl, seiten: e.target.value })}
                  placeholder="z. B. 3-7, 10 – leer lassen für alles"
                  className="min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green"
                />
              </div>
            ) : ablauf.gliederung.length === 0 ? (
              <p className="text-sm text-ws-muted">In diesem Skript wurden keine Überschriften gefunden. Es wird das ganze Skript verwendet.</p>
            ) : (
              <fieldset className="space-y-1">
                <legend className="mb-2 text-sm text-ws-muted">Nur diese Abschnitte verwenden (keiner gewählt = alles):</legend>
                {ablauf.gliederung.map((g) => {
                  const an = auswahl.abschnitte.includes(g.nr)
                  return (
                    <Label
                      key={g.nr}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-2 font-normal text-ws-text hover:bg-ws-raised"
                    >
                      <Checkbox
                        checked={an}
                        onCheckedChange={(c) =>
                          setAuswahl({
                            ...auswahl,
                            abschnitte: c
                              ? [...auswahl.abschnitte, g.nr].sort((a, b) => a - b)
                              : auswahl.abschnitte.filter((n) => n !== g.nr),
                          })
                        }
                      />
                      <span className="truncate" title={g.titel}>
                        {g.titel}
                      </span>
                    </Label>
                  )
                })}
              </fieldset>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export function Hinweis({ children, ton = 'info' }: { children: React.ReactNode; ton?: 'info' | 'warnung' }) {
  return (
    <p
      className={cn(
        'flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed',
        ton === 'info' ? 'border-ws-blue/30 bg-ws-blue/10 text-ws-text' : 'border-ws-orange/30 bg-ws-orange/10 text-ws-text',
      )}
    >
      {ton === 'info' ? (
        <Info className="mt-0.5 size-4 shrink-0 text-ws-blue" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-ws-orange" aria-hidden />
      )}
      <span>{children}</span>
    </p>
  )
}
