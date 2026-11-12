'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { BilderStand } from '@/components/werkzeugkiste/editor/katalog-dialog'
import { ladeMaterialBild, ladeMaterialBilder } from '@/lib/werkzeugkiste-api'
import type { MaterialBild } from '@/lib/werkzeugkiste-editor'

/**
 * Bilder des Materials im Baukasten (PROJ-90, E5): Die Liste wird einmal je
 * geöffnetem Editor beim Kern geholt (erst, wenn jemand sie braucht) und dann
 * von Katalog, Bildauswahl und Formularen geteilt. Gespeichert wird nichts.
 */
interface Kontext {
  materialId: string
  stand: BilderStand
  bilder: MaterialBild[]
  mehr: boolean
  /** Liste anfordern (lädt nur beim ersten Mal bzw. nach einem Fehler) */
  anfordern: () => void
  /** Ist das Skript noch da? null = noch nicht bekannt (PROJ-92) */
  skript: boolean | null
  /** Bilder, die der Entwurf schon benutzt (Marke „Verwendet“ in der Galerie) */
  verwendet: ReadonlySet<string>
  /** Größe der Seite laut letzter Vorschau in Bytes; 0 = noch unbekannt */
  seitenGroesse: number
  /** Ein eben hochgeladenes Bild vorn in die Liste setzen */
  eigenesHinzufuegen: (bild: MaterialBild) => void
  /** Ein Bild in Arbeitsgröße (data:-Adresse), zwischengespeichert */
  gross: (pfad: string) => Promise<string>
}

const BilderKontext = createContext<Kontext | null>(null)

const KEINE: ReadonlySet<string> = new Set()

export function MaterialBilderProvider({
  materialId,
  verwendet = KEINE,
  seitenGroesse = 0,
  children,
}: {
  materialId: string
  verwendet?: ReadonlySet<string>
  seitenGroesse?: number
  children: ReactNode
}) {
  const [stand, setStand] = useState<BilderStand>('laedt')
  const [bilder, setBilder] = useState<MaterialBild[]>([])
  const [mehr, setMehr] = useState(false)
  const [skript, setSkript] = useState<boolean | null>(null)
  const laeuft = useRef(false)
  const geladen = useRef(false)
  const grosse = useRef(new Map<string, Promise<string>>())

  const anfordern = useCallback(() => {
    if (laeuft.current || geladen.current) return
    laeuft.current = true
    setStand('laedt')
    ladeMaterialBilder(materialId)
      .then((r) => {
        geladen.current = true
        setBilder(r.bilder)
        setMehr(r.mehr)
        setSkript(typeof r.skript === 'boolean' ? r.skript : null)
        setStand(r.bilder.length)
      })
      .catch(() => setStand('fehler'))
      .finally(() => {
        laeuft.current = false
      })
  }, [materialId])

  const gross = useCallback(
    (pfad: string) => {
      let p = grosse.current.get(pfad)
      if (!p) {
        p = ladeMaterialBild(materialId, pfad).then((r) => r.bild)
        // Fehlschläge nicht merken, damit ein neuer Versuch möglich ist
        p.catch(() => grosse.current.delete(pfad))
        grosse.current.set(pfad, p)
      }
      return p
    },
    [materialId],
  )

  const eigenesHinzufuegen = useCallback((bild: MaterialBild) => {
    // Auch wenn die Liste noch nie geladen wurde: Sie wird beim nächsten Öffnen vollständig geholt
    setBilder((alt) => [bild, ...alt.filter((b) => b.pfad !== bild.pfad)])
    setStand((alt) => (typeof alt === 'number' ? alt + 1 : alt))
    grosse.current.delete(bild.pfad)
  }, [])

  const wert = useMemo(
    () => ({ materialId, stand, bilder, mehr, anfordern, gross, skript, verwendet, seitenGroesse, eigenesHinzufuegen }),
    [materialId, stand, bilder, mehr, anfordern, gross, skript, verwendet, seitenGroesse, eigenesHinzufuegen],
  )
  return <BilderKontext.Provider value={wert}>{children}</BilderKontext.Provider>
}

/** Bilder des Materials; außerhalb des Editors (Tests, Formular-Vorschau) leer */
export function useMaterialBilder(): Kontext {
  return (
    useContext(BilderKontext) ?? {
      materialId: '',
      stand: 0,
      bilder: [],
      mehr: false,
      anfordern: () => {},
      gross: () => Promise.reject(new Error('Keine Bilder')),
      skript: null,
      verwendet: KEINE,
      seitenGroesse: 0,
      eigenesHinzufuegen: () => {},
    }
  )
}

/** Das Bild eines Blocks in Arbeitsgröße laden; null während des Ladens, 'fehler' wenn es nicht geht */
export function useGrossesBild(pfad: string): string | null | 'fehler' {
  const { gross } = useMaterialBilder()
  const [bild, setBild] = useState<{ pfad: string; wert: string | 'fehler' } | null>(null)
  useEffect(() => {
    if (!pfad) return
    let aktiv = true
    gross(pfad)
      .then((b) => aktiv && setBild({ pfad, wert: b }))
      .catch(() => aktiv && setBild({ pfad, wert: 'fehler' }))
    return () => {
      aktiv = false
    }
  }, [pfad, gross])
  if (!pfad) return 'fehler'
  return bild?.pfad === pfad ? bild.wert : null
}

/** Kurzer Anzeigename eines Bildes: `images/seite3_x42.png` → `seite3_x42.png` */
export const bildName = (pfad: string) => pfad.split('/').pop() || pfad
