'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { BildAuswahl } from '@/components/werkzeugkiste/editor/bild-dialog'
import { BildBeschriften } from '@/components/werkzeugkiste/editor/bild-beschriften'
import { useMaterialBilder } from '@/components/werkzeugkiste/editor/material-bilder'
import { ladeBildHoch } from '@/lib/werkzeugkiste-api'
import {
  arbeitskopie,
  dataAdresseZuBlob,
  drehe,
  erzeugeErgebnis,
  formatErlaubt,
  type Ergebnis,
} from '@/lib/werkzeugkiste-bild-bearbeiten'
import {
  NUR_BILDER_FEHLER,
  leseMarken,
  neuerBildBlock,
  nurBilder,
  setzeMarken,
  wendeBildAenderungAn,
  type BildAenderung,
} from '@/lib/werkzeugkiste-bild-block'
import { FORMAT_FEHLER, ORIGINAL_MAX_BYTES, SEITE_GRENZE_BYTES, ZU_GROSS_FEHLER, seiteMitBild } from '@/lib/werkzeugkiste-bilder'
import { fuegeBloeckeEin, type Ziel } from '@/lib/werkzeugkiste-bloecke'
import type { Block, Ort, Struktur } from '@/lib/werkzeugkiste-editor'

/**
 * Alles, was mit einem Bild im Baukasten passiert, ohne dass die Lehrkraft ein Formular braucht (PROJ-104, PROJ-106):
 * Austauschen, Zuschneiden, Drehen, Beschriften und das Hochladen abgelegter oder eingefügter Dateien. Die Vorschau
 * (abgeschottete Seite) wünscht nur; hier führt die App aus und speichert über `aendere`.
 */
export type BildAnfrage =
  | { nr: number; art: 'keine' }
  | { nr: number; art: 'austauschen' | 'zuschneiden' | 'beschriften' | 'drehenLinks' | 'drehenRechts'; ort: Ort }
  | { nr: number; art: 'dateien'; dateien: File[]; ziel: DateiZiel }

/** Wohin eine abgelegte Datei kommt: auf ein vorhandenes Bild (ersetzen) oder als neuer Block an eine Stelle */
export type DateiZiel = { art: 'auf'; ort: Ort } | { art: 'einfuegen'; ziel: Ziel }

export const KEINE_BILDANFRAGE: BildAnfrage = { nr: 0, art: 'keine' }

function blockAn(s: Struktur, ort: Ort): Block | undefined {
  return s.chapters[ort.thema]?.elements[ort.block]
}

/** Eine Datei auf Format und Größe prüfen und für den Upload vorbereiten (Verkleinern, JPEG/PNG) */
async function bereiteVor(datei: File): Promise<Ergebnis> {
  if (!formatErlaubt(datei)) throw new Error(FORMAT_FEHLER)
  if (datei.size > ORIGINAL_MAX_BYTES) throw new Error(ZU_GROSS_FEHLER)
  const c = await arbeitskopie(datei)
  return erzeugeErgebnis(c, null, /png|webp|gif/.test(datei.type))
}

export function BildWerkzeuge({
  materialId,
  anfrage,
  struktur,
  aendere,
  gesperrt,
  beiNeuesBild,
}: {
  materialId: string
  anfrage: BildAnfrage
  struktur: Struktur
  aendere: (neu: (s: Struktur) => Struktur, gruppe?: string, ohneZeitgrenze?: boolean) => void
  gesperrt: boolean
  /** Nach dem Einfügen neuer Bilder: Orte der neuen Blöcke (zum Auswählen) */
  beiNeuesBild: (orte: Ort[]) => void
}) {
  const { gross, eigenesHinzufuegen, seitenGroesse } = useMaterialBilder()
  const [dialog, setDialog] = useState<{ art: 'austauschen' | 'zuschneiden' | 'beschriften'; ort: Ort } | null>(null)
  const bearbeitet = useRef(0)
  const strukturRef = useRef(struktur)
  const groesseRef = useRef(seitenGroesse)
  useEffect(() => {
    strukturRef.current = struktur
    groesseRef.current = seitenGroesse
  })

  /** Ändert den Block an `ort`, aber nur, solange dort noch dasselbe Bild steht (während des Hochladens kann sich die Seite ändern) */
  const aendereBild = useCallback(
    (ort: Ort, vorherPfad: string | null, neu: (b: Block) => Block, gruppe?: string) => {
      aendere((s) => {
        const b = blockAn(s, ort)
        if (!b || (vorherPfad !== null && b.path !== vorherPfad)) return s
        const themen = s.chapters.map((t) => ({ ...t, elements: [...t.elements] }))
        themen[ort.thema].elements[ort.block] = neu(b)
        return { ...s, chapters: themen }
      }, gruppe)
    },
    [aendere],
  )

  const hochladen = useCallback(
    async (e: Ergebnis) => {
      const bild = await ladeBildHoch(materialId, e.blob, () => {})
      eigenesHinzufuegen(bild)
      return bild
    },
    [materialId, eigenesHinzufuegen],
  )

  const dreheBild = useCallback(
    async (ort: Ort, richtung: 1 | -1) => {
      const block = blockAn(strukturRef.current, ort)
      const pfad = typeof block?.path === 'string' ? block.path : ''
      if (!block || !pfad) return
      const t = toast.loading('Bild wird gedreht …')
      try {
        const blob = dataAdresseZuBlob(await gross(pfad))
        if (!blob) throw new Error('Dieses Bild lässt sich nicht öffnen.')
        const gedreht = drehe(await arbeitskopie(blob), richtung)
        const e = await erzeugeErgebnis(gedreht, null, /png|webp/.test(blob.type))
        const bild = await hochladen(e)
        aendereBild(ort, pfad, (b) => wendeBildAenderungAn(b, bild.pfad, undefined, { drehungen: richtung === 1 ? 1 : 3, ausschnitt: null }).block)
        toast.success('Bild gedreht', { id: t })
      } catch (fehler) {
        toast.error(fehler instanceof Error ? fehler.message : 'Das Drehen hat nicht geklappt. Bitte versuche es erneut.', { id: t })
      }
    },
    [gross, hochladen, aendereBild],
  )

  const ladeDateien = useCallback(
    async (dateien: File[], ziel: DateiZiel) => {
      const { bilder, abgelehnt } = nurBilder(dateien, formatErlaubt)
      if (abgelehnt > 0) toast.error(NUR_BILDER_FEHLER)
      if (bilder.length === 0) return
      const t = toast.loading(bilder.length === 1 ? 'Bild wird hochgeladen …' : `${bilder.length} Bilder werden hochgeladen …`)
      let platz = groesseRef.current > 0 ? groesseRef.current : null
      const pfade: string[] = []
      let zuGross = 0
      let fehler: string | null = null
      for (const datei of bilder) {
        try {
          const e = await bereiteVor(datei)
          const mit = seiteMitBild(platz, e.blob.size)
          if (mit !== null && mit > SEITE_GRENZE_BYTES) {
            zuGross++
            continue
          }
          const bild = await hochladen(e)
          pfade.push(bild.pfad)
          platz = mit
        } catch (f) {
          fehler = f instanceof Error ? f.message : 'Das Hochladen hat nicht geklappt.'
        }
      }
      toast.dismiss(t)
      if (zuGross > 0) {
        toast.error(zuGross === 1 ? 'Ein Bild passt nicht mehr in die Seite (8 MB). Es wurde nicht eingefügt.' : `${zuGross} Bilder passen nicht mehr in die Seite (8 MB) und wurden nicht eingefügt.`)
      }
      if (fehler && pfade.length === 0) toast.error(fehler)
      else if (fehler) toast.error(`Nicht alle Bilder konnten hochgeladen werden: ${fehler}`)
      if (pfade.length === 0) return

      let einzufuegen = pfade
      if (ziel.art === 'auf') {
        const [erstes, ...rest] = pfade
        const ort = ziel.ort
        aendereBild(ort, null, (b) => setzeMarken({ ...b, path: erstes }, []))
        einzufuegen = rest
        if (rest.length === 0) {
          toast.success('Bild ersetzt – Größe, Ausrichtung und Texte bleiben.')
          return
        }
        const nach: Ziel = { thema: ort.thema, index: ort.block + 1 }
        const neu = einzufuegen.map((p) => neuerBildBlock(p))
        const r = fuegeBloeckeEin(strukturRef.current, nach, neu)
        aendere((s) => fuegeBloeckeEin(s, nach, neu).struktur)
        beiNeuesBild(r.orte)
        toast.success(`Bild ersetzt, ${rest.length === 1 ? '1 weiteres Bild' : `${rest.length} weitere Bilder`} eingefügt.`)
        return
      }
      const neu = einzufuegen.map((p) => neuerBildBlock(p))
      const r = fuegeBloeckeEin(strukturRef.current, ziel.ziel, neu)
      aendere((s) => fuegeBloeckeEin(s, ziel.ziel, neu).struktur)
      beiNeuesBild(r.orte)
      toast.success(pfade.length === 1 ? 'Bild eingefügt. Der Alternativtext fehlt noch.' : `${pfade.length} Bilder eingefügt. Die Alternativtexte fehlen noch.`)
    },
    [hochladen, aendere, aendereBild, beiNeuesBild],
  )

  // Anfrage von außen (Leiste in der Vorschau, Ablegen, Einfügen): jede Nummer genau einmal ausführen
  useEffect(() => {
    if (anfrage.nr === bearbeitet.current || anfrage.art === 'keine') return
    bearbeitet.current = anfrage.nr
    if (gesperrt) return
    // Der Dialog öffnet sich im nächsten Takt, nicht mitten im Effekt
    queueMicrotask(() => {
      if (anfrage.art === 'dateien') void ladeDateien(anfrage.dateien, anfrage.ziel)
      else if (anfrage.art === 'drehenLinks') void dreheBild(anfrage.ort, -1)
      else if (anfrage.art === 'drehenRechts') void dreheBild(anfrage.ort, 1)
      else setDialog({ art: anfrage.art, ort: anfrage.ort })
    })
  }, [anfrage, gesperrt, dreheBild, ladeDateien])

  const block = dialog ? blockAn(struktur, dialog.ort) : undefined
  const pfad = typeof block?.path === 'string' ? block.path : ''

  function gewaehlt(neuerPfad: string, alt?: string, aenderung?: BildAenderung) {
    if (!dialog) return
    const { ort, art } = dialog
    setDialog(null)
    const vorher = pfad
    let ausserhalb = 0
    let markenWeg = false
    aendereBild(ort, vorher, (b) => {
      if (aenderung && art === 'zuschneiden') {
        const r = wendeBildAenderungAn(b, neuerPfad, alt, aenderung)
        ausserhalb = r.ausserhalb
        return r.block
      }
      markenWeg = leseMarken(b).length > 0 && neuerPfad !== b.path
      const neu: Block = { ...b, path: neuerPfad }
      if (alt !== undefined && alt.trim()) neu.alt = alt
      return markenWeg ? setzeMarken(neu, []) : neu
    })
    if (ausserhalb > 0) toast.info(ausserhalb === 1 ? '1 Markierung liegt außerhalb und wurde ausgeblendet.' : `${ausserhalb} Markierungen liegen außerhalb und wurden ausgeblendet.`)
    if (markenWeg) toast.info('Die Markierungen gehörten zum alten Bild und wurden entfernt. „Rückgängig“ bringt sie zurück.')
  }

  return (
    <>
      <BildAuswahl
        offen={dialog?.art === 'austauschen' || dialog?.art === 'zuschneiden'}
        onOpenChange={(o) => !o && setDialog(null)}
        aktuell={pfad}
        mitAlt
        alt={typeof block?.alt === 'string' ? block.alt : ''}
        bearbeite={dialog?.art === 'zuschneiden' ? pfad : undefined}
        onWaehle={gewaehlt}
      />
      <BildBeschriften
        offen={dialog?.art === 'beschriften'}
        onOpenChange={(o) => !o && setDialog(null)}
        pfad={pfad}
        marken={block ? leseMarken(block) : []}
        onFertig={(marken) => {
          if (!dialog) return
          aendereBild(dialog.ort, pfad, (b) => setzeMarken(b, marken), 'marken')
        }}
      />
    </>
  )
}

/** Bilder aus der Zwischenablage des Systems (Screenshot, kopiertes Bild); leer, wenn es keine gibt oder der Zugriff fehlt */
export async function liesBilderAusZwischenablage(): Promise<File[]> {
  try {
    if (!navigator.clipboard?.read) return []
    const eintraege = await navigator.clipboard.read()
    const dateien: File[] = []
    for (const e of eintraege) {
      const typ = e.types.find((x) => /^image\/(png|jpeg|webp)$/.test(x))
      if (!typ) continue
      const blob = await e.getType(typ)
      dateien.push(new File([blob], `eingefuegt.${typ === 'image/jpeg' ? 'jpg' : typ.slice(6)}`, { type: typ }))
    }
    return dateien
  } catch {
    return []
  }
}
