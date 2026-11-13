import { NextResponse } from 'next/server'
import { requireTeacherOrAdmin } from '@/app/api/admin/_lib/auth'
import { createServiceClient } from '@/lib/supabase-server'
import type { AblaufTeil } from '@/lib/werkzeugkiste'
import {
  aktualisiere,
  einlesungPfad,
  fehler,
  kern,
  kernFehlerAntwort,
  ladeEigenenAblauf,
  leseAdresse,
  ungueltig,
  zeileZuAblauf, eigeneSeiteSperre,
} from '@/lib/werkzeugkiste-server'
import {
  fingerabdruck,
  type KernPruefung,
  type KernTeilPruefung,
  ladeTeilAntwort,
  speichereTeilAntwort,
  stufeAusBefunden,
  teilAntwortSchema,
  teilErsetzen,
  teilKapitel,
  teilSatz,
} from '@/lib/werkzeugkiste-teile-server'

export const maxDuration = 90

type Kontext = { params: Promise<{ id: string; nr: string }> }

/** So lang darf eine Teil-Antwort samt angehängter Fortsetzung werden */
const GESPEICHERT_MAX = 600_000

/**
 * POST /api/admin/werkzeugkiste/ablaeufe/:id/teile/:nr/antwort (PROJ-69) — nimmt die Antwort
 * der KI zu genau einem Teil an und prüft sie sofort (Prüfstelle des Kerns).
 *
 *  - Abgeschnitten? Dann bleiben die vollständigen Kapitel, der Teil gilt als „abgeschnitten“
 *    und die Lehrkraft holt den Rest mit dem Weiterschreib-Prompt nach (`weiter: true`
 *    hängt die Antwort darauf an die bisherige an).
 *  - Falscher Teil oder schon eingefügt? Dann wird nichts gespeichert, sondern gewarnt
 *    (`uebernommen: false` + `warnung`); mit `trotzdem: true` wird sie doch übernommen.
 *  - Unlesbar oder nichts zu retten: `uebernommen: false` + `fehler`, die alte Antwort bleibt.
 */
export async function POST(request: Request, { params }: Kontext) {
  const auth = await requireTeacherOrAdmin()
  if (auth.error) return auth.error
  const parsed = teilAntwortSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return ungueltig(parsed.error)
  const { antwort, weiter, trotzdem } = parsed.data

  const { id, nr: nrText } = await params
  const zeile = await ladeEigenenAblauf(auth.supabase, id)
  if (!zeile) return fehler('Diesen Ablauf gibt es nicht mehr.', 404)
  const keinAblauf = eigeneSeiteSperre(zeile)
  if (keinAblauf) return keinAblauf
  const teile = zeile.teile
  if (!teile) return fehler('Dieser Ablauf ist nicht in Teile geteilt.', 400)
  if (zeile.status === 'fertig') {
    return fehler('Dieses Material ist fertig. Nutze „Antwort überarbeiten“, um etwas zu ändern.', 400)
  }
  const nr = Number(nrText)
  const teil = teile.teile.find((t) => t.nr === nr)
  if (!teil) return fehler('Diesen Teil gibt es nicht.', 404)
  if (weiter && teil.zustand !== 'abgeschnitten') return fehler('Zu diesem Teil gibt es nichts weiterzuschreiben.', 400)

  const service = createServiceClient()
  const einlesung = await leseAdresse(service, einlesungPfad(zeile.owner_id, zeile.id))
  if (!einlesung) return fehler('Das eingelesene Skript fehlt. Bitte lade es erneut hoch.', 400)
  const ablauf = zeileZuAblauf(zeile)

  try {
    const pruefeTeil = (text: string) =>
      kern<KernPruefung>('/api/pruefen', {
        antwort: text,
        werkzeug: ablauf.werkzeug,
        einstellungen: ablauf.einstellungen,
        auswahl: teil.auswahl,
        einlesung: { url: einlesung },
        teil: true,
      })

    const check = await kern<KernTeilPruefung>('/api/teil-pruefen', {
      antwort,
      werkzeug: ablauf.werkzeug,
      einlesung: { url: einlesung },
      teile: teile.teile.map((t) => t.auswahl),
      nr,
    })

    // 1) Warnen, bevor etwas überschrieben wird – die Lehrkraft entscheidet
    const abdruck = fingerabdruck(antwort)
    if (!trotzdem) {
      const doppelt = teile.teile.find((t) => t.nr !== nr && t.fingerabdruck === abdruck)
      if (doppelt) {
        return NextResponse.json({
          uebernommen: false,
          warnung: {
            art: 'doppelt',
            teil: doppelt.nr,
            satz: `Diese Antwort hast du schon bei Teil ${doppelt.nr} eingefügt.`,
          },
        })
      }
      // Eine Fortsetzung deckt nur den Rest des Teils ab: Der Vergleich wäre ein Fehlalarm
      if (!weiter && check.eherTeil && check.eherTeil !== nr) {
        return NextResponse.json({
          uebernommen: false,
          warnung: {
            art: 'falscher_teil',
            teil: check.eherTeil,
            satz: `Diese Antwort passt eher zu Teil ${check.eherTeil} als zu Teil ${nr}.`,
          },
        })
      }
    }

    // 2) Was davon behalten wir? Ganz, wenn vollständig – sonst die vollständigen Kapitel
    const brauchbar = check.gerettet ?? (check.vollstaendig && check.lesbar ? antwort : null)
    if (!brauchbar) {
      const p = await pruefeTeil(antwort)
      return NextResponse.json({
        uebernommen: false,
        fehler:
          !p.lesbar && p.fehler
            ? p.fehler
            : `Die Antwort bricht ab, bevor ein Kapitel fertig war. Frage Teil ${nr} noch einmal an.`,
      })
    }

    let text = brauchbar
    let kapitel = check.kapitel
    let runden = teil.runden
    if (weiter) {
      const basis = await ladeTeilAntwort(service, zeile.owner_id, zeile.id, nr)
      if (!basis) return fehler(`Die bisherige Antwort von Teil ${nr} fehlt. Füge den Teil noch einmal ein.`, 400)
      const m = await kern<{ antwort: string }>('/api/zusammenfuegen', {
        antworten: [basis, brauchbar],
        werkzeug: ablauf.werkzeug,
      })
      text = m.antwort
      kapitel = [...teil.kapitel, ...check.kapitel]
      runden += 1
    }
    if (text.length > GESPEICHERT_MAX) return fehler('Die Antwort dieses Teils ist zu lang.', 400)

    // 3) Prüfstelle über das, was wir behalten
    const p = await pruefeTeil(text)
    if (!p.lesbar) {
      return NextResponse.json({ uebernommen: false, fehler: p.fehler ?? 'Die Antwort lässt sich nicht lesen.' })
    }

    const zustand = check.vollstaendig ? 'fertig' : 'abgeschnitten'
    const stufe = stufeAusBefunden(p.befunde)
    const neuerTeil: AblaufTeil = {
      ...teil,
      zustand,
      kapitel: teilKapitel(kapitel),
      befund: zustand === 'abgeschnitten' ? null : stufe,
      satz: teilSatz({ nr, zustand, kapitel: kapitel.length, befunde: p.befunde, stufe }),
      runden,
      // Der Abdruck gilt der zuerst eingefügten Antwort; eine Fortsetzung ändert ihn nicht
      fingerabdruck: weiter ? teil.fingerabdruck : abdruck,
    }

    if (!(await speichereTeilAntwort(service, zeile.owner_id, zeile.id, nr, text))) {
      return fehler('Die Antwort konnte nicht gespeichert werden.', 500)
    }
    const neu = await aktualisiere(
      auth.supabase,
      zeile.id,
      {
        teile: teilErsetzen(teile, neuerTeil),
        // Eine frühere Zusammenfügung ist mit der neuen Teil-Antwort veraltet
        ...(teile.zusammengefuegt
          ? { antwort: null, pruefung: null, schritt: 3 }
          : { schritt: Math.max(zeile.schritt, 3) }),
      },
      zeile.updated_at,
    )
    if (!neu) {
      return fehler(
        'Der Ablauf hat sich gerade geändert, vielleicht in einem anderen Fenster. Lade die Seite neu und füge die Antwort noch einmal ein.',
        409,
      )
    }

    return NextResponse.json({
      uebernommen: true,
      ablauf: zeileZuAblauf(neu),
      teil: neuerTeil,
      geretteteKapitel: check.vollstaendig ? 0 : check.geretteteKapitel,
      nachbesserungsPrompt: stufe === 'hoch' && zustand === 'fertig' ? p.nachbesserungsPrompt : null,
      // Bricht auch der Weiterschreib-Prompt ab, hilft ein kleinerer Abschnitt in Schritt 1
      tippKleiner: !!weiter && !check.vollstaendig,
    })
  } catch (e) {
    return kernFehlerAntwort(e)
  }
}
