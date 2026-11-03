'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { KopierKnopf } from '@/components/werkzeugkiste/schritt-prompt'

/** Ergebnis des Absendens: übernommen, oder nicht (dann mit Satz) */
export type RettungsErgebnis = { ok: true; tippKleiner?: boolean } | { ok: false; fehler: string }

const NEBEN_KOPIEREN = 'bg-ws-surface text-ws-text ring-1 ring-ws-line hover:bg-ws-raised'

/**
 * Eine abgeschnittene KI-Antwort (PROJ-69): Die vollständigen Kapitel sind gerettet, der Rest fehlt.
 * Die Lehrkraft kopiert den Weiterschreib-Prompt (er nennt der KI die fertigen Kapitel), fügt die
 * Antwort ein, und sie wird hinten angehängt. Bricht auch das ab, bleibt die Box stehen und der
 * Tipp „kleineren Abschnitt wählen“ erscheint.
 *
 * `automatisch`: Der Prompt wird beim Öffnen geholt (er ändert nichts). Sonst gibt es zuerst einen
 * Knopf, denn das Holen kürzt die Antwort auf die vollständigen Kapitel.
 */
export function RettungsBox({
  titel,
  fertig,
  ladePrompt,
  senden,
  automatisch = false,
  tippKleiner = false,
  knopf = 'Fertige Kapitel behalten, Rest nachholen',
}: {
  /** Der Satz oben, z. B. „Die Antwort bricht nach Kapitel 3 ab.“ */
  titel: string
  /** Titel der vollständig angekommenen Kapitel */
  fertig: string[]
  ladePrompt: () => Promise<string>
  senden: (antwort: string) => Promise<RettungsErgebnis>
  automatisch?: boolean
  tippKleiner?: boolean
  knopf?: string
}) {
  const [prompt, setPrompt] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(false)
  const [sendet, setSendet] = useState(false)
  const [antwort, setAntwort] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)
  const [tipp, setTipp] = useState(tippKleiner)

  async function hole() {
    setLaedt(true)
    setFehler(null)
    try {
      setPrompt(await ladePrompt())
    } catch (e) {
      setFehler(e instanceof WerkzeugFehler ? e.message : 'Der Prompt konnte gerade nicht erstellt werden. Bitte versuche es erneut.')
    } finally {
      setLaedt(false)
    }
  }

  useEffect(() => {
    if (automatisch) void hole()
    // nur beim Öffnen: ladePrompt ändert sich mit jedem Render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatisch])

  async function absenden() {
    setSendet(true)
    setFehler(null)
    try {
      const r = await senden(antwort)
      if (r.ok) {
        setAntwort('')
        setPrompt(null)
        if (r.tippKleiner) setTipp(true)
        // Bricht auch diese Antwort ab, steht die Box wieder mit neuem Prompt da
        if (automatisch) void hole()
      } else setFehler(r.fehler)
    } catch (e) {
      setFehler(e instanceof WerkzeugFehler ? e.message : 'Das hat gerade nicht geklappt. Bitte versuche es erneut.')
    } finally {
      setSendet(false)
    }
  }

  const letztes = fertig[fertig.length - 1]
  return (
    <section aria-label="Abgeschnittene Antwort" className="space-y-4 rounded-2xl border border-ws-orange/30 bg-ws-orange/10 p-4 sm:p-5">
      <p className="flex items-start gap-3 font-semibold text-ws-text">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ws-orange" aria-hidden />
        {titel}
      </p>
      <div className="space-y-4 sm:pl-8">
        <p className="text-sm leading-relaxed text-ws-text">
          {fertig.length === 0
            ? 'Es ist noch kein Kapitel vollständig angekommen.'
            : fertig.length === 1
              ? `Ein Kapitel ist vollständig angekommen: „${letztes}“.`
              : `${fertig.length} Kapitel sind vollständig angekommen, zuletzt „${letztes}“.`}{' '}
          Sie bleiben erhalten. Es fehlt nur der Rest.
        </p>

        {tipp && (
          <p className="text-sm leading-relaxed text-ws-text" role="status">
            Auch das Nachholen wurde abgeschnitten. Das passiert bei sehr langen Abschnitten. Wähle in Schritt 1 einen kleineren
            Abschnitt aus, dann bricht die Antwort seltener ab.
          </p>
        )}

        {prompt === null && !automatisch && (
          <Button onClick={() => void hole()} disabled={laedt} className="min-h-11 rounded-xl bg-ws-surface px-5 text-ws-text ring-1 ring-ws-line hover:bg-ws-raised">
            {laedt && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
            {knopf}
          </Button>
        )}

        {automatisch && prompt === null && laedt && (
          <p className="flex items-center gap-2 text-sm text-ws-muted" role="status">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Weiterschreib-Prompt wird erstellt …
          </p>
        )}

        {prompt !== null && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ws-muted">
              Kopiere diesen Prompt in <strong className="font-semibold text-ws-text">dieselbe Unterhaltung</strong> deiner KI. Er sagt ihr,
              welche Kapitel schon da sind. Füge ihre Antwort danach hier ein.
            </p>
            <KopierKnopf text={prompt} label="Weiterschreib-Prompt kopieren" className={`w-full sm:w-auto ${NEBEN_KOPIEREN}`} />
            <div className="space-y-2">
              <Label htmlFor="wk-weiter-antwort" className="sr-only">
                Antwort auf den Weiterschreib-Prompt
              </Label>
              <Textarea
                id="wk-weiter-antwort"
                value={antwort}
                onChange={(e) => setAntwort(e.target.value)}
                placeholder="Antwort auf den Weiterschreib-Prompt hier einfügen …"
                spellCheck={false}
                className="min-h-40 resize-y rounded-xl border-ws-line bg-ws-surface p-3 font-mono text-sm leading-relaxed text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
              />
              <Button
                variant="outline"
                onClick={() => void absenden()}
                disabled={sendet || antwort.trim().length === 0}
                className="min-h-11 rounded-xl border-ws-line"
              >
                {sendet && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
                Anhängen und prüfen
              </Button>
            </div>
          </div>
        )}

        <div aria-live="polite">
          {fehler && (
            <p role="alert" className="text-sm leading-relaxed text-ws-red">
              {fehler}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
