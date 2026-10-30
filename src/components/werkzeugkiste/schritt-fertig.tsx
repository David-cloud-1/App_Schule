'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ClipboardCopy, Download, Eye, Library, Loader2, PencilLine, Repeat } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ablaufHref, WERKZEUGKISTE_HREF, type AblaufErgebnis } from '@/lib/werkzeugkiste'
import { downloadHref, ladeDatei, kopiereFuerAnderesWerkzeug, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { euro } from '@/lib/werkzeugkiste-kosten'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { VorschauDialog } from '@/components/werkzeugkiste/vorschau-dialog'

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
  anderesWerkzeug = true,
}: {
  ablaufId: string
  ergebnis: AblaufErgebnis
  /** Direkter Weg (PROJ-64): Kosten zeigen, kein „Antwort überarbeiten“ */
  direkt?: boolean
  kostenEur?: number | null
  /** Was die Prüfstelle nach dem Lauf noch bemerkt hat — höchstens fünf, kurz */
  hinweise?: string[]
  /** false bei Video-Fragen: Sie haben ein Transkript statt eines Skripts, das sich für ein anderes Werkzeug nicht kopieren lässt */
  anderesWerkzeug?: boolean
}) {
  const [vorschauOffen, setVorschauOffen] = useState(false)
  const [kopiert, setKopiert] = useState(false)
  // Text zum Kopieren (LearningApps): Statt eines Downloads steht je Vorlage ein „Kopieren“-Knopf da
  const zumKopieren = !!ergebnis.texte && ergebnis.texte.length > 0

  /** Neuer Ablauf mit kopiertem Skript — das fertige Material bleibt unberührt (PROJ-52) */
  async function anderesWerkzeugStarten() {
    setKopiert(true)
    try {
      const { ablauf } = await kopiereFuerAnderesWerkzeug(ablaufId)
      window.location.href = ablaufHref(ablauf.id, 2)
    } catch (e) {
      toast.error(e instanceof WerkzeugFehler ? e.message : 'Das hat gerade nicht geklappt. Bitte versuche es erneut.')
      setKopiert(false)
    }
  }

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
              <a
                href={downloadHref(ablaufId)}
                download={ergebnis.dateiname}
                onClick={(e) => {
                  e.preventDefault()
                  ladeDatei(ablaufId).catch((err) =>
                    toast.error(err instanceof WerkzeugFehler ? err.message : 'Das hat gerade nicht geklappt. Bitte versuche es erneut.'),
                  )
                }}
              >
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
        <p className="flex flex-wrap items-center justify-center gap-x-1 text-xs text-ws-faint">
          <Library className="size-3.5" aria-hidden />
          Automatisch unter{' '}
          <Link href={`${WERKZEUGKISTE_HREF}?tab=materialien`} className="font-medium text-ws-blue underline-offset-2 hover:underline">
            Meine Materialien
          </Link>{' '}
          gespeichert.
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
          {anderesWerkzeug && (
            <Button
              variant="outline"
              onClick={() => void anderesWerkzeugStarten()}
              disabled={kopiert}
              className={`${NEBENAKTION} h-auto min-h-12 justify-start whitespace-normal py-3 text-left`}
            >
              {kopiert ? <Loader2 className="mr-2 size-4 shrink-0 animate-spin" aria-hidden /> : <Repeat className="mr-2 size-4 shrink-0" aria-hidden />}
              Gleiches Skript, anderes Werkzeug
            </Button>
          )}
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

      <VorschauDialog ablaufId={ablaufId} titel={ergebnis.titel} offen={vorschauOffen} onOpenChange={setVorschauOffen} />
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
