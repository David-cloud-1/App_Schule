import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import {
  type AblaufAbbruch,
  type AblaufAuswahl,
  type AblaufPruefung,
  type AblaufTeil,
  type AblaufTeile,
  type TeilAuswahl,
  type TeilZustand,
  TEILE_MAX,
} from '@/lib/werkzeugkiste'
import { ablaufOrdner, teilAntwortPfad, WK_BUCKET } from '@/lib/werkzeugkiste-server'

/**
 * Server-Seite des kostenlosen Wegs in Teilen (PROJ-69): Teil-Liste anlegen, Teil-Antworten
 * im privaten Speicher ablegen, Prüfergebnisse in einen Satz fassen. Der Kern macht das
 * Fachliche (Teilen, Prüfen, Retten, Zusammenfügen); hier steht nur, was die App dazu
 * speichert und anzeigt. Nur in API-Routen verwenden.
 */

// ── Eingaben ──────────────────────────────────────────────────────────────

const TEIL_ANTWORT_MAX = 500_000

export const teilAntwortSchema = z
  .object({
    antwort: z.string().min(1, 'Füge zuerst die Antwort der KI ein.').max(TEIL_ANTWORT_MAX, 'Die Antwort ist zu lang.'),
    /** true = Antwort auf den Weiterschreib-Prompt: wird an die bisherige Antwort des Teils angehängt */
    weiter: z.boolean().optional(),
    /** true = trotz Warnung („falscher Teil“, „schon eingefügt“) übernehmen */
    trotzdem: z.boolean().optional(),
  })
  .strict()

export const teilPromptSchema = z.object({ weiter: z.boolean().optional() }).strict()

export const zusammenfuegenSchema = z.object({ unvollstaendigOk: z.boolean().optional() }).strict()

export const fortsetzungSchema = z
  .object({
    antwort: z.string().min(1, 'Füge zuerst die Antwort der KI ein.').max(TEIL_ANTWORT_MAX, 'Die Antwort ist zu lang.'),
  })
  .strict()

// ── Antworten des Kerns ───────────────────────────────────────────────────

export interface KernTeilPruefung {
  vollstaendig: boolean
  lesbar: boolean
  kapitel: string[]
  gerettet: string | null
  geretteteKapitel: number
  eherTeil: number | null
}

export interface KernPruefung {
  lesbar: boolean
  fehler: string | null
  befunde: { text: string; schwere?: string }[]
  korrekturen: number
  nachbesserungsPrompt: string | null
}

/** Die Prüfung des Kerns in der Form, wie sie am Ablauf gespeichert wird */
export function pruefungAusKern(p: KernPruefung, ausRegal = false): AblaufPruefung {
  return {
    lesbar: !!p.lesbar,
    fehler: p.fehler ?? null,
    // Eine Kopie aus dem Regal hat keinen Skripttext, ihre Befunde wären Fehlalarme (PROJ-53)
    befunde: ausRegal ? [] : (p.befunde ?? []).map((b) => ({ text: String(b.text) })),
    korrekturen: Number(p.korrekturen) || 0,
    nachbesserungsPrompt: ausRegal ? null : (p.nachbesserungsPrompt ?? null),
  }
}

/** Abbruch-Angabe für die Oberfläche; null = die Antwort ist vollständig */
export function abbruchAusKern(c: KernTeilPruefung, runde: number): AblaufAbbruch | null {
  if (c.vollstaendig) return null
  return { kapitel: kuerzeListe(c.kapitel, 60, 100), rettbar: c.gerettet !== null, runde }
}

// ── Teil-Liste ────────────────────────────────────────────────────────────

const KAPITEL_MAX = 30
const TITEL_ZEICHEN = 100

function kuerzeListe(liste: unknown, max: number, laenge: number): string[] {
  if (!Array.isArray(liste)) return []
  return liste
    .map((t) => String(t ?? '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, max)
    .map((t) => (t.length > laenge ? `${t.slice(0, laenge - 1)}…` : t))
}

/** „1,2,3,5“ → „1–3, 5“ */
function seitenKurz(seiten: string): string {
  const nummern = seiten
    .split(',')
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)
  const teile: string[] = []
  for (let i = 0; i < nummern.length; ) {
    let j = i
    while (j + 1 < nummern.length && nummern[j + 1] === nummern[j] + 1) j++
    teile.push(j > i ? `${nummern[i]}–${nummern[j]}` : String(nummern[i]))
    i = j + 1
  }
  return teile.join(', ')
}

/** Was ein Teil enthält, kurz: Titel der Word-Abschnitte bzw. „Seiten 1–4“ */
export function beschreibeTeil(
  auswahl: AblaufAuswahl & { vorspann?: boolean },
  gliederung: { nr: number; titel: string }[],
  unterteil?: { nr: number; von: number } | null,
  beginnt?: string | null,
): string[] {
  if (auswahl.abschnitte.length > 0 || auswahl.vorspann) {
    const titel = [
      ...(auswahl.vorspann ? ['Einstieg (Text vor der ersten Überschrift)'] : []),
      ...auswahl.abschnitte.map((nr) => gliederung.find((g) => g.nr === nr)?.titel || `Abschnitt ${nr}`),
    ]
    if (unterteil && titel.length === 1) {
      // Zerlegter Abschnitt (PROJ-71): „Übungsaufgaben, 2. von 4 (ab Aufgabe 3)“; der erste Teil beginnt mit dem Titel selbst
      const ab = unterteil.nr > 1 && beginnt ? ` (ab ${beginnt.replace(/\s+/g, ' ').trim()})` : ''
      return kuerzeListe([`${kuerzeListe(titel, 1, 60)[0]}, ${unterteil.nr}. von ${unterteil.von}${ab}`], 1, 100)
    }
    return kuerzeListe(titel, 6, 80)
  }
  const kurz = seitenKurz(auswahl.seiten)
  return kurz ? [`${kurz.includes(',') || kurz.includes('–') ? 'Seiten' : 'Seite'} ${kurz}`] : []
}

/** Ein Teil, wie der Kern ihn liefert; die Angaben zum Unterteil gibt es nur bei zerlegten Abschnitten (PROJ-71) */
export interface KernTeil {
  auswahl: TeilAuswahl
  zeichen: number
  unterteil?: { nr: number; von: number }
  beginnt?: string
  zuGross?: boolean
}

/** Ausschnitt aus der Antwort des Kerns übernehmen; ungültige Angaben entfallen (dann gilt der ganze Abschnitt) */
function auswahlAusKern(a: TeilAuswahl | undefined): TeilAuswahl {
  const von = Number(a?.ausschnitt?.von)
  const bis = Number(a?.ausschnitt?.bis)
  const ausschnitt = Number.isInteger(von) && Number.isInteger(bis) && von >= 0 && bis > von ? { ausschnitt: { von, bis } } : {}
  return { seiten: a?.seiten ?? '', abschnitte: a?.abschnitte ?? [], ...(a?.vorspann ? { vorspann: true } : {}), ...ausschnitt }
}

export function legeTeileAn(
  kernTeile: KernTeil[],
  gliederung: { nr: number; titel: string }[],
  groesse: number,
): AblaufTeile {
  return {
    groesse,
    zusammengefuegt: false,
    hinweise: [],
    teile: kernTeile.slice(0, TEILE_MAX).map((t, i) => {
      const auswahl = auswahlAusKern(t.auswahl)
      // Die Angaben zum Unterteil gelten nur mit gültigem Ausschnitt; sonst wäre die Beschriftung falsch
      const zerlegt = !!auswahl.ausschnitt && Number.isInteger(t.unterteil?.nr) && Number.isInteger(t.unterteil?.von)
      const unterteil = zerlegt ? { nr: Number(t.unterteil?.nr), von: Number(t.unterteil?.von) } : undefined
      const beginnt = zerlegt && t.beginnt ? String(t.beginnt).replace(/\s+/g, ' ').trim().slice(0, 60) : undefined
      return {
        nr: i + 1,
        inhalt: beschreibeTeil(auswahl, gliederung, unterteil, beginnt),
        auswahl,
        ...(unterteil ? { unterteil } : {}),
        ...(beginnt ? { beginnt } : {}),
        ...(t.zuGross ? { zuGross: true } : {}),
        zeichen: Number(t.zeichen) || 0,
        zustand: 'offen' as TeilZustand,
        kapitel: [],
        befund: null,
        satz: null,
        runden: 0,
        fingerabdruck: null,

      }
    }),
  }
}

/** Antwort desselben Inhalts ergibt denselben Fingerabdruck, auch mit anderem Zaun oder Zeilenumbruch */
export function fingerabdruck(antwort: string): string {
  const norm = antwort.replace(/```[a-z]*/gi, '').replace(/\s+/g, ' ').trim()
  return createHash('sha256').update(norm).digest('hex').slice(0, 16)
}

export function teilKapitel(liste: string[]): string[] {
  return kuerzeListe(liste, KAPITEL_MAX, TITEL_ZEICHEN)
}

// ── Prüfergebnis in einem Satz ────────────────────────────────────────────

export type Stufe = 'ok' | 'mittel' | 'hoch'

export function stufeAusBefunden(befunde: { schwere?: string }[]): Stufe {
  if (befunde.some((b) => b.schwere === 'hoch')) return 'hoch'
  return befunde.length > 0 ? 'mittel' : 'ok'
}

export function teilSatz(p: {
  nr: number
  zustand: TeilZustand
  kapitel: number
  befunde: { text: string; schwere?: string }[]
  stufe: Stufe
}): string {
  const kap = p.kapitel === 1 ? '1 Kapitel' : `${p.kapitel} Kapitel`
  if (p.zustand === 'abgeschnitten') {
    return `Die Antwort bricht ab: ${kap} sind vollständig angekommen, der Rest von Teil ${p.nr} fehlt.`
  }
  if (p.stufe === 'hoch') {
    const b = p.befunde.find((x) => x.schwere === 'hoch')
    return `Achtung: ${b?.text ?? 'ein wichtiger Fehler'}. Frage diesen Teil am besten noch einmal an.`.slice(0, 300)
  }
  if (p.stufe === 'mittel') {
    const n = p.befunde.length
    return `${kap} angekommen, ${n === 1 ? '1 Hinweis' : `${n} Hinweise`}: Die siehst du am Ende in der Prüfung.`
  }
  return `Teil ${p.nr} ist vollständig und in Ordnung (${kap}).`
}

/** Ersetzt einen Teil in der Liste; alle anderen bleiben, die Zusammenfügung gilt danach als veraltet */
export function teilErsetzen(teile: AblaufTeile, neu: AblaufTeil): AblaufTeile {
  return {
    ...teile,
    zusammengefuegt: false,
    hinweise: [],
    teile: teile.teile.map((t) => (t.nr === neu.nr ? neu : t)),
  }
}

// ── Speicher der Teil-Antworten ───────────────────────────────────────────

export async function speichereTeilAntwort(service: SupabaseClient, ownerId: string, id: string, nr: number, text: string) {
  const { error } = await service.storage
    .from(WK_BUCKET)
    .upload(teilAntwortPfad(ownerId, id, nr), new Blob([text], { type: 'text/plain' }), {
      upsert: true,
      contentType: 'text/plain; charset=utf-8',
    })
  return !error
}

export async function ladeTeilAntwort(service: SupabaseClient, ownerId: string, id: string, nr: number): Promise<string | null> {
  const { data } = await service.storage.from(WK_BUCKET).download(teilAntwortPfad(ownerId, id, nr))
  return data ? await data.text() : null
}

/** Alle Teil-Dateien eines Ablaufs entfernen (die übrigen Dateien bleiben). Best effort. */
export async function loescheTeilDateien(service: SupabaseClient, ownerId: string, id: string) {
  try {
    const ordner = ablaufOrdner(ownerId, id)
    const { data } = await service.storage.from(WK_BUCKET).list(ordner, { limit: 200 })
    const pfade = (data ?? []).filter((f) => /^teil-frei-\d+\.yaml$/.test(f.name)).map((f) => `${ordner}/${f.name}`)
    if (pfade.length) await service.storage.from(WK_BUCKET).remove(pfade)
  } catch {
    // Aufräumen darf nie etwas scheitern lassen; der tägliche Zeitplan räumt den ganzen Ordner ab
  }
}

/** Auswahl und Einstellungen so vergleichbar machen, dass nur echte Änderungen auffallen */
export function auswahlSchluessel(a: AblaufAuswahl | null | undefined): string {
  return JSON.stringify({ s: (a?.seiten ?? '').replace(/\s+/g, ''), a: [...(a?.abschnitte ?? [])].sort((x, y) => x - y) })
}

export function einstellungenSchluessel(e: Record<string, string>): string {
  return JSON.stringify(Object.keys(e).sort().map((k) => [k, e[k]]))
}
