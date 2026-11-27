'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CircleCheck, ImagePlus, Loader2, Maximize2, Minimize2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { liesWunsch, type VorschauWunsch } from '@/components/werkzeugkiste/editor/vorschau-nachrichten'
import type { SchreibTeil } from '@/components/werkzeugkiste/editor/schreiben'
import type { EintragOrt } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { LOESUNG_TYPEN } from '@/components/werkzeugkiste/editor/loesungen-kennzeichnen'
import { LOESUNGEN_SICHTBAR } from '@/components/werkzeugkiste/editor/bedien-woerter'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { SEITE_GRENZE_BYTES } from '@/lib/werkzeugkiste-bilder'
import { cn } from '@/lib/utils'

export type Modus = 'bearbeiten' | 'ausprobieren'

/** PROJ-103: Die Seite soll einen Teil direkt zum Schreiben öffnen (`html` nur beim Lehrtext: gespeicherte Fassung) */
export interface SchreibStart {
  nr: number
  marke: string
  teil: SchreibTeil
  html?: string
}
/** PROJ-103: Befehl an die Seite: Schreiben beenden (Endstand melden) oder verwerfen (nichts geändert, gebaute Fassung zurück) */
export interface SchreibBefehl {
  nr: number
  art: 'beende' | 'vorbei'
}

/** PROJ-114: Die Seite soll eine Aufgabe an Ort und Stelle zum Bearbeiten öffnen (`block` = gespeicherte Fassung) */
export interface AufgabeStart {
  nr: number
  marke: string
  block: Record<string, unknown>
  typName: string
  /** Gibt es einen verwandten Typ zum Wechseln? */
  typWechsel: boolean
  eintrag: EintragOrt | null
}
/** PROJ-114: Befehl an die offene Aufgabe: beenden, verwerfen (ohne Meldung) oder neuen Stand zeigen (Rückgängig) */
export interface AufgabeBefehl {
  nr: number
  art: 'beende' | 'vorbei' | 'stand'
  block?: Record<string, unknown>
}

/** PROJ-104: Wohin eine abgelegte Datei zielt (so hat die Seite die Stelle zuletzt gemeldet) */
export interface DateiZielMarke {
  marke: string
  wo: 'vor' | 'nach' | 'anfang' | 'auf'
}

/**
 * Vorschau des Entwurfs (PROJ-89): die echte Seite mit funktionierenden
 * Aufgaben, abgeschottet in einem Rahmen ohne eigene Herkunft
 * (`sandbox` mit Skripten und neuen Tabs, aber ohne `allow-same-origin`; PROJ-109). Die Seite kann ihre
 * Skripte ausführen, aber weder Anmeldedaten noch Inhalte der App lesen.
 *
 * Nur Text-Nachrichten gehen hin und her (PROJ-96, PROJ-101):
 *  - App → Seite: Zustand (Modus, Schreibschutz, Handy, leere Themen), gewählte Stelle samt
 *    Typ-Name, Scrollposition nach einem Neubau.
 *  - Seite → App: **Wünsche** (auswählen, mehr auswählen, bearbeiten, einfügen, löschen, duplizieren, kopieren,
 *    ablegen/ziehen, Menü, Schnellauswahl, Tasten), Scrollposition, „bereit“. Die App prüft jede Nachricht streng
 *    (`liesWunsch`) und führt nur aus, was sie selbst für gültig hält.
 * Die App nimmt Nachrichten nur vom eigenen Rahmen an.
 */
export function EditorVorschau({
  html,
  laedt,
  fehler,
  marke,
  name = '',
  neuLaden,
  groesse = 0,
  onWunsch,
  modus = 'bearbeiten',
  onModus,
  lesen = false,
  mobil = false,
  leer = [],
  vollbreit = false,
  onVollbreit,
  mehrMarken = [],
  schreiben = null,
  schreibBefehl = null,
  beiNeueSeite,
  schubladeOffen = false,
  onDateien,
  aufgabe = null,
  aufgabeBefehl = null,
  aufgaben = {},
  bereitetVor = false,
  loesungenSichtbar,
}: {
  html: string | null
  laedt: boolean
  fehler: string | null
  /** data-wk der gewählten Stelle (k0, k0-e3, abschluss) */
  marke: string | null
  /** Typ-Name der gewählten Stelle für die Leiste in der Seite („Lückentext“) */
  name?: string
  neuLaden: () => void
  /** Größe der gebauten Seite in Bytes (PROJ-92: Platzanzeige zur 8-MB-Grenze); 0 = unbekannt */
  groesse?: number
  /**
   * Wunsch aus der Seite. `false` = nicht angenommen, weil die Vorschau veraltet ist
   * (dann sagt die Kopfzeile, was zu tun ist). Wünsche ohne Marke (Tasten) meldet die App immer als angenommen.
   */
  onWunsch?: (w: VorschauWunsch) => boolean
  modus?: Modus
  onModus?: (m: Modus) => void
  /** Schreibgeschützt: die Leiste zeigt nur „Bearbeiten“ */
  lesen?: boolean
  /** Unter 1024 px: Leiste fest am unteren Rand */
  mobil?: boolean
  /** Nummern der Themen ohne Blöcke (Leerzustand mit Vorschlägen) */
  leer?: number[]
  /** Vorschau über die ganze Breite (Gliederung und Schublade ausgeblendet) */
  vollbreit?: boolean
  onVollbreit?: () => void
  /** PROJ-102: Marken aller gewählten Blöcke, wenn mehrere gewählt sind (sonst leer) */
  mehrMarken?: string[]
  /** PROJ-103: Start des Schreibens direkt in der Seite */
  schreiben?: SchreibStart | null
  schreibBefehl?: SchreibBefehl | null
  /** Die Seite wurde neu gebaut (eine laufende Schreib-Sitzung ist damit vorbei) */
  beiNeueSeite?: () => void
  /** PROJ-111: Das Formular zur gewählten Stelle ist offen; die Leiste in der Seite zeigt dann kein zweites „Bearbeiten“ */
  schubladeOffen?: boolean
  /** PROJ-104: Dateien wurden auf die Vorschau gelegt (`ziel` = zuletzt gemeldete Stelle der Seite, sonst null) */
  onDateien?: (dateien: File[], ziel: DateiZielMarke | null) => void
  /** PROJ-114: Aufgabe an Ort und Stelle bearbeiten */
  aufgabe?: AufgabeStart | null
  aufgabeBefehl?: AufgabeBefehl | null
  /** PROJ-114: Blöcke, die sich an Ort und Stelle bearbeiten lassen (Marke → Typ); die Seite findet so die Einträge */
  aufgaben?: Record<string, string>
  /** Eine neu eingefügte Aufgabe wartet darauf, in der Seite aufzugehen (vorgemerkte Öffnung) */
  bereitetVor?: boolean
  /** PROJ-116: Hat das Material Aufgaben mit Lösungs-Kennzeichen? (fehlt: aus `aufgaben` abgeleitet) */
  loesungenSichtbar?: boolean
}) {
  const rahmen = useRef<HTMLIFrameElement>(null)
  const scrollY = useRef(0)
  const letzte = useRef<string | null>(null)
  const ausVorschau = useRef<string | null>(null)
  const bereit = useRef(false)
  const schreibwerkGeschickt = useRef(false)
  const aufgabenwerkGeschickt = useRef(false)
  const neueSeiteRef = useRef(beiNeueSeite)
  const aktuelleMarke = useRef(marke)
  const aktuellerName = useRef(name)
  const mehrSchluessel = mehrMarken.join(',')
  const aktuelleMehr = useRef(mehrMarken)
  const wunschRef = useRef(onWunsch)
  const fehlerRef = useRef(fehler)
  const leerSchluessel = leer.join(',')
  const aufgabenSchluessel = JSON.stringify(aufgaben)
  const zustandRef = useRef({ modus, lesen, mobil, leer, schublade: schubladeOffen, aufgaben })
  useEffect(() => {
    aktuelleMarke.current = marke
    aktuellerName.current = name
    aktuelleMehr.current = mehrMarken
    wunschRef.current = onWunsch
    neueSeiteRef.current = beiNeueSeite
    fehlerRef.current = fehler
    zustandRef.current = { modus, lesen, mobil, leer, schublade: schubladeOffen, aufgaben }
  })
  const [hinweis, setHinweis] = useState<string | null>(null)
  // PROJ-116: Hinweis nur, wenn die Seite überhaupt Aufgaben mit sichtbaren Lösungen hat
  const hatLoesungen = loesungenSichtbar ?? Object.values(aufgaben).some((t) => LOESUNG_TYPEN.includes(t))
  const zeigtLoesungen = modus === 'bearbeiten' && hatLoesungen
  const [dateiZieht, setDateiZieht] = useState(false)
  const dropZiel = useRef<DateiZielMarke | null>(null)
  const dateienRef = useRef(onDateien)
  const zeigerTakt = useRef<number | null>(null)
  useEffect(() => {
    dateienRef.current = onDateien
  })

  const senden = useCallback((nachricht: Record<string, unknown>) => {
    rahmen.current?.contentWindow?.postMessage(nachricht, '*')
  }, [])

  // Neue Seite (neues srcdoc): Das Skript meldet sich gleich mit „bereit“
  useEffect(() => {
    bereit.current = false
    schreibwerkGeschickt.current = false
    aufgabenwerkGeschickt.current = false
  }, [html])

  // PROJ-114: Aufgabe öffnen. Das Aufgabenwerk wird erst beim ersten Mal in die Seite geladen.
  const aufgabeNr = aufgabe?.nr ?? 0
  const aufgabeRef = useRef(aufgabe)
  aufgabeRef.current = aufgabe
  useEffect(() => {
    const a = aufgabeRef.current
    if (!a || !bereit.current) return
    let abgebrochen = false
    void (async () => {
      if (!aufgabenwerkGeschickt.current) {
        const m = await import('@/components/werkzeugkiste/editor/aufgabenwerk/aufgabenwerk-bundle.generated')
        if (abgebrochen) return
        senden({ wkAufgabenwerk: m.AUFGABENWERK_CODE })
        aufgabenwerkGeschickt.current = true
      }
      senden({ wkAufgabeStart: { marke: a.marke, block: a.block, typName: a.typName, typWechsel: a.typWechsel, eintrag: a.eintrag } })
    })()
    return () => {
      abgebrochen = true
    }
  }, [aufgabeNr, senden])

  const aBefehlNr = aufgabeBefehl?.nr ?? 0
  const aBefehlRef = useRef(aufgabeBefehl)
  aBefehlRef.current = aufgabeBefehl
  useEffect(() => {
    const b = aBefehlRef.current
    if (!b || aBefehlNr === 0) return
    if (b.art === 'beende') senden({ wkAufgabeBeende: true })
    else if (b.art === 'vorbei') senden({ wkAufgabeVorbei: true })
    else if (b.block) senden({ wkAufgabeStand: b.block })
  }, [aBefehlNr, senden])

  // PROJ-103: Schreiben starten. Das Schreibwerk (Text-Motor) wird erst jetzt und nur für Lehrtext in die Seite geladen.
  const startNr = schreiben?.nr ?? 0
  const startRef = useRef(schreiben)
  startRef.current = schreiben
  useEffect(() => {
    const s = startRef.current
    if (!s || !bereit.current) return
    let abgebrochen = false
    void (async () => {
      if (s.teil === 'text' && !schreibwerkGeschickt.current) {
        const m = await import('@/components/werkzeugkiste/editor/schreibwerk/schreibwerk-bundle.generated')
        if (abgebrochen) return
        senden({ wkSchreibwerk: m.SCHREIBWERK_CODE })
        schreibwerkGeschickt.current = true
      }
      senden({ wkSchreibStart: { marke: s.marke, teil: s.teil, html: s.html } })
    })()
    return () => {
      abgebrochen = true
    }
  }, [startNr, senden])

  const befehlNr = schreibBefehl?.nr ?? 0
  const befehlArt = schreibBefehl?.art
  useEffect(() => {
    if (befehlNr > 0 && befehlArt) senden(befehlArt === 'beende' ? { wkSchreibBeende: true } : { wkSchreibVorbei: true })
  }, [befehlNr, befehlArt, senden])

  // Andere Stelle gewählt (oder anderer Typ-Name), während die Seite steht: hervorheben und hinspringen
  // (kam der Klick aus der Seite selbst, bleibt sie, wo sie ist)
  useEffect(() => {
    const schluessel = `${marke ?? ''}|${name}|${mehrSchluessel}`
    if (letzte.current === schluessel) return
    letzte.current = schluessel
    senden({ wk: marke, name, mehr: aktuelleMehr.current, still: ausVorschau.current === marke })
    ausVorschau.current = null
  }, [marke, name, mehrSchluessel, senden])

  // Modus, Schreibschutz, Handy oder leere Themen geändert: der Seite Bescheid geben
  useEffect(() => {
    if (bereit.current) senden({ wkZustand: zustandRef.current })
  }, [modus, lesen, mobil, leerSchluessel, schubladeOffen, aufgabenSchluessel, senden])

  useEffect(() => {
    const beiNachricht = (e: MessageEvent) => {
      if (!rahmen.current || e.source !== rahmen.current.contentWindow) return
      const d: unknown = e.data
      if (!d || typeof d !== 'object') return
      const n = d as Record<string, unknown>
      if (n.wkBereit === true) {
        // Neue Seite steht: Zustand, Auswahl und Scrollposition wiederherstellen
        bereit.current = true
        neueSeiteRef.current?.()
        letzte.current = `${aktuelleMarke.current ?? ''}|${aktuellerName.current}|${aktuelleMehr.current.join(',')}`
        senden({ wkZustand: zustandRef.current })
        senden({ wk: aktuelleMarke.current, name: aktuellerName.current, mehr: aktuelleMehr.current, scrollY: scrollY.current })
        return
      }
      if (typeof n.wkScroll === 'number' && Number.isFinite(n.wkScroll)) {
        scrollY.current = Math.max(0, n.wkScroll)
        return
      }
      let w = liesWunsch(n)
      if (!w) return
      if (w.art === 'dropZiel') {
        // Nur merken: Ablegen entscheidet die App erst beim Loslassen
        dropZiel.current = w.marke && w.wo ? { marke: w.marke, wo: w.wo } : null
        return
      }
      if (
        w.art === 'schreibZwischen' ||
        w.art === 'schreibEnde' ||
        w.art === 'schreibAbbruch' ||
        w.art === 'aufgabeAenderung' ||
        w.art === 'aufgabeEnde' ||
        w.art === 'aufgabeAbbruch' ||
        w.art === 'aufgabeAktion'
      ) {
        // Schreib-Wünsche entscheidet die App selbst; ein Hinweis „Vorschau veraltet“ passt dazu nicht
        wunschRef.current?.(w)
        return
      }
      if (w.art === 'menue') {
        // Die Seite meldet Koordinaten im Rahmen; das Menü gehört der App und braucht Fensterkoordinaten
        const r = rahmen.current.getBoundingClientRect()
        w = { ...w, x: r.left + w.x, y: r.top + w.y }
      }
      const angenommen = wunschRef.current?.(w) ?? false
      if (angenommen) {
        // Ein Klick aus der Seite lässt sie, wo sie ist
        if (w.art === 'waehle' || w.art === 'bearbeite' || w.art === 'mehr' || w.art === 'aufgabe') ausVorschau.current = w.marke
        setHinweis(null)
      } else {
        setHinweis(
          fehlerRef.current
            ? 'Die Vorschau ist nicht aktuell. Bitte „Erneut versuchen“ klicken oder die Stelle in der Gliederung wählen.'
            : 'Die Vorschau wird gerade aktualisiert. Bitte gleich noch einmal klicken.',
        )
      }
    }
    window.addEventListener('message', beiNachricht)
    return () => window.removeEventListener('message', beiNachricht)
  }, [senden])

  // PROJ-104: Wird eine Datei über das Fenster gezogen, legt sich eine Fläche über die Seite (Ziehen über einen
  // Rahmen erreicht die App sonst nicht). Die Seite zeigt dann die Einfügestelle.
  const dateienErlaubt = !!onDateien && modus === 'bearbeiten' && !lesen
  useEffect(() => {
    if (!dateienErlaubt) return
    const hatDatei = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files')
    const ein = (e: DragEvent) => {
      if (hatDatei(e)) setDateiZieht(true)
    }
    const aus = (e: DragEvent) => {
      if (!e.relatedTarget) setDateiZieht(false)
    }
    const ende = () => setDateiZieht(false)
    window.addEventListener('dragenter', ein)
    window.addEventListener('dragleave', aus)
    window.addEventListener('drop', ende)
    window.addEventListener('dragend', ende)
    return () => {
      window.removeEventListener('dragenter', ein)
      window.removeEventListener('dragleave', aus)
      window.removeEventListener('drop', ende)
      window.removeEventListener('dragend', ende)
    }
  }, [dateienErlaubt])

  const zeigerMelden = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      const r = rahmen.current?.getBoundingClientRect()
      if (!r) return
      // Nur Dateien, die keine Bilder sind (PDF, Word): keine Einfügelinie
      const items = Array.from(e.dataTransfer.items ?? [])
      const nurFremde = items.length > 0 && items.every((i) => i.kind === 'file' && i.type !== '' && !/^image\/(png|jpeg|webp)$/.test(i.type))
      const x = e.clientX - r.left
      const y = e.clientY - r.top
      if (zeigerTakt.current !== null) cancelAnimationFrame(zeigerTakt.current)
      zeigerTakt.current = requestAnimationFrame(() => {
        zeigerTakt.current = null
        senden({ wkDropZeiger: nurFremde ? null : { x: Math.round(x), y: Math.round(y) } })
      })
    },
    [senden],
  )

  useEffect(() => {
    if (!hinweis) return
    const t = setTimeout(() => setHinweis(null), 4000)
    return () => clearTimeout(t)
  }, [hinweis])

  return (
    <div className="flex h-full min-h-[60vh] flex-col overflow-hidden rounded-2xl border border-ws-line bg-white">
      <div className="flex min-h-11 flex-wrap items-center gap-x-2 gap-y-1 border-b border-ws-line bg-ws-surface px-3 py-1 text-sm text-ws-muted">
        {onModus && (
          <AdminSegmented
            value={modus}
            onChange={onModus}
            ariaLabel="Modus der Vorschau"
            options={[
              { value: 'bearbeiten', label: 'Bearbeiten' },
              { value: 'ausprobieren', label: 'Ausprobieren' },
            ]}
          />
        )}
        {(laedt || bereitetVor) && (
          <span className="flex items-center gap-1.5" aria-live="polite">
            <Loader2 className="size-3.5 animate-spin" aria-hidden />{' '}
            {bereitetVor ? 'Aufgabe wird vorbereitet …' : 'Vorschau wird aktualisiert …'}
          </span>
        )}
        {!laedt && fehler && html && (
          <span className="text-ws-orange" role="status">
            Vorschau gerade nicht aktuell
          </span>
        )}
        {zeigtLoesungen && !laedt && !fehler && (
          <span className="flex items-center gap-1.5 text-ws-green" title={LOESUNGEN_SICHTBAR.erklaerung} data-testid="loesungen-hinweis">
            <CircleCheck className="size-3.5" aria-hidden /> {LOESUNGEN_SICHTBAR.hinweis}
          </span>
        )}
        {hinweis && (
          <span className="text-ws-orange" role="status">
            {hinweis}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Die Seitengröße zeigt sich erst, wenn es eng wird (ab 80 %), damit die Kopfzeile ruhig bleibt */}
          {groesse / SEITE_GRENZE_BYTES >= 0.8 && <SeitenGroesse bytes={groesse} />}
          {!laedt && fehler && (
            <Button variant="ghost" size="sm" className="min-h-9 rounded-lg" onClick={neuLaden}>
              <RotateCw className="mr-1.5 size-3.5" aria-hidden /> Erneut versuchen
            </Button>
          )}
          {onVollbreit && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden size-9 rounded-lg text-ws-muted hover:bg-ws-raised hover:text-ws-text lg:inline-flex"
              onClick={onVollbreit}
              aria-pressed={vollbreit}
              aria-label={vollbreit ? 'Bearbeitung wieder einblenden' : 'Vorschau über die ganze Breite'}
              title={vollbreit ? 'Bearbeitung wieder einblenden' : 'Vorschau über die ganze Breite'}
            >
              {vollbreit ? <Minimize2 className="size-4" aria-hidden /> : <Maximize2 className="size-4" aria-hidden />}
            </Button>
          )}
        </div>
      </div>
      {html ? (
        <div className="relative flex min-h-0 flex-1 flex-col">
          <iframe
            ref={rahmen}
            title="Vorschau der Seite"
            srcDoc={html}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            className="w-full flex-1 bg-white"
          />
          {dateiZieht && dateienErlaubt && (
            <div
              className="absolute inset-0 z-10 flex items-start justify-center border-4 border-dashed border-ws-green/60 bg-ws-green/5 pt-3"
              data-testid="ablege-flaeche"
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'copy'
                zeigerMelden(e)
              }}
              onDragLeave={() => {
                dropZiel.current = null
                senden({ wkDropZeiger: null })
              }}
              onDrop={(e) => {
                e.preventDefault()
                const dateien = Array.from(e.dataTransfer.files ?? [])
                const ziel = dropZiel.current
                dropZiel.current = null
                senden({ wkDropZeiger: null })
                setDateiZieht(false)
                if (dateien.length > 0) dateienRef.current?.(dateien, ziel)
              }}
            >
              <span className="pointer-events-none flex items-center gap-2 rounded-full bg-ws-green px-4 py-1.5 text-sm font-semibold text-ws-on-accent shadow">
                <ImagePlus className="size-4" aria-hidden /> Bild hier ablegen
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-ws-bg p-6 text-center text-sm text-ws-muted">
          {fehler ? (
            <>
              <p role="alert">{fehler}</p>
              <Button variant="outline" className={NEBENAKTION} onClick={neuLaden}>
                <RotateCw className="mr-2 size-4" aria-hidden /> Erneut versuchen
              </Button>
            </>
          ) : (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Vorschau wird gebaut …
            </span>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Platzanzeige (PROJ-92): Wie viel der 8 MB, die eine Seite höchstens groß sein darf,
 * ist belegt? Ab 80 % orange, ab 100 % rot – dann lässt sich die Seite nicht veröffentlichen.
 */
export function SeitenGroesse({ bytes }: { bytes: number }) {
  const anteil = bytes / SEITE_GRENZE_BYTES
  const mb = (bytes / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
  const voll = anteil >= 1
  const knapp = anteil >= 0.8
  return (
    <span
      className={cn('ml-auto flex items-center gap-2', voll ? 'text-ws-red' : knapp ? 'text-ws-orange' : 'text-ws-muted')}
      title={voll ? 'Die Seite ist zu groß, um die Änderungen zu übernehmen. Entferne Bilder oder teile das Material auf.' : undefined}
    >
      <span className="whitespace-nowrap" role="status">
        Seitengröße: {mb} MB von 8 MB
      </span>
      <Progress
        value={Math.min(100, Math.round(anteil * 100))}
        aria-valuenow={Math.min(100, Math.round(anteil * 100))}
        aria-label="Belegter Platz der Seite"
        className={cn('h-2 w-16 bg-ws-raised sm:w-24', voll ? '[&>div]:bg-ws-red' : knapp ? '[&>div]:bg-ws-orange' : '[&>div]:bg-ws-green')}
      />
    </span>
  )
}
