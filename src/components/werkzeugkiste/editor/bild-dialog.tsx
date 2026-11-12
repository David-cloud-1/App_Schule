'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ImageOff, ImagePlus, Loader2, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AdminTabs, AdminTabsContent, AdminTabsList, AdminTabsTrigger } from '@/components/admin/admin-tabs'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'
import { OHNE_BILDER } from '@/components/werkzeugkiste/editor/katalog-dialog'
import { BildBearbeiten } from '@/components/werkzeugkiste/editor/bild-bearbeiten'
import { bildName, useMaterialBilder } from '@/components/werkzeugkiste/editor/material-bilder'
import { cn } from '@/lib/utils'
import { ladeBildHoch } from '@/lib/werkzeugkiste-api'
import { dataAdresseZuBlob, formatErlaubt, type Ergebnis } from '@/lib/werkzeugkiste-bild-bearbeiten'
import { FORMAT_FEHLER, ORIGINAL_MAX_BYTES, ZU_GROSS_FEHLER, istEigenerPfad } from '@/lib/werkzeugkiste-bilder'

/**
 * Das Bild-Fenster des Baukastens (PROJ-92): ein Bild aus dem Skript wählen, ein
 * eigenes hochladen oder ein vorhandenes Bild zuschneiden und drehen. Bilder aus
 * dem Skript gelten mit einem Klick; Hochladen und Bearbeiten führen über den
 * Schritt „Zuschneiden“. Bearbeitete Bilder sind immer neue Bilder – das Skript
 * bleibt unberührt.
 */
export interface BildDialogProps {
  offen: boolean
  onOpenChange: (offen: boolean) => void
  /** Das gewählte Bild (Name im Material) und, wenn danach gefragt wurde, der Alternativtext */
  onWaehle: (pfad: string, alt?: string) => void
  /** Das Bild, das der Block heute hat (in der Galerie markiert) */
  aktuell?: string
  /** Nach dem Alternativtext fragen (Bild-Block) */
  mitAlt?: boolean
  /** Alternativtext des Blocks (Vorbelegung) */
  alt?: string
  /** Direkt dieses Bild zuschneiden/drehen statt eine Auswahl zu zeigen */
  bearbeite?: string
}

type Schritt =
  | { art: 'waehlen'; fehler: string | null }
  | { art: 'bearbeiten'; quelle: Blob | null; laedt: boolean; fehler: string | null; hochfehler: string | null }

const WAEHLEN: Schritt = { art: 'waehlen', fehler: null }

export function BildAuswahl({ offen, onOpenChange, onWaehle, aktuell, mitAlt = false, alt = '', bearbeite }: BildDialogProps) {
  const { materialId, stand, bilder, mehr, anfordern, gross, skript, verwendet, seitenGroesse, eigenesHinzufuegen } = useMaterialBilder()
  const [reiter, setReiter] = useState<'skript' | 'hochladen'>('skript')
  const [schritt, setSchritt] = useState<Schritt>(WAEHLEN)
  const [fortschritt, setFortschritt] = useState<number | null>(null)
  const [zieht, setZieht] = useState(false)
  const eingabe = useRef<HTMLInputElement>(null)

  // Beim Öffnen: Zustand zurücksetzen und Liste holen (Zustand beim Rendern angleichen statt im Effekt)
  const [warOffen, setWarOffen] = useState(false)
  if (offen !== warOffen) {
    setWarOffen(offen)
    if (offen) {
      setReiter('skript')
      setFortschritt(null)
      setZieht(false)
      setSchritt(bearbeite ? { art: 'bearbeiten', quelle: null, laedt: true, fehler: null, hochfehler: null } : WAEHLEN)
    }
  }

  useEffect(() => {
    if (offen) anfordern()
  }, [offen, anfordern])

  // „Bild bearbeiten“: das vorhandene Bild in Arbeitsgröße holen
  useEffect(() => {
    if (!offen || !bearbeite) return
    let aktiv = true
    gross(bearbeite)
      .then((adresse) => {
        const blob = dataAdresseZuBlob(adresse)
        if (!aktiv) return
        setSchritt(
          blob
            ? { art: 'bearbeiten', quelle: blob, laedt: false, fehler: null, hochfehler: null }
            : { art: 'bearbeiten', quelle: null, laedt: false, fehler: 'Dieses Bild lässt sich nicht öffnen.', hochfehler: null },
        )
      })
      .catch(() => {
        if (aktiv)
          setSchritt({ art: 'bearbeiten', quelle: null, laedt: false, fehler: 'Dieses Bild konnte nicht geladen werden.', hochfehler: null })
      })
    return () => {
      aktiv = false
    }
  }, [offen, bearbeite, gross])

  const dateiGewaehlt = useCallback((datei: File | undefined | null) => {
    if (!datei) return
    if (!formatErlaubt(datei)) return setSchritt({ art: 'waehlen', fehler: FORMAT_FEHLER })
    if (datei.size > ORIGINAL_MAX_BYTES) return setSchritt({ art: 'waehlen', fehler: ZU_GROSS_FEHLER })
    setSchritt({ art: 'bearbeiten', quelle: datei, laedt: false, fehler: null, hochfehler: null })
  }, [])

  async function hochladen(ergebnis: Ergebnis, altText: string) {
    setFortschritt(0)
    setSchritt((s) => (s.art === 'bearbeiten' ? { ...s, hochfehler: null } : s))
    try {
      const bild = await ladeBildHoch(materialId, ergebnis.blob, setFortschritt)
      eigenesHinzufuegen(bild)
      setFortschritt(null)
      onWaehle(bild.pfad, mitAlt ? altText : undefined)
    } catch (e) {
      setFortschritt(null)
      const text = e instanceof Error ? e.message : 'Das Hochladen hat nicht geklappt. Bitte versuche es erneut.'
      setSchritt((s) => (s.art === 'bearbeiten' ? { ...s, hochfehler: text } : s))
    }
  }

  const beschaeftigt = fortschritt !== null
  const imBearbeiten = schritt.art === 'bearbeiten'

  return (
    <Dialog open={offen} onOpenChange={(o) => (beschaeftigt ? undefined : onOpenChange(o))}>
      <DialogContent className="flex max-h-[92svh] w-full max-w-3xl flex-col gap-0 rounded-2xl border-ws-line bg-ws-surface p-0 text-ws-text">
        <DialogHeader className="space-y-1 border-b border-ws-line p-4 pr-14 text-left sm:p-6">
          <DialogTitle className="text-xl font-bold">{imBearbeiten ? (bearbeite ? 'Bild bearbeiten' : 'Bild zuschneiden') : 'Bild wählen'}</DialogTitle>
          <DialogDescription className="text-ws-muted">
            {imBearbeiten
              ? 'Zuschneiden und drehen. Das Original bleibt unverändert, das Ergebnis wird als neues Bild gespeichert.'
              : 'Ein Bild aus dem Skript wählen oder ein eigenes hochladen.'}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {schritt.art === 'bearbeiten' ? (
            schritt.laedt ? (
              <div className="flex items-center justify-center gap-2 py-12 text-ws-muted" role="status">
                <Loader2 className="size-5 animate-spin" aria-hidden /> Bild wird geladen …
              </div>
            ) : schritt.quelle ? (
              <BildBearbeiten
                quelle={schritt.quelle}
                mitAlt={mitAlt}
                alt={alt}
                fortschritt={fortschritt}
                fehler={schritt.hochfehler}
                seitenGroesse={seitenGroesse}
                onZurueck={() => (bearbeite ? onOpenChange(false) : setSchritt(WAEHLEN))}
                onFertig={(e, a) => void hochladen(e, a)}
              />
            ) : (
              <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
                <p className="text-ws-muted">{schritt.fehler}</p>
                <Button variant="outline" className={NEBENAKTION} onClick={() => (bearbeite ? onOpenChange(false) : setSchritt(WAEHLEN))}>
                  {bearbeite ? 'Schließen' : 'Zurück'}
                </Button>
              </div>
            )
          ) : (
            <AdminTabs value={reiter} onValueChange={(v) => setReiter(v as 'skript' | 'hochladen')}>
              <AdminTabsList aria-label="Woher kommt das Bild?">
                <AdminTabsTrigger value="skript">Aus dem Skript</AdminTabsTrigger>
                <AdminTabsTrigger value="hochladen">
                  <Upload className="size-4" aria-hidden /> Hochladen
                </AdminTabsTrigger>
              </AdminTabsList>

              <AdminTabsContent value="skript" className="pt-4">
                {stand === 'laedt' && (
                  <div className="flex items-center justify-center gap-2 py-12 text-ws-muted" role="status">
                    <Loader2 className="size-5 animate-spin" aria-hidden /> Bilder werden geladen …
                  </div>
                )}
                {stand === 'fehler' && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center" role="alert">
                    <p className="text-ws-muted">Die Bilder konnten gerade nicht geladen werden.</p>
                    <Button variant="outline" className={NEBENAKTION} onClick={anfordern}>
                      Erneut versuchen
                    </Button>
                  </div>
                )}
                {stand === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <ImageOff className="size-8 text-ws-faint" aria-hidden />
                    <p className="text-ws-muted">{OHNE_BILDER}</p>
                    <Button className="min-h-11 rounded-xl" variant="outline" onClick={() => setReiter('hochladen')}>
                      <ImagePlus className="mr-1.5 size-4" aria-hidden /> Bild hochladen
                    </Button>
                  </div>
                )}
                {typeof stand === 'number' && stand > 0 && (
                  <>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {bilder.map((b) => (
                        <li key={b.pfad}>
                          <button
                            type="button"
                            onClick={() => onWaehle(b.pfad)}
                            aria-pressed={aktuell === b.pfad}
                            className={cn(
                              'flex min-h-11 w-full flex-col gap-1 rounded-xl border bg-ws-bg p-2 text-left transition-colors duration-200 hover:border-ws-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ws-green',
                              aktuell === b.pfad ? 'border-ws-green' : 'border-ws-line',
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element -- data:-Adresse vom Kern, kein Next-Bild möglich */}
                            <img src={b.vorschau} alt="" className="aspect-[4/3] w-full rounded-lg bg-white object-contain" />
                            <span className="flex flex-wrap items-center gap-1">
                              <span className="truncate text-xs text-ws-muted" title={bildName(b.pfad)}>
                                {istEigenerPfad(b.pfad) ? 'Eigenes Bild' : bildName(b.pfad)}
                              </span>
                              {verwendet.has(b.pfad) && (
                                <Badge variant="outline" className="rounded-full border-ws-green/30 bg-ws-green/15 px-2 py-0 text-[11px] text-ws-green">
                                  Verwendet
                                </Badge>
                              )}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {mehr && <p className="mt-3 text-sm text-ws-faint">Es werden die ersten {bilder.length} Bilder gezeigt.</p>}
                  </>
                )}
                {skript === false && stand !== 'laedt' && stand !== 'fehler' && (
                  <p className="mt-3 text-sm text-ws-faint">Weitere Bilder aus dem Skript sind nicht mehr verfügbar.</p>
                )}
              </AdminTabsContent>

              <AdminTabsContent value="hochladen" className="pt-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setZieht(true)
                  }}
                  onDragLeave={() => setZieht(false)}
                  onDrop={(e) => {
                    e.preventDefault()
                    setZieht(false)
                    dateiGewaehlt(e.dataTransfer.files?.[0])
                  }}
                  className={cn(
                    'flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200',
                    zieht ? 'border-ws-green bg-ws-green/10' : 'border-ws-line bg-ws-bg',
                  )}
                >
                  <ImagePlus className="size-8 text-ws-faint" aria-hidden />
                  <p className="text-ws-text">Bild hierher ziehen oder auswählen</p>
                  <input
                    ref={eingabe}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    aria-label="Bilddatei auswählen"
                    onChange={(e) => {
                      dateiGewaehlt(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  <Button type="button" className="min-h-11 rounded-xl" variant="outline" onClick={() => eingabe.current?.click()}>
                    <Upload className="mr-1.5 size-4" aria-hidden /> Bild auswählen
                  </Button>
                  <p className="text-sm text-ws-faint">PNG, JPG oder WebP, höchstens 10 MB. Auf dem Handy auch direkt mit der Kamera.</p>
                </div>
              </AdminTabsContent>
            </AdminTabs>
          )}
          {schritt.art === 'waehlen' && schritt.fehler && (
            <p className="mt-3 text-sm text-ws-red" role="alert">
              {schritt.fehler}
            </p>
          )}
        </div>

        {!imBearbeiten && (
          <div className="flex justify-end border-t border-ws-line p-4 sm:px-6">
            <Button variant="outline" className={NEBENAKTION} onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
