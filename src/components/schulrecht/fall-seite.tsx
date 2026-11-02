'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Download, Loader2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import { AblaufRahmen, HAUPTAKTION, NEBENAKTION, SchliessenKnopf } from '@/components/werkzeugkiste/ablauf-rahmen'
import { SchrittPrompt } from '@/components/werkzeugkiste/schritt-prompt'
import { Hinweis } from '@/components/werkzeugkiste/schritt-skript'
import { SachverhaltFunde } from '@/components/schulrecht/sachverhalt-funde'
import {
  erkennePersonenbezuege,
  erstelleFallPrompt,
  ladeAktennotiz,
  ladeFall,
  legeFallAn,
  pruefeFallAntwort,
  SchulrechtFehler,
  speichereFallSchritt,
  verwirfFall,
} from '@/lib/schulrecht-api'
import {
  alleAbgelehnt,
  ANTWORT_MAX_ZEICHEN,
  FALL_SCHRITTE,
  FALL_START_KEY,
  fallHref,
  fallSchrittAusParam,
  fundstelleKurz,
  HAFTUNGSHINWEIS,
  leseAusTab,
  loescheAusTab,
  SACHVERHALT_ENTWURF_KEY,
  SACHVERHALT_MAX_ZEICHEN,
  SCHULRECHT_HREF,
  speichereImTab,
  wendeErsetzungenAn,
  type Entscheidung,
  type Fall,
  type FallPruefung,
  type FallSchritt,
  type FallStart,
  type Fund,
} from '@/lib/schulrecht'

const SCHULRECHT_RUECKFRAGE = {
  titel: 'Abbrechen?',
  text: 'Der Fall wird gelöscht. Nichts davon bleibt gespeichert.',
  knopf: 'Abbrechen',
} as const

function fehlertext(e: unknown, standard: string): string {
  return e instanceof SchulrechtFehler ? e.message : standard
}

/**
 * Aktennotiz zu einem Fall (PROJ-55): Sachverhalt · Prompt · Aktennotiz.
 * Ohne `id` beginnt ein neuer Fall (nur Schritt 1, der Originaltext bleibt im
 * Browser dieses Tabs); mit `id` läuft ein gespeicherter Fall, der spätestens
 * nach 24 Stunden verschwindet (E4).
 */
export function FallSeite({ id }: { id?: string }) {
  if (!id) return <NeuerFall />
  return <LaufenderFall id={id} />
}

// ── Schritt 1 eines neuen Falls ────────────────────────────────────────────

function NeuerFall() {
  const router = useRouter()
  const [sachverhalt, setSachverhalt] = useState('')
  const [start, setStart] = useState<FallStart | null>(null)
  const [bereit, setBereit] = useState(false)
  const [phase, setPhase] = useState<'eingabe' | 'pruefen'>('eingabe')
  const [funde, setFunde] = useState<Fund[]>([])
  const [entscheidungen, setEntscheidungen] = useState<Record<number, Entscheidung>>({})
  const [bestaetigt, setBestaetigt] = useState(false)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  // Entwurf und Startdaten stehen nur in diesem Tab (sessionStorage), nie auf dem Server
  useEffect(() => {
    const s = leseAusTab<FallStart>(FALL_START_KEY)
    const entwurf = leseAusTab<string>(SACHVERHALT_ENTWURF_KEY)
    setStart(s)
    setSachverhalt(entwurf ?? s?.frage ?? '')
    setBereit(true)
  }, [])

  useEffect(() => {
    if (!bereit) return
    if (sachverhalt) speichereImTab(SACHVERHALT_ENTWURF_KEY, sachverhalt)
    else loescheAusTab(SACHVERHALT_ENTWURF_KEY)
  }, [sachverhalt, bereit])

  const zuruecksetzen = useCallback(async () => {
    loescheAusTab(SACHVERHALT_ENTWURF_KEY)
    loescheAusTab(FALL_START_KEY)
  }, [])

  async function weiter() {
    setLaeuft(true)
    setFehler(null)
    try {
      const { funde: gefunden } = await erkennePersonenbezuege(sachverhalt)
      setFunde(gefunden)
      setEntscheidungen({})
      setBestaetigt(false)
      setPhase('pruefen')
    } catch (e) {
      setFehler(fehlertext(e, 'Die Prüfung auf Namen hat gerade nicht geklappt.'))
    } finally {
      setLaeuft(false)
    }
  }

  async function promptErstellen() {
    setLaeuft(true)
    setFehler(null)
    try {
      const bestaetigterText = wendeErsetzungenAn(sachverhalt, funde, entscheidungen)
      const { fall } = await legeFallAn({
        sachverhalt: bestaetigterText,
        fundstellen: start?.fundstellen ?? [],
        alleAbgelehnt: alleAbgelehnt(funde, entscheidungen),
      })
      await erstelleFallPrompt(fall.id)
      await zuruecksetzen()
      router.replace(fallHref(fall.id, 2))
    } catch (e) {
      setFehler(fehlertext(e, 'Der Prompt konnte gerade nicht erstellt werden.'))
      setLaeuft(false)
    }
  }

  const leer = sachverhalt.trim().length === 0
  const blockiert = phase === 'pruefen' && alleAbgelehnt(funde, entscheidungen) && !bestaetigt

  return (
    <AblaufRahmen
      schritt={1}
      erreicht={1}
      schritte={FALL_SCHRITTE}
      kopfTitel="Aktennotiz"
      kurzinfo={start?.fundstellen.length ? `${start.fundstellen.length} Fundstellen aus deiner Suche` : undefined}
      titel={phase === 'eingabe' ? 'Sachverhalt beschreiben' : 'Namen und Daten prüfen'}
      beschreibung={
        phase === 'eingabe'
          ? 'Beschreibe den Fall in ein paar Sätzen. Im nächsten Schritt kannst du Namen, Klassen und Daten ersetzen lassen.'
          : undefined
      }
      schliessen={
        <SchliessenKnopf
          ziel={SCHULRECHT_HREF}
          rueckfrage={leer ? undefined : SCHULRECHT_RUECKFRAGE}
          beimAbbrechen={zuruecksetzen}
        />
      }
      fuss={
        <>
          {phase === 'pruefen' ? (
            <Button variant="outline" onClick={() => setPhase('eingabe')} disabled={laeuft} className={NEBENAKTION}>
              Zurück
            </Button>
          ) : (
            <span />
          )}
          {phase === 'eingabe' ? (
            <Button onClick={weiter} disabled={leer || laeuft} className={HAUPTAKTION}>
              {laeuft && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
              Weiter
            </Button>
          ) : (
            <Button onClick={promptErstellen} disabled={laeuft || blockiert} className={HAUPTAKTION}>
              {laeuft && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
              Prompt erstellen
            </Button>
          )}
        </>
      }
    >
      <Hinweis>{HAFTUNGSHINWEIS}</Hinweis>
      {phase === 'eingabe' ? (
        <div className="space-y-2">
          <Label htmlFor="sr-sachverhalt" className="sr-only">
            Sachverhalt
          </Label>
          <Textarea
            id="sr-sachverhalt"
            value={sachverhalt}
            onChange={(e) => setSachverhalt(e.target.value.slice(0, SACHVERHALT_MAX_ZEICHEN))}
            placeholder="z. B. Ein Schüler hat bei der Schulaufgabe gefehlt und sich erst zwei Tage später entschuldigt."
            className="min-h-56 resize-y rounded-2xl border-ws-line bg-ws-surface p-4 text-base leading-relaxed text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
          />
          <p className="text-sm text-ws-faint">
            Dein Originaltext bleibt in diesem Browser-Tab. Gespeichert wird erst die bestätigte, ersetzte Fassung – für höchstens 24 Stunden.
          </p>
        </div>
      ) : (
        <SachverhaltFunde
          sachverhalt={sachverhalt}
          funde={funde}
          entscheidungen={entscheidungen}
          setEntscheidung={(fid, e) => setEntscheidungen((alt) => ({ ...alt, [fid]: e }))}
          bestaetigt={bestaetigt}
          setBestaetigt={setBestaetigt}
        />
      )}
      {fehler && (
        <p role="alert" className="text-sm text-ws-red">
          {fehler}
        </p>
      )}
    </AblaufRahmen>
  )
}

// ── Gespeicherter Fall: Schritte 1–3 ───────────────────────────────────────

function LaufenderFall({ id }: { id: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [fall, setFall] = useState<Fall | null>(null)
  const [ladeFehler, setLadeFehler] = useState<{ text: string; status: number } | null>(null)
  const [versuch, setVersuch] = useState(0)

  useEffect(() => {
    let aktiv = true
    ladeFall(id)
      .then((r) => aktiv && setFall(r.fall))
      .catch((e: unknown) => {
        if (!aktiv) return
        setLadeFehler({
          text:
            e instanceof SchulrechtFehler && e.status === 404
              ? 'Dieser Fall ist nicht mehr da. Fälle werden nach 24 Stunden gelöscht.'
              : fehlertext(e, 'Der Fall konnte nicht geladen werden.'),
          status: e instanceof SchulrechtFehler ? e.status : 0,
        })
      })
    return () => {
      aktiv = false
    }
  }, [id, versuch])

  if (ladeFehler) {
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <AdminErrorState message={ladeFehler.text} onRetry={ladeFehler.status === 404 ? () => router.replace(SCHULRECHT_HREF) : () => {
                setLadeFehler(null)
                setVersuch((v) => v + 1)
              }} />
      </div>
    )
  }
  if (!fall) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <AdminLoadingState variant="form" />
      </div>
    )
  }
  return <FallSchritte fall={fall} setFall={setFall} schrittParam={params.get('schritt')} />
}

function FallSchritte({
  fall,
  setFall,
  schrittParam,
}: {
  fall: Fall
  setFall: (f: Fall) => void
  schrittParam: string | null
}) {
  const router = useRouter()
  const schritt = fallSchrittAusParam(fall, schrittParam)
  const [antwort, setAntwort] = useState(fall.antwort)
  const [pruefung, setPruefung] = useState<FallPruefung | null>(fall.pruefung)
  const [prueftGerade, setPrueftGerade] = useState(false)
  const [pruefFehler, setPruefFehler] = useState<string | null>(null)
  const [ladeNotiz, setLadeNotiz] = useState(false)
  const gepruefterText = useRef(fall.pruefung ? fall.antwort : '')
  const pruefNr = useRef(0)

  const geheZu = useCallback(
    (nr: FallSchritt) => {
      router.push(fallHref(fall.id, nr))
      if (nr > fall.schritt) void speichereFallSchritt(fall.id, nr).then((r) => setFall(r.fall)).catch(() => undefined)
    },
    [fall.id, fall.schritt, router, setFall],
  )

  const pruefe = useCallback(
    async (text: string) => {
      const nr = ++pruefNr.current
      setPrueftGerade(true)
      setPruefFehler(null)
      try {
        const { fall: neu } = await pruefeFallAntwort(fall.id, text)
        if (nr !== pruefNr.current) return
        gepruefterText.current = text
        setPruefung(neu.pruefung)
        setFall(neu)
      } catch (e) {
        if (nr !== pruefNr.current) return
        setPruefFehler(fehlertext(e, 'Die Prüfung hat gerade nicht geklappt.'))
      } finally {
        if (nr === pruefNr.current) setPrueftGerade(false)
      }
    },
    [fall.id, setFall],
  )

  // Nach dem Einfügen prüft die App von selbst (ohne KI), kurz nach der letzten Eingabe
  useEffect(() => {
    if (schritt !== 3) return
    const text = antwort.trim()
    if (text.length < 20 || text === gepruefterText.current.trim()) return
    const t = setTimeout(() => void pruefe(antwort), 800)
    return () => clearTimeout(t)
  }, [antwort, schritt, pruefe])

  async function herunterladen() {
    setLadeNotiz(true)
    try {
      const { blob, dateiname } = await ladeAktennotiz(fall.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = dateiname
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Aktennotiz heruntergeladen')
    } catch (e) {
      toast.error(fehlertext(e, 'Die Aktennotiz konnte gerade nicht erstellt werden.'))
    } finally {
      setLadeNotiz(false)
    }
  }

  const kannLaden = antwort.trim().length > 0 && pruefung?.lesbar !== false && !prueftGerade && gepruefterText.current.trim() === antwort.trim()

  const titel = schritt === 1 ? 'Dein Sachverhalt' : schritt === 2 ? 'Prompt kopieren' : 'Antwort einfügen'
  const beschreibung =
    schritt === 1
      ? 'So geht der Fall an die KI. Namen und Daten sind schon ersetzt.'
      : schritt === 2
        ? 'Der Prompt enthält die Fundstellen im Wortlaut und deinen Sachverhalt. Die KI kann so keine Paragraphen erfinden.'
        : 'Füge die ganze Antwort deiner KI ein. Die App prüft, ob sie Stellen nennt, die ihr nicht gegeben wurden.'

  return (
    <AblaufRahmen
      schritt={schritt}
      erreicht={fall.schritt}
      schritte={FALL_SCHRITTE}
      kopfTitel="Aktennotiz"
      kurzinfo={fall.fundstellen.length ? `${fall.fundstellen.length} Fundstellen` : undefined}
      titel={titel}
      beschreibung={beschreibung}
      schliessen={
        <SchliessenKnopf ziel={SCHULRECHT_HREF} rueckfrage={SCHULRECHT_RUECKFRAGE} beimAbbrechen={() => verwirfFall(fall.id).then(() => undefined)} />
      }
      fuss={
        <>
          {schritt > 1 ? (
            <Button variant="outline" onClick={() => router.back()} className={NEBENAKTION}>
              Zurück
            </Button>
          ) : (
            <span />
          )}
          {schritt === 1 && (
            <Button onClick={() => geheZu(2)} className={HAUPTAKTION}>
              Weiter
            </Button>
          )}
          {schritt === 2 && (
            <Button onClick={() => geheZu(3)} className={HAUPTAKTION}>
              Ich habe die Antwort
            </Button>
          )}
          {schritt === 3 && (
            <Button onClick={herunterladen} disabled={!kannLaden || ladeNotiz} className={HAUPTAKTION}>
              {ladeNotiz ? <Loader2 className="mr-2 size-5 animate-spin" aria-hidden /> : <Download className="mr-2 size-5" aria-hidden />}
              Word herunterladen
            </Button>
          )}
        </>
      }
    >
      <Hinweis>{HAFTUNGSHINWEIS}</Hinweis>

      {schritt === 1 && (
        <section aria-label="Sachverhalt" className="space-y-4">
          <p className="whitespace-pre-wrap break-words rounded-2xl border border-ws-line bg-ws-surface p-4 leading-relaxed">
            {fall.sachverhalt}
          </p>
          {fall.fundstellen.length > 0 && (
            <p className="text-sm text-ws-muted">Rechtsgrundlage: {fall.fundstellen.map(fundstelleKurz).join(' · ')}</p>
          )}
        </section>
      )}

      {schritt === 2 && fall.prompt && <SchrittPrompt prompt={fall.prompt} />}

      {schritt === 3 && (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="sr-antwort" className="sr-only">
              Antwort der KI
            </Label>
            <Textarea
              id="sr-antwort"
              value={antwort}
              onChange={(e) => setAntwort(e.target.value.slice(0, ANTWORT_MAX_ZEICHEN))}
              placeholder="Hier die komplette Antwort der KI einfügen …"
              spellCheck={false}
              className="min-h-56 resize-y rounded-2xl border-ws-line bg-ws-surface p-4 text-sm leading-relaxed text-ws-text placeholder:text-ws-faint focus-visible:ring-ws-green"
            />
          </div>
          <div aria-live="polite">
            <PruefBox pruefung={pruefung} prueftGerade={prueftGerade} fehler={pruefFehler} erneut={() => void pruefe(antwort)} />
          </div>
          <p className="text-sm text-ws-faint">
            Die Aktennotiz wird nur heruntergeladen und nirgends abgelegt. Dieser Fall verschwindet spätestens nach 24 Stunden.
          </p>
        </div>
      )}
    </AblaufRahmen>
  )
}

function PruefBox({
  pruefung,
  prueftGerade,
  fehler,
  erneut,
}: {
  pruefung: FallPruefung | null
  prueftGerade: boolean
  fehler: string | null
  erneut: () => void
}) {
  if (prueftGerade) {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl border border-ws-line bg-ws-surface p-4 text-sm text-ws-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Wird geprüft …
      </div>
    )
  }
  if (fehler) {
    return (
      <Box ton="rot" icon={XCircle} titel={fehler}>
        <Button variant="outline" onClick={erneut} className={NEBENAKTION}>
          Erneut versuchen
        </Button>
      </Box>
    )
  }
  if (!pruefung) return null
  if (!pruefung.lesbar) {
    return <Box ton="rot" icon={XCircle} titel={pruefung.fehler ?? 'Die Antwort ist leer oder unvollständig. Bitte die KI um die vollständige Antwort bitten.'} />
  }
  if (pruefung.befunde.length === 0) {
    return <Box ton="gruen" icon={CheckCircle2} titel="Alle genannten Fundstellen waren der KI gegeben" />
  }
  const n = pruefung.befunde.length
  return (
    <Box ton="orange" icon={AlertTriangle} titel={`${n} ${n === 1 ? 'Hinweis' : 'Hinweise'} – bitte prüfen`}>
      <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ws-text">
        {pruefung.befunde.map((b, i) => (
          <li key={i}>{b.text}</li>
        ))}
      </ul>
    </Box>
  )
}

const TON = {
  gruen: { rahmen: 'border-ws-green/30 bg-ws-green/10', icon: 'text-ws-green' },
  orange: { rahmen: 'border-ws-orange/30 bg-ws-orange/10', icon: 'text-ws-orange' },
  rot: { rahmen: 'border-ws-red/30 bg-ws-red/10', icon: 'text-ws-red' },
} as const

function Box({
  ton,
  icon: Icon,
  titel,
  children,
}: {
  ton: keyof typeof TON
  icon: typeof CheckCircle2
  titel: string
  children?: React.ReactNode
}) {
  return (
    <section aria-label="Prüfergebnis" className={`space-y-3 rounded-2xl border p-4 sm:p-5 ${TON[ton].rahmen}`}>
      <p className="flex items-start gap-3 font-semibold text-ws-text">
        <Icon className={`mt-0.5 size-5 shrink-0 ${TON[ton].icon}`} aria-hidden />
        {titel}
      </p>
      {children && <div className="space-y-3 pl-8">{children}</div>}
    </section>
  )
}
