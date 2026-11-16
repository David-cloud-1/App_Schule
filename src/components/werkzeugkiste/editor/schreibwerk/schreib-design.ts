/**
 * Schreib-Design (PROJ-103): Aussehen von Lehrtext im Schreibmodus in der Vorschau-Seite.
 *
 * Der Kern baut die fertige Seite um (Boxen bekommen Rahmen und Titelzeile). Im Schreibmodus
 * steht die gespeicherte Fassung des Textes da; dieses Stylesheet gibt ihr das Aussehen der
 * fertigen Seite. Die Farben entsprechen dem Papier-Design des Formulars (`text-editor.tsx`)
 * und `schuldesign.py`. Läuft im Rahmen der Vorschau, deshalb reines CSS ohne Tailwind.
 */

/** Farbpaare der Formatleiste; `schreib-design.test.ts` prüft den Kontrast (≥ 4,5 : 1) */
export const SCHREIB_FARBEN = {
  grund: '#ffffff',
  text: '#1e3a8a',
  aktivGrund: '#dbeafe',
  hinweis: '#92400e',
  hinweisGrund: '#fffbeb',
} as const

const F = SCHREIB_FARBEN

export const SCHREIB_CSS = [
  '.wk-schreibzone{position:relative;outline:2px solid #2563eb;outline-offset:4px;border-radius:4px;cursor:text!important}',
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
  `.wk-format{position:sticky;top:4px;z-index:2147483000;display:flex;flex-wrap:wrap;align-items:center;gap:2px;margin:0 0 8px;padding:3px;background:${F.grund};border:1px solid ${F.text};border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.2);font:600 13px/1.2 system-ui,sans-serif}`,
  // PROJ-111: Nach „Fertig“ ist die Leiste weg. Ohne diese Regel überstimmt `display:flex` das Attribut `hidden`.
  '.wk-format[hidden]{display:none!important}',
  '.wk-format-unten{position:fixed;left:0;right:0;top:auto;bottom:0;margin:0;border-radius:12px 12px 0 0;border-width:1px 0 0}',
  `.wk-fb{display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:34px;min-height:34px;padding:4px 8px;border:1px solid transparent;border-radius:8px;background:transparent;color:${F.text};font:inherit;cursor:pointer}`,
  `.wk-fb:hover{background:#eff6ff;border-color:${F.text}}`,
  `.wk-fb[aria-pressed="true"]{background:${F.aktivGrund};border-color:${F.text}}`,
  '.wk-fb:focus-visible,.wk-fs:focus-visible,.wk-fe input:focus-visible{outline:3px solid #2563eb;outline-offset:1px}',
  `.wk-fs{min-height:34px;max-width:11rem;padding:4px 6px;border:1px solid ${F.text};border-radius:8px;background:${F.grund};color:${F.text};font:inherit}`,
  `.wk-fe{display:flex;flex-basis:100%;gap:4px;padding:3px}.wk-fe input{flex:1;min-height:34px;padding:4px 8px;border:1px solid ${F.text};border-radius:8px;font:inherit;color:#111}`,
  '.wk-fe[hidden]{display:none!important}',
  `.wk-fh{flex-basis:100%;padding:3px 6px;color:${F.hinweis};background:${F.hinweisGrund};border-radius:6px}.wk-fh[hidden]{display:none!important}`,
  '.wk-fertig{margin-left:auto;font-weight:700}',
  '@media (hover:none),(pointer:coarse){.wk-fb,.wk-fs{min-height:44px;min-width:44px}}',
].join('')
