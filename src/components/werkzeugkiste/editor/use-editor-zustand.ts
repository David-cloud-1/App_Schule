'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { WerkzeugFehler, baueEntwurfVorschau, speichereEntwurf } from '@/lib/werkzeugkiste-api'
import { RUECKGAENGIG_SCHRITTE, SPEICHERN_NACH_MS, type EditorBefund, type Struktur } from '@/lib/werkzeugkiste-editor'

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

  const aendere = useCallback((neu: (s: Struktur) => Struktur, gruppe?: string) => {
    if (konfliktRef.current) return
    setVerlauf((v) => {
      const alt = v.liste[v.index]
      const naechste = neu(alt)
      if (naechste === alt) return v
      const jetzt = Date.now()
      const zusammen = !!gruppe && gruppe === v.gruppe && jetzt - v.zeit < GRUPPE_MS && v.index > 0
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
    neuStart,
  }
}

const VORSCHAU_NACH_MS = 1500

/** Sprung-Helfer, der in die Vorschau eingefügt wird: Der Editor schickt nur eine Marke als Text */
const SPRUNG_SKRIPT = `<script>addEventListener("message",function(e){var d=e.data;if(!d||typeof d.wk!=="string")return;var el=document.querySelector('[data-wk="'+d.wk.replace(/[^a-z0-9_-]/gi,"")+'"]');if(el)el.scrollIntoView({block:"start",behavior:"smooth"});});</script>`

export function mitSprungSkript(html: string): string {
  const i = html.lastIndexOf('</body>')
  return i >= 0 ? html.slice(0, i) + SPRUNG_SKRIPT + html.slice(i) : html + SPRUNG_SKRIPT
}

/**
 * Vorschau des gespeicherten Entwurfs: baut neu, sobald gespeichert wurde –
 * nie mehrere gleichzeitig und seltener als gespeichert wird.
 */
export function useEditorVorschau(id: string, gespeichertAm: number) {
  const [html, setHtml] = useState<string | null>(null)
  const [laedt, setLaedt] = useState(true)
  const [fehler, setFehler] = useState<string | null>(null)
  const [befunde, setBefunde] = useState<EditorBefund[] | null>(null)
  const [groesse, setGroesse] = useState(0)
  const laeuft = useRef(false)
  const nochmal = useRef(false)

  const bauen = useCallback(async () => {
    if (laeuft.current) {
      nochmal.current = true
      return
    }
    laeuft.current = true
    setLaedt(true)
    try {
      const r = await baueEntwurfVorschau(id)
      const res = await fetch(r.adresse, { cache: 'no-store' })
      if (!res.ok) throw new Error('Die Vorschau konnte nicht geladen werden.')
      setHtml(mitSprungSkript(await res.text()))
      setBefunde(r.befunde)
      setGroesse(r.groesse)
      setFehler(null)
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Die Vorschau konnte nicht geladen werden.')
    } finally {
      laeuft.current = false
      setLaedt(false)
      if (nochmal.current) {
        nochmal.current = false
        void bauen()
      }
    }
  }, [id])

  useEffect(() => {
    const t = setTimeout(() => void bauen(), gespeichertAm === 0 ? 0 : VORSCHAU_NACH_MS)
    return () => clearTimeout(t)
  }, [gespeichertAm, bauen])

  return { html, laedt, fehler, befunde, setBefunde, groesse, neuBauen: bauen }
}
