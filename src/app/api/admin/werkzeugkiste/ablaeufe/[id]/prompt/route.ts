import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import { hatTeilWeg, TEIL_ZEICHEN_KOSTENLOS, teileEingefuegt } from '@/lib/werkzeugkiste'
import { type KernTeil, legeTeileAn, loescheTeilDateien } from '@/lib/werkzeugkiste-teile-server'
import {
  aktualisiere,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  zeileZuAblauf,
} from '@/lib/werkzeugkiste-server'

export const maxDuration = 60

type Kontext = { params: Promise<{ id: string }> }

/** Lang, aber ohne Kapitel- oder Seitengrenzen (z. B. .txt): ein Prompt, die Rettung greift bei Abbruch */
const KEIN_TEILEN_HINWEIS =
  'Dein Text lässt sich nicht in kleinere Teile zerlegen. Bei sehr langen Texten kann die Antwort abbrechen. Dann hilft der Nachhol-Prompt.'

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/prompt (PROJ-51) — der Kern baut
 * den Prompt aus Einlesung, Auswahl und Einstellungen, zeichengenau wie die
 * alte Werkzeugkiste. `hinweis` meldet z. B. eine unlesbare Seitenangabe.
 *
 * PROJ-69: Bei „Ganzes Skript“ und „Kreativ“ teilt der Kern eine lange Auswahl in
 * Teile (kleiner als im bezahlten Weg). Bei mehr als einem Teil entsteht kein einzelner
 * Prompt, sondern die Teil-Liste am Ablauf; die Prompts je Teil holt die
 * Oberfläche einzeln (…/teile/:nr/prompt). Schon eingefügte Teil-Antworten bleiben
 * dabei unangetastet: Ändert sich die Auswahl, verwirft PATCH die Teile erst nach Rückfrage.
 */
export async function POST(_request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const zeile = await ladeEigenenAblauf(auth.supabase, (await params).id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  if (!zeile.kennzahlen) return fehler('Das Skript ist noch nicht eingelesen.', 400)

  const einlesung = await leseAdresse(createServiceClient(), einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)

  const ablauf = zeileZuAblauf(zeile)
  // Eingefügte Teil-Antworten bleiben; neu geteilt wird nur, solange keine da ist
  if (zeile.teile && teileEingefuegt(zeile.teile) > 0) {
    return NextResponse.json({ ablauf, hinweis: null })
  }
  try {
    const service = createServiceClient()
    // Ein fertiges Material bekommt keine Teile mehr: Es lässt sich nichts mehr einfügen
    let zuLang = false
    if (hatTeilWeg(ablauf.werkzeug) && zeile.status !== 'fertig') {
      const t = await kern<{ teile: KernTeil[] }>('/api/teilen', {
        einlesung: { url: einlesung },
        auswahl: ablauf.auswahl,
        max_zeichen: TEIL_ZEICHEN_KOSTENLOS,
        zerlegen: true, // PROJ-71: zu große Word-Abschnitte weiter zerlegen (ein älterer Kern ignoriert das)
      })
      if (Array.isArray(t.teile) && t.teile.length > 1) {
        const teile = legeTeileAn(t.teile, ablauf.gliederung, TEIL_ZEICHEN_KOSTENLOS)
        // Prompt und Antwort aus einem früheren Durchgang gelten für die Teile nicht mehr
        const neu = await aktualisiere(auth.supabase, zeile.id, {
          teile,
          prompt: null,
          antwort: null,
          pruefung: null,
          schritt: Math.max(zeile.schritt, 3),
        })
        if (!neu) return fehler('Die Teile konnten nicht gespeichert werden.', 500)
        return NextResponse.json({ ablauf: zeileZuAblauf(neu), hinweis: null })
      }
      // Ein Teil genügt (oder der Text lässt sich nicht kleiner teilen): Prompt wie bisher;
      zuLang = (t.teile?.[0]?.zeichen ?? 0) > TEIL_ZEICHEN_KOSTENLOS
      // eine alte Teil-Liste entfällt
      if (zeile.teile) await loescheTeilDateien(service, zeile.owner_id, zeile.id)
    }
    const r = await kern<{ prompt: string; hinweis?: string; warnung?: string }>('/api/prompt', {
      einlesung: { url: einlesung },
      werkzeug: ablauf.werkzeug,
      einstellungen: ablauf.einstellungen,
      auswahl: ablauf.auswahl,
    })
    const neu = await aktualisiere(auth.supabase, zeile.id, {
      prompt: r.prompt,
      ...(zeile.teile ? { teile: null } : {}),
      schritt: Math.max(zeile.schritt, 3),
    })
    if (!neu) return fehler('Der Prompt konnte nicht gespeichert werden.', 500)
    return NextResponse.json({ ablauf: zeileZuAblauf(neu), hinweis: [r.hinweis, r.warnung, zuLang ? KEIN_TEILEN_HINWEIS : null].filter(Boolean).join(' ') || null })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
