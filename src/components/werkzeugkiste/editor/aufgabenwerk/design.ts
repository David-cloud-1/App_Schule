/**
 * Aussehen des Aufgabenwerks (PROJ-114). Die Aufgabe behält die Klassen der gebauten Seite
 * (`.frage`, `.antworten`, `.antwort` aus dem Kern) und sieht deshalb aus wie für die Schüler.
 * Dazu kommen nur die Bearbeiten-Zeichen aus dem Prototyp v2: blauer Rahmen, Schild,
 * Felder ohne Rahmen (gestrichelt beim Darüberfahren, blau hinterlegt beim Tippen).
 */

/** Farbpaare (Text auf Grund); ein Test prüft den Kontrast (≥ 4,5 : 1) */
export const AW_FARBEN = {
  blau: '#1d4ed8',
  blauText: '#1e3a8a',
  grund: '#ffffff',
  feldGrund: '#eff6ff',
  schildText: '#ffffff',
  gruen: '#166534',
  gruenGrund: '#dcfce7',
  orange: '#9a3412',
  orangeGrund: '#fff7ed',
  rot: '#991b1b',
  leise: '#475569',
} as const

const F = AW_FARBEN

export const AW_CSS = [
  `.wk-aw-offen{position:relative;outline:3px solid ${F.blau}!important;outline-offset:2px;padding-bottom:0!important}`,
  `.wk-aw-schild{position:absolute;left:-3px;top:-26px;padding:3px 10px;border-radius:6px 6px 0 0;background:${F.blau};color:${F.schildText};font:700 12px/1.4 system-ui,sans-serif;letter-spacing:.02em}`,
  '.wk-aw *{box-sizing:border-box}',
  // Felder: sehen aus wie Text, zeigen beim Darüberfahren eine gestrichelte Linie, beim Tippen einen hellblauen Grund
  `.wk-aw-feld{display:block;width:100%;margin:0;border:0;border-bottom:1px dashed transparent;border-radius:4px;background:transparent;color:inherit;font:inherit;line-height:1.4;padding:2px 4px;resize:none;overflow:hidden}`,
  `.wk-aw-feld:hover{border-bottom-color:${F.leise}}`,
  `.wk-aw-feld:focus{outline:2px solid ${F.blau};outline-offset:1px;background:${F.feldGrund}}`,
  `.wk-aw-feld::placeholder{color:${F.leise};font-weight:400;opacity:1}`,
  'textarea.wk-aw-feld.frage{font-weight:700;margin-bottom:8px}',
  // Antwortzeilen (Muster A)
  '.wk-aw-liste{display:flex;flex-direction:column;gap:6px;margin:0;padding:0;list-style:none}',
  '.wk-aw-zeile{display:flex;align-items:center;gap:4px}',
  '.wk-aw-zeile .antwort{flex:1;min-width:0;cursor:text}',
  `.wk-aw-zeile.wk-aw-richtig .antwort{border-color:${F.gruen};background:#F2F9F0}`,
  `.wk-aw-zeile.wk-aw-gezogen{opacity:.45}`,
  `.wk-aw-ziel{height:3px;border-radius:2px;background:${F.blau};margin:-2px 0}`,
  // Kreis vor der Antwort: Klick macht sie richtig
  `.wk-aw-kreis{flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;border-radius:50%;background:transparent;cursor:pointer}`,
  `.wk-aw-kreis::before{content:"";width:18px;height:18px;border-radius:50%;border:2px solid ${F.leise};background:#fff;box-sizing:border-box}`,
  `.wk-aw-kreis[aria-checked="true"]::before{border:6px solid ${F.gruen}}`,
  `.wk-aw-kreis:hover::before{border-color:${F.gruen}}`,
  // Zeilenwerkzeuge: bei Maus beim Darüberfahren/Fokus, auf Touch immer
  `.wk-aw-wz{flex:none;width:32px;height:32px;display:inline-flex;align-items:center;justify-content:center;padding:0;border:1px solid transparent;border-radius:8px;background:transparent;color:${F.leise};cursor:pointer;font:600 15px/1 system-ui,sans-serif}`,
  `.wk-aw-wz:hover{background:${F.feldGrund};border-color:${F.blau};color:${F.blauText}}`,
  `.wk-aw-wz[data-voll="true"]{color:${F.blauText}}`,
  `.wk-aw-wz.wk-aw-weg:hover{color:${F.rot};border-color:${F.rot};background:#fef2f2}`,
  '.wk-aw-griff{cursor:grab;touch-action:none}',
  '.wk-aw-zeile .wk-aw-wz{opacity:0}',
  '.wk-aw-zeile:hover .wk-aw-wz,.wk-aw-zeile:focus-within .wk-aw-wz,.wk-aw-zeile .wk-aw-wz[data-voll="true"],.wk-aw-zeile .wk-aw-wz[aria-expanded="true"]{opacity:1}',
  '.wk-aw-kreis:focus-visible,.wk-aw-wz:focus-visible,.wk-aw-knopf:focus-visible{outline:3px solid #2563eb;outline-offset:1px;opacity:1}',
  `.wk-aw-rueck{margin:2px 0 4px 36px;width:calc(100% - 36px);font-size:.9rem;color:${F.blauText}}`,
  `.wk-aw-neu{display:flex;align-items:center;gap:8px;margin-top:6px;padding:6px 8px;border:1px dashed ${F.leise};border-radius:6px;background:transparent;color:${F.blauText};font:inherit;cursor:pointer;width:100%;text-align:left}`,
  `.wk-aw-neu:hover{background:${F.feldGrund};border-color:${F.blau}}`,
  `.wk-aw-hinweis{margin:6px 0 0;padding:6px 10px;border-radius:6px;background:${F.orangeGrund};color:${F.orange};font-size:.9rem}`,
  // Fußleiste: klebt beim Scrollen unten an der Aufgabe
  `.wk-aw-fuss{position:sticky;bottom:0;z-index:5;display:flex;align-items:center;gap:6px;margin:14px -18px 0;padding:8px 12px;border-top:1px solid #c9cfd8;background:${F.grund};font:14px/1.3 system-ui,sans-serif}`,
  `.wk-aw-typ{flex:1;min-width:0;color:${F.leise};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}`,
  `.wk-aw-knopf{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;min-width:36px;padding:4px 12px;border:1px solid ${F.blauText};border-radius:8px;background:${F.grund};color:${F.blauText};font:600 14px/1 system-ui,sans-serif;cursor:pointer}`,
  `.wk-aw-knopf:hover{background:${F.feldGrund}}`,
  `.wk-aw-fertig{background:${F.blau};border-color:${F.blau};color:#fff}.wk-aw-fertig:hover{background:${F.blauText}}`,
  `.wk-aw-menue{position:absolute;right:0;bottom:calc(100% + 4px);min-width:220px;padding:4px;border:1px solid #c9cfd8;border-radius:10px;background:${F.grund};box-shadow:0 8px 24px rgba(15,23,42,.18)}`,
  `.wk-aw-menue button{display:flex;width:100%;min-height:36px;align-items:center;padding:6px 10px;border:0;border-radius:6px;background:transparent;color:${F.blauText};font:14px/1.3 system-ui,sans-serif;text-align:left;cursor:pointer}`,
  `.wk-aw-menue button:hover,.wk-aw-menue button:focus-visible{background:${F.feldGrund};outline:none}`,
  `.wk-aw-menue .wk-aw-gefahr{color:${F.rot};border-top:1px solid #e2e8f0;border-radius:0 0 6px 6px}`,
  '.wk-aw-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}',
  '.wk-aw-mehr-wrap{position:relative}',
  // Muster C kurz: beide Teile nebeneinander (schmal untereinander)
  `.wk-aw-nr{flex:none;width:24px;height:24px;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:${F.blauText};color:#fff;font:700 12px/1 system-ui,sans-serif}`,
  '.wk-aw-paar-felder{flex:1;min-width:0;display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:6px}',
  '.wk-aw-paar-felder .wk-aw-feld{border:1px solid #c9cfd8;border-radius:4px;padding:6px 8px}',
  '@media (max-width:400px){.wk-aw-paar-felder{grid-template-columns:minmax(0,1fr)}}',
  // Muster C lang: Aufklapp-Leiste wie in der Schülersicht
  '.wk-aw-k{border:1px solid #c9cfd8;margin-bottom:5px;list-style:none}',
  '.wk-aw-k-kopf{padding:2px 6px;background:#E6E6E6}',
  '.wk-aw-k-kopf .wk-aw-k-begriff{flex:1;min-width:0;font-weight:700;color:#1F497D}',
  '.wk-aw-k-text{padding:8px 11px}',
  `.wk-aw-k-fehlt{border-color:${F.orange};border-left-width:4px}`,
  `.wk-aw-fehlt{flex:none;padding:2px 8px;border-radius:999px;background:${F.orangeGrund};color:${F.orange};font:600 12px/1.4 system-ui,sans-serif;white-space:nowrap}`,
  '.wk-aw-k-pfeil{opacity:1!important}',
  // Muster E: Text mit Lücken
  '.wk-aw-lt-wrap{position:relative}',
  `.wk-aw-lt{min-height:3em;padding:6px 8px;border:1px dashed transparent;border-radius:4px;white-space:pre-wrap;line-height:1.9;cursor:text}`,
  `.wk-aw-lt:hover{border-color:${F.leise}}`,
  `.wk-aw-lt:focus{outline:2px solid ${F.blau};outline-offset:1px;background:${F.feldGrund}}`,
  `.wk-aw-lt:empty::before{content:attr(data-platzhalter);color:${F.leise}}`,
  `.wk-aw-luecke{display:inline-block;padding:0 6px;margin:0 1px;border-radius:4px;border-bottom:2px solid ${F.gruen};background:${F.gruenGrund};color:${F.gruen};font-weight:700;line-height:1.5;cursor:pointer;white-space:nowrap}`,
  `.wk-aw-luecke:hover,.wk-aw-luecke:focus-visible{background:#bbf7d0;outline:2px solid ${F.gruen};outline-offset:1px}`,
  `.wk-aw-lt-markieren .wk-aw-luecke::after{content:" ✓";font-weight:700}`,
  '.wk-aw-schwebe{position:absolute;z-index:6;display:flex;flex-direction:column;align-items:flex-start;gap:4px}',
  `.wk-aw-schwebe .wk-aw-knopf[aria-disabled="true"]{background:#94a3b8;border-color:#94a3b8;color:#0f172a}`,
  `.wk-aw-schwebe-grund{padding:3px 8px;border-radius:6px;background:${F.orangeGrund};color:${F.orange};font:13px/1.3 system-ui,sans-serif}`,
  `.wk-aw-fenster{position:absolute;z-index:7;width:min(320px,calc(100% - 8px));padding:10px 12px;border:1px solid #c9cfd8;border-radius:10px;background:${F.grund};box-shadow:0 8px 24px rgba(15,23,42,.18);font:14px/1.4 system-ui,sans-serif;color:${F.blauText}}`,
  '.wk-aw-fenster-titel{margin:0 0 6px;font-weight:700}',
  '.wk-aw-fenster-feld{display:flex;flex-direction:column;gap:2px;margin-bottom:8px}',
  `.wk-aw-eingabe{min-height:36px;padding:4px 8px;border:1px solid #94a3b8;border-radius:6px;font:inherit;color:#0f172a;background:#fff}`,
  `.wk-aw-eingabe:focus{outline:2px solid ${F.blau};outline-offset:1px}`,
  '.wk-aw-fenster-knoepfe{display:flex;flex-wrap:wrap;gap:6px;justify-content:space-between}',
  `.wk-aw-gefahr-knopf{color:${F.rot};border-color:${F.rot}}`,
  '.wk-aw-vorrat{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:8px}',
  `.wk-aw-vorrat-titel{color:${F.leise};font-size:.9rem}`,
  // Touch: alles 44 px, Werkzeuge immer sichtbar
  '@media (hover:none),(pointer:coarse){.wk-aw-kreis,.wk-aw-wz{width:44px;height:44px}.wk-aw-zeile .wk-aw-wz{opacity:1}.wk-aw-knopf{min-height:44px;min-width:44px}.wk-aw-neu{min-height:44px}.wk-aw-menue button{min-height:44px}.wk-aw-rueck{margin-left:48px;width:calc(100% - 48px)}.wk-aw-eingabe{min-height:44px}.wk-aw-luecke{padding:4px 8px}}',
  '@media print{.wk-aw-schild,.wk-aw-fuss{display:none!important}}',
].join('')
