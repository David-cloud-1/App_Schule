import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import {
  aktualisiere,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  ungueltig,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'
import {
  type KernPruefung,
  ladeTeilAntwort,
  pruefungAusKern,
  zusammenfuegenSchema,
} from '@/lib/werkzeugkiste-teile-server'

export const maxDuration = 90

type Kontext = { params: Promise<{ id: string }> }

/** Wie bei einer einzelnen Antwort (`antwortSchema`) */
const GESAMT_MAX = 2_000_000

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/zusammenfuegen (PROJ-69) — fügt die Teil-Antworten
 * zu EINER Antwort zusammen (ein Deckblatt, alle Kapitel in Reihenfolge, ein Abschlusskapitel),
 * prüft sie wie jede Antwort und legt sie am Ablauf ab. Danach laufen Prüfen, Vorschau und
 * Bauen wie bisher (Schritt 4 und 5).
 *
 * Erst möglich, wenn jeder Teil eingefügt ist und keiner einen schweren Befund hat. Ein
 * abgeschnittener Teil braucht die ausdrückliche Zustimmung (`unvollstaendigOk`), weil dann
 * der Rest dieses Teils in der Datei fehlt.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = zusammenfuegenSchema.safeParse((await request.json().catch(() => null)) ?? {})
  if (!parsed.success) return ungueltig(parsed.error)

  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  const teile = zeile.teile
  if (!teile) return fehler('Dieser Ablauf ist nicht in Teile geteilt.', 400)
  if (zeile.status === 'fertig') return fehler('Dieses Material ist fertig.', 400)

  const offen = teile.teile.filter((t) => t.zustand === 'offen').map((t) => t.nr)
  if (offen.length > 0) {
    return fehler(offen.length === 1 ? `Teil ${offen[0]} fehlt noch.` : `Die Teile ${offen.join(', ')} fehlen noch.`, 400)
  }
  const schwer = teile.teile.filter((t) => t.befund === 'hoch').map((t) => t.nr)
  if (schwer.length > 0) {
    return fehler(
      schwer.length === 1
        ? `Teil ${schwer[0]} hat einen schweren Fehler. Frage ihn noch einmal an und füge die neue Antwort ein.`
        : `Die Teile ${schwer.join(', ')} haben schwere Fehler. Frage sie noch einmal an und füge die neuen Antworten ein.`,
      400,
    )
  }
  const unvollstaendig = teile.teile.filter((t) => t.zustand === 'abgeschnitten')
  if (unvollstaendig.length > 0 && !parsed.data.unvollstaendigOk) {
    return NextResponse.json(
      {
        error: 'Mindestens ein Teil ist abgeschnitten. Der Rest davon würde in der Datei fehlen.',
        code: 'unvollstaendig',
        teile: unvollstaendig.map((t) => t.nr),
      },
      { status: 409 },
    )
  }

  const service = createServiceClient()
  const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)
  const ablauf = zeileZuAblauf(zeile)

  try {
    const texte = await Promise.all(teile.teile.map((t) => ladeTeilAntwort(service, zeile.owner_id, zeile.id, t.nr)))
    const fehlt = teile.teile.filter((_, i) => !texte[i]).map((t) => t.nr)
    if (fehlt.length > 0) {
      return fehler(`Die Antwort von Teil ${fehlt.join(', ')} fehlt im Speicher. Füge sie noch einmal ein.`, 400)
    }

    const z = await kern<{ antwort: string; hinweise?: string[] }>('/api/zusammenfuegen', {
      antworten: texte,
      werkzeug: ablauf.werkzeug,
    })
    if (!z.antwort || z.antwort.length > GESAMT_MAX) return fehler('Die zusammengefügte Antwort ist zu lang.', 400)

    const p = await kern<KernPruefung>('/api/pruefen', {
      antwort: z.antwort,
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
      einlesung: { url: einlesung },
    })

    const hinweise = [
      ...(Array.isArray(z.hinweise) ? z.hinweise.map((h) => String(h).slice(0, 300)) : []),
      ...unvollstaendig.map(
        (t) =>
          `Teil ${t.nr} ist unvollständig: Er wurde nach Kapitel ${t.kapitel.length} abgeschnitten, der Rest davon fehlt in der Datei.`,
      ),
    ].slice(0, 20)

    const neu = await aktualisiere(auth.supabase, zeile.id, {
      antwort: z.antwort,
      pruefung: pruefungAusKern(p),
      teile: { ...teile, zusammengefuegt: true, hinweise },
      schritt: Math.max(zeile.schritt, 4),
    })
    if (!neu) return fehler('Die Antwort konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu), hinweise })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
