'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminErrorState, AdminLoadingState } from '@/components/admin/admin-states'
import {
  ablaufHref,
  ablaufKurzinfo,
  einstellungenFuerWerkzeug,
  neuerAblaufHref,
  schrittAusParam,
  WERKZEUGKISTE_HREF,
  type Ablauf,
  type AblaufAuswahl,
  type AblaufEinstellungen,
  type AblaufSchritt,
  type LaufInfo,
} from '@/lib/werkzeugkiste'
import {
  baueMaterial,
  brichDirektAb,
  erstellePrompt,
  ladeDirektStand,
  ladeAblauf,
  ladeOptionen,
  loescheAblauf,
  pruefeAntwort,
  speichereAblauf,
  starteDirekt,
  WerkzeugFehler,
  type WerkzeugOptionen,
} from '@/lib/werkzeugkiste-api'
import { AblaufRahmen, HAUPTAKTION, SchliessenKnopf } from '@/components/werkzeugkiste/ablauf-rahmen'
import { Hinweis, SkriptErgebnis } from '@/components/werkzeugkiste/schritt-skript'
import { kurzesNiveau, SchrittEinstellungen } from '@/components/werkzeugkiste/schritt-einstellungen'
import { SchrittPrompt } from '@/components/werkzeugkiste/schritt-prompt'
import { SchrittAntwort } from '@/components/werkzeugkiste/schritt-antwort'
import { SchrittFertig } from '@/components/werkzeugkiste/schritt-fertig'
import { SchrittErstellen } from '@/components/werkzeugkiste/schritt-erstellen'
import { KostenRueckfrage, WegKarte, type WegDaten } from '@/components/werkzeugkiste/schritt-wegwahl'
import { NEBENAKTION } from '@/components/werkzeugkiste/ablauf-rahmen'

/** Wartezeit nach dem letzten Tippen/Einfügen, bevor die Prüfstelle läuft */
const PRUEF_PAUSE_MS = 800
const MIN_ANTWORT_ZEICHEN = 20
/** So oft fragt der Warte-Bildschirm nach dem Stand der direkten Erstellung */
const LAUF_ABFRAGE_MS = 3000

const TITEL_ERSTELLEN = { titel: 'Dein Material wird erstellt', beschreibung: 'Die App fragt die KI für dich und prüft die Antwort.' }

const TITEL: Record<AblaufSchritt, { titel: string; beschreibung?: string }> = {
  1: { titel: 'Skript hochladen', beschreibung: 'Word, PDF oder PowerPoint. Rot markierter oder versteckter Text wird als Lösung erkannt.' },
  2: { titel: 'Was soll daraus werden?' },
  3: { titel: 'Prompt in deine KI kopieren', beschreibung: 'Kostenlos – du nutzt die KI, die du sowieso verwendest.' },
  4: { titel: 'Antwort der KI einfügen', beschreibung: 'Die App prüft die Antwort automatisch, ganz ohne KI.' },
  5: { titel: 'Dein Material ist fertig' },
}

const ABBRECHEN = {
  titel: 'Abbrechen?',
  text: 'Dein Zwischenstand geht verloren: das hochgeladene Skript, die Einstellungen und eine eingefügte Antwort.',
}

function gleicheAuswahl(a: AblaufAuswahl, b: AblaufAuswahl) {
  return a.seiten.trim() === b.seiten.trim() && a.abschnitte.join(',') === b.abschnitte.join(',')
}

/**
 * Ein laufender Ablauf (PROJ-51). Der Schritt steht in der Adresse
 * (?schritt=), damit der Zurück-Knopf des Browsers zum vorigen Schritt führt
 * und ein Neuladen dort weitermacht. Eingaben bleiben beim Zurückgehen erhalten.
 */
export function AblaufSeite({ id }: { id: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [ablauf, setAblauf] = useState<Ablauf | null>(null)
  const [ladeFehler, setLadeFehler] = useState<WerkzeugFehler | null>(null)
  const [optionen, setOptionen] = useState<WerkzeugOptionen | null>(null)
  const [optionenFehler, setOptionenFehler] = useState(false)

  // Eingaben der Lehrkraft — gespeichert wird beim Weitergehen
  const [auswahl, setAuswahl] = useState<AblaufAuswahl>({ seiten: '', abschnitte: [] })
  const [werkzeug, setWerkzeug] = useState('')
  const [einstellungen, setEinstellungen] = useState<AblaufEinstellungen | null>(null)
  const [antwort, setAntwort] = useState('')

  const [promptHinweis, setPromptHinweis] = useState<string | null>(null)
  const [beschaeftigt, setBeschaeftigt] = useState(false)
  const [aktionsFehler, setAktionsFehler] = useState<string | null>(null)
  /** Die zuletzt fehlgeschlagene Aktion — der Knopf „Erneut versuchen“ führt sie noch einmal aus */
  const [wiederholen, setWiederholen] = useState<(() => Promise<void>) | null>(null)
  /** Zählt Neuversuche der Prüfstelle hoch, damit sie nach einem Fehler noch einmal läuft */
  const [pruefVersuch, setPruefVersuch] = useState(0)

  // Direkt erstellen (PROJ-64)
  const [wegDaten, setWegDaten] = useState<WegDaten | null>(null)
  const [wegFehler, setWegFehler] = useState(false)
  const [lauf, setLauf] = useState<LaufInfo | null>(null)
  const [rueckfrage, setRueckfrage] = useState<string | null>(null)
  const [prueftGerade, setPrueftGerade] = useState(false)
  const [pruefFehler, setPruefFehler] = useState<string | null>(null)
  /** Antwort, zu der die angezeigte Prüfung gehört */
  const [geprueftFuer, setGeprueftFuer] = useState<string | null>(null)

  const lade = useCallback(async () => {
    setLadeFehler(null)
    try {
      const { ablauf: a } = await ladeAblauf(id)
      setAblauf(a)
      setAuswahl(a.auswahl)
      setWerkzeug(a.werkzeug)
      setEinstellungen(a.einstellungen)
      setAntwort(a.antwort ?? '')
      setGeprueftFuer(a.pruefung ? (a.antwort ?? '') : null)
    } catch (e) {
      setLadeFehler(e instanceof WerkzeugFehler ? e : new WerkzeugFehler('Der Ablauf konnte nicht geladen werden.', 0))
    }
  }, [id])

  useEffect(() => {
    void lade()
    ladeOptionen()
      .then(setOptionen)
      .catch(() => setOptionenFehler(true))
  }, [lade])

  const schritt: AblaufSchritt = ablauf ? schrittAusParam(searchParams.get('schritt'), ablauf) : 1

  function gehe(n: AblaufSchritt) {
    setAktionsFehler(null)
    setWiederholen(null)
    router.push(ablaufHref(id, n), { scroll: false })
  }

  async function aktion(fn: () => Promise<void>) {
    setBeschaeftigt(true)
    setAktionsFehler(null)
    setWiederholen(null)
    try {
      await fn()
    } catch (e) {
      setAktionsFehler(e instanceof WerkzeugFehler ? e.message : 'Das hat gerade nicht geklappt. Bitte versuche es erneut.')
      setWiederholen(() => () => aktion(fn))
    } finally {
      setBeschaeftigt(false)
    }
  }

  // Prüfstelle läuft automatisch kurz nach dem Einfügen bzw. Tippen
  useEffect(() => {
    if (!ablauf || schritt !== 4) return
    const text = antwort.trim()
    if (text.length < MIN_ANTWORT_ZEICHEN || antwort === geprueftFuer) return
    const t = setTimeout(async () => {
      setPrueftGerade(true)
      setPruefFehler(null)
      try {
        const { ablauf: a } = await pruefeAntwort(id, antwort)
        setGeprueftFuer(antwort)
        setAblauf(a)
      } catch (e) {
        setPruefFehler(e instanceof WerkzeugFehler ? e.message : 'Die Prüfung hat gerade nicht geklappt. Bitte versuche es erneut.')
      } finally {
        setPrueftGerade(false)
      }
    }, PRUEF_PAUSE_MS)
    return () => clearTimeout(t)
  }, [antwort, geprueftFuer, ablauf, schritt, id, pruefVersuch])

  const direkt = ablauf?.weg === 'direkt'
  const geladen = !!ablauf

  // Schritt 2: Kosten für die Wegwahl holen (die Auswahl steht seit Schritt 1 fest)
  useEffect(() => {
    if (!ablauf?.kennzahlen || schritt !== 2) return
    let aktiv = true
    setWegFehler(false)
    ladeDirektStand(id, true)
      .then((d) => aktiv && setWegDaten({ sperre: d.sperre, preis: d.preis, usdEur: d.usdEur, teile: d.teile }))
      .catch(() => aktiv && setWegFehler(true))
    return () => {
      aktiv = false
    }
  }, [id, schritt, ablauf?.kennzahlen])

  // Schritt „Erstellen“: Stand alle paar Sekunden abfragen; fertig → Ergebnis holen und weiter
  useEffect(() => {
    if (!geladen || !direkt || schritt !== 3) return
    let aktiv = true
    let timer: ReturnType<typeof setTimeout> | undefined
    const frage = async () => {
      try {
        const d = await ladeDirektStand(id)
        if (!aktiv) return
        setLauf(d.lauf)
        if (d.lauf?.status === 'fertig') {
          await lade()
          if (aktiv) router.replace(ablaufHref(id, 5), { scroll: false })
          return
        }
        if (d.lauf && d.lauf.status !== 'laeuft' && d.lauf.status !== 'baut') return
      } catch {
        // kurzer Aussetzer (Netz, Neustart des Servers) — der nächste Versuch klappt meist
      }
      if (aktiv) timer = setTimeout(frage, LAUF_ABFRAGE_MS)
    }
    void frage()
    return () => {
      aktiv = false
      if (timer) clearTimeout(timer)
    }
  }, [id, geladen, direkt, schritt, lauf?.id, lade, router])

  // Schritt 5 nach direktem Weg: genauen Betrag laden
  useEffect(() => {
    if (!geladen || !direkt || schritt !== 5 || lauf?.status === 'fertig') return
    let aktiv = true
    ladeDirektStand(id)
      .then((d) => aktiv && setLauf(d.lauf))
      .catch(() => undefined)
    return () => {
      aktiv = false
    }
  }, [id, geladen, direkt, schritt, lauf?.status])

  if (ladeFehler) {
    const weg = ladeFehler.status === 404
    const keinZugang = ladeFehler.status === 401 || ladeFehler.status === 403
    return (
      <div className="mx-auto flex min-h-svh max-w-xl flex-col justify-center gap-4 px-4 py-10">
        <AdminErrorState
          message={
            weg
              ? 'Diesen Ablauf gibt es nicht mehr. Zwischenstände werden nach 7 Tagen gelöscht.'
              : keinZugang
                ? 'Du hast keinen Zugang mehr zur Werkzeugkiste.'
                : ladeFehler.message
          }
          onRetry={weg || keinZugang ? undefined : lade}
        />
        <Button asChild variant="link" className="text-ws-blue">
          <Link href={keinZugang ? '/' : WERKZEUGKISTE_HREF}>{keinZugang ? 'Zur Lern-App' : 'Zur Werkzeugkiste'}</Link>
        </Button>
      </div>
    )
  }

  if (!ablauf || !einstellungen) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <AdminLoadingState variant="form" rows={3} label="Ablauf wird geladen …" />
      </div>
    )
  }

  async function startDirekt(bestaetigt = false) {
    if (!einstellungen) return
    setBeschaeftigt(true)
    setAktionsFehler(null)
    setWiederholen(null)
    try {
      const { lauf: neu } = await starteDirekt(id, werkzeug, einstellungen, bestaetigt)
      setLauf(neu)
      setAblauf((a) => (a ? { ...a, weg: 'direkt', schritt: Math.max(a.schritt, 3) as AblaufSchritt } : a))
      router.push(ablaufHref(id, 3), { scroll: false })
    } catch (e) {
      if (e instanceof WerkzeugFehler && e.status === 409) {
        setRueckfrage(e.message)
      } else if (e instanceof WerkzeugFehler && (e.status === 403 || e.status === 429)) {
        // gesperrt: Satz zeigen und die Karte neu laden, damit sie den Grund nennt
        setAktionsFehler(e.message)
        ladeDirektStand(id, true)
          .then((d) => setWegDaten({ sperre: d.sperre, preis: d.preis, usdEur: d.usdEur, teile: d.teile }))
          .catch(() => undefined)
      } else {
        setAktionsFehler(e instanceof WerkzeugFehler ? e.message : 'Das hat gerade nicht geklappt. Bitte versuche es erneut.')
        setWiederholen(() => () => startDirekt(bestaetigt))
      }
    } finally {
      setBeschaeftigt(false)
    }
  }

  /** Vom direkten Weg in den kostenlosen: gleiche Auswahl und Einstellungen, jetzt mit Prompt */
  function wechsleZuKostenlos() {
    return aktion(async () => {
      if (!einstellungen) return
      await speichereAblauf(id, { werkzeug, einstellungen, weg: 'kostenlos' })
      const { ablauf: a, hinweis } = await erstellePrompt(id)
      setAblauf(a)
      setPromptHinweis(hinweis ?? null)
      setLauf(null)
      router.push(ablaufHref(id, 3), { scroll: false })
    })
  }

  async function brichAb() {
    try {
      const { lauf: neu } = await brichDirektAb(id)
      setLauf(neu)
    } catch (e) {
      setAktionsFehler(e instanceof WerkzeugFehler ? e.message : 'Das Abbrechen hat gerade nicht geklappt.')
    }
  }

  const niveau = optionen?.niveaus.find((n) => n.key === einstellungen.niveau)
  const kurzinfo = ablaufKurzinfo({ werkzeug, einstellungen, datei: ablauf.datei }, niveau ? kurzesNiveau(niveau) : undefined)
  const kopf = direkt && schritt === 3 ? TITEL_ERSTELLEN : TITEL[schritt]

  const zurueck =
    schritt > 1 && schritt < 5 ? (
      <Button
        variant="ghost"
        onClick={() => gehe((schritt - 1) as AblaufSchritt)}
        disabled={beschaeftigt}
        className="min-h-12 rounded-xl text-ws-muted hover:bg-ws-raised hover:text-ws-text"
      >
        Zurück
      </Button>
    ) : (
      <span />
    )

  const weiter = (label: string, onClick: () => void, gesperrt = false) => (
    <Button onClick={onClick} disabled={beschaeftigt || gesperrt} className={HAUPTAKTION}>
      {beschaeftigt && <Loader2 className="mr-2 size-5 animate-spin" aria-hidden />}
      {label}
    </Button>
  )

  let inhalt: React.ReactNode
  let fuss: React.ReactNode

  switch (schritt) {
    case 1:
      inhalt = (
        <SkriptErgebnis
          ablauf={ablauf}
          auswahl={auswahl}
          setAuswahl={setAuswahl}
          andereDatei={() =>
            aktion(async () => {
              await loescheAblauf(id)
              router.replace(neuerAblaufHref(werkzeug))
            })
          }
        />
      )
      fuss = (
        <>
          {zurueck}
          {weiter('Weiter', () =>
            aktion(async () => {
              if (!gleicheAuswahl(auswahl, ablauf.auswahl)) {
                const { ablauf: a } = await speichereAblauf(id, { auswahl, schritt: 2 })
                setAblauf(a)
              } else if (ablauf.schritt < 2) {
                const { ablauf: a } = await speichereAblauf(id, { schritt: 2 })
                setAblauf(a)
              }
              gehe(2)
            }),
          )}
        </>
      )
      break

    case 2:
      inhalt = (
        <SchrittEinstellungen
          werkzeugId={werkzeug}
          einstellungen={einstellungen}
          optionen={optionen}
          optionenFehler={optionenFehler}
          setWerkzeug={(neu) => {
            setWerkzeug(neu)
            setEinstellungen(einstellungenFuerWerkzeug(neu, einstellungen))
          }}
          setEinstellungen={setEinstellungen}
        />
      )
      inhalt = (
        <>
          {inhalt}
          <WegKarte daten={wegDaten} fehler={wegFehler} />
        </>
      )
      fuss = (
        <>
          {zurueck}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <Button
              variant="outline"
              disabled={beschaeftigt}
              onClick={() =>
                aktion(async () => {
                  await speichereAblauf(id, { werkzeug, einstellungen, weg: 'kostenlos' })
                  const { ablauf: a, hinweis } = await erstellePrompt(id)
                  setAblauf(a)
                  setPromptHinweis(hinweis ?? null)
                  gehe(3)
                })
              }
              className={`${NEBENAKTION} min-h-12 px-5`}
            >
              Kostenlos mit eigener KI
            </Button>
            {weiter('Direkt erstellen', () => void startDirekt(), wegDaten?.sperre != null)}
          </div>
        </>
      )
      break

    case 3:
      if (direkt) {
        inhalt = (
          <SchrittErstellen
            lauf={lauf}
            beschaeftigt={beschaeftigt}
            abbrechen={() => void brichAb()}
            nochmal={() => void startDirekt(true)}
            kostenlos={() => void wechsleZuKostenlos()}
          />
        )
        fuss = null
        break
      }
      inhalt = (
        <>
          {promptHinweis && <Hinweis ton="warnung">{promptHinweis}</Hinweis>}
          <SchrittPrompt prompt={ablauf.prompt ?? ''} />
        </>
      )
      fuss = (
        <>
          {zurueck}
          {weiter('Ich habe die Antwort', () => {
            if (ablauf.schritt < 4) void speichereAblauf(id, { schritt: 4 }).then(({ ablauf: a }) => setAblauf(a)).catch(() => {})
            gehe(4)
          })}
        </>
      )
      break

    case 4: {
      const pruefungPasst = geprueftFuer === antwort && !prueftGerade
      const lesbar = pruefungPasst && !!ablauf.pruefung?.lesbar && !pruefFehler
      inhalt = (
        <SchrittAntwort
          antwort={antwort}
          setAntwort={setAntwort}
          pruefung={pruefungPasst ? ablauf.pruefung : null}
          prueftGerade={prueftGerade}
          pruefFehler={pruefFehler}
          erneutPruefen={() => {
            setPruefFehler(null)
            setPruefVersuch((n) => n + 1)
          }}
        />
      )
      fuss = (
        <>
          {zurueck}
          {weiter(
            'Material erstellen',
            () =>
              aktion(async () => {
                const { ablauf: a } = await baueMaterial(id)
                setAblauf(a)
                gehe(5)
              }),
            !lesbar,
          )}
        </>
      )
      break
    }

    case 5:
      inhalt = ablauf.ergebnis ? (
        <SchrittFertig
          ablaufId={id}
          ergebnis={ablauf.ergebnis}
          direkt={direkt}
          kostenEur={lauf?.status === 'fertig' ? lauf.kostenEur : null}
          hinweise={direkt ? (ablauf.pruefung?.befunde ?? []).map((b) => b.text) : []}
        />
      ) : null
      fuss = null
      break
  }

  return (
    <AblaufRahmen
      schritt={schritt}
      erreicht={ablauf.schritt}
      direkt={direkt}
      kurzinfo={kurzinfo}
      titel={kopf.titel}
      beschreibung={kopf.beschreibung}
      schliessen={schritt === 5 ? <SchliessenKnopf /> : <SchliessenKnopf rueckfrage={ABBRECHEN} beimAbbrechen={() => loescheAblauf(id).then(() => {})} />}
      fuss={fuss}
    >
      {inhalt}
      <KostenRueckfrage
        satz={rueckfrage}
        offen={rueckfrage !== null}
        beiAuswahl={(weiter) => {
          setRueckfrage(null)
          if (weiter) void startDirekt(true)
        }}
      />
      {aktionsFehler && (
        <div role="alert">
          <Hinweis ton="warnung">{aktionsFehler}</Hinweis>
          {wiederholen && !beschaeftigt && (
            <Button variant="outline" onClick={() => void wiederholen()} className="mt-3 min-h-11 rounded-xl border-ws-line">
              Erneut versuchen
            </Button>
          )}
        </div>
      )}
    </AblaufRahmen>
  )
}
