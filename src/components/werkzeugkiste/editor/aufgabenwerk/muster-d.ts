import { html } from 'htm/preact'
import type { VNode } from 'preact'
import { eintragsName, hinweise, type GruppenTeil, type ZuordnenTeil } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'
import { listenAktionen } from '@/components/werkzeugkiste/editor/aufgabenwerk/listen'
import { stringListe } from '@/components/werkzeugkiste/editor/aufgabenwerk/muster-b'
import { liste, s, wachse, zeilenAusEinfuegen, type Block, type Eintrag, type Werk } from '@/components/werkzeugkiste/editor/aufgabenwerk/werk'

/**
 * Muster D – Gruppen (PROJ-114): Kästen wie bei den Schülern.
 *  - **Zuordnen:** ein Kasten je Kategorie mit ihren Begriffen; „Verschieben nach …“ je Begriff.
 *  - **Trainer:** ein Kasten je Gruppe mit Titel, Hinweis, Einträgen in Reihenfolge und Störern.
 */

const texte = (v: unknown): string[] => (Array.isArray(v) ? v.map(s) : [])

// ── Zuordnen ────────────────────────────────────────────────────────────

export function zuordnenTeil(w: Werk, teil: ZuordnenTeil): VNode {
  const kat = texte(w.block[teil.kategorien])
  const begriffe = liste(w.block[teil.feld])
  const mitStand = (k: string[], b: Eintrag[]): Block => ({ ...w.block, [teil.kategorien]: k, [teil.feld]: b })
  const hinweis = (text: string) => {
    w.hinweis = { wo: teil.feld, text }
    w.ansage(text)
    w.zeichne()
  }
  const fehlt = hinweise(w.block).filter((h) => h.wo.startsWith(teil.feld) || h.wo.startsWith(teil.kategorien))

  // Zu welchem Kasten gehört ein Begriff? Gleiche Namen: der erste Kasten bekommt sie (auch bei leerem Namen, damit Tippen nichts verliert)
  const kastenVon = (b: Eintrag): number => {
    const k = kat.indexOf(s(b.category))
    return k
  }
  const setzeBegriff = (gi: number, patch: Eintrag) => mitStand(kat, begriffe.map((b, j) => (j === gi ? { ...b, ...patch } : b)))

  function neuerBegriff(ci: number, nach: number, texte: string[] = ['']) {
    const platz = teil.hoechstens - begriffe.length
    if (platz <= 0) return hinweis(`Höchstens ${teil.hoechstens} ${teil.mehrzahl} möglich.`)
    const dazu = texte.slice(0, platz).map((t) => ({ text: t, category: kat[ci] }))
    const l = [...begriffe]
    // Hinter den letzten Begriff dieses Kastens (oder ans Ende)
    let pos = nach >= 0 ? nach + 1 : l.length
    if (nach < 0) for (let j = l.length - 1; j >= 0; j--) if (kastenVon(l[j]) === ci) { pos = j + 1; break }
    l.splice(pos, 0, ...dazu)
    w.tue(mitStand(kat, l), 'neu-begriff', `beg-${pos + dazu.length - 1}`)
  }

  function loescheBegriff(gi: number) {
    if (begriffe.length <= teil.mindestens) return hinweis(`Mindestens ${teil.mindestens} ${teil.mindestens === 1 ? teil.einzahl : teil.mehrzahl} nötig – ändere den Text, statt zu löschen.`)
    w.tue(mitStand(kat, begriffe.filter((_, j) => j !== gi)), 'loeschen-begriff', `beg-${Math.max(0, Math.min(gi, begriffe.length - 2))}`)
  }

  function loescheKategorie(ci: number) {
    if (kat.length <= teil.mindestKategorien) return hinweis(`Mindestens ${teil.mindestKategorien} Kategorien nötig – ändere den Namen, statt zu löschen.`)
    w.tue(
      mitStand(
        kat.filter((_, j) => j !== ci),
        begriffe.filter((b) => kastenVon(b) !== ci),
      ),
      'loeschen-kategorie',
      `kat-${Math.max(0, ci - 1)}`,
    )
  }

  function neueKategorie() {
    if (kat.length >= 20) return hinweis('Höchstens 20 Kategorien möglich.')
    let n = kat.length + 1
    while (kat.includes(`Kategorie ${n}`)) n++
    w.tue(mitStand([...kat, `Kategorie ${n}`], begriffe), 'neu-kategorie', `kat-${kat.length}`)
  }

  /** Name, der gerade getippt wird, aber noch nicht gespeichert werden darf (gibt es schon): Ohne diese Sperre würden die Begriffe zweier gleichnamiger Kategorien zusammenfallen */
  const entwurfKey = (ci: number) => `rueck-katname-${ci}`
  function benenne(ci: number, name: string) {
    if (kat.some((k, j) => j !== ci && k === name)) {
      w.zustand[entwurfKey(ci)] = name
      w.hinweis = { wo: teil.feld, text: `Eine Kategorie „${name || '(ohne Namen)'}“ gibt es schon. Der Name wird erst übernommen, wenn er anders lautet.` }
      w.zeichne()
      return
    }
    delete w.zustand[entwurfKey(ci)]
    if (w.hinweis?.wo === teil.feld) w.hinweis = null
    w.tippe(
      mitStand(
        kat.map((k, j) => (j === ci ? name : k)),
        begriffe.map((b) => (kastenVon(b) === ci ? { ...b, category: name } : b)),
      ),
      `kat-${ci}`,
    )
  }

  function begriffZeile(gi: number): VNode {
    const b = begriffe[gi]
    const ci = kastenVon(b)
    const nr = gi + 1
    return html`<li class="wk-aw-zeile wk-aw-begriff" data-aw-zeile key=${gi}>
      <textarea
        class="wk-aw-feld"
        rows="1"
        data-aw-fokus=${`beg-${gi}`}
        aria-label=${`${teil.einzahl} ${nr}`}
        placeholder=${`${teil.einzahl}, z. B. „Frachtbrief“`}
        value=${s(b.text)}
        spellcheck="true"
        lang="de"
        onInput=${(e: Event) => {
          const el = e.currentTarget as HTMLTextAreaElement
          wachse(el)
          w.tippe(setzeBegriff(gi, { text: el.value }), `begriff-${gi}`)
        }}
        onPaste=${(e: ClipboardEvent) => {
          const z = zeilenAusEinfuegen(e.clipboardData?.getData('text/plain') ?? '')
          if (z.length < 2) return
          e.preventDefault()
          if (ci >= 0) neuerBegriff(ci, gi, z)
        }}
        onKeyDown=${(e: KeyboardEvent) => {
          const el = e.currentTarget as HTMLTextAreaElement
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            // Nächster Begriff im selben Kasten, sonst neuer
            const weiter = begriffe.findIndex((x, j) => j > gi && kastenVon(x) === ci)
            if (weiter >= 0) {
              w.fokus(`beg-${weiter}`)
              w.zeichne()
            } else if (ci >= 0) neuerBegriff(ci, gi)
          } else if (e.key === 'Backspace' && el.value === '' && begriffe.length > teil.mindestens) {
            e.preventDefault()
            loescheBegriff(gi)
          }
        }}
      ></textarea>
      <select
        class="wk-aw-eingabe wk-aw-verschieben"
        aria-label=${`${teil.einzahl} ${nr} verschieben nach …`}
        title="Verschieben nach …"
        value=${ci >= 0 ? String(ci) : ''}
        onChange=${(e: Event) => {
          const v = (e.currentTarget as HTMLSelectElement).value
          if (v === '') return
          w.tue(setzeBegriff(gi, { category: kat[Number(v)] }), 'verschiebe-begriff', `beg-${gi}`)
          w.ansage(`${teil.einzahl} ${nr} ist jetzt in „${kat[Number(v)] || 'Kategorie ohne Namen'}“.`)
        }}
      >
        ${ci < 0 && html`<option value="">Kategorie wählen …</option>`}
        ${kat.map((k, j) => html`<option value=${String(j)} selected=${j === ci}>${k.trim() ? k : '(ohne Namen)'}</option>`)}
      </select>
      <button
        type="button"
        class="wk-aw-wz wk-aw-weg"
        aria-label=${`${teil.einzahl} ${nr} löschen`}
        aria-disabled=${begriffe.length <= teil.mindestens ? 'true' : 'false'}
        title="Löschen"
        onClick=${() => loescheBegriff(gi)}
      >×</button>
    </li>`
  }

  const indizes = (ci: number) => begriffe.flatMap((b, gi) => (kastenVon(b) === ci ? [gi] : []))
  const ohne = begriffe.flatMap((b, gi) => (kastenVon(b) < 0 ? [gi] : []))

  return html`<div class="faecher wk-aw-faecher">
    ${kat.map(
      (k, ci) => html`<div class="fach wk-aw-fach" key=${ci}>
        <div class="wk-aw-fach-kopf">
          <input
            class="wk-aw-feld wk-aw-fach-name"
            data-aw-fokus=${`kat-${ci}`}
            aria-label=${`Kategorie ${ci + 1}`}
            placeholder="Name der Kategorie"
            value=${typeof w.zustand[entwurfKey(ci)] === 'string' ? (w.zustand[entwurfKey(ci)] as string) : k}
            onInput=${(e: Event) => benenne(ci, (e.currentTarget as HTMLInputElement).value)}
            onBlur=${() => {
              if (w.zustand[entwurfKey(ci)] === undefined) return
              delete w.zustand[entwurfKey(ci)]
              w.hinweis = null
              w.zeichne()
            }}
            onKeyDown=${(e: KeyboardEvent) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const erster = indizes(ci)[0]
                if (erster !== undefined) {
                  w.fokus(`beg-${erster}`)
                  w.zeichne()
                } else neuerBegriff(ci, -1)
              }
            }}
          />
          <button
            type="button"
            class="wk-aw-wz wk-aw-weg"
            aria-label=${`Kategorie ${ci + 1} samt Begriffen löschen`}
            aria-disabled=${kat.length <= teil.mindestKategorien ? 'true' : 'false'}
            title="Kategorie löschen"
            onClick=${() => loescheKategorie(ci)}
          >×</button>
        </div>
        <ul class="wk-aw-liste">${indizes(ci).map(begriffZeile)}</ul>
        <button type="button" class="wk-aw-neu" onClick=${() => neuerBegriff(ci, -1)}>＋ ${teil.einzahl}</button>
      </div>`,
    )}
    ${ohne.length > 0 &&
    html`<div class="fach wk-aw-fach wk-aw-fach-ohne">
      <div class="wk-aw-fach-kopf"><strong>Ohne Kategorie</strong></div>
      <ul class="wk-aw-liste">${ohne.map(begriffZeile)}</ul>
    </div>`}
    ${kat.length < 20 && html`<button type="button" class="wk-aw-neu" onClick=${neueKategorie}>＋ Kategorie hinzufügen</button>`}
    ${w.hinweis?.wo === teil.feld && html`<p class="wk-aw-hinweis" role="alert">${w.hinweis.text}</p>`}
    ${fehlt.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

export function zuordnenAnsicht(w: Werk, teil: ZuordnenTeil): VNode {
  const kat = texte(w.block[teil.kategorien]).filter((k) => k.trim())
  return html`<div class="faecher">${kat.map((k) => html`<div class="fach"><h4>${k}</h4></div>`)}</div>`
}

// ── Trainer ─────────────────────────────────────────────────────────────

export function gruppenTeil(w: Werk, teil: GruppenTeil): VNode {
  const L = listenAktionen(w, {
    feld: teil.feld,
    einzahl: teil.einzahl,
    mehrzahl: teil.mehrzahl,
    mindestens: teil.mindestens,
    hoechstens: teil.hoechstens,
    schluessel: teil.schluessel,
    neu: (t) => ({ [teil.titel[0]]: t, [teil.reihe[0]]: ['', ''] }),
    fokus: (i) => `gt-${i}`,
  })
  const gruppen = L.eintraege
  const fehlt = hinweise(w.block).filter((h) => h.wo.startsWith(teil.feld))
  const setzeGruppe = (i: number, patch: Eintrag) => L.mit(gruppen.map((g, j) => (j === i ? { ...g, ...patch } : g)))

  const kaesten = gruppen.map((g, i) => {
    const titelName = eintragsName(g, teil.titel)
    const reiheName = eintragsName(g, teil.reihe)
    const z = L.zeilenZiehen(i)
    const notizen = fehlt.filter((h) => h.wo === `${teil.feld}-titel-${i}` || h.wo === `${teil.feld}-reihe-${i}`)
    return html`<li class=${`fach wk-aw-fach${z.klasse}`} data-aw-zeile key=${i} style=${z.stil}>
      <div class="wk-aw-fach-kopf">
        <input
          class="wk-aw-feld wk-aw-fach-name"
          data-aw-fokus=${`gt-${i}`}
          aria-label=${`Gruppe ${i + 1}: Titel`}
          placeholder="Titel der Gruppe, z. B. „Ablauf einer Sendung“"
          value=${s(g[titelName])}
          onInput=${(e: Event) => w.tippe(setzeGruppe(i, { [titelName]: (e.currentTarget as HTMLInputElement).value }), `gruppe-${i}-titel`)}
          onKeyDown=${(e: KeyboardEvent) => {
            if (L.tasten(i, e)) return
            if (e.key === 'Enter') {
              e.preventDefault()
              w.fokus(`zeile-${teil.feld}-${i}-reihe-0`)
              w.zeichne()
            }
          }}
        />
        ${L.griff(i)} ${L.weg(i)}
      </div>
      <input
        class="wk-aw-feld wk-aw-fach-hinweis"
        aria-label=${`Gruppe ${i + 1}: Hinweis`}
        placeholder="Hinweis (optional)"
        value=${s(g.hinweis)}
        onInput=${(e: Event) => w.tippe(setzeGruppe(i, { hinweis: (e.currentTarget as HTMLInputElement).value }), `gruppe-${i}-hinweis`)}
      />
      ${stringListe(w, {
        feld: `${teil.feld}-${i}-reihe`,
        titel: 'Einträge in der richtigen Reihenfolge',
        einzahl: 'Eintrag',
        mehrzahl: 'Einträge',
        mindestens: teil.mindestensReihe,
        hoechstens: 30,
        schluessel: 'trainer-eintrag',
        platzhalter: 'Eintrag, z. B. „Auftrag annehmen“',
        holen: () => texte(g[reiheName]),
        schreibe: (l) => setzeGruppe(i, { [reiheName]: l }),
      })}
      ${stringListe(w, {
        feld: `${teil.feld}-${i}-stoerer`,
        titel: 'Störer (optional, sonst aus den anderen Gruppen)',
        einzahl: 'Störer',
        mehrzahl: 'Störer',
        mindestens: 0,
        hoechstens: 30,
        schluessel: 'trainer-stoerer',
        platzhalter: 'Störer – gehört nicht in diese Gruppe',
        holen: () => texte(g.stoerer),
        schreibe: (l) => setzeGruppe(i, { stoerer: l }),
      })}
      ${notizen.map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
    </li>`
  })

  return html`<div class="wk-aw-gruppen">
    <ol class="wk-aw-liste wk-aw-faecher" data-aw-liste=${teil.feld}>${kaesten}</ol>
    ${L.neuKnopf()} ${L.hinweisZeile()}
    ${fehlt.filter((h) => h.wo === teil.feld).map((h) => html`<p class="wk-aw-hinweis" role="note" key=${h.wo}>${h.text}</p>`)}
  </div>`
}

export function gruppenAnsicht(w: Werk, teil: GruppenTeil): VNode {
  const l = liste(w.block[teil.feld])
  return html`<ol>${l.map((g) => html`<li>${s(g[eintragsName(g, teil.titel)])}</li>`)}</ol>`
}
