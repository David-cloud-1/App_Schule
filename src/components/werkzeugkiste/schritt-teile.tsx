'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { teileEingefuegt, type Ablauf, type AblaufTeil } from '@/lib/werkzeugkiste'
import { ladeTeilPrompt, sendeTeilAntwort, WerkzeugFehler, type TeilWarnung } from '@/lib/werkzeugkiste-api'
import { cn } from '@/lib/utils'
import { RettungsBox } from '@/components/werkzeugkiste/abbruch-rettung'
import { KiOeffnenLink, KopierKnopf } from '@/components/werkzeugkiste/schritt-prompt'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'

/** Ab so vielen Teilen empfehlen wir, weniger Kapitel auszuwählen */
const VIELE_TEILE = 8

const NEBEN_KOPIEREN = 'bg-ws-surface text-ws-text ring-1 ring-ws-line hover:bg-ws-raised'

/**
 * Zustand eines Teils in Worten, mit Farbe (getönt, Schrift gleichfarbig, nie nur Farbe).
 * `box` und `iconFarbe` gehören zum Satz mit dem Prüfergebnis unter dem Teil.
 */
export function teilStatus(t: AblaufTeil): { label: string; klasse: string; box: string; iconFarbe: string; icon: typeof Circle } {
  if (t.zustand === 'offen') {
    return { label: 'offen', klasse: 'border-ws-line bg-ws-raised text-ws-muted', box: 'border-ws-line bg-ws-raised', iconFarbe: 'text-ws-muted', icon: Circle }
  }
  if (t.zustand === 'abgeschnitten') {
    return { label: 'abgeschnitten', klasse: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange', box: 'border-ws-orange/30 bg-ws-orange/10', iconFarbe: 'text-ws-orange', icon: AlertTriangle }
  }
  if (t.befund === 'hoch') {
    return { label: 'Fehler', klasse: 'border-ws-red/30 bg-ws-red/15 text-ws-red', box: 'border-ws-red/30 bg-ws-red/10', iconFarbe: 'text-ws-red', icon: XCircle }
  }
  if (t.befund === 'mittel') {
    return { label: 'mit Hinweisen', klasse: 'border-ws-orange/30 bg-ws-orange/15 text-ws-orange', box: 'border-ws-orange/30 bg-ws-orange/10', iconFarbe: 'text-ws-orange', icon: AlertTriangle }
  }
  return { label: 'geprüft', klasse: 'border-ws-green/30 bg-ws-green/15 text-ws-green', box: 'border-ws-green/30 bg-ws-green/10', iconFarbe: 'text-ws-green', icon: CheckCircle2 }
}

/** Der Teil, an dem die Lehrkraft weitermacht: der erste, der nicht fertig ist (oder mit schwerem Fehler) */
export function naechsterOffenerTeil(teile: AblaufTeil[]): number | null {
  const t = teile.find((x) => x.zustand !== 'fertig' || x.befund === 'hoch')
  return t ? t.nr : null
}

/** Warum „Weiter zur Datei“ noch gesperrt ist, in einem Satz (null = es geht) */
export function sperrGrund(teile: AblaufTeil[]): string | null {
  const offen = teile.filter((t) => t.zustand === 'offen').map((t) => t.nr)
  if (offen.length === 1) return `Es fehlt noch Teil ${offen[0]}.`
  if (offen.length > 1) return `Es fehlen noch die Teile ${offen.join(', ')}.`
  const hoch = teile.filter((t) => t.befund === 'hoch').map((t) => t.nr)
  if (hoch.length === 1) return `Teil ${hoch[0]} hat einen schweren Fehler. Frage ihn noch einmal an und füge die neue Antwort ein.`
  if (hoch.length > 1) return `Die Teile ${hoch.join(', ')} haben schwere Fehler. Frage sie noch einmal an und füge die neuen Antworten ein.`
  return null
}

interface Ergebnis {
  warnung?: TeilWarnung
  fehler?: string
  nachbesserungsPrompt?: string | null
}

/**
 * Schritt 3 bei langem Skript (PROJ-69): Das Skript kommt in Teilen, jeder Teil mit eigenem
 * Prompt und eigenem Antwortfeld. Jede eingefügte Antwort wird sofort geprüft. So fällt ein
 * kaputter Teil gleich auf und nicht erst am Ende.
 */
export function SchrittTeile({ ablauf, onAblauf }: { ablauf: Ablauf; onAblauf: (a: Ablauf) => void }) {
  const liste = ablauf.teile?.teile ?? []
  const [offen, setOffen] = useState<string>(() => {
    const n = naechsterOffenerTeil(liste)
    return n ? String(n) : ''
  })
  // Entwürfe und Prompts überleben das Zuklappen eines Teils
  const [entwuerfe, setEntwuerfe] = useState<Record<number, string>>({})
  const [prompts, setPrompts] = useState<Record<number, string>>({})
  const [ergebnisse, setErgebnisse] = useState<Record<number, Ergebnis>>({})

  if (!ablauf.teile) return null
  const von = liste.length
  const eingefuegt = teileEingefuegt(ablauf.teile)
  const grund = sperrGrund(liste)

  function weiterNach(neu: Ablauf, nr: number) {
    const t = neu.teile?.teile ?? []
    // Ein schwerer Befund oder ein Abbruch will gesehen werden: Der Teil bleibt offen, erst saubere Teile gehen weiter
    const dieser = t.find((x) => x.nr === nr)
    if (dieser && (dieser.befund === 'hoch' || dieser.zustand === 'abgeschnitten')) {
      setOffen(String(nr))
      return
    }
    const n = t.find((x) => x.nr > nr && x.zustand !== 'fertig') ?? t.find((x) => x.zustand !== 'fertig')
    setOffen(n ? String(n.nr) : '')
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="leading-relaxed text-ws-text">
          Dein Skript ist lang, deshalb bekommst du es in <strong>{von} Teilen</strong>. So geht es, für jeden Teil gleich:
        </p>
        <ol className="space-y-2 text-ws-text">
          {['Prompt kopieren', 'In der KI einfügen und abschicken', 'Antwort der KI hier einfügen'].map((text, i) => (
            <li key={i} className="flex items-center gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ws-raised text-sm font-bold">{i + 1}</span>
              <span className="leading-relaxed">{text}</span>
            </li>
          ))}
        </ol>
        {liste.some((t) => t.unterteil) && (
          <Hinweis>
            Dein Skript hat nur wenige Überschriften. Die App teilt deshalb mitten in den Abschnitten, am liebsten vor einer Aufgabe. Mit
            Überschriften in Word wird die Aufteilung genauer.
          </Hinweis>
        )}
        {liste.some((t) => t.zuGross) && (
          <Hinweis>
            Ein Teil bleibt größer als die anderen, zum Beispiel wegen einer sehr großen Tabelle. Falls die KI dort abbricht, hilft der Weg über „Weiterschreiben“.
          </Hinweis>
        )}
        {von >= VIELE_TEILE && (
          <Hinweis>Tipp: Wähle in Schritt 1 nur die Kapitel für die nächsten Wochen aus, dann sind es weniger Teile.</Hinweis>
        )}
      </div>

      <KiOeffnenLink />

      <div className="space-y-2">
        <p className="text-sm font-semibold text-ws-text" aria-live="polite">
          {eingefuegt} von {von} Teilen eingefügt
        </p>
        <Progress
          value={Math.round((eingefuegt / von) * 100)}
          className="h-2 bg-ws-raised [&>div]:bg-ws-green"
          aria-label={`${eingefuegt} von ${von} Teilen eingefügt`}
        />
      </div>

      <Accordion type="single" collapsible value={offen} onValueChange={setOffen} className="space-y-3">
        {liste.map((t) => {
          const status = teilStatus(t)
          const Icon = status.icon
          return (
            <AccordionItem key={t.nr} value={String(t.nr)} className="rounded-2xl border border-ws-line bg-ws-surface px-4 sm:px-5">
              <AccordionTrigger className="min-h-14 gap-3 py-3 hover:no-underline focus-visible:ring-2 focus-visible:ring-ws-green">
                <span className="flex min-w-0 flex-1 flex-col gap-1 text-left sm:flex-row sm:items-center sm:gap-3">
                  <span className="font-semibold text-ws-text">
                    Teil {t.nr} von {von}
                  </span>
                  <span className="min-w-0 truncate text-sm font-normal text-ws-muted" title={t.inhalt.join(' · ')}>
                    {t.inhalt.join(' · ') || `${t.zeichen.toLocaleString('de-DE')} Zeichen`}
                  </span>
                </span>
                <Badge variant="outline" className={cn('shrink-0 gap-1 rounded-full px-3 py-1 font-medium', status.klasse)}>
                  <Icon className="size-3.5" aria-hidden />
                  {status.label}
                </Badge>
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <TeilKarte
                  ablauf={ablauf}
                  teil={t}
                  von={von}
                  prompt={prompts[t.nr] ?? null}
                  setPrompt={(p) => setPrompts((x) => ({ ...x, [t.nr]: p }))}
                  entwurf={entwuerfe[t.nr] ?? ''}
                  setEntwurf={(e) => setEntwuerfe((x) => ({ ...x, [t.nr]: e }))}
                  ergebnis={ergebnisse[t.nr] ?? null}
                  setErgebnis={(e) => setErgebnisse((x) => ({ ...x, [t.nr]: e }))}
                  onAblauf={(neu) => {
                    onAblauf(neu)
                    weiterNach(neu, t.nr)
                  }}
                />
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>

      {grund && (
        <p className="text-sm leading-relaxed text-ws-muted" aria-live="polite">
          {grund}
        </p>
      )}
    </div>
  )
}

function TeilKarte({
  ablauf,
  teil,
  von,
  prompt,
  setPrompt,
  entwurf,
  setEntwurf,
  ergebnis,
  setErgebnis,
  onAblauf,
}: {
  ablauf: Ablauf
  teil: AblaufTeil
  von: number
  prompt: string | null
  setPrompt: (p: string) => void
  entwurf: string
  setEntwurf: (e: string) => void
  ergebnis: Ergebnis | null
  setErgebnis: (e: Ergebnis) => void
  onAblauf: (a: Ablauf) => void
}) {
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [pruefend, setPruefend] = useState(false)
  // Ein abgeschnittener Teil holt erst den Rest nach; wer will, fragt ihn stattdessen ganz neu an
  const [ganzNeu, setGanzNeu] = useState(false)
  const rest = teil.zustand === 'abgeschnitten' && !ganzNeu

  // Der Prompt wird beim Aufklappen geholt, nicht erst beim Kopieren: Safari (iPhone) erlaubt das Kopieren
  // nur direkt nach dem Tippen, ein Umweg über das Netz dazwischen würde es verbieten.
  useEffect(() => {
    if (rest || prompt !== null) return
    let aktiv = true
    setLadeFehler(null)
    ladeTeilPrompt(ablauf.id, teil.nr)
      .then((r) => aktiv && setPrompt(r.prompt))
      .catch((e) => aktiv && setLadeFehler(e instanceof WerkzeugFehler ? e.message : 'Der Prompt konnte gerade nicht erstellt werden.'))
    return () => {
      aktiv = false
    }
    // setPrompt ändert sich mit jedem Render, gemeint ist nur: Teil oder Modus wechselt
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ablauf.id, teil.nr, rest, prompt === null])

  async function einfuegen(trotzdem = false) {
    setPruefend(true)
    try {
      const r = await sendeTeilAntwort(ablauf.id, teil.nr, { antwort: entwurf, ...(trotzdem ? { trotzdem } : {}) })
      if (r.uebernommen) {
        setErgebnis({ nachbesserungsPrompt: r.nachbesserungsPrompt })
        setEntwurf('')
        setGanzNeu(false)
        onAblauf(r.ablauf)
      } else {
        setErgebnis({ warnung: r.warnung, fehler: r.fehler })
      }
    } catch (e) {
      setErgebnis({ fehler: e instanceof WerkzeugFehler ? e.message : 'Die Prüfung hat gerade nicht geklappt. Bitte versuche es erneut.' })
    } finally {
      setPruefend(false)
    }
  }

  const status = teilStatus(teil)
  const ersetzt = teil.zustand !== 'offen'

  return (
    <div className="space-y-5">
      {teil.inhalt.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-5 text-sm leading-relaxed text-ws-muted">
          {teil.inhalt.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      )}

      {rest ? (
        <div className="space-y-3">
          <RettungsBox
            key={teil.runden}
            titel={`Teil ${teil.nr} bricht ab.`}
            fertig={teil.kapitel}
            automatisch
            tippKleiner={teil.runden >= 1}
            ladePrompt={async () => (await ladeTeilPrompt(ablauf.id, teil.nr, true)).prompt}
            senden={async (antwort) => {
              const r = await sendeTeilAntwort(ablauf.id, teil.nr, { antwort, weiter: true })
              if (!r.uebernommen) return { ok: false, fehler: r.fehler ?? r.warnung?.satz ?? 'Die Antwort konnte nicht angehängt werden.' }
              onAblauf(r.ablauf)
              return { ok: true, tippKleiner: r.tippKleiner }
            }}
          />
          <Button variant="ghost" onClick={() => setGanzNeu(true)} className="min-h-11 rounded-xl text-ws-blue hover:bg-ws-raised hover:text-ws-blue-hover">
            Stattdessen den ganzen Teil neu anfragen
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {teil.zustand === 'abgeschnitten' && (
            <Button variant="ghost" onClick={() => setGanzNeu(false)} className="min-h-11 rounded-xl text-ws-blue hover:bg-ws-raised hover:text-ws-blue-hover">
              Zurück zum Weiterschreiben
            </Button>
          )}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-ws-text">1. Prompt kopieren, in der KI einfügen und abschicken</p>
            {prompt !== null ? (
              <>
                <KopierKnopf text={prompt} label={`Prompt für Teil ${teil.nr} kopieren`} className={`w-full sm:w-auto ${NEBEN_KOPIEREN}`} />
                <p className="text-sm text-ws-faint">
                  ca. {prompt.length.toLocaleString('de-DE')} Zeichen · Teil {teil.nr} von {von}
                </p>
              </>
            ) : ladeFehler ? (
              <p role="alert" className="text-sm leading-relaxed text-ws-red">
                {ladeFehler}
              </p>
            ) : (
              <Button disabled className="min-h-11 rounded-xl bg-ws-surface px-5 text-ws-muted ring-1 ring-ws-line">
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Prompt wird erstellt …
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-ws-text" aria-hidden>
              2. Die ganze Antwort der KI hier einfügen
            </p>
            <Label htmlFor={`wk-teil-${teil.nr}`} className="sr-only">
              Antwort der KI zu Teil {teil.nr}
            </Label>
            <Textarea
              id={`wk-teil-${teil.nr}`}
              value={entwurf}
              onChange={(e) => {
                setEntwurf(e.target.value)
                if (ergebnis?.warnung || ergebnis?.fehler) setErgebnis({})
              }}
              placeholder={ersetzt ? `Neue Antwort zu Teil ${teil.nr} einfügen, sie ersetzt die bisherige …` : `Antwort der KI zu Teil ${teil.nr} hier einfügen …`}
              spellCheck={false}
              className="min-h-40 resize-y rounded-xl border-ws-line bg-ws-bg p-3 font-mono text-sm leading-relaxed text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
            />
            <Button
              variant="outline"
              onClick={() => void einfuegen()}
              disabled={pruefend || entwurf.trim().length === 0}
              className="min-h-11 rounded-xl border-ws-line"
            >
              {pruefend && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />}
              {ersetzt ? 'Ersetzen und prüfen' : 'Einfügen und prüfen'}
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite" className="space-y-3">
        {pruefend && (
          <p role="status" className="flex items-center gap-2 text-sm text-ws-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Teil {teil.nr} wird geprüft …
          </p>
        )}
        {!pruefend && ergebnis?.warnung && (
          <div role="alert" className="space-y-3 rounded-2xl border border-ws-orange/30 bg-ws-orange/10 p-4">
            <p className="flex items-start gap-3 text-sm font-semibold leading-relaxed text-ws-text">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-ws-orange" aria-hidden />
              {ergebnis.warnung.satz}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:pl-8">
              <Button variant="outline" onClick={() => void einfuegen(true)} className="min-h-11 rounded-xl border-ws-line">
                Trotzdem bei Teil {teil.nr} übernehmen
              </Button>
              <Button variant="ghost" onClick={() => setErgebnis({})} className="min-h-11 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text">
                Nicht übernehmen
              </Button>
            </div>
          </div>
        )}
        {!pruefend && ergebnis?.fehler && (
          <div role="alert" className="flex items-start gap-3 rounded-2xl border border-ws-red/30 bg-ws-red/10 p-4 text-sm leading-relaxed text-ws-text">
            <XCircle className="mt-0.5 size-5 shrink-0 text-ws-red" aria-hidden />
            <span>{ergebnis.fehler}</span>
          </div>
        )}
        {!pruefend && !ergebnis?.warnung && !ergebnis?.fehler && teil.satz && teil.zustand !== 'abgeschnitten' && (
          <p className={cn('flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed text-ws-text', status.box)}>
            <status.icon className={cn('mt-0.5 size-5 shrink-0', status.iconFarbe)} aria-hidden />
            <span>{teil.satz}</span>
          </p>
        )}
        {!pruefend && ergebnis?.nachbesserungsPrompt && teil.befund === 'hoch' && (
          <div className="space-y-2">
            <p className="text-sm text-ws-muted">
              Füge den Nachbesserungs-Prompt in dieselbe KI-Unterhaltung ein und ersetze die Antwort dieses Teils durch die neue.
            </p>
            <KopierKnopf text={ergebnis.nachbesserungsPrompt} label="Nachbesserungs-Prompt kopieren" className={`w-full sm:w-auto ${NEBEN_KOPIEREN}`} />
          </div>
        )}
      </div>
    </div>
  )
}
