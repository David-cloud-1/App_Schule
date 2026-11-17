/**
 * Schreib-Design (PROJ-103): Aussehen von Lehrtext im Schreibmodus in der Vorschau-Seite.
 *
 * Der Kern baut die fertige Seite um (Boxen bekommen Rahmen und Titelzeile). Im Schreibmodus
 * steht die gespeicherte Fassung des Textes da; dieses Stylesheet gibt ihr das Aussehen der
 * fertigen Seite. Die Farben entsprechen dem Papier-Design des Formulars (`text-editor.tsx`)
 * und `schuldesign.py`. Läuft im Rahmen der Vorschau, deshalb reines CSS ohne Tailwind.
 */

import {
  BEDIEN_FARBEN,
  BEDIEN_MASSE,
  BEDIEN_SCHRIFT,
  auswahlCss,
  fertigCss,
  fokusCss,
  knopfCss,
  leistenRahmenCss,
} from '@/components/werkzeugkiste/editor/bedien-design'

/** Farbpaare der Formatleiste (PROJ-117: Ausschnitt der gemeinsamen Quelle `bedien-design.ts`) */
export const SCHREIB_FARBEN = BEDIEN_FARBEN

const F = SCHREIB_FARBEN

export const SCHREIB_CSS = [
  `.wk-schreibzone{position:relative;outline:2px solid ${F.akzent};outline-offset:4px;border-radius:4px;cursor:text!important}`,
  '.wk-schreibzone *{cursor:text!important}.wk-format *{cursor:pointer!important}.wk-fe input{cursor:text!important}',
  '.wk-papier{font:inherit;color:#222;line-height:1.6}',
  '.wk-papier .ProseMirror{outline:none;min-height:3em;white-space:pre-wrap;word-wrap:break-word}',
  '.wk-papier p{margin:.5em 0}.wk-papier ul,.wk-papier ol{margin:.5em 0;padding-left:1.4em}',
  '.wk-papier ul{list-style:disc}.wk-papier ol{list-style:decimal}',
  '.wk-papier a{color:#095f90;text-decoration:underline}',
  '.wk-papier h2{margin:0 0 14px;padding:8px 14px;border-radius:4px;background:#C4BC96;color:#1F497D;font-size:1.1em;font-weight:700}',
  '.wk-papier h3{margin:18px 0 8px;padding-bottom:4px;border-bottom:2px solid #C4BC96;color:#1F497D;font-size:1em;font-weight:700}',
  '.wk-papier .ProseMirror div[class]{margin:12px 0;padding:12px 16px;border-radius:6px}',
  '.wk-papier .ProseMirror div[class]::before{display:block;margin-bottom:6px;font-size:.75em;font-weight:700;letter-spacing:.06em;text-transform:uppercase}',
  '.wk-papier .lernziele{border:2px solid #4F81BD;background:#f0f7ee}.wk-papier .lernziele::before{color:#1F497D;content:"Lernziele"}',
  '.wk-papier .ausgangssituation{border:2px solid #4F81BD;background:#eef4fb}.wk-papier .ausgangssituation::before{color:#1F497D;content:"Ausgangssituation"}',
  '.wk-papier .arbeitsauftrag{border:2px solid #C4BC96;background:#faf7ee}.wk-papier .arbeitsauftrag::before{color:#7a6800;content:"Arbeitsauftrag"}',
  '.wk-papier .merke{border-left:4px solid #1F497D;background:#eef4fb}.wk-papier .merke::before{color:#1F497D;content:"Merke:"}',
  '.wk-papier .tipp{border-left:4px solid #5a8a3c;background:#f5faf0}.wk-papier .tipp::before{color:#3a6a20;content:"Tipp aus der Praxis:"}',
  '.wk-papier .achtung{border-left:4px solid #d4870f;background:#fdf5e6}.wk-papier .achtung::before{color:#a05c00;content:"Achtung:"}',
  '.wk-papier .beispiel{border:1px dashed #C4BC96;background:#fdf9f0}.wk-papier .beispiel::before{color:#7a6800;content:"Beispiel"}',
  '.wk-papier .mission{border:2px solid #3a50b0;background:#eef0fb}.wk-papier .mission::before{color:#3a50b0;content:"📁 Neuer Fall"}',
  '.wk-papier .pruefung{border:2px solid #c0392b;background:#fff5f5}.wk-papier .pruefung::before{color:#c0392b;content:"⭐ IHK-Prüfungssimulation"}',
  '.wk-papier div[data-titel]::before{content:attr(data-titel)}',
  '.wk-papier .vergleich{display:flex;flex-wrap:wrap;gap:12px;padding:0;border:0;background:none}.wk-papier .vergleich::before{display:none}',
  '.wk-papier .vergleich>div{min-width:11rem;flex:1;padding:8px 12px;border:1px solid #5a8a3c;border-radius:6px;background:#f0f7ee}',
  '.wk-papier .vergleich>div::before{display:block;color:#3a6a20;font-weight:700;content:attr(data-titel)}',
  '.wk-papier ol.schritte{list-style:none;padding-left:0;counter-reset:schritt}',
  '.wk-papier ol.schritte>li{position:relative;margin-bottom:8px;padding-left:36px;counter-increment:schritt}',
  '.wk-papier ol.schritte>li::before{position:absolute;left:0;display:flex;width:24px;height:24px;align-items:center;justify-content:center;border-radius:50%;background:#1F497D;color:#fff;font-size:12px;font-weight:700;content:counter(schritt)}',
  // Geschützte Inseln: sichtbar, aber gesperrt
  '.wk-papier .wk-erhalten{margin:12px 0;padding:8px;border:1px dashed #999;border-radius:6px;opacity:.9}',
  '.wk-papier .wk-erhalten::before{display:block;margin-bottom:8px;color:#555;font-size:11px;content:"Geschützt – in der Schublade bearbeiten"}',
  '.wk-papier .wk-erhalten table{width:100%;border-collapse:collapse}.wk-papier .wk-erhalten td,.wk-papier .wk-erhalten th{border:1px solid #ddd;padding:6px}',
  '.wk-papier .ProseMirror-selectednode{outline:2px solid #26640C}',
  // Formatleiste
  `.wk-format{position:sticky;top:4px;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;gap:2px;margin:0 0 8px;padding:3px;${leistenRahmenCss()};font:${BEDIEN_SCHRIFT}}`,
  // PROJ-111: Nach „Fertig“ ist die Leiste weg. Ohne diese Regel überstimmt `display:flex` das Attribut `hidden`.
  '.wk-format[hidden]{display:none!important}',
  '.wk-format-unten{position:fixed;left:0;right:0;top:auto;bottom:0;margin:0;border-radius:12px 12px 0 0;border-width:1px 0 0}',
  knopfCss('.wk-fb'),
  fokusCss('.wk-fs:focus-visible,.wk-fe input:focus-visible'),
  auswahlCss('.wk-fs'),
  `.wk-fe{display:flex;flex-basis:100%;gap:4px;padding:3px}.wk-fe input{flex:1;min-height:${BEDIEN_MASSE.knopfHoehe}px;padding:4px 8px;border:1px solid ${F.text};border-radius:${BEDIEN_MASSE.knopfRundung}px;font:inherit;color:#111}`,
  '.wk-fe[hidden]{display:none!important}',
  `.wk-fh{flex-basis:100%;padding:3px 6px;color:${F.hinweis};background:${F.hinweisGrund};border-radius:6px}.wk-fh[hidden]{display:none!important}`,
  '.wk-fertig{margin-left:auto}',
  fertigCss('.wk-fb.wk-fertig'),
].join('')
