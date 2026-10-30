'use client'

import { useState } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Ablauf } from '@/lib/werkzeugkiste'
import { erstelleKapitelPrompt, ladeKapitel, setzeKapitelEin, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { ersetzeText, treffersatz, zaehleTreffer } from '@/lib/werkzeugkiste-ueberarbeiten'
import { KopierKnopf } from '@/components/werkzeugkiste/schritt-prompt'

const FELD = 'min-h-11 rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green'
const KOPF =
  'group flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-sm font-medium text-ws-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green'
const FEHLER_STANDARD = 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'

const meldung = (e: unknown) => (e instanceof WerkzeugFehler ? e.message : FEHLER_STANDARD)

function Aufklapper({ titel, onOpenChange, children }: { titel: string; onOpenChange?: (offen: boolean) => void; children: React.ReactNode }) {
  return (
    <Collapsible onOpenChange={onOpenChange} className="rounded-2xl border border-ws-line bg-ws-surface">
      <CollapsibleTrigger className={KOPF}>
        {titel}
        <ChevronDown className="size-4 text-ws-muted transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-ws-line px-4 py-4">{children}</CollapsibleContent>
    </Collapsible>
  )
}

/**
 * Zwei Hilfen unter der Antwort in Schritt 4 (PROJ-52, Paket 2):
 * Tippfehler direkt korrigieren (ohne KI) und ein einzelnes Kapitel neu anfragen.
 * Das Kapitel läuft über die gespeicherte Antwort; deshalb gibt es diesen Teil erst,
 * wenn die angezeigte Antwort geprüft und gespeichert ist.
 */
export function UeberarbeitenHilfen({
  ablaufId,
  antwort,
  setAntwort,
  gespeichert,
  onAblauf,
}: {
  ablaufId: string
  antwort: string
  setAntwort: (a: string) => void
  gespeichert: boolean
  onAblauf: (a: Ablauf) => void
}) {
  return (
    <section aria-label="Antwort überarbeiten" className="space-y-3">
      <Tippfehler antwort={antwort} setAntwort={setAntwort} />
      {gespeichert && <KapitelNeu ablaufId={ablaufId} onAblauf={onAblauf} />}
    </section>
  )
}

function Tippfehler({ antwort, setAntwort }: { antwort: string; setAntwort: (a: string) => void }) {
  const [suche, setSuche] = useState('')
  const [neu, setNeu] = useState('')
  const [rueckmeldung, setRueckmeldung] = useState<string | null>(null)
  const treffer = zaehleTreffer(antwort, suche)

  function ersetzen() {
    const r = ersetzeText(antwort, suche, neu)
    if (r.anzahl === 0) {
      setRueckmeldung('Diese Stelle kommt in der Antwort nicht vor.')
      return
    }
    setAntwort(r.text)
    setRueckmeldung(treffersatz(r.anzahl))
    setSuche('')
    setNeu('')
  }

  return (
    <Aufklapper titel="Tippfehler direkt korrigieren">
      <p className="text-sm text-ws-muted">Ersetzt eine Stelle überall in der Antwort. Das geht ohne KI und kostet nichts. Groß- und Kleinschreibung zählen.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wk-suche">Suchen</Label>
          <Input id="wk-suche" value={suche} onChange={(e) => { setSuche(e.target.value); setRueckmeldung(null) }} className={FELD} autoComplete="off" spellCheck={false} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wk-ersetzen">Ersetzen durch</Label>
          <Input id="wk-ersetzen" value={neu} onChange={(e) => setNeu(e.target.value)} className={FELD} autoComplete="off" spellCheck={false} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" disabled={!suche} onClick={ersetzen} className="min-h-11 rounded-xl border-ws-line">
          Ersetzen
        </Button>
        <p className="text-sm text-ws-muted" aria-live="polite">
          {rueckmeldung ?? (suche ? (treffer === 1 ? '1 Fundstelle' : `${treffer} Fundstellen`) : '')}
        </p>
      </div>
    </Aufklapper>
  )
}

type Phase = 'wunsch' | 'antwort'

function KapitelNeu({ ablaufId, onAblauf }: { ablaufId: string; onAblauf: (a: Ablauf) => void }) {
  const [kapitel, setKapitel] = useState<string[] | null>(null)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [index, setIndex] = useState('0')
  const [wunsch, setWunsch] = useState('')
  const [phase, setPhase] = useState<Phase>('wunsch')
  const [prompt, setPrompt] = useState('')
  const [kiAntwort, setKiAntwort] = useState('')
  const [beschaeftigt, setBeschaeftigt] = useState(false)

  async function laden() {
    if (kapitel) return
    setLadeFehler(null)
    try {
      setKapitel((await ladeKapitel(ablaufId)).kapitel)
    } catch (e) {
      setLadeFehler(meldung(e))
    }
  }

  async function promptErstellen() {
    setBeschaeftigt(true)
    try {
      const r = await erstelleKapitelPrompt(ablaufId, Number(index), wunsch)
      setPrompt(r.prompt)
      setPhase('antwort')
    } catch (e) {
      toast.error(meldung(e))
    } finally {
      setBeschaeftigt(false)
    }
  }

  async function einsetzen() {
    setBeschaeftigt(true)
    try {
      const { ablauf } = await setzeKapitelEin(ablaufId, Number(index), kiAntwort)
      onAblauf(ablauf)
      toast.success('Kapitel eingesetzt. Die Antwort wird neu geprüft.')
      setPhase('wunsch')
      setWunsch('')
      setKiAntwort('')
      setPrompt('')
    } catch (e) {
      toast.error(meldung(e))
    } finally {
      setBeschaeftigt(false)
    }
  }

  // Ohne erkennbare Kapitel (z. B. Word-Ergebnisse) gibt es nichts zu wählen
  if (kapitel && kapitel.length === 0) return null

  return (
    <Aufklapper titel="Ein einzelnes Kapitel neu anfragen" onOpenChange={(offen) => offen && void laden()}>
      {ladeFehler ? (
        <div className="space-y-3">
          <p className="text-sm text-ws-red">{ladeFehler}</p>
          <Button variant="outline" onClick={() => void laden()} className="min-h-11 rounded-xl border-ws-line">
            Erneut versuchen
          </Button>
        </div>
      ) : !kapitel ? (
        <p className="flex items-center gap-2 text-sm text-ws-muted" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Kapitel werden gelesen …
        </p>
      ) : phase === 'wunsch' ? (
        <>
          <p className="text-sm text-ws-muted">Nur dieses Kapitel geht an die KI. Alle anderen bleiben genau, wie sie sind.</p>
          <div className="space-y-1.5">
            <Label htmlFor="wk-kapitel">Kapitel</Label>
            <Select value={index} onValueChange={setIndex}>
              <SelectTrigger id="wk-kapitel" className={FELD}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {kapitel.map((t, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i + 1}. {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wk-wunsch">Was soll anders werden?</Label>
            <Textarea
              id="wk-wunsch"
              value={wunsch}
              onChange={(e) => setWunsch(e.target.value)}
              maxLength={4000}
              placeholder="Zum Beispiel: Mehr Beispiele aus der Praxis, einfachere Sprache, eine Aufgabe weniger."
              className="min-h-24 resize-y rounded-xl border-ws-line bg-ws-bg text-ws-text focus-visible:ring-ws-green"
            />
          </div>
          <Button
            disabled={beschaeftigt || !wunsch.trim()}
            onClick={() => void promptErstellen()}
            className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
          >
            {beschaeftigt && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            Prompt für dieses Kapitel erstellen
          </Button>
        </>
      ) : (
        <>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ws-muted">
            <li>Kopiere den Prompt und schicke ihn an die KI.</li>
            <li>Füge die Antwort der KI unten ein. Sie darf nur dieses eine Kapitel enthalten.</li>
          </ol>
          <KopierKnopf text={prompt} label="Prompt kopieren" className="w-full sm:w-auto" />
          <div className="space-y-1.5">
            <Label htmlFor="wk-kapitel-antwort">Antwort der KI zum Kapitel</Label>
            <Textarea
              id="wk-kapitel-antwort"
              value={kiAntwort}
              onChange={(e) => setKiAntwort(e.target.value)}
              spellCheck={false}
              className="min-h-40 resize-y rounded-xl border-ws-line bg-ws-bg font-mono text-sm text-ws-text focus-visible:ring-ws-green"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" disabled={beschaeftigt} onClick={() => setPhase('wunsch')} className="min-h-11 rounded-xl border-ws-line">
              Zurück
            </Button>
            <Button
              disabled={beschaeftigt || !kiAntwort.trim()}
              onClick={() => void einsetzen()}
              className="min-h-11 rounded-xl bg-ws-green font-semibold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
            >
              {beschaeftigt && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              Kapitel einsetzen
            </Button>
          </div>
        </>
      )}
    </Aufklapper>
  )
}
