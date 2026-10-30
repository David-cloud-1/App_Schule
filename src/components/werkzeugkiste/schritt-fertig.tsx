'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ClipboardCopy, Download, Eye, Loader2, PencilLine, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ablaufHref, type AblaufErgebnis } from '@/lib/werkzeugkiste'
import { downloadHref, ladeVorschau } from '@/lib/werkzeugkiste-api'
import { euro } from '@/lib/werkzeugkiste-kosten'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/**
 * Schritt 5 (PROJ-51): Erfolg, eine Hauptaktion „Herunterladen“, daneben die
 * Vorschau und darunter höchstens drei Vorschläge, wie es weitergeht.
 */
export function SchrittFertig({
  ablaufId,
  ergebnis,
  direkt,
  kostenEur,
  hinweise,
}: {
  ablaufId: string
  ergebnis: AblaufErgebnis
  /** Direkter Weg (PROJ-64): Kosten zeigen, kein „Antwort überarbeiten“ */
  direkt?: boolean
  kostenEur?: number | null
  /** Was die Prüfstelle nach dem Lauf noch bemerkt hat — höchstens fünf, kurz */
  hinweise?: string[]
}) {
  const [vorschauOffen, setVorschauOffen] = useState(false)
  const [vorschau, setVorschau] = useState<string | null>(null)
  const [vorschauFehler, setVorschauFehler] = useState(false)
  // Text zum Kopieren (LearningApps): Statt eines Downloads steht je Vorlage ein „Kopieren“-Knopf da
  const zumKopieren = !!ergebnis.texte && ergebnis.texte.length > 0

  useEffect(() => {
    if (!vorschauOffen || vorschau !== null || vorschauFehler) return
    let aktiv = true
    ladeVorschau(ablaufId)
      .then((html) => aktiv && setVorschau(html))
      .catch(() => aktiv && setVorschauFehler(true))
    return () => {
      aktiv = false
    }
  }, [vorschauOffen, vorschau, vorschauFehler, ablaufId])

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-ws-line bg-ws-surface px-5 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-ws-green/15 text-ws-green">
          <Check className="size-7" strokeWidth={2.5} aria-hidden />
        </span>
        <div className="grid gap-1">
          <p className="break-words text-lg font-semibold" title={ergebnis.titel}>
            {ergebnis.titel}
          </p>
          <p className="text-sm text-ws-muted">
            {[
              ergebnis.dateiname,
              ergebnis.kapitel > 0 ? `${ergebnis.kapitel} Kapitel` : null,
              ergebnis.einheit
                ? `${ergebnis.aufgaben} ${ergebnis.einheit}`
                : `${ergebnis.aufgaben} ${ergebnis.aufgaben === 1 ? 'Aufgabe' : 'Aufgaben'}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {zumKopieren && (
            <p className="text-sm text-ws-muted">
              {ergebnis.texte!.length === 1 ? 'Der Text steht unten zum Kopieren bereit.' : 'Die Texte stehen unten zum Kopieren bereit – je Übung einer.'}
            </p>
          )}
          {ergebnis.hinweis && <p className="text-sm text-ws-muted">{ergebnis.hinweis}</p>}
          {ergebnis.enthaelt && ergebnis.enthaelt.length > 0 && (
            <p className="text-sm text-ws-muted">Darin: {ergebnis.enthaelt.join(' · ')}</p>
          )}
        </div>
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          {!zumKopieren && (
            <Button
              asChild
              className="min-h-12 rounded-2xl bg-ws-green px-6 text-base font-bold text-ws-on-accent hover:bg-ws-green-hover focus-visible:ring-ws-green"
            >
              <a href={downloadHref(ablaufId)} download={ergebnis.dateiname}>
                <Download className="mr-2 size-5" aria-hidden />
                Herunterladen
              </a>
            </Button>
          )}
          {ergebnis.hatVorschau !== false && (
            <Button variant="outline" onClick={() => setVorschauOffen(true)} className={`${NEBENAKTION} min-h-12 px-5`}>
              <Eye className="mr-2 size-5" aria-hidden />
              Vorschau ansehen
            </Button>
          )}
        </div>
        <p className="text-xs text-ws-faint">
          {zumKopieren ? 'Das Ergebnis steht 7 Tage lang bereit.' : 'Der Download steht 7 Tage lang bereit.'}
          {direkt && kostenEur != null && <span className="ml-1 font-medium text-ws-muted">Kosten: {euro(kostenEur)}</span>}
        </p>
      </div>

      {zumKopieren && (
        <section aria-label="Texte zum Kopieren" className="space-y-3">
          {ergebnis.texte!.map((t, i) => (
            <TextZumKopieren key={i} titel={t.titel} text={t.text} />
          ))}
        </section>
      )}

      {hinweise && hinweise.length > 0 && (
        <section aria-label="Hinweise zum Material" className="space-y-2 rounded-2xl border border-ws-orange/30 bg-ws-orange/10 p-4 text-sm">
          <h2 className="font-semibold">
            {hinweise.length === 1 ? 'Ein Hinweis zum Material' : `${hinweise.length} Hinweise zum Material`}
          </h2>
          <ul className="list-disc space-y-1 pl-5 leading-relaxed">
            {hinweise.slice(0, 5).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          {hinweise.length > 5 && <p className="text-ws-muted">… und {hinweise.length - 5} weitere.</p>}
        </section>
      )}

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-ws-muted">Wie geht es weiter?</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="outline" className={`${NEBENAKTION} h-auto min-h-12 justify-start whitespace-normal py-3 text-left`}>
            <Link href={ablaufHref(ablaufId, 2)}>
              <Repeat className="mr-2 size-4 shrink-0" aria-hidden />
              Gleiches Skript, anderes Werkzeug
            </Link>
          </Button>
          {!direkt && (
            <Button asChild variant="outline" className={`${NEBENAKTION} h-auto min-h-12 justify-start whitespace-normal py-3 text-left`}>
              <Link href={ablaufHref(ablaufId, 4)}>
                <PencilLine className="mr-2 size-4 shrink-0" aria-hidden />
                Antwort überarbeiten
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Dialog open={vorschauOffen} onOpenChange={setVorschauOffen}>
        <DialogContent className="flex h-svh max-h-svh w-full max-w-none flex-col gap-3 rounded-none border-ws-line bg-ws-surface p-4 text-ws-text sm:h-[90svh] sm:max-w-5xl sm:rounded-2xl sm:p-6">
          <DialogHeader>
            <DialogTitle>Vorschau</DialogTitle>
            <DialogDescription className="text-ws-muted">
              Jede Aufgabe mit der hinterlegten Lösung – richtige Antworten sind hervorgehoben.
            </DialogDescription>
          </DialogHeader>
          {vorschau !== null ? (
            // Abgeschottet: Die Vorschau enthält Text aus der KI-Antwort — keine Skripte, kein Zugriff auf die App
            <iframe
              srcDoc={vorschau}
              sandbox=""
              title={`Vorschau: ${ergebnis.titel}`}
              className="min-h-0 w-full flex-1 rounded-xl border border-ws-line bg-white"
            />
          ) : vorschauFehler ? (
            <div role="alert" className="space-y-3 text-sm text-ws-red">
              <p>Die Vorschau konnte nicht geladen werden. Die Datei kannst du trotzdem herunterladen.</p>
              <Button variant="outline" onClick={() => setVorschauFehler(false)} className={`${NEBENAKTION} min-h-11 px-5`}>
                Erneut versuchen
              </Button>
            </div>
          ) : (
            <p role="status" className="flex items-center gap-2 text-sm text-ws-muted">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Vorschau wird geladen …
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Ein Text mit eigenem „Kopieren“-Knopf; klappt die Zwischenablage nicht, bleibt der Text zum Markieren stehen */
function TextZumKopieren({ titel, text }: { titel: string; text: string }) {
  const [kopiert, setKopiert] = useState(false)

  async function kopieren() {
    try {
      await navigator.clipboard.writeText(text)
      setKopiert(true)
      toast.success('In die Zwischenablage kopiert')
      setTimeout(() => setKopiert(false), 2000)
    } catch {
      toast.error('Kopieren hat nicht geklappt. Markiere den Text und kopiere ihn selbst.')
    }
  }

  return (
    <div className="space-y-2 rounded-2xl border border-ws-line bg-ws-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="min-w-0 break-words text-sm font-semibold" title={titel}>
          {titel}
        </h2>
        <Button variant="outline" onClick={kopieren} className={`${NEBENAKTION} min-h-11 px-4`}>
          {kopiert ? <Check className="mr-2 size-4" aria-hidden /> : <ClipboardCopy className="mr-2 size-4" aria-hidden />}
          {kopiert ? 'Kopiert' : 'Kopieren'}
          <span className="sr-only">: {titel}</span>
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-ws-line bg-ws-bg p-3 text-sm leading-relaxed text-ws-text">
        {text}
      </pre>
    </div>
  )
}
