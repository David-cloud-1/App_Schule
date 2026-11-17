'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WerkzeugFehler, baueEntwurfVorschau, speichereEntwurf } from '@/lib/werkzeugkiste-api'
import { mitSprungSkript } from '@/components/werkzeugkiste/editor/vorschau-skript'
import { RUECKGAENGIG_SCHRITTE, SPEICHERN_NACH_MS, type EditorBefund, type Struktur } from '@/lib/werkzeugkiste-editor'

export { mitSprungSkript }

/**
 * PROJ-113: Fingerabdruck jeder Stelle (Thema `k0`, Block `k0-e1`) einer Struktur. Die Vorschau-Seite trägt diese
 * Marken; stimmt der Fingerabdruck der angeklickten Stelle in der gebauten und in der aktuellen Struktur überein,
 * ist ein Klick in die (noch nicht neu gebaute) Seite sicher: Er trifft denselben Block.
 */
export function markenSchluessel(s: Struktur): Record<string, string> {
  const aus: Record<string, string> = {}
  s.chapters.forEach((k, t) => {
    aus[`k${t}`] = String(k?.title ?? '')
    ;(k?.elements ?? []).forEach((e, b) => {
      aus[`k${t}-e${b}`] = JSON.stringify(e)
    })
  })
  return aus
}

/**
 * Trifft ein Klick auf `marke` in der gezeigten Seite denselben Block wie jetzt im Entwurf?
 * Deckblatt und Lernzielkontrolle hängen nicht an der Nummerierung und stimmen immer.
 * `gebaut` ist null, solange nicht sicher ist, aus welchem Stand die Seite stammt.
 */
export function stelleStimmt(marke: string, aktuell: Struktur, gebaut: Record<string, string> | null): boolean {
  if (!/^k\d+(-e\d+)?$/.test(marke)) return true
  if (!gebaut) return false
  const jetzt = markenSchluessel(aktuell)
  return marke in jetzt && gebaut[marke] === jetzt[marke]
}

export type Speicherstand = 'gespeichert' | 'ungespeichert' | 'speichert' | 'fehler'

interface Verlauf {
  liste: Struktur[]
  index: number
  /** Gleiche Gruppe kurz nacheinander (Tippen in einem Feld) = ein Rückgängig-Schritt */
  gruppe: string | null
  zeit: number
}

const GRUPPE_MS = 1500
const NEUER_VERSUCH_MS = 5000
export const KEIN_ZUGRIFF = 'Du hast keinen Zugriff mehr auf die Werkzeugkiste. Deine letzten Änderungen sind nicht gespeichert.'
export const MATERIAL_WEG = 'Dieses Material gibt es nicht mehr. Deine letzten Änderungen sind nicht gespeichert.'

/**
 * Zustand des Baukasten-Editors (PROJ-89): die Struktur mit Rückgängig/Wiederholen
 * (E11), automatisches Speichern als Entwurf (E10) mit der Zwei-Tabs-Regel.
 * Gespeichert wird immer der ganze Entwurf, nie nur eine Änderung.
 */
export function useEditorZustand(id: string, start: Struktur, startStand: string | null) {
  const [verlauf, setVerlauf] = useState<Verlauf>({ liste: [start], index: 0, gruppe: null, zeit: 0 })
  const [speicherstand, setSpeicherstand] = useState<Speicherstand>('gespeichert')
  const [konflikt, setKonflikt] = useState(false)
  /** Satz, wenn der Editor schreibgeschützt ist (kein Zugriff, Material weg) */
  const [gesperrt, setGesperrt] = useState<string | null>(null)
  const [fehlertext, setFehlertext] = useState<string | null>(null)
  /** Stand nach dem letzten erfolgreichen Speichern – Auslöser für die Vorschau */
  const [gespeichertAm, setGespeichertAm] = useState(0)
  /** PROJ-113: Fingerabdrücke der zuletzt gespeicherten Struktur (gehört zu `gespeichertAm`) */
  const [gespeichertSchluessel, setGespeichertSchluessel] = useState<Record<string, string>>(() => markenSchluessel(start))

  const struktur = verlauf.liste[verlauf.index]
  const standRef = useRef<string | null>(startStand)
  const gespeichertRef = useRef<Struktur>(start)
  const aktuellRef = useRef<Struktur>(start)
  const laeuftRef = useRef(false)
  const zeitgeber = useRef<ReturnType<typeof setTimeout> | null>(null)
  const konfliktRef = useRef(false)
  aktuellRef.current = struktur

  const speichern = useCallback(async (): Promise<boolean> => {
    if (konfliktRef.current || laeuftRef.current) return false
    laeuftRef.current = true
    try {
      // Während des Speicherns weitergetippt? Dann gleich hinterher – bis nichts mehr offen ist
      while (aktuellRef.current !== gespeichertRef.current) {
        const ziel = aktuellRef.current
        setSpeicherstand('speichert')
        const { stand } = await speichereEntwurf(id, ziel, standRef.current)
        standRef.current = stand
        gespeichertRef.current = ziel
        setFehlertext(null)
        setGespeichertSchluessel(markenSchluessel(ziel))
        setGespeichertAm(Date.now())
      }
      setSpeicherstand('gespeichert')
      return true
    } catch (e) {
      if (e instanceof WerkzeugFehler && e.status === 409) {
        konfliktRef.current = true
        setKonflikt(true)
        setSpeicherstand('fehler')
        return false
      }
      // Kein Zugriff mehr (Rolle entzogen, abgemeldet) oder Material gelöscht:
      // nicht endlos wiederholen, sondern schreibgeschützt anhalten (QA BUG-4)
      if (e instanceof WerkzeugFehler && (e.status === 401 || e.status === 403 || e.status === 404)) {
        konfliktRef.current = true
        setGesperrt(e.status === 404 ? MATERIAL_WEG : KEIN_ZUGRIFF)
        setSpeicherstand('fehler')
        return false
      }
      setFehlertext(e instanceof Error ? e.message : null)
      setSpeicherstand('fehler')
      // Von selbst noch einmal versuchen (E10)
      if (zeitgeber.current) clearTimeout(zeitgeber.current)
      zeitgeber.current = setTimeout(() => void speichernRef.current(), NEUER_VERSUCH_MS)
      return false
    } finally {
      laeuftRef.current = false
    }
  }, [id])
  const speichernRef = useRef(speichern)
  useEffect(() => {
    speichernRef.current = speichern
  }, [speichern])

  // Nach jeder Änderung kurz warten, dann speichern
  useEffect(() => {
    if (struktur === gespeichertRef.current || konfliktRef.current) return
    setSpeicherstand((s) => (s === 'speichert' ? s : 'ungespeichert'))
    if (zeitgeber.current) clearTimeout(zeitgeber.current)
    zeitgeber.current = setTimeout(() => void speichern(), SPEICHERN_NACH_MS)
  }, [struktur, speichern])

  // Verbindung wieder da: sofort speichern
  useEffect(() => {
    const online = () => void speichern()
    window.addEventListener('online', online)
    return () => window.removeEventListener('online', online)
  }, [speichern])

  // Tab schließen mit ungespeicherten Änderungen: Browser fragt nach
  useEffect(() => {
    const vorher = (e: BeforeUnloadEvent) => {
      if (aktuellRef.current !== gespeichertRef.current) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', vorher)
    return () => window.removeEventListener('beforeunload', vorher)
  }, [])

  useEffect(() => () => {
    if (zeitgeber.current) clearTimeout(zeitgeber.current)
  }, [])

  /** `ohneZeitgrenze`: gleiche Gruppe bleibt ein Schritt, egal wie lange es dauert (PROJ-103: Schreiben direkt in der Seite) */
  const aendere = useCallback((neu: (s: Struktur) => Struktur, gruppe?: string, ohneZeitgrenze?: boolean) => {
    if (konfliktRef.current) return
    setVerlauf((v) => {
      const alt = v.liste[v.index]
      const naechste = neu(alt)
      if (naechste === alt) return v
      const jetzt = Date.now()
      const zusammen = !!gruppe && gruppe === v.gruppe && (ohneZeitgrenze || jetzt - v.zeit < GRUPPE_MS) && v.index > 0
      const basis = v.liste.slice(0, zusammen ? v.index : v.index + 1)
      const liste = [...basis, naechste].slice(-RUECKGAENGIG_SCHRITTE - 1)
      return { liste, index: liste.length - 1, gruppe: gruppe ?? null, zeit: jetzt }
    })
  }, [])

  const rueckgaengig = useCallback(() => {
    if (konfliktRef.current) return
    setVerlauf((v) => (v.index > 0 ? { ...v, index: v.index - 1, gruppe: null } : v))
  }, [])

  const wiederholen = useCallback(() => {
    if (konfliktRef.current) return
    setVerlauf((v) => (v.index < v.liste.length - 1 ? { ...v, index: v.index + 1, gruppe: null } : v))
  }, [])

  /** Nach Verwerfen oder Veröffentlichen: neuer Ausgangspunkt, Verlauf beginnt neu */
  const neuStart = useCallback((s: Struktur, stand: string | null) => {
    if (zeitgeber.current) clearTimeout(zeitgeber.current)
    standRef.current = stand
    gespeichertRef.current = s
    aktuellRef.current = s
    setVerlauf({ liste: [s], index: 0, gruppe: null, zeit: 0 })
    setSpeicherstand('gespeichert')
    setGespeichertAm(Date.now())
  }, [])

  return {
    struktur,
    aendere,
    rueckgaengig,
    wiederholen,
    kannZurueck: verlauf.index > 0,
    kannVor: verlauf.index < verlauf.liste.length - 1,
    speicherstand,
    fehlertext,
    konflikt,
    gesperrt,
    /** Sofort speichern (vor dem Veröffentlichen); true = alles gespeichert */
    jetztSpeichern: speichern,
    stand: () => standRef.current,
    hatEntwurf: () => standRef.current !== null,
    gespeichertAm,
    gespeichertSchluessel,
    neuStart,
  }
}

const VORSCHAU_NACH_MS = 1500
/** PROJ-112: Nach einem langsamen Bau wartet der nächste länger (halbe Bauzeit, höchstens so viel), sonst staut sich eine Schlange von Neubauten */
const VORSCHAU_HOECHSTENS_MS = 3000

/** Wartezeit bis zum nächsten Neubau, abhängig davon, wie lange der letzte gedauert hat */
export function vorschauWartezeit(letzteDauerMs: number): number {
  if (!Number.isFinite(letzteDauerMs) || letzteDauerMs <= 0) return VORSCHAU_NACH_MS
  return Math.min(VORSCHAU_HOECHSTENS_MS, Math.max(VORSCHAU_NACH_MS, Math.round(letzteDauerMs / 2)))
}

/**
 * Vorschau des gespeicherten Entwurfs: baut neu, sobald gespeichert wurde –
 * nie mehrere gleichzeitig und seltener als gespeichert wird.
 */
export function useEditorVorschau(id: string, gespeichertAm: number, pausiert = false, gespeichertSchluessel?: Record<string, string>) {
  const [html, setHtml] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [befunde, setBefunde] = useState<EditorBefund[] | null>(null)
  const [groesse, setGroesse] = useState(0)
  /** Für welchen Speicherstand (`gespeichertAm`) die gezeigte Seite gebaut wurde (PROJ-96: Klick auf veraltete Vorschau erkennen) */
  const [gebautFuer, setGebautFuer] = useState<number | null>(null)
  const stand = useRef(gespeichertAm)
  stand.current = gespeichertAm
  const schluesselRef = useRef(gespeichertSchluessel)
  schluesselRef.current = gespeichertSchluessel
  /** PROJ-113: Fingerabdrücke der Struktur, aus der die gezeigte Seite gebaut wurde (null = unsicher, z. B. während des Baus gespeichert) */
  const [gebautSchluessel, setGebautSchluessel] = useState<Record<string, string> | null>(null)
  /** PROJ-114, Schritt 3: Zahl der beendeten Bauversuche (gelungen oder gescheitert) – „ist seitdem gebaut worden?“ */
  const [bauFertig, setBauFertig] = useState(0)
  const laeuft = useRef(false)
  /** Gibt es gerade eine offene Aufgabe oder einen Schreibvorgang? Dann darf eine fertig gebaute Seite sie nicht ersetzen (QA BUG-5) */
  const pausiertRef = useRef(pausiert)
  pausiertRef.current = pausiert
  const nochmal = useRef(false)
  /** Für welchen Speicherstand zuletzt gebaut wurde (nach einer Pause nicht ohne Grund neu bauen) */
  const gebautStand = useRef(-1)
  /** Dauer des letzten Baus (Server, Download, Übergabe an den Rahmen) in ms */
  const letzteDauer = useRef(0)

  const bauen = useCallback(async () => {
    if (laeuft.current) {
      nochmal.current = true
      return
    }
    laeuft.current = true
    setLaedt(true)
    const t0 = performance.now()
    try {
      const fuer = stand.current
      const schluessel = schluesselRef.current ?? null
      const r = await baueEntwurfVorschau(id)
      const t1 = performance.now()
      const res = await fetch(r.adresse, { cache: 'no-store' })
      if (!res.ok) throw new Error('Die Vorschau konnte nicht geladen werden.')
      const text = await res.text()
      const t2 = performance.now()
      // Inzwischen wird direkt in der Seite bearbeitet: Ergebnis verwerfen. `gebautStand` bleibt alt, deshalb baut der
      // Effekt unten nach dem Ende von selbst neu.
      if (pausiertRef.current) return
      setHtml(mitSprungSkript(text))
      letzteDauer.current = t2 - t0
      // Messwerte für die Fehlersuche (nur Konsole, nichts wird gesendet)
      console.info(`[Vorschau] ${Math.round(r.groesse / 1000)} kB gebaut: Server ${Math.round(t1 - t0)} ms, Laden ${Math.round(t2 - t1)} ms`)
      setBefunde(r.befunde)
      setGroesse(r.groesse)
      setGebautFuer(fuer)
      // Wurde während des Baus erneut gespeichert, weiß man nicht sicher, welcher Stand in der Seite steckt
      setGebautSchluessel(stand.current === fuer ? schluessel : null)
      gebautStand.current = fuer
      setFehler(null)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Die Vorschau konnte nicht geladen werden.')
    } finally {
      laeuft.current = false
      setLaedt(false)
      setBauFertig((n) => n + 1)
      if (nochmal.current) {
        nochmal.current = false
        void bauen()
      }
    }
  }, [id])

  // PROJ-103: Solange direkt in der Seite geschrieben wird, baut die Vorschau nicht neu (der Cursor soll nie springen)
  useEffect(() => {
    if (pausiert || gebautStand.current === gespeichertAm) return
    const t = setTimeout(() => void bauen(), gespeichertAm === 0 ? 0 : vorschauWartezeit(letzteDauer.current))
    return () => clearTimeout(t)
  }, [gespeichertAm, bauen, pausiert])

  return { html, laedt, fehler, befunde, setBefunde, groesse, gebautFuer, gebautSchluessel, bauFertig, neuBauen: bauen }
}
