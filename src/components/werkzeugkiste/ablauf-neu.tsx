'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { findeWerkzeug, ablaufHref, pruefeTranskript, pruefeVideoLink, STANDARD_WERKZEUG, type Werkzeug } from '@/lib/werkzeugkiste'
import { ladeHoch, legeAblaufAn, legeVideoAblaufAn, lieseSkriptEin, loescheAblauf, WerkzeugFehler } from '@/lib/werkzeugkiste-api'
import { AblaufRahmen, HAUPTAKTION, NEBENAKTION, SchliessenKnopf } from '@/components/werkzeugkiste/ablauf-rahmen'
import { DateiAblage, Hinweis, HochladeFortschritt } from '@/components/werkzeugkiste/schritt-skript'
import { VideoEingabe } from '@/components/werkzeugkiste/schritt-video'

type Phase = 'wahl' | 'hochladen' | 'lesen' | 'lesefehler'

const ABBRECHEN = {
  titel: 'Abbrechen?',
  text: 'Dein hochgeladenes Skript und alle Eingaben gehen verloren.',
}

/**
 * Schritt 1 eines neuen Ablaufs (PROJ-51). Der Ablauf entsteht erst mit der
 * Datei: anlegen → direkt in den Speicher hochladen → einlesen lassen →
 * weiter zur Adresse des Ablaufs, wo die Kennzahlen stehen.
 */
export function AblaufNeu({ werkzeugParam }: { werkzeugParam: string | null }) {
  const vorgabe = findeWerkzeug(werkzeugParam)
  const werkzeug = vorgabe?.aktiv ? vorgabe : findeWerkzeug(STANDARD_WERKZEUG)!
  return werkzeug.eingabe === 'video' ? <VideoNeu werkzeug={werkzeug} /> : <SkriptNeu werkzeug={werkzeug} />
}

/**
 * Schritt 1 bei Video-Fragen (PROJ-54, Paket D): kein Hochladen, sondern Link
 * und Transkript einfügen. Der Ablauf entsteht mit einem Aufruf und ist danach
 * schon eingelesen.
 */
function VideoNeu({ werkzeug }: { werkzeug: Werkzeug }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [transkript, setTranskript] = useState('')
  const [sendet, setSendet] = useState(false)
  const [fehler, setFehler] = useState<{ text: string; hinweis?: string } | null>(null)

  const bereit = !pruefeTranskript(transkript) && !pruefeVideoLink(url)

  async function weiter() {
    setSendet(true)
    setFehler(null)
    try {
      const { ablauf } = await legeVideoAblaufAn(werkzeug.id, { url: url.trim(), transkript: transkript.trim() })
      router.replace(ablaufHref(ablauf.id, 1))
    } catch (e) {
      setFehler(
        e instanceof WerkzeugFehler
          ? { text: e.message, hinweis: e.hinweis }
          : { text: 'Das hat gerade nicht geklappt. Bitte versuche es erneut.' },
      )
      setSendet(false)
    }
  }

  return (
    <AblaufRahmen
      schritt={1}
      erreicht={1}
      kurzinfo={werkzeug.name}
      titel="Video"
      beschreibung="Die KI sieht das Video nicht, sondern liest sein Transkript. Füge es hier ein."
      schliessen={<SchliessenKnopf />}
      fuss={
        <>
          <span />
          <Button onClick={() => void weiter()} disabled={!bereit || sendet} className={HAUPTAKTION}>
            {sendet && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
            Weiter
          </Button>
        </>
      }
    >
      <VideoEingabe url={url} setUrl={setUrl} transkript={transkript} setTranskript={setTranskript} deaktiviert={sendet} />
      {fehler && (
        <div role="alert">
          <Hinweis ton="warnung">
            <span className="font-semibold">{fehler.text}</span>
            {fehler.hinweis && <span className="mt-1 block text-ws-muted">{fehler.hinweis}</span>}
          </Hinweis>
        </div>
      )}
    </AblaufRahmen>
  )
}

function SkriptNeu({ werkzeug }: { werkzeug: Werkzeug }) {
  const router = useRouter()

  const [phase, setPhase] = useState<Phase>('wahl')
  const [datei, setDatei] = useState<File | null>(null)
  const [prozent, setProzent] = useState(0)
  const [fehler, setFehler] = useState<{ text: string; hinweis?: string } | null>(null)
  const [ablaufId, setAblaufId] = useState<string | null>(null)

  function zeigeFehler(e: unknown) {
    if (e instanceof WerkzeugFehler) setFehler({ text: e.message, hinweis: e.hinweis })
    else setFehler({ text: 'Das hat gerade nicht geklappt. Bitte versuche es erneut.' })
  }

  async function einlesen(id: string) {
    setPhase('lesen')
    setFehler(null)
    try {
      await lieseSkriptEin(id)
      router.replace(ablaufHref(id, 1))
    } catch (e) {
      zeigeFehler(e)
      setPhase('lesefehler')
    }
  }

  async function starte(neu: File) {
    setDatei(neu)
    setFehler(null)
    setProzent(0)
    setPhase('hochladen')
    let id: string | null = null
    try {
      const { ablauf, upload } = await legeAblaufAn(werkzeug.id, { name: neu.name, groesse: neu.size, typ: neu.type })
      id = ablauf.id
      setAblaufId(id)
      await ladeHoch(upload, neu, setProzent)
    } catch (e) {
      // Ohne vollständige Datei ist der Ablauf wertlos — gleich wieder entfernen
      if (id) void loescheAblauf(id).catch(() => {})
      setAblaufId(null)
      zeigeFehler(e)
      setPhase('wahl')
      return
    }
    await einlesen(id)
  }

  async function andereDatei() {
    if (ablaufId) await loescheAblauf(ablaufId).catch(() => {})
    setAblaufId(null)
    setDatei(null)
    setFehler(null)
    setPhase('wahl')
  }

  return (
    <AblaufRahmen
      schritt={1}
      erreicht={1}
      kurzinfo={datei ? `${datei.name} · ${werkzeug.name}` : werkzeug.name}
      titel="Skript hochladen"
      beschreibung="Word, PDF oder PowerPoint. Rot markierter oder versteckter Text wird als Lösung erkannt."
      schliessen={
        ablaufId ? <SchliessenKnopf rueckfrage={ABBRECHEN} beimAbbrechen={() => loescheAblauf(ablaufId).then(() => {})} /> : <SchliessenKnopf />
      }
      fuss={
        <>
          <span />
          <Button disabled className={HAUPTAKTION}>
            Weiter
          </Button>
        </>
      }
    >
      {phase === 'wahl' && <DateiAblage onDatei={starte} />}
      {phase === 'wahl' && (
        <p className="text-sm text-ws-faint">Bitte keine Schülerdaten im Skript – nur Unterrichtsmaterial.</p>
      )}
      {(phase === 'hochladen' || phase === 'lesen') && datei && (
        <HochladeFortschritt datei={datei} phase={phase} prozent={prozent} />
      )}
      {fehler && (
        <div role="alert" className="space-y-3">
          <Hinweis ton="warnung">
            <span className="font-semibold">{fehler.text}</span>
            {fehler.hinweis && <span className="mt-1 block text-ws-muted">{fehler.hinweis}</span>}
          </Hinweis>
          {phase === 'lesefehler' && ablaufId && (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={() => einlesen(ablaufId)} className={NEBENAKTION}>
                <RotateCw className="mr-2 size-4" aria-hidden />
                Erneut versuchen
              </Button>
              <Button variant="outline" onClick={andereDatei} className={NEBENAKTION}>
                Andere Datei wählen
              </Button>
            </div>
          )}
        </div>
      )}
    </AblaufRahmen>
  )
}
