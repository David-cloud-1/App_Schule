import Anthropic from '@anthropic-ai/sdk'
import { timingSafeEqual } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { AblaufAuswahl, AblaufEinstellungen, DirektSperre, LaufInfo } from '@/lib/werkzeugkiste'
import { GUTHABEN_TEXT } from '@/lib/werkzeugkiste-texte'
import { addiere, kostenUsd, TAGESLIMIT, type ModellPreis, type Verbrauch } from '@/lib/werkzeugkiste-kosten'
import {
  ABLAUF_SPALTEN,
  ABLAUF_TABELLE,
  ablaufOrdner,
  einlesungPfad,
  frischStempel,
  kern,
  KernFehler,
  kernBauen,
  leseAdresse,
  WK_BUCKET,
  type AblaufZeile,
} from '@/lib/werkzeugkiste-server'

/**
 * Direkt erstellen (PROJ-64): Die App fragt die KI selbst. Ablauf eines Laufs:
 *
 *   Start (Lehrkraft)  → Kern teilt die Auswahl → je Teil ein Arbeiter-Aufruf
 *   Teil-Arbeiter      → Prompt vom Kern → Claude → Prüfstelle → ggf. einmal nachbessern
 *   letzter Teil fertig → Abschluss-Arbeiter: zusammenfügen, prüfen, bauen
 *
 * Jeder Arbeiter ist ein eigener Server-Aufruf (Zeitgrenze 5 Minuten) und stößt
 * den nächsten selbst an. Bleibt einer hängen, repariert das die nächste
 * Statusabfrage (`repariere`). Kosten werden nach JEDEM KI-Aufruf gespeichert.
 */

export const LAUF_TABELLE = 'ki_laeufe'
export const TEIL_TABELLE = 'ki_lauf_teile'
const EINSTELLUNGEN_TABELLE = 'ki_einstellungen'

const LAUF_SPALTEN = 'id, owner_id, ablauf_id, werkzeug, status, fehler, fehler_art, teile_gesamt, teile_fertig, abschluss_versuche, abschluss_gestartet_am, kosten_eur, gestartet_am, beendet_am'
const TEIL_SPALTEN = 'id, lauf_id, nr, auswahl, zeichen, status, phase, versuche, gestartet_am, ein_tokens, aus_tokens, cache_schreiben_tokens, cache_lesen_tokens, ki_aufrufe, kosten_usd'

/** Ein Arbeiter gilt als hängend, wenn er länger als seine Zeitgrenze (300 s) still ist */
export const HAENGER_MS = 330_000
/** Wartende Teile, die so lange nicht angestoßen wurden, stößt die Statusabfrage an */
const WARTET_ZU_LANGE_MS = 45_000
const MAX_TEIL_VERSUCHE = 4
const MAX_ABSCHLUSS_VERSUCHE = 2
/** Bei leerem Guthaben: höchstens ein Probe-Lauf pro Stunde */
const PROBE_ABSTAND_MS = 60 * 60 * 1000
/** Claude muss vor der Zeitgrenze fertig sein, sonst ist der Verbrauch nicht mehr messbar */
const KI_FRIST_MS = 240_000
/**
 * Obergrenze der Antwort. Ein Teil (≤ ~22.000 Zeichen Skript) braucht im Normalfall
 * 6.000–12.000 Bausteine; die Grenze deckelt zugleich die Kosten eines Aufrufs (~0,24 $).
 */
export const MAX_ANTWORT_BAUSTEINE = 24_000

export const GUTHABEN_SATZ = GUTHABEN_TEXT
const KI_SATZ = 'Die KI hat gerade nicht geantwortet. Bitte versuche es erneut oder mach kostenlos mit deiner eigenen KI weiter.'
const ZU_LANG_SATZ =
  'Die Antwort der KI war für dieses Skript zu lang und wurde abgeschnitten. Wähle in Schritt 1 einen kleineren Teil des Skripts oder mach kostenlos mit deiner eigenen KI weiter.'
const UNLESBAR_SATZ =
  'Die KI hat zweimal keine verwertbare Antwort geliefert. Bitte versuche es erneut oder mach kostenlos mit deiner eigenen KI weiter.'

// ── Zeilen ────────────────────────────────────────────────────────────────

export interface LaufZeile {
  id: string
  owner_id: string | null
  ablauf_id: string | null
  werkzeug: string
  status: LaufInfo['status']
  fehler: string | null
  fehler_art: string | null
  teile_gesamt: number
  teile_fertig: number
  abschluss_versuche: number
  abschluss_gestartet_am: string | null
  kosten_eur: number | string
  gestartet_am: string
  beendet_am: string | null
}

interface TeilZeile {
  id: string
  lauf_id: string
  nr: number
  auswahl: AblaufAuswahl
  zeichen: number
  status: 'wartet' | 'laeuft' | 'fertig' | 'fehlgeschlagen'
  phase: 'erstellen' | 'nachbessern'
  versuche: number
  gestartet_am: string | null
  ein_tokens: number
  aus_tokens: number
  cache_schreiben_tokens: number
  cache_lesen_tokens: number
  ki_aufrufe: number
  kosten_usd: number | string
}

export interface KiEinstellungen {
  modell: string
  preis: ModellPreis
  usdEur: number
  guthabenLeerSeit: string | null
  letzteProbeAm: string | null
}

export function laufZuInfo(l: LaufZeile): LaufInfo {
  return {
    id: l.id,
    status: l.status,
    teileGesamt: l.teile_gesamt,
    teileFertig: l.teile_fertig,
    kostenEur: Number(l.kosten_eur) || 0,
    fehler: l.fehler,
    fehlerArt: l.fehler_art,
    gestartetAm: l.gestartet_am,
    beendetAm: l.beendet_am,
  }
}

export const istAktiv = (l: Pick<LaufZeile, 'status'>) => l.status === 'laeuft' || l.status === 'baut'

// ── Einstellungen & Sperren ───────────────────────────────────────────────

export async function ladeKiEinstellungen(service: SupabaseClient): Promise<KiEinstellungen> {
  const { data } = await service
    .from(EINSTELLUNGEN_TABELLE)
    .select('modell, preise, usd_eur, guthaben_leer_seit, letzte_probe_am')
    .eq('id', 1)
    .maybeSingle()
  const modell = (data?.modell as string) || 'claude-sonnet-5-5'
  const preise = (data?.preise ?? {}) as Record<string, ModellPreis>
  return {
    modell,
    preis: preise[modell] ?? { ein: 2, aus: 10, cache_schreiben: 2.5, cache_lesen: 0.1 },
    usdEur: Number(data?.usd_eur) || 0.86,
    guthabenLeerSeit: (data?.guthaben_leer_seit as string | null) ?? null,
    letzteProbeAm: (data?.letzte_probe_am as string | null) ?? null,
  }
}

/** Guthaben leer: gesperrt, außer die letzte Probe ist über eine Stunde her */
export function guthabenGesperrt(e: Pick<KiEinstellungen, 'guthabenLeerSeit' | 'letzteProbeAm'>, jetzt = Date.now()) {
  if (!e.guthabenLeerSeit) return false
  const probe = e.letzteProbeAm ? Date.parse(e.letzteProbeAm) : 0
  return jetzt - probe < PROBE_ABSTAND_MS
}

/** Direkte Läufe der Lehrkraft in den letzten 24 Stunden */
export async function laeufeHeute(service: SupabaseClient, ownerId: string, jetzt = Date.now()) {
  const { count } = await service
    .from(LAUF_TABELLE)
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .gte('gestartet_am', new Date(jetzt - 24 * 60 * 60 * 1000).toISOString())
  return count ?? 0
}

export async function sperreFuer(service: SupabaseClient, ownerId: string, e: KiEinstellungen): Promise<DirektSperre> {
  if (guthabenGesperrt(e)) return 'guthaben'
  if ((await laeufeHeute(service, ownerId)) >= TAGESLIMIT) return 'tageslimit'
  return null
}

async function merkeGuthaben(service: SupabaseClient, leer: boolean) {
  await service
    .from(EINSTELLUNGEN_TABELLE)
    .update(leer ? { guthaben_leer_seit: new Date().toISOString() } : { guthaben_leer_seit: null })
    .eq('id', 1)
    .then(() => undefined, () => undefined)
}

export async function merkeProbe(service: SupabaseClient) {
  await service.from(EINSTELLUNGEN_TABELLE).update({ letzte_probe_am: new Date().toISOString() }).eq('id', 1)
}

// ── Arbeiter anstoßen ─────────────────────────────────────────────────────

const INTERN_KOPF = 'x-werkzeugkiste-intern'

/** Interne Arbeiter-Routen prüfen dasselbe Geheimnis wie der Zeitplan (CRON_SECRET) */
export function internErlaubt(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const soll = Buffer.from(secret)
  const ist = Buffer.from(request.headers.get(INTERN_KOPF) ?? '')
  return soll.length === ist.length && timingSafeEqual(soll, ist)
}

/**
 * Stößt einen Arbeiter an und wartet nur auf dessen Quittung (202) — die
 * eigentliche Arbeit läuft dort nach der Antwort weiter. Fehler hier sind
 * nicht schlimm: Die nächste Statusabfrage stößt erneut an.
 */
export async function stosseAn(origin: string, pfad: 'teil' | 'abschluss', id: string) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const kopf: Record<string, string> = { 'Content-Type': 'application/json', [INTERN_KOPF]: secret }
  // Geschützte Vorschau-Bereitstellungen von Vercel lassen interne Aufrufe nur mit diesem Schlüssel durch
  if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) kopf['x-vercel-protection-bypass'] = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
  try {
    const res = await fetch(`${origin}/api/intern/werkzeugkiste/${pfad}`, {
      method: 'POST',
      headers: kopf,
      body: JSON.stringify({ id }),
      signal: AbortSignal.timeout(15_000),
      cache: 'no-store',
    })
    return res.status === 202
  } catch {
    return false
  }
}

// ── KI-Aufruf ─────────────────────────────────────────────────────────────

const LEHRTEXT = '\nLEHRTEXT:\n'

/**
 * Teilt den Kern-Prompt in den festen Anweisungsteil (zwischengespeichert,
 * in jedem Teil gleich) und den Skripttext. Ohne Marker: alles in einem Block.
 */
export function promptBloecke(prompt: string): Anthropic.TextBlockParam[] {
  const i = prompt.lastIndexOf(LEHRTEXT)
  if (i < 0) return [{ type: 'text', text: prompt }]
  return [
    { type: 'text', text: prompt.slice(0, i), cache_control: { type: 'ephemeral' } },
    { type: 'text', text: prompt.slice(i + 1) },
  ]
}

export function verbrauchAus(u: Partial<Anthropic.Usage> | null | undefined): Verbrauch {
  return {
    ein: u?.input_tokens ?? 0,
    aus: u?.output_tokens ?? 0,
    cacheSchreiben: u?.cache_creation_input_tokens ?? 0,
    cacheLesen: u?.cache_read_input_tokens ?? 0,
  }
}

export class GuthabenLeer extends Error {}

/** Anthropic meldet leeres Guthaben als 400 mit diesem Wortlaut */
export function istGuthabenFehler(e: unknown) {
  return e instanceof Anthropic.APIError && /credit balance/i.test(e.message)
}

interface KiErgebnis {
  text: string
  verbrauch: Verbrauch
  abgeschnitten: boolean
}

/**
 * Die Anfrage an Claude. Das Nachdenken ist bewusst AUS: Die Aufgabe (Text in ein
 * festes Gerüst umformen) braucht es nicht, und es würde als Ausgabe zählen. Mit
 * dem Standard (adaptives Nachdenken) verbrauchten zwei Aufrufe je 20.000 Bausteine,
 * die Antwort wurde abgeschnitten und war unbrauchbar (PROJ-64, erster Praxistest).
 */
export function anfrageFuer(modell: string, nachrichten: Anthropic.MessageParam[]) {
  return {
    model: modell,
    max_tokens: MAX_ANTWORT_BAUSTEINE,
    thinking: { type: 'disabled' as const },
    messages: nachrichten,
  }
}

/**
 * Ein Aufruf bei Claude mit Streaming. Läuft die Frist ab, wird abgebrochen und
 * der bis dahin gemeldete Verbrauch trotzdem zurückgegeben (bezahlt ist er ja).
 */
export async function frageKi(modell: string, nachrichten: Anthropic.MessageParam[]): Promise<KiErgebnis> {
  const client = new Anthropic({ maxRetries: 3 })
  const stream = client.messages.stream(anfrageFuer(modell, nachrichten))
  const frist = setTimeout(() => stream.abort(), KI_FRIST_MS)
  try {
    const m = await stream.finalMessage()
    const text = m.content.map((b) => (b.type === 'text' ? b.text : '')).join('')
    return { text, verbrauch: verbrauchAus(m.usage), abgeschnitten: m.stop_reason === 'max_tokens' }
  } catch (e) {
    if (istGuthabenFehler(e)) throw new GuthabenLeer()
    const teilweise = stream.currentMessage?.usage
    if (teilweise) throw Object.assign(new Error('KI abgebrochen'), { verbrauch: verbrauchAus(teilweise) })
    throw e
  } finally {
    clearTimeout(frist)
  }
}

// ── Speicher der Teil-Antworten ───────────────────────────────────────────

const teilPfad = (ownerId: string, ablaufId: string, nr: number) => `${ablaufOrdner(ownerId, ablaufId)}/teil-${nr}.yaml`

async function speichereTeilAntwort(service: SupabaseClient, pfad: string, text: string) {
  const { error } = await service.storage
    .from(WK_BUCKET)
    .upload(pfad, new Blob([text], { type: 'text/plain' }), { upsert: true, contentType: 'text/plain; charset=utf-8' })
  if (error) throw new Error('Teil-Antwort nicht gespeichert')
}

async function ladeTeilAntwort(service: SupabaseClient, pfad: string): Promise<string | null> {
  const { data } = await service.storage.from(WK_BUCKET).download(pfad)
  return data ? await data.text() : null
}

// ── Lauf und Teile lesen/schreiben ────────────────────────────────────────

async function ladeLauf(service: SupabaseClient, id: string) {
  const { data } = await service.from(LAUF_TABELLE).select(LAUF_SPALTEN).eq('id', id).maybeSingle()
  return (data as LaufZeile | null) ?? null
}

async function ladeAblaufService(service: SupabaseClient, id: string) {
  const { data } = await service.from(ABLAUF_TABELLE).select(ABLAUF_SPALTEN).eq('id', id).maybeSingle()
  return (data as AblaufZeile | null) ?? null
}

async function beendeLauf(service: SupabaseClient, laufId: string, status: 'fertig' | 'fehlgeschlagen', fehler?: string, art?: string) {
  await service
    .from(LAUF_TABELLE)
    .update({ status, fehler: fehler ?? null, fehler_art: art ?? null, beendet_am: new Date().toISOString() })
    .eq('id', laufId)
    .in('status', ['laeuft', 'baut'])
}

/** Verbrauch eines Aufrufs sofort am Teil verbuchen (Trigger summiert im Lauf) */
async function verbuche(service: SupabaseClient, teil: TeilZeile, v: Verbrauch, preis: ModellPreis) {
  const gesamt = addiere(
    { ein: teil.ein_tokens, aus: teil.aus_tokens, cacheSchreiben: teil.cache_schreiben_tokens, cacheLesen: teil.cache_lesen_tokens },
    v,
  )
  teil.ein_tokens = gesamt.ein
  teil.aus_tokens = gesamt.aus
  teil.cache_schreiben_tokens = gesamt.cacheSchreiben
  teil.cache_lesen_tokens = gesamt.cacheLesen
  teil.ki_aufrufe += 1
  teil.kosten_usd = Number(teil.kosten_usd) + kostenUsd(v, preis)
  await service
    .from(TEIL_TABELLE)
    .update({
      ein_tokens: gesamt.ein,
      aus_tokens: gesamt.aus,
      cache_schreiben_tokens: gesamt.cacheSchreiben,
      cache_lesen_tokens: gesamt.cacheLesen,
      ki_aufrufe: teil.ki_aufrufe,
      kosten_usd: teil.kosten_usd,
    })
    .eq('id', teil.id)
}

/**
 * Übernimmt einen Teil für genau einen Arbeiter: nur wenn er wartet oder hängt.
 * Zwei gleichzeitige Arbeiter (Doppelanstoß) bekommen ihn nie beide.
 */
async function uebernimmTeil(service: SupabaseClient, id: string): Promise<TeilZeile | null> {
  const { data: alt } = await service.from(TEIL_TABELLE).select(TEIL_SPALTEN).eq('id', id).maybeSingle()
  const t = alt as TeilZeile | null
  if (!t || t.status === 'fertig' || t.status === 'fehlgeschlagen') return null
  const haengt = t.status === 'laeuft' && (!t.gestartet_am || Date.now() - Date.parse(t.gestartet_am) > HAENGER_MS)
  if (t.status === 'laeuft' && !haengt) return null
  const { data } = await service
    .from(TEIL_TABELLE)
    .update({ status: 'laeuft', versuche: t.versuche + 1, gestartet_am: new Date().toISOString() })
    .eq('id', id)
    .eq('versuche', t.versuche)
    .eq('status', t.status)
    .select(TEIL_SPALTEN)
    .maybeSingle()
  return (data as TeilZeile | null) ?? null
}

/** Stößt den Abschluss an, wenn alle Teile fertig sind — genau einmal */
async function abschlussWennFertig(service: SupabaseClient, origin: string, laufId: string) {
  const lauf = await ladeLauf(service, laufId)
  if (!lauf || lauf.status !== 'laeuft' || lauf.teile_fertig < lauf.teile_gesamt) return
  const { data } = await service
    .from(LAUF_TABELLE)
    .update({ status: 'baut', abschluss_gestartet_am: new Date().toISOString() })
    .eq('id', laufId)
    .eq('status', 'laeuft')
    .select('id')
    .maybeSingle()
  if (data) await stosseAn(origin, 'abschluss', laufId)
}

interface KernPruefung {
  lesbar: boolean
  fehler: string | null
  befunde: { text: string; schwere?: string }[]
  nachbesserungsPrompt: string | null
}

// ── Teil-Arbeiter ─────────────────────────────────────────────────────────

/**
 * Bearbeitet einen Teil. Phase „erstellen“: Prompt → Claude → Prüfstelle;
 * unlesbar → einmal neu; Befund „hoch“ → Phase „nachbessern“ als nächster
 * Arbeiter-Aufruf (eigene Zeitgrenze). Phase „nachbessern“: gleiche Unterhaltung
 * plus Nachbesserungs-Prompt; ist das Ergebnis lesbar, ersetzt es die Antwort.
 */
export async function bearbeiteTeil(service: SupabaseClient, origin: string, teilId: string) {
  const teil = await uebernimmTeil(service, teilId)
  if (!teil) return
  const lauf = await ladeLauf(service, teil.lauf_id)
  if (!lauf || lauf.status !== 'laeuft' || !lauf.ablauf_id || !lauf.owner_id) {
    await service.from(TEIL_TABELLE).update({ status: 'fehlgeschlagen' }).eq('id', teil.id)
    return
  }
  if (teil.versuche > MAX_TEIL_VERSUCHE) {
    await service.from(TEIL_TABELLE).update({ status: 'fehlgeschlagen' }).eq('id', teil.id)
    await beendeLauf(service, lauf.id, 'fehlgeschlagen', KI_SATZ, 'ki')
    return
  }
  const zeile = await ladeAblaufService(service, lauf.ablauf_id)
  if (!zeile) {
    await beendeLauf(service, lauf.id, 'fehlgeschlagen', 'Der Ablauf wurde gelöscht.', 'abgebrochen')
    return
  }
  const e = await ladeKiEinstellungen(service)
  const einstellungen = zeile.einstellungen as AblaufEinstellungen
  const pfad = teilPfad(lauf.owner_id, zeile.id, teil.nr)

  try {
    const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
    if (!einlesung) throw new KernFehler('Das eingelesene Skript fehlt.', 400)
    const { prompt } = await kern<{ prompt: string }>('/api/prompt', {
      einlesung: { url: einlesung },
      werkzeug: zeile.werkzeug,
      einstellungen,
      auswahl: teil.auswahl,
    })
    const pruefe = async (antwort: string) =>
      kern<KernPruefung>('/api/pruefen', {
        antwort,
        werkzeug: zeile.werkzeug,
        einstellungen,
        auswahl: teil.auswahl,
        einlesung: { url: (await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))) ?? einlesung },
      })
    const erste: Anthropic.MessageParam = { role: 'user', content: promptBloecke(prompt) }

    if (teil.phase === 'nachbessern') {
      const bisher = await ladeTeilAntwort(service, pfad)
      const pruefung = bisher ? await pruefe(bisher) : null
      if (bisher && pruefung?.nachbesserungsPrompt) {
        const r = await rufeKi(service, teil, e, [
          erste,
          { role: 'assistant', content: bisher },
          { role: 'user', content: pruefung.nachbesserungsPrompt },
        ])
        if (!r.abgeschnitten && (await pruefe(r.text)).lesbar) await speichereTeilAntwort(service, pfad, r.text)
      }
      await service.from(TEIL_TABELLE).update({ status: 'fertig' }).eq('id', teil.id)
      await abschlussWennFertig(service, origin, lauf.id)
      return
    }

    let ergebnis = await rufeKi(service, teil, e, [erste])
    if (ergebnis.abgeschnitten) {
      // Dieselbe Anfrage noch einmal würde wieder abgeschnitten — und noch einmal kosten
      await service.from(TEIL_TABELLE).update({ status: 'fehlgeschlagen' }).eq('id', teil.id)
      await beendeLauf(service, lauf.id, 'fehlgeschlagen', ZU_LANG_SATZ, 'zulang')
      return
    }
    let pruefung: KernPruefung | null = await pruefe(ergebnis.text)
    if (!pruefung?.lesbar) {
      if ((await ladeLauf(service, lauf.id))?.status !== 'laeuft') return
      // Antwort vollständig, aber nicht lesbar (z. B. verrutschte Einrückung): einmal neu, zählt zum selben Lauf
      ergebnis = await rufeKi(service, teil, e, [erste])
      pruefung = ergebnis.abgeschnitten ? null : await pruefe(ergebnis.text)
      if (!pruefung?.lesbar) {
        await service.from(TEIL_TABELLE).update({ status: 'fehlgeschlagen' }).eq('id', teil.id)
        await beendeLauf(service, lauf.id, 'fehlgeschlagen', UNLESBAR_SATZ, 'unlesbar')
        return
      }
    }
    await speichereTeilAntwort(service, pfad, ergebnis.text)
    const wichtig = (pruefung?.befunde ?? []).some((b) => b.schwere === 'hoch') && !!pruefung?.nachbesserungsPrompt
    if (wichtig && (await ladeLauf(service, lauf.id))?.status === 'laeuft') {
      await service.from(TEIL_TABELLE).update({ status: 'wartet', phase: 'nachbessern', gestartet_am: new Date().toISOString() }).eq('id', teil.id)
      await stosseAn(origin, 'teil', teil.id)
      return
    }
    await service.from(TEIL_TABELLE).update({ status: 'fertig' }).eq('id', teil.id)
    await abschlussWennFertig(service, origin, lauf.id)
  } catch (err) {
    if (err instanceof GuthabenLeer) {
      await merkeGuthaben(service, true)
      await service.from(TEIL_TABELLE).update({ status: 'fehlgeschlagen' }).eq('id', teil.id)
      await beendeLauf(service, lauf.id, 'fehlgeschlagen', GUTHABEN_SATZ, 'guthaben')
      return
    }
    // Nochmal versuchen lassen: Teil wartet, die nächste Statusabfrage stößt an
    console.error('[werkzeugkiste-direkt] Teil fehlgeschlagen', err instanceof Error ? err.message : 'unbekannt')
    await service.from(TEIL_TABELLE).update({ status: 'wartet', gestartet_am: new Date().toISOString() }).eq('id', teil.id)
  }
}

/** KI fragen und den Verbrauch sofort verbuchen — auch bei Abbruch */
async function rufeKi(service: SupabaseClient, teil: TeilZeile, e: KiEinstellungen, nachrichten: Anthropic.MessageParam[]) {
  try {
    const r = await frageKi(e.modell, nachrichten)
    await verbuche(service, teil, r.verbrauch, e.preis)
    await merkeGuthaben(service, false)
    return r
  } catch (err) {
    const v = (err as { verbrauch?: Verbrauch }).verbrauch
    if (v) await verbuche(service, teil, v, e.preis)
    throw err
  }
}

// ── Abschluss-Arbeiter ────────────────────────────────────────────────────

/** Fügt die Teile zusammen, prüft, baut die Datei und schreibt das Ergebnis an den Ablauf */
export async function schliesseAb(service: SupabaseClient, laufId: string) {
  const lauf = await ladeLauf(service, laufId)
  if (!lauf || lauf.status !== 'baut' || !lauf.owner_id) return
  await service
    .from(LAUF_TABELLE)
    .update({ abschluss_versuche: lauf.abschluss_versuche + 1, abschluss_gestartet_am: new Date().toISOString() })
    .eq('id', laufId)
  const zeile = lauf.ablauf_id ? await ladeAblaufService(service, lauf.ablauf_id) : null
  if (!zeile) return beendeLauf(service, laufId, 'fehlgeschlagen', 'Der Ablauf wurde gelöscht.', 'abgebrochen')

  try {
    const { data: teile } = await service.from(TEIL_TABELLE).select('nr').eq('lauf_id', laufId).order('nr').limit(100)
    const antworten: string[] = []
    for (const t of (teile ?? []) as { nr: number }[]) {
      const text = await ladeTeilAntwort(service, teilPfad(lauf.owner_id, zeile.id, t.nr))
      if (!text) throw new KernFehler('Ein Teil der Antwort fehlt.', 500)
      antworten.push(text)
    }
    const { antwort } = await kern<{ antwort: string }>('/api/zusammenfuegen', { antworten, werkzeug: zeile.werkzeug })

    const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
    if (!einlesung) throw new KernFehler('Das eingelesene Skript fehlt.', 400)
    const pruefung = await kern<KernPruefung & { korrekturen?: number }>('/api/pruefen', {
      antwort,
      werkzeug: zeile.werkzeug,
      einstellungen: zeile.einstellungen,
      auswahl: zeile.auswahl,
      einlesung: { url: einlesung },
    })
    if (!pruefung.lesbar) throw new KernFehler(pruefung.fehler ?? 'Die Antwort ließ sich nicht verarbeiten.', 400)
    if ((await ladeLauf(service, laufId))?.status !== 'baut') return // inzwischen abgebrochen

    const ergebnis = await kernBauen(service, zeile, antwort)
    await service
      .from(ABLAUF_TABELLE)
      .update({
        antwort,
        pruefung: {
          lesbar: true,
          fehler: null,
          befunde: (pruefung.befunde ?? []).map((b) => ({ text: String(b.text) })),
          korrekturen: Number(pruefung.korrekturen) || 0,
          nachbesserungsPrompt: null,
        },
        ergebnis,
        status: 'fertig',
        schritt: 5,
        weg: 'direkt',
        ...frischStempel(),
      })
      .eq('id', zeile.id)
    await beendeLauf(service, laufId, 'fertig')
  } catch (err) {
    console.error('[werkzeugkiste-direkt] Abschluss fehlgeschlagen', err instanceof Error ? err.message : 'unbekannt')
    // Kern-Fehler mit Satz sind endgültig; alles andere darf die Statusabfrage noch einmal versuchen
    if (err instanceof KernFehler && err.status < 500) {
      await beendeLauf(service, laufId, 'fehlgeschlagen', err.message, 'kern')
    } else if (lauf.abschluss_versuche + 1 >= MAX_ABSCHLUSS_VERSUCHE) {
      await beendeLauf(service, laufId, 'fehlgeschlagen', KI_SATZ, 'kern')
    }
  }
}

// ── Statusabfrage repariert Hänger ────────────────────────────────────────

/**
 * Wird bei jeder Statusabfrage aufgerufen: stößt wartende oder hängende Teile
 * und einen hängenden Abschluss erneut an. Gibt den aktuellen Lauf zurück.
 */
export async function repariere(service: SupabaseClient, origin: string, lauf: LaufZeile): Promise<LaufZeile> {
  if (!istAktiv(lauf)) return lauf
  const jetzt = Date.now()
  if (lauf.status === 'baut') {
    const seit = lauf.abschluss_gestartet_am ? jetzt - Date.parse(lauf.abschluss_gestartet_am) : Infinity
    if (seit > HAENGER_MS) {
      if (lauf.abschluss_versuche >= MAX_ABSCHLUSS_VERSUCHE) {
        await beendeLauf(service, lauf.id, 'fehlgeschlagen', KI_SATZ, 'zeit')
      } else {
        await service.from(LAUF_TABELLE).update({ abschluss_gestartet_am: new Date().toISOString() }).eq('id', lauf.id)
        await stosseAn(origin, 'abschluss', lauf.id)
      }
    }
    return (await ladeLauf(service, lauf.id)) ?? lauf
  }

  const { data } = await service.from(TEIL_TABELLE).select(TEIL_SPALTEN).eq('lauf_id', lauf.id).order('nr').limit(100)
  const teile = (data ?? []) as TeilZeile[]
  for (const t of teile) {
    const seit = t.gestartet_am ? jetzt - Date.parse(t.gestartet_am) : Infinity
    const anstossen = (t.status === 'wartet' && seit > WARTET_ZU_LANGE_MS) || (t.status === 'laeuft' && seit > HAENGER_MS)
    if (!anstossen) continue
    if (t.versuche >= MAX_TEIL_VERSUCHE) {
      await service.from(TEIL_TABELLE).update({ status: 'fehlgeschlagen' }).eq('id', t.id)
      await beendeLauf(service, lauf.id, 'fehlgeschlagen', KI_SATZ, 'zeit')
      break
    }
    await stosseAn(origin, 'teil', t.id)
  }
  await abschlussWennFertig(service, origin, lauf.id)
  return (await ladeLauf(service, lauf.id)) ?? lauf
}

// ── Start & Abbruch ───────────────────────────────────────────────────────

export async function letzterLauf(supabase: SupabaseClient, ablaufId: string): Promise<LaufZeile | null> {
  const { data } = await supabase
    .from(LAUF_TABELLE)
    .select(LAUF_SPALTEN)
    .eq('ablauf_id', ablaufId)
    .order('gestartet_am', { ascending: false })
    .limit(1)
    .maybeSingle()
  return (data as LaufZeile | null) ?? null
}

export async function legeLaufAn(
  service: SupabaseClient,
  zeile: AblaufZeile,
  teile: { auswahl: AblaufAuswahl; zeichen: number }[],
  e: KiEinstellungen,
): Promise<{ lauf: LaufZeile; teilIds: string[] } | { laufend: true }> {
  const { data, error } = await service
    .from(LAUF_TABELLE)
    .insert({
      owner_id: zeile.owner_id,
      ablauf_id: zeile.id,
      werkzeug: zeile.werkzeug,
      datei_name: zeile.datei_name,
      zeichen: teile.reduce((s, t) => s + t.zeichen, 0),
      modell: e.modell,
      teile_gesamt: teile.length,
      usd_eur: e.usdEur,
    })
    .select(LAUF_SPALTEN)
    .single()
  // 23505: es läuft schon einer für diesen Ablauf (Doppelklick)
  if (error?.code === '23505') return { laufend: true }
  if (error || !data) throw new Error('Lauf nicht angelegt')
  const lauf = data as LaufZeile
  const { data: neu, error: teilFehler } = await service
    .from(TEIL_TABELLE)
    .insert(teile.map((t, i) => ({ lauf_id: lauf.id, nr: i + 1, auswahl: t.auswahl, zeichen: t.zeichen })))
    .select('id')
  if (teilFehler || !neu) {
    await beendeLauf(service, lauf.id, 'fehlgeschlagen', KI_SATZ, 'start')
    throw new Error('Teile nicht angelegt')
  }
  return { lauf, teilIds: (neu as { id: string }[]).map((t) => t.id) }
}

export async function brichAb(service: SupabaseClient, laufId: string) {
  const { data } = await service
    .from(LAUF_TABELLE)
    .update({ status: 'abgebrochen', beendet_am: new Date().toISOString() })
    .eq('id', laufId)
    .in('status', ['laeuft', 'baut'])
    .select(LAUF_SPALTEN)
    .maybeSingle()
  return (data as LaufZeile | null) ?? (await ladeLauf(service, laufId))
}

/** Teile laut Kern für die aktuelle Auswahl (für Schätzung und Start) */
export async function teileFuer(service: SupabaseClient, zeile: AblaufZeile, auswahl: AblaufAuswahl) {
  const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) throw new KernFehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)
  const r = await kern<{ teile: { auswahl: AblaufAuswahl; zeichen: number }[] }>('/api/teilen', {
    einlesung: { url: einlesung },
    auswahl,
  })
  if (!Array.isArray(r.teile) || r.teile.length === 0 || r.teile.length > 100) throw new KernFehler('Das Skript ließ sich nicht aufteilen.', 502)
  return r.teile.map((t) => ({
    auswahl: { seiten: String(t.auswahl?.seiten ?? ''), abschnitte: (t.auswahl?.abschnitte ?? []).map(Number) },
    zeichen: Number(t.zeichen) || 0,
  }))
}

