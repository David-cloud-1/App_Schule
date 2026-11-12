'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { AlertTriangle, Loader2, RotateCcw, RotateCw, Undo2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { HAUPTAKTION, NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import {
  alsBlob,
  arbeitskopie,
  ausschnittAufBild,
  ausschnittZuKlein,
  drehe,
  erzeugeErgebnis,
  type Ergebnis,
} from '@/lib/werkzeugkiste-bild-bearbeiten'
import { SEITE_GRENZE_BYTES, seiteMitBild } from '@/lib/werkzeugkiste-bilder'

/**
 * Zuschneiden, Drehen und Übernehmen eines Bildes (PROJ-92). Alles passiert im
 * Browser auf einer Arbeitskopie; das Original wird nie verändert. „Zurücksetzen“
 * stellt den Stand beim Öffnen des Fensters wieder her.
 */
export interface BildBearbeitenProps {
  /** Die Datei bzw. das Bild, das bearbeitet wird */
  quelle: Blob
  /** Alternativtext abfragen (Bild-Block); bei Pflicht bleibt „Übernehmen“ ohne Text gesperrt */
  mitAlt: boolean
  alt: string
  /** Läuft gerade das Hochladen? (Fortschritt 0–100, null = nein) */
  fortschritt: number | null
  /** Fehlermeldung vom letzten Versuch (Hochladen) */
  fehler: string | null
  /** Geschätzte Seitengröße vor dem Bild in Bytes; 0 = unbekannt */
  seitenGroesse: number
  onZurueck: () => void
  onFertig: (ergebnis: Ergebnis, alt: string) => void
}

export function BildBearbeiten({ quelle, mitAlt, alt: altStart, fortschritt, fehler, seitenGroesse, onZurueck, onFertig }: BildBearbeitenProps) {
  const [arbeit, setArbeit] = useState<HTMLCanvasElement | null>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [ladefehler, setLadefehler] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [fertigerCrop, setFertigerCrop] = useState<PixelCrop>()
  const [alt, setAlt] = useState(altStart)
  const [rechnet, setRechnet] = useState(false)
  const [rechenfehler, setRechenfehler] = useState<string | null>(null)
  const [warnung, setWarnung] = useState<Ergebnis | null>(null)
  const bild = useRef<HTMLImageElement>(null)

  // Arbeitskopie bereitstellen (und die Adresse für die Anzeige verwalten)
  const zeige = useCallback(async (c: HTMLCanvasElement) => {
    const blob = await alsBlob(c, 'image/png')
    if (!blob) throw new Error('Das Bild lässt sich nicht anzeigen.')
    setUrl((alt) => {
      if (alt) URL.revokeObjectURL(alt)
      return URL.createObjectURL(blob)
    })
    setArbeit(c)
    setCrop(undefined)
    setFertigerCrop(undefined)
  }, [])

  const zuruecksetzen = useCallback(() => {
    setLadefehler(null)
    arbeitskopie(quelle)
      .then(zeige)
      .catch((e: unknown) => setLadefehler(e instanceof Error ? e.message : 'Das Bild lässt sich nicht öffnen.'))
  }, [quelle, zeige])

  useEffect(() => {
    zuruecksetzen()
  }, [zuruecksetzen])
  useEffect(() => () => setUrl((u) => (u && URL.revokeObjectURL(u), null)), [])

  const dreheUm = (richtung: 1 | -1) => {
    if (arbeit) void zeige(drehe(arbeit, richtung))
  }

  /** Ausschnitt in Bildpunkten der Arbeitskopie; null = ganzes Bild */
  function ausschnitt() {
    if (!arbeit || !bild.current || !fertigerCrop || fertigerCrop.width < 2 || fertigerCrop.height < 2) return null
    return ausschnittAufBild(
      fertigerCrop,
      { breite: bild.current.width, hoehe: bild.current.height },
      { breite: arbeit.width, hoehe: arbeit.height },
    )
  }
  const a = ausschnitt()
  const zuKlein = a ? ausschnittZuKlein(a) : false
  const altFehlt = mitAlt && alt.trim() === ''
  const beschaeftigt = rechnet || fortschritt !== null

  async function uebernehmen(trotzdem = false) {
    if (!arbeit || altFehlt || zuKlein) return
    setRechenfehler(null)
    setRechnet(true)
    try {
      const transparent = /png|webp|gif/.test(quelle.type)
      const ergebnis = await erzeugeErgebnis(arbeit, a, transparent)
      const mit = seiteMitBild(seitenGroesse > 0 ? seitenGroesse : null, ergebnis.blob.size)
      if (!trotzdem && mit !== null && mit > SEITE_GRENZE_BYTES) {
        setWarnung(ergebnis)
        return
      }
      setWarnung(null)
      onFertig(ergebnis, alt.trim())
    } catch (e) {
      setRechenfehler(e instanceof Error ? e.message : 'Das Bild konnte nicht vorbereitet werden.')
    } finally {
      setRechnet(false)
    }
  }

  if (ladefehler) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
        <p className="text-ws-muted">{ladefehler}</p>
        <Button variant="outline" className={NEBENAKTION} onClick={onZurueck}>
          Anderes Bild wählen
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-ws-line bg-ws-bg p-2">
        {url ? (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setFertigerCrop(c)}
            keepSelection
            disabled={beschaeftigt}
            aria-label="Ausschnitt wählen"
            className="max-h-[45svh]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- Blob-Adresse der Arbeitskopie, kein Next-Bild möglich */}
            <img ref={bild} src={url} alt="Vorschau des Bildes" className="max-h-[45svh] max-w-full select-none" draggable={false} />
          </ReactCrop>
        ) : (
          <div className="flex items-center gap-2 py-12 text-ws-muted" role="status">
            <Loader2 className="size-5 animate-spin" aria-hidden /> Bild wird geöffnet …
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" className={NEBENAKTION} onClick={() => dreheUm(-1)} disabled={!arbeit || beschaeftigt}>
          <RotateCcw className="mr-1.5 size-4" aria-hidden /> Links drehen
        </Button>
        <Button type="button" variant="outline" className={NEBENAKTION} onClick={() => dreheUm(1)} disabled={!arbeit || beschaeftigt}>
          <RotateCw className="mr-1.5 size-4" aria-hidden /> Rechts drehen
        </Button>
        <Button type="button" variant="outline" className={NEBENAKTION} onClick={zuruecksetzen} disabled={!arbeit || beschaeftigt}>
          <Undo2 className="mr-1.5 size-4" aria-hidden /> Zurücksetzen
        </Button>
      </div>
      <p className="text-sm text-ws-faint">
        {a && !zuKlein
          ? 'Nur der markierte Ausschnitt wird übernommen.'
          : zuKlein
            ? 'Der Ausschnitt ist zu klein. Ziehe den Rahmen größer.'
            : 'Ziehe einen Rahmen über das Bild, um es zuzuschneiden. Ohne Rahmen wird das ganze Bild übernommen.'}
      </p>

      {mitAlt && (
        <div className="space-y-1.5">
          <Label htmlFor="bild-alt">
            Alternativtext
            <span className="ml-1 text-ws-red" aria-hidden>
              *
            </span>
          </Label>
          <Input
            id="bild-alt"
            value={alt}
            maxLength={300}
            onChange={(e) => setAlt(e.target.value)}
            disabled={beschaeftigt}
            aria-required
            aria-describedby="bild-alt-hinweis"
            className="min-h-11 rounded-xl"
          />
          <p id="bild-alt-hinweis" className={altFehlt ? 'text-sm text-ws-orange' : 'text-sm text-ws-faint'}>
            {altFehlt
              ? 'Bitte beschreibe in einem Satz, was auf dem Bild zu sehen ist.'
              : 'Ein Satz, was auf dem Bild zu sehen ist – für Menschen, die es nicht sehen können.'}
          </p>
        </div>
      )}

      {warnung && (
        <Alert className="border-ws-orange/30 bg-ws-orange/15 text-ws-orange">
          <AlertTriangle className="size-4" aria-hidden />
          <AlertDescription className="space-y-2 text-ws-text">
            <p>
              Mit diesem Bild wird die Seite wohl größer als 8 MB. Dann lässt sie sich nicht veröffentlichen, bis du Bilder entfernst oder das
              Material aufteilst.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className={NEBENAKTION} onClick={() => void uebernehmen(true)}>
                Trotzdem übernehmen
              </Button>
              <Button variant="outline" className={NEBENAKTION} onClick={() => setWarnung(null)}>
                Zurück
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {(rechenfehler || fehler) && (
        <p className="text-sm text-ws-red" role="alert">
          {rechenfehler ?? fehler}
        </p>
      )}

      {fortschritt !== null && (
        <div className="space-y-1" role="status" aria-live="polite">
          <p className="text-sm text-ws-muted">Bild wird hochgeladen … {fortschritt} %</p>
          <Progress value={fortschritt} className="h-2 bg-ws-raised [&>div]:bg-ws-green" aria-label="Fortschritt des Hochladens" />
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2 pt-1">
        <Button variant="outline" className={NEBENAKTION} onClick={onZurueck} disabled={beschaeftigt}>
          Zurück
        </Button>
        <Button className={HAUPTAKTION} onClick={() => void uebernehmen()} disabled={!arbeit || beschaeftigt || altFehlt || zuKlein}>
          {beschaeftigt ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
          {fehler ? 'Erneut versuchen' : 'Übernehmen'}
        </Button>
      </div>
    </div>
  )
}
