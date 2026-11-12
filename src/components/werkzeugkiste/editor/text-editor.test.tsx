import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { Editor } from '@tiptap/core'
import { renderInWorkspace } from '@/components/admin/workspace-test-utils'
import { aufraeumen, rundreiseOk } from '@/lib/werkzeugkiste-text'
import { alsHtml, textErweiterungen } from './text-erweiterungen'
import { TextEditor } from './text-editor'

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
)

/** Was der gestaltete Editor aus einem Block macht (ohne Oberfläche) */
function durchDenEditor(html: string): string {
  const e = new Editor({ extensions: textErweiterungen(), content: html })
  const raus = aufraeumen(alsHtml(e))
  e.destroy()
  return raus
}

// Neue Antworten: Boxen nur mit Klasse (Master-Prompt auf vercel-kern)
const NEU = `<div class="lernziele"><ul><li>Du kannst die Haftung des Frachtführers erklären.</li><li>Du kannst Haftungsgrenzen berechnen.</li></ul></div>
<h2>Frachtführerhaftung</h2>
<p>Der <strong>Frachtführer</strong> haftet nach <em>§ 425 HGB</em> verschuldensunabhängig.</p>
<div class="achtung" data-titel="⭐ Prüfungsrelevant:">8,33 SZR je kg Rohgewicht</div>
<div class="merke"><p>Haftung = Gewicht × 8,33 SZR</p><p>Zweiter Absatz</p></div>
<ol class="schritte"><li>Schaden melden</li><li>Haftung prüfen</li></ol>
<div class="vergleich"><div data-titel="Spediteur">organisiert</div><div data-titel="Frachtführer">transportiert</div></div>
<table class="zebra"><thead><tr><th>Kostenart</th><th>Betrag</th></tr></thead><tbody><tr><td>Fracht</td><td>1.200,00 €</td></tr></tbody></table>
<p>Mehr unter <a href="https://www.gesetze-im-internet.de/hgb/">HGB</a>.</p>`

// Alte Antworten: Boxen mit Inline-Stil (vor PROJ-68)
const ALT = `<div style="background:#f0f7ee;border:2px solid #4F81BD;border-radius:6px;padding:14px 18px;margin:0 0 18px 0;"><p style="font-size:0.75em;font-weight:700;">Lernziele</p><ul style="margin:0;padding-left:18px;"><li style="margin-bottom:4px;">Erklären</li></ul></div>
<h2 style="background:#C4BC96;padding:8px 14px;border-radius:4px;color:#1F497D;">Titel</h2><p>Normaler Text.</p>
<p style="margin:0;font-weight:700">Fetter Absatz mit eigenem Stil</p>`

describe('Rundreise durch den gestalteten Editor', () => {
  it('lässt eine neue KI-Antwort mit allen Box-Arten, Tabelle und Link unverändert', () => {
    const raus = durchDenEditor(NEU)
    expect(rundreiseOk(NEU, raus)).toBe(true)
    // Tabelle bleibt byte-genau (unveränderlicher Block, kein thead→tbody-Umbau)
    expect(raus).toContain('<table class="zebra"><thead><tr><th>Kostenart</th>')
    expect(raus).not.toContain('colgroup')
    // Links ohne angehängtes target/rel
    expect(raus).toContain('<a href="https://www.gesetze-im-internet.de/hgb/">HGB</a>')
  })

  it('lässt eine alte Antwort mit Inline-Stilen byte-genau stehen (unveränderliche Blöcke)', () => {
    const raus = durchDenEditor(ALT)
    expect(rundreiseOk(ALT, raus)).toBe(true)
    expect(raus).toContain('<h2 style="background:#C4BC96;padding:8px 14px;border-radius:4px;color:#1F497D;">Titel</h2>')
    expect(raus).toContain('<p style="margin:0;font-weight:700">Fetter Absatz mit eigenem Stil</p>')
  })

  it('merkt, wenn Gestaltung verloren ginge', () => {
    for (const html of [
      '<p><u>unterstrichen</u></p>',
      '<p>Text <img src="x.png"> mitten im Satz</p>',
      '<p><sub>2</sub></p>',
      '<p>Text mit <span style="color:#1F497D">Farbe</span></p>',
    ]) {
      expect(rundreiseOk(html, durchDenEditor(html))).toBe(false)
    }
  })

  it('entfernt im Editor keine Skripte – das macht nur der Kern beim Bauen', () => {
    // Ein Skript wird zum unveränderlichen Block (nicht stillschweigend gelöscht)
    const html = '<p>a</p><div onclick="x()">b</div>'
    expect(durchDenEditor(html)).toContain('onclick="x()"')
  })
})

describe('Text-Editor', () => {
  it('öffnet einen verlustfreien Block in der gestalteten Ansicht', async () => {
    renderInWorkspace(<TextEditor html={NEU} onChange={vi.fn()} beschriftung="Lehrtext" />, { withSidebar: false })
    expect(await screen.findByRole('toolbar', { name: 'Textgestaltung' })).toBeInTheDocument()
    expect(screen.queryByText(/nicht verlustfrei/)).not.toBeInTheDocument()
  })

  it('öffnet einen Block mit nicht darstellbarer Gestaltung gleich in der HTML-Ansicht', async () => {
    renderInWorkspace(<TextEditor html="<p><u>wichtig</u></p>" onChange={vi.fn()} beschriftung="Lehrtext" />, { withSidebar: false })
    expect(await screen.findByText(/nicht verlustfrei darstellen/)).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('toolbar', { name: 'Textgestaltung' })).not.toBeInTheDocument())
  })

  it('weist auf Skripte und nicht geschlossenes HTML hin, sperrt aber nichts', async () => {
    renderInWorkspace(<TextEditor html={'<div><p onclick="x()">a</div>'} onChange={vi.fn()} beschriftung="Lehrtext" />, {
      withSidebar: false,
    })
    expect(await screen.findByText(/aus Sicherheitsgründen beim Bauen entfernt/)).toBeInTheDocument()
  })
})
