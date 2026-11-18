import { BEDIEN_FARBEN, elementLeisteCss, knopfCss, leistenRahmenCss } from '@/components/werkzeugkiste/editor/bedien-design'
import { BLOCK_LEISTE, ELEMENT_LEISTE, FERTIG } from '@/components/werkzeugkiste/editor/bedien-woerter'
import { SCHNELLE_TYPEN, auswahlAusMarke } from '@/components/werkzeugkiste/editor/vorschau-nachrichten'
import { typName } from '@/lib/werkzeugkiste-editor'
import { BREITE_MAX, BREITE_MIN, BREITE_STUFEN, EINRAST_NAEHE, HANDY_BREITEN } from '@/lib/werkzeugkiste-bild-block'
import { FINDER } from '@/components/werkzeugkiste/editor/aufgabenwerk/bauplan'

export { auswahlAusMarke }

/**
 * Hilfsskript der Editor-Vorschau (PROJ-89, PROJ-96, PROJ-101).
 *
 * Die App fügt es erst im Browser in die gebaute Seite ein, nie in die gespeicherte
 * oder veröffentlichte Datei. **Regel für alle Folge-Features: Die Seite zeigt und
 * meldet, die App entscheidet und speichert.** Das Skript ändert nie selbst Inhalte,
 * es schickt nur Wünsche (`liesWunsch` in `vorschau-nachrichten.ts` prüft sie streng).
 *
 * Zwei Modi (Nachricht `{ wkZustand }` von der App):
 *  - **bearbeiten:** Ein Klick wählt den Block aus (`{ wkWaehle }`), Doppelklick öffnet
 *    das Formular (`{ wkBearbeite }`). Aufgaben sind „eingefroren“: Alle Maus-, Touch-,
 *    Tastatur- und Zieh-Ereignisse werden vor der Seite abgefangen (Fenster, Erfassungs-
 *    phase). Am gewählten Block schwebt eine Leiste, zwischen Blöcken erscheint beim
 *    Darüberfahren eine Einfügelinie, leere Themen zeigen Vorschläge.
 *  - **ausprobieren:** Alle Bedienelemente des Editors sind weg, die Seite verhält sich
 *    wie für Schüler.
 *
 * PROJ-102: ⌘/Strg+Klick und Umschalt+Klick wählen mehrere Blöcke (`{ wkMehr }`), am Griff der Leiste
 * lässt sich ziehen (`{ wkLege }`, `{ wkLegeThema }`); Kopieren, Ausschneiden, Einfügen und Alt+Pfeil gehen als Tasten an die App.
 *
 * Weitere Aufgaben: zu einer Stelle springen (`{ wk }`), klebenden Seitenkopf ausblenden,
 * Scrollposition melden (`{ wkScroll }`) und „bereit“ melden (`{ wkBereit }`).
 *
 * Die Seite läuft abgeschottet (kein `allow-same-origin`): Nur Text-Nachrichten
 * gehen hin und her, und beide Seiten prüfen den Absender.
 */

/** Farbpaare der Leiste; ein Test prüft den Kontrast (≥ 4,5 : 1) */
export const LEISTE_FARBEN = BEDIEN_FARBEN

const F = LEISTE_FARBEN

const CSS = [
  // Seitenkopf: im Editor ohne Nutzen und verdeckt beim Scrollen Inhalt (`.navi` kommt aus dem Kern)
  '.navi{display:none!important}',
  '.wk-ui{box-sizing:border-box;font:600 13px/1.2 system-ui,sans-serif}',
  'body:not(.wk-bearbeiten) .wk-ui{display:none!important}',
  'body.wk-bearbeiten [data-wk],body.wk-bearbeiten [data-wk] *{cursor:pointer!important}',
  `body.wk-bearbeiten .wk-hover{outline:2px dashed ${F.akzent};outline-offset:2px}`,
  `body.wk-bearbeiten .wk-aktiv{outline:3px solid ${F.akzent}!important;outline-offset:3px}`,
  `.wk-leiste{position:fixed;z-index:2147483000;display:flex;align-items:center;gap:2px;padding:3px;${leistenRahmenCss()}}`,
  '.wk-leiste[hidden],.wk-b[hidden]{display:none!important}',
  '.wk-leiste:not(.wk-leiste-unten){flex-wrap:wrap;max-width:calc(100% - 8px)}',
  `.wk-trenner{width:1px;align-self:stretch;margin:3px 2px;background:${F.trenner}}.wk-trenner[hidden]{display:none!important}`,
  // PROJ-104: Anfasser zum Größenziehen, Breiten-Etikett, Ablegen von Dateien
  '.wk-griffe{position:fixed;z-index:2147482990;pointer-events:none}.wk-griffe[hidden]{display:none!important}',
  `.wk-gr{position:absolute;width:24px;height:24px;margin:-12px 0 0 -12px;padding:0;border:2px solid #fff;border-radius:50%;background:${F.akzent};box-shadow:0 0 0 1px ${F.text};pointer-events:auto;touch-action:none}`,
  '.wk-gr::after{content:"";position:absolute;inset:-10px}',
  '.wk-gr:focus-visible{outline:3px solid #facc15;outline-offset:2px}',
  '.wk-gr[data-gr="nw"]{left:0;top:0;cursor:nwse-resize}.wk-gr[data-gr="ne"]{left:100%;top:0;cursor:nesw-resize}',
  '.wk-gr[data-gr="sw"]{left:0;top:100%;cursor:nesw-resize}.wk-gr[data-gr="se"]{left:100%;top:100%;cursor:nwse-resize}',
  '.wk-gr[data-gr="w"]{left:0;top:50%;cursor:ew-resize}.wk-gr[data-gr="e"]{left:100%;top:50%;cursor:ew-resize}',
  `.wk-bl{position:fixed;z-index:2147483002;padding:3px 8px;border-radius:6px;background:${F.text};color:#fff;font:700 12px/1.3 system-ui,sans-serif;pointer-events:none;white-space:nowrap}`,
  '.wk-bl[hidden]{display:none!important}',
  'body.wk-bearbeiten .wk-dropauf{outline:4px solid #16a34a!important;outline-offset:2px}',
  'body.wk-bearbeiten.wk-mobil{padding-bottom:72px}',
  '.wk-leiste-unten{left:0;right:0;bottom:0;flex-wrap:wrap;justify-content:space-between;border-radius:12px 12px 0 0;border-width:1px 0 0}',
  `.wk-typ{padding:0 8px;color:${F.textTyp};white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}`,
  knopfCss('.wk-b'),
  `.wk-d{color:${F.gefahr}}.wk-d:hover{background:${F.gefahrHover};border-color:${F.gefahr}}`,
  '.wk-griff{cursor:grab!important;touch-action:none;padding:4px 6px}',
  'body.wk-zieht-aktiv,body.wk-zieht-aktiv *{cursor:grabbing!important;user-select:none!important}',
  'body.wk-bearbeiten .wk-zieht{opacity:.4}',
  `.wk-linie{position:fixed;z-index:2147483001;height:4px;margin-top:-2px;border-radius:2px;background:${F.akzent};pointer-events:none;box-shadow:0 0 0 2px rgba(37,99,235,.25)}`,
  '.wk-linie[hidden]{display:none!important}',
  '.wk-plus{position:fixed;z-index:2147482999;height:24px;display:flex;align-items:center;justify-content:center;pointer-events:none}',
  '.wk-plus[hidden]{display:none!important}',
  `.wk-plus::before{content:"";position:absolute;left:0;right:0;top:11px;height:2px;background:${F.akzent}}`,
  `.wk-plus .wk-b{pointer-events:auto;position:relative;background:${F.akzent};color:${F.akzentText};border-radius:999px;min-height:24px;padding:0 10px}`,
  `.wk-plus .wk-b:hover{background:${F.text};border-color:${F.text}}`,
  `.wk-leer{margin:12px 0;padding:16px;border:2px dashed #64748b;border-radius:12px;background:${F.leerGrund};color:${F.leerText}}`,
  '.wk-leer p{margin:0 0 10px;font-weight:600}',
  `.wk-leer-knoepfe{display:flex;flex-wrap:wrap;gap:8px}.wk-leer .wk-b{border-color:${F.text};background:#fff}`,
  `.wk-ende{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}.wk-ende .wk-b{border:1px dashed ${F.text}}`,
  '@media (hover:none),(pointer:coarse){.wk-b{min-height:44px;min-width:44px;justify-content:center}.wk-plus{display:none!important}}',
  '@media (prefers-reduced-motion:no-preference){.wk-leiste{animation:wkein .15s ease-out}@keyframes wkein{from{opacity:0}to{opacity:1}}}',
  // PROJ-103: Beim Schreiben verschwinden Leiste, Einfügelinie und Rahmen
  'body.wk-schreibt .wk-leiste,body.wk-schreibt .wk-plus,body.wk-schreibt .wk-linie{display:none!important}',
  'body.wk-schreibt .wk-hover{outline:none!important}',
  `.wk-einfach{outline:2px solid ${F.akzent};outline-offset:4px;border-radius:4px;cursor:text!important}`,
  // PROJ-114/118: Während eine Aufgabe bearbeitet wird, hat sie ihre eigene Bearbeiten-Leiste
  'body.wk-aufgabe .wk-leiste,body.wk-aufgabe .wk-plus,body.wk-aufgabe .wk-linie{display:none!important}',
  'body.wk-bearbeiten .wk-aufgabenzone[data-wk],body.wk-bearbeiten .wk-aufgabenzone[data-wk] *{cursor:auto!important}',
  'body.wk-bearbeiten .wk-aufgabenzone[data-wk] :is(button,[role=radio]){cursor:pointer!important}',
  'body.wk-bearbeiten .wk-aufgabenzone[data-wk] :is(textarea,input){cursor:text!important}',
  'body.wk-bearbeiten .wk-aufgabenzone.wk-hover{outline:none}',
  // PROJ-118: die eine Bearbeiten-Leiste auch für Thema, Deckblatt und Bildunterschrift
  elementLeisteCss(),
  '@media print{.wk-ui{display:none!important}.wk-aktiv,.wk-hover{outline:none!important}}',
].join('')

/** Wörter für das Skript in der Seite (aus der einzigen Quelle `bedien-woerter.ts`) */
const WOERTER = {
  bearbeiten: BLOCK_LEISTE.bearbeiten,
  darunter: BLOCK_LEISTE.darunter,
  duplizieren: BLOCK_LEISTE.duplizieren,
  mehr: BLOCK_LEISTE.mehr.lang,
  loeschen: BLOCK_LEISTE.loeschen,
  fertig: FERTIG,
  enter: ELEMENT_LEISTE.enterHinweis,
  leisteName: ELEMENT_LEISTE.name('#'),
  einfachNamen: { kapitel: 'Thema', titel: 'Deckblatt', untertitel: 'Deckblatt', unterschrift: 'Bildunterschrift' },
}

const SVG = (pfad: string) =>
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  pfad +
  '</svg>'

const ICONS = {
  stift: SVG('<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>'),
  plus: SVG('<path d="M12 5v14M5 12h14"/>'),
  kopie: SVG('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  mehr: SVG('<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>'),
  griff: SVG('<circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/>'),
  zwischen: SVG('<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'),
  hoch: SVG('<path d="m18 15-6-6-6 6"/>'),
  runter: SVG('<path d="m6 9 6 6 6-6"/>'),
  austausch: SVG('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'),
  zuschnitt: SVG('<path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/>'),
  drehLinks: SVG('<path d="M3 2v6h6"/><path d="M3.5 13a9 9 0 1 0 2.6-7.4L3 8"/>'),
  drehRechts: SVG('<path d="M21 2v6h-6"/><path d="M20.5 13a9 9 0 1 1-2.6-7.4L21 8"/>'),
  ausLinks: SVG('<path d="M21 6H3M15 12H3M17 18H3"/>'),
  ausMitte: SVG('<path d="M21 6H3M17 12H7M19 18H5"/>'),
  ausRechts: SVG('<path d="M21 6H3M21 12H9M21 18H7"/>'),
  papierkorb: SVG('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
}

/** Gültige Marke im Dokument: Deckblatt, Thema (k0), Block (k0-e3) oder Lernzielkontrolle (abschluss) */
const MARKE_KNOPF = /^(deckblatt|k\d+(-e\d+)?|abschluss)$/

/** Schnellauswahl im leeren Thema: Typ und Beschriftung (aus den Namen der App, nie aus der Seite) */
const SCHNELL = SCHNELLE_TYPEN.map((t) => [t, typName(t)])

const SKRIPT_TEXT = String.raw`
(function(){
var MUSTER=${MARKE_KNOPF.toString()};
var SCHNELL=${JSON.stringify(SCHNELL)};
var STUFEN=${JSON.stringify(BREITE_STUFEN)},BMIN=${BREITE_MIN},BMAX=${BREITE_MAX},NAEHE=${EINRAST_NAEHE},HANDY=${JSON.stringify(HANDY_BREITEN)};
var ICON=${JSON.stringify(ICONS)};
var FINDER=${JSON.stringify(FINDER)};
var W=${JSON.stringify(WOERTER)};
var modus="bearbeiten",lesen=false,mobil=false,schublade=false,leer=[],auswahl=null,auswahlName="",hoverEl=null,plusZiel=null,mehr=[],ziehen=null,schreibt=null,merkeKlick=null,aufgabe=null,aufgaben={};
function p(x){parent.postMessage(x,"*")}
function finde(m){return document.querySelector('[data-wk="'+String(m).replace(/[^a-z0-9_-]/gi,"")+'"]')}
function elt(t){return t&&t.nodeType===1?t:(t&&t.parentElement)||null}
function markeVon(t){
  var e=t&&t.closest?t.closest("[data-wk]"):null;
  while(e){
    var m=e.getAttribute("data-wk");
    if(/^abschluss-/.test(m))return "abschluss";
    if(MUSTER.test(m))return m;
    e=e.parentElement?e.parentElement.closest("[data-wk]"):null;
  }
  return null;
}
function istFeld(t){return !!(t&&t.closest&&t.closest("input,textarea,select,[contenteditable='true'],[contenteditable='']"))}
function stoppe(e){e.preventDefault();e.stopImmediatePropagation()}
function inZone(t){return !!(t&&t.closest&&t.closest(".wk-schreibzone,.wk-aufgabenzone"))}
// PROJ-114: Welche Aufgabe (und welcher Eintrag darin) wurde angeklickt? Welche Blöcke Aufgaben sind, sagt
// die App (\`aufgaben\`: Marke → Typ). Gezählt wird nur in der Seite; ob die Zahl zum gespeicherten Block passt,
// prüft die App (sonst öffnet sie ohne Eintrag).
function aufgabeZiel(t){
  var sec=t.closest?t.closest("section[data-wk]"):null;
  if(!sec)return null;
  var m=sec.getAttribute("data-wk"),typ=aufgaben[m];
  if(!/^k\d+-e\d+$/.test(m)||typeof typ!=="string")return null;
  var sel=FINDER[typ],i;
  if(sel){
    var alle=Array.prototype.slice.call(sec.querySelectorAll(sel));
    for(i=0;i<alle.length;i++)if(alle[i].contains(t))return {marke:m,eintrag:{art:"eintrag",nr:i},anzahl:alle.length};
  }
  var f=t.closest(".frage");
  if(f&&sec.contains(f))return {marke:m,eintrag:{art:"frage"},anzahl:null};
  return {marke:m,eintrag:null,anzahl:null};
}
function aufgabeOffen(){return !!(aufgabe&&!aufgabe.fertig)}
function neu(tag,klasse,html){var n=document.createElement(tag);if(klasse)n.className=klasse;if(html)n.innerHTML=html;return n}
function knopf(aktion,html,label,klasse){
  var b=neu("button","wk-b"+(klasse?" "+klasse:""),html);
  b.type="button";b.setAttribute("data-wk-aktion",aktion);if(label)b.setAttribute("aria-label",label);return b;
}

var st=document.createElement("style");st.textContent=${JSON.stringify(CSS)};(document.head||document.documentElement).appendChild(st);

// ── Leiste am gewählten Block ──────────────────────────────────────────
var leiste=neu("div","wk-ui wk-leiste");
leiste.setAttribute("role","toolbar");leiste.setAttribute("aria-label","Aktionen für den ausgewählten Bereich");leiste.hidden=true;
var typ=neu("span","wk-typ");
var bGriff=knopf("griff",ICON.griff,"Zum Verschieben ziehen","wk-griff");bGriff.setAttribute("title","Ziehen zum Verschieben");
var bHoch=knopf("hoch",ICON.hoch,"Nach oben");
var bRunter=knopf("runter",ICON.runter,"Nach unten");
var bKopiere=knopf("kopiere",ICON.zwischen+"<span>Kopieren</span>","Kopieren");
// PROJ-118: Gleiche Wörter und Reihenfolge für jede Elementart (Name · Bearbeiten · Darunter einfügen · Duplizieren · ⋯ · Löschen)
function wort(b,w){b.querySelector("span").textContent=w.text;return b}
var bBearb=wort(knopf("bearbeite",ICON.stift+"<span></span>",W.bearbeiten.lang),W.bearbeiten);
var bPlus=wort(knopf("einfuegen",ICON.plus+"<span></span>",W.darunter.lang),W.darunter);
var bKopie=wort(knopf("dupliziere",ICON.kopie+"<span></span>",W.duplizieren.lang),W.duplizieren);
var bMehr=knopf("menue",ICON.mehr,W.mehr);bMehr.setAttribute("aria-haspopup","menu");
var bWeg=wort(knopf("loesche",ICON.papierkorb+"<span></span>",W.loeschen.lang,"wk-d"),W.loeschen);
var bildAkt=function(a,icon,text,label){var b=knopf("bild",icon+(text?"<span>"+text+"</span>":""),label);b.setAttribute("data-wk-bild",a);b.setAttribute("title",label);return b};
var bAustausch=bildAkt("austauschen",ICON.austausch,"Austauschen","Bild austauschen");
var bZuschnitt=bildAkt("zuschneiden",ICON.zuschnitt,"Zuschneiden","Bild zuschneiden");
var bDrehL=bildAkt("drehenLinks",ICON.drehLinks,"","Nach links drehen");
var bDrehR=bildAkt("drehenRechts",ICON.drehRechts,"","Nach rechts drehen");
var bAusL=bildAkt("links",ICON.ausLinks,"","Bild links ausrichten");
var bAusM=bildAkt("mitte",ICON.ausMitte,"","Bild mittig ausrichten");
var bAusR=bildAkt("rechts",ICON.ausRechts,"","Bild rechts ausrichten");
var bBeschr=bildAkt("beschriften",ICON.stift,"Beschriften","Bild beschriften und markieren");
var bAlt=bildAkt("alt",ICON.stift,"Alternativtext","Alternativtext eingeben");
var bTrenn=neu("span","wk-trenner");bTrenn.setAttribute("aria-hidden","true");
var bBreiten=HANDY.map(function(h){var b=knopf("breite","<span>"+h.name+"</span>","Bildbreite "+h.name);b.setAttribute("data-wk-prozent",String(h.prozent));return b});
var BILDKNOEPFE=[bAustausch,bZuschnitt,bDrehL,bDrehR,bAusL,bAusM,bAusR,bBeschr,bAlt].concat(bBreiten);
[bGriff,typ,bBearb,bTrenn].concat(BILDKNOEPFE).concat([bPlus,bHoch,bRunter,bKopiere,bKopie,bMehr,bWeg]).forEach(function(x){leiste.appendChild(x)});
document.body.appendChild(leiste);

var plus=neu("div","wk-ui wk-plus");plus.hidden=true;
var plusKnopf=knopf("einfuegen",ICON.plus+"<span>Element</span>","Element hier einfügen");
plus.appendChild(plusKnopf);document.body.appendChild(plus);

function leisteAktualisieren(){
  var viele=mehr.length>1;
  var art=!auswahl?"":(viele?"viele":(/-e\d+$/.test(auswahl)?"block":(/^k\d+$/.test(auswahl)?"thema":"sonst")));
  typ.textContent=viele?(mehr.length+" Elemente ausgewählt"):auswahlName;
  bGriff.hidden=lesen||mobil||(art!=="block"&&art!=="thema"&&art!=="viele");
  // PROJ-118: „Bearbeiten“ steht immer da und führt in die eine Bearbeiten-Leiste (oder, wo es nur dort geht, in die Schublade)
  bBearb.hidden=viele;
  bPlus.hidden=lesen||viele||(art!=="block"&&art!=="thema");
  bHoch.hidden=lesen||!mobil||(art!=="block"&&art!=="viele");
  bRunter.hidden=bHoch.hidden;
  bKopiere.hidden=viele?false:true;
  bKopie.hidden=lesen||(art!=="block"&&art!=="viele");
  bMehr.hidden=lesen||(art!=="block"&&art!=="viele");
  bWeg.hidden=lesen||(art!=="block"&&art!=="thema"&&art!=="viele");
  bWeg.setAttribute("aria-label",art==="thema"?"Thema löschen":(viele?"Ausgewählte Elemente löschen":W.loeschen.lang));
  bildLeiste(art);
}
// PROJ-104: Knöpfe für Bilder (nur bei genau einem Bild-Block, nicht in der Galerie)
function bildFigur(){
  var e=auswahl&&mehr.length<2?finde(auswahl):null;
  return e&&/-e\d+$/.test(auswahl)?e.querySelector("figure.bild"):null;
}
function bildBreite(fig){var w=parseFloat(fig&&fig.style?fig.style.width:"");return isFinite(w)?w:100}
function bildLeiste(art){
  var fig=art==="block"&&!lesen?bildFigur():null,hat=!!(fig&&fig.querySelector("img")),klein=hat&&bildBreite(fig)<99.5;
  BILDKNOEPFE.forEach(function(b){b.hidden=true});
  bTrenn.hidden=!fig;
  if(!fig)return;
  bAustausch.hidden=false;
  bAlt.hidden=!(fig.querySelector(".wk-altwarnung"));
  if(!hat)return;
  bZuschnitt.hidden=bDrehL.hidden=bDrehR.hidden=bBeschr.hidden=false;
  bAusL.hidden=bAusM.hidden=bAusR.hidden=!klein||mobil;
  bAusL.setAttribute("aria-pressed",String(fig.classList.contains("bild-links")));
  bAusR.setAttribute("aria-pressed",String(fig.classList.contains("bild-rechts")));
  bAusM.setAttribute("aria-pressed",String(!fig.classList.contains("bild-links")&&!fig.classList.contains("bild-rechts")));
  if(mobil){
    bZuschnitt.hidden=true;bBeschr.hidden=true;
    bBreiten.forEach(function(b){b.hidden=false;b.setAttribute("aria-pressed",String(Math.abs(Number(b.getAttribute("data-wk-prozent"))-bildBreite(fig))<4))});
  }
}
function plaziere(){plaziereLeiste();griffeAktualisieren()}
function plaziereLeiste(){
  var e=modus==="bearbeiten"&&auswahl?finde(auswahl):null;
  if(!e){leiste.hidden=true;return}
  var r=e.getBoundingClientRect();
  if(mobil){leiste.className="wk-ui wk-leiste wk-leiste-unten";leiste.hidden=false;leiste.style.top="";leiste.style.left="";return}
  if(r.bottom<0||r.top>innerHeight){leiste.hidden=true;return}
  leiste.className="wk-ui wk-leiste";leiste.hidden=false;
  // Erst an den linken Rand, dann messen: Ein fixiertes Element darf nur bis zum rechten Rand breit werden.
  // Am alten Platz gemessen wäre die Leiste schon umgebrochen und bliebe es (Befund PROJ-118, ~690 px).
  leiste.style.left="0px";
  var h=leiste.offsetHeight||38,w=leiste.offsetWidth||0;
  var top=r.top-h-6;
  if(top<4){
    // Kein Platz darüber: Beginnt der Block noch im Bild, steht die Leiste darunter (sonst verdeckt sie seinen Anfang).
    // Ragt er oben aus dem Bild, bleibt sie am oberen Rand des Blocks kleben.
    if(r.top>=0&&r.bottom+6+h<=innerHeight)top=r.bottom+6;else top=4;
  }else if(top>r.bottom-h)top=Math.max(4,r.bottom-h);
  var left=Math.min(Math.max(4,r.right-w),Math.max(4,innerWidth-w-4));
  leiste.style.top=top+"px";leiste.style.left=left+"px";
}
function markiere(m,name,liste){
  var a=document.querySelectorAll(".wk-aktiv"),i;
  for(i=0;i<a.length;i++)a[i].classList.remove("wk-aktiv");
  var e=m?finde(m):null;
  mehr=Array.isArray(liste)?liste.filter(function(x){return typeof x==="string"&&/^k\d+-e\d+$/.test(x)}).slice(0,100):[];
  if(mehr.length>1&&e){mehr.forEach(function(x){var f=finde(x);if(f)f.classList.add("wk-aktiv")})}else mehr=[];
  if(e)e.classList.add("wk-aktiv");
  auswahl=e?m:null;auswahlName=e&&typeof name==="string"?name.slice(0,60):"";
  leisteAktualisieren();plaziere();
  return e;
}

// ── Leere Themen und Einfügestellen am Ende ───────────────────────────
function themenKoepfe(){return Array.prototype.slice.call(document.querySelectorAll("h2[data-wk]"))}
function baueEinfuegestellen(){
  var alt=document.querySelectorAll(".wk-leer,.wk-ende"),i;
  for(i=0;i<alt.length;i++)alt[i].parentNode.removeChild(alt[i]);
  var koepfe=themenKoepfe(),letzte=-1;
  for(i=0;i<koepfe.length;i++)if(/^k\d+$/.test(koepfe[i].getAttribute("data-wk")))letzte=i;
  for(i=0;i<koepfe.length;i++){
    var k=koepfe[i],m=k.getAttribute("data-wk");
    if(!/^k\d+$/.test(m))continue;
    var nr=Number(m.slice(1));
    if(leer.indexOf(nr)>=0){
      var box=neu("div","wk-ui wk-leer"),satz=neu("p",null);
      satz.textContent="Dieses Thema ist noch leer.";box.appendChild(satz);
      var reihe=neu("div","wk-leer-knoepfe");
      SCHNELL.forEach(function(s){
        var b=knopf("schnell","<span></span>",null);b.querySelector("span").textContent=s[1];
        b.setAttribute("data-wk-marke",m);b.setAttribute("data-wk-typ",s[0]);reihe.appendChild(b);
      });
      var alle=knopf("einfuegen",ICON.plus+"<span>Alle Elemente …</span>",null);alle.setAttribute("data-wk-marke",m);reihe.appendChild(alle);
      box.appendChild(reihe);
      k.parentNode.insertBefore(box,k.nextSibling);
      continue;
    }
    // Ende dieses Themas: vor der nächsten Überschrift (oder nach dem letzten Element)
    var ende=neu("div","wk-ui wk-ende"),letzterBlock=m,n=k.nextElementSibling;
    while(n&&!(n.tagName==="H2"&&n.hasAttribute("data-wk"))){
      var nm=n.getAttribute&&n.getAttribute("data-wk");
      if(nm&&/^k\d+-e\d+$/.test(nm))letzterBlock=nm;
      n=n.nextElementSibling;
    }
    var bb=knopf("einfuegen",ICON.plus+"<span>Element</span>","Element am Ende des Themas einfügen");
    bb.setAttribute("data-wk-marke",letzterBlock);ende.appendChild(bb);
    if(i===letzte){
      var bt=knopf("thema",ICON.plus+"<span>Thema</span>","Neues Thema am Ende einfügen");ende.appendChild(bt);
    }
    if(n)n.parentNode.insertBefore(ende,n);else k.parentNode.appendChild(ende);
  }
}

// ── Einfügelinie zwischen zwei Blöcken (nur mit Maus) ─────────────────
function grob(){return typeof matchMedia==="function"&&matchMedia("(hover:none),(pointer:coarse)").matches}
function bewegt(ev){
  if(modus!=="bearbeiten"||lesen||mobil||grob()||ziehen)return;
  var t=elt(ev.target);
  if(!t)return;
  if(t.closest&&t.closest(".wk-ui")){return}
  var e=t.closest?t.closest("[data-wk]"):null;
  var ziel=null,y=0,r=null;
  if(e){
    var m=e.getAttribute("data-wk");
    if(/^(k\d+(-e\d+)?)$/.test(m)){
      r=e.getBoundingClientRect();
      if(r.bottom-ev.clientY<=12&&r.bottom-ev.clientY>=-12){ziel=m;y=r.bottom}
      else if(ev.clientY-r.top<=12&&/-e\d+$/.test(m)){
        var v=e.previousElementSibling;
        while(v&&!(v.getAttribute&&/^k\d+(-e\d+)?$/.test(v.getAttribute("data-wk")||"")))v=v.previousElementSibling;
        if(v){ziel=v.getAttribute("data-wk");y=r.top}
      }
    }
  }
  if(!ziel){plus.hidden=true;plusZiel=null;return}
  plusZiel=ziel;plusKnopf.setAttribute("data-wk-marke",ziel);
  plusKnopf.querySelector("span").textContent="Element";
  plus.hidden=false;plus.style.top=(y-12)+"px";plus.style.left=Math.max(0,r.left)+"px";plus.style.width=r.width+"px";
}
addEventListener("mousemove",bewegt,{passive:true});
document.documentElement.addEventListener("mouseleave",function(){plus.hidden=true});
addEventListener("mouseover",function(ev){
  if(modus!=="bearbeiten")return;
  var t=elt(ev.target),m=t?markeVon(t):null,e=m&&!(t.closest&&t.closest(".wk-ui"))?finde(m):null;
  if(hoverEl&&hoverEl!==e)hoverEl.classList.remove("wk-hover");
  hoverEl=e;if(e&&m!==auswahl)e.classList.add("wk-hover");
},{passive:true});

// ── Aktionen der eigenen Bedienelemente ───────────────────────────────
function aktion(a){
  var t=a.getAttribute("data-wk-aktion"),m=a.getAttribute("data-wk-marke")||auswahl;
  if(t==="bearbeite"){merkeKlick=null;p({wkBearbeite:m})}
  else if(t==="fertig"){if(schreibt&&!schreibt.fertig)schreibt.beende();else if(aufgabeOffen())aufgabe.beende()}
  else if(t==="einfuegen")p({wkEinfuegen:m});
  else if(t==="dupliziere")p({wkDupliziere:m});
  else if(t==="loesche")p({wkLoesche:m});
  else if(t==="thema")p({wkThemaNeu:true});
  else if(t==="schnell")p({wkSchnell:m,typ:a.getAttribute("data-wk-typ")});
  else if(t==="kopiere")p({wkKopiere:m});
  else if(t==="bild")p({wkBild:m,aktion:a.getAttribute("data-wk-bild")});
  else if(t==="breite")p({wkBreite:m,prozent:Number(a.getAttribute("data-wk-prozent"))});
  else if(t==="hoch"||t==="runter")p({wkTaste:t==="hoch"?"ArrowUp":"ArrowDown",mod:false,shift:false,alt:true});
  else if(t==="menue"){var r=a.getBoundingClientRect();p({wkMenue:m,x:Math.round(r.right),y:Math.round(r.bottom)})}
}

// ── Einfrieren: Im Modus „bearbeiten“ bekommt die Seite keine Eingaben ─
var EINFRIEREN=["mousedown","mouseup","pointerdown","pointerup","touchstart","touchend","dblclick","dragstart","drop","keypress","keyup","input","change","submit","auxclick"];
EINFRIEREN.forEach(function(name){
  addEventListener(name,function(e){
    if(modus!=="bearbeiten")return;
    var t=elt(e.target);
    if(!t||!t.closest||t.closest(".wk-ui")||inZone(t)||!t.closest("[data-wk]"))return;
    if(name==="touchstart"||name==="touchend"){e.stopImmediatePropagation();return}
    stoppe(e);
  },true);
});
addEventListener("focusin",function(e){
  if(modus!=="bearbeiten")return;
  var t=elt(e.target);
  if(t&&t.closest&&t.closest("[data-wk]")&&!t.closest(".wk-ui")&&!inZone(t)&&t.blur)t.blur();
},true);
addEventListener("click",function(e){
  var t=elt(e.target);
  if(!t)return;
  var a=t.closest?t.closest("[data-wk-aktion]"):null;
  if(a){stoppe(e);if(modus==="bearbeiten")aktion(a);return}
  if(modus!=="bearbeiten")return;
  if(inZone(t))return;
  if(t.closest&&t.closest(".wk-ui")){stoppe(e);return}
  stoppe(e);
  // Ein Klick außerhalb beendet das Schreiben (und wählt nichts aus)
  if(schreibt&&!schreibt.fertig){schreibt.beende();return}
  var mitMod=e.metaKey||e.ctrlKey||e.shiftKey;
  // PROJ-114: Ein Klick neben die offene Aufgabe beendet sie; auf eine andere Aufgabe wechselt er direkt dorthin
  var az=(!mitMod&&!lesen)?aufgabeZiel(t):null;
  if(aufgabeOffen()){aufgabe.beende();if(!az)return}
  var m=markeVon(t);
  if(!m){p({wkAbwaehle:true});return}
  if(az&&az.marke===m){p({wkAufgabe:m,eintrag:az.eintrag,anzahl:az.anzahl});return}
  var sz=(!mitMod&&!lesen&&!schreibt)?schreibZiel(t):null;
  if(sz&&sz.marke===m&&(e.detail>=2||m===auswahl)){merkeKlick={x:e.clientX,y:e.clientY};p({wkSchreibe:m,teil:sz.teil});return}
  if(mitMod&&/-e\d+$/.test(m)&&!mobil)p({wkMehr:m,wie:e.shiftKey?"bereich":"umschalten"});
  else if(e.detail>=2)p({wkBearbeite:m});else p({wkWaehle:m});
},true);

// ── Ziehen: nur am Griff der Leiste; die Seite meldet am Ende genau einen Wunsch ─
var linie=neu("div","wk-ui wk-linie");linie.hidden=true;document.body.appendChild(linie);
var zeiger={x:0,y:0},ziehTakt=null;
function ziehMarken(){return mehr.length>1?mehr:(auswahl?[auswahl]:[])}
function grenzen(thema,gesperrt){
  var liste=[],els=Array.prototype.slice.call(document.querySelectorAll("[data-wk]")),i;
  if(thema){
    var ks=els.filter(function(x){return x.tagName==="H2"&&/^k\d+$/.test(x.getAttribute("data-wk"))});
    ks.forEach(function(k){var r=k.getBoundingClientRect();liste.push({marke:k.getAttribute("data-wk"),y:r.top,x:r.left,b:r.width})});
    var ab=els.filter(function(x){return /^abschluss/.test(x.getAttribute("data-wk"))})[0];
    if(ab){var ra=ab.getBoundingClientRect();liste.push({marke:"abschluss",y:ra.top,x:ra.left,b:ra.width})}
    else if(ks.length){var l=ks[ks.length-1].parentNode.lastElementChild;if(l){var rl=l.getBoundingClientRect();liste.push({marke:"abschluss",y:rl.bottom,x:rl.left,b:rl.width})}}
    return liste;
  }
  for(i=0;i<els.length;i++){
    var x=els[i],m=x.getAttribute("data-wk"),r=x.getBoundingClientRect();
    if(x.tagName==="H2"&&/^k\d+$/.test(m)){
      // Ende der Überschrift; ein leeres Thema zeigt dahinter die Vorschläge (auch dort darf abgelegt werden)
      var nx=x.nextElementSibling,unten=r.bottom;
      if(nx&&nx.classList.contains("wk-leer"))unten=nx.getBoundingClientRect().bottom;
      liste.push({marke:m,wo:"anfang",y:unten,x:r.left,b:r.width});
    }else if(/^k\d+-e\d+$/.test(m)&&!gesperrt[m]){
      liste.push({marke:m,wo:"nach",y:r.bottom,x:r.left,b:r.width});
    }
  }
  return liste;
}
function zielBerechnen(){
  if(!ziehen)return;
  var gesperrt={};ziehMarken().forEach(function(m){gesperrt[m]=1});
  var liste=grenzen(ziehen.thema,gesperrt),beste=null,d=1e9,i;
  for(i=0;i<liste.length;i++){var dd=Math.abs(liste[i].y-zeiger.y);if(dd<d){d=dd;beste=liste[i]}}
  ziehen.ziel=beste;
  if(!beste){linie.hidden=true;return}
  linie.hidden=false;linie.style.top=beste.y+"px";linie.style.left=beste.x+"px";linie.style.width=beste.b+"px";
}
function startZiehen(ev){
  if(modus!=="bearbeiten"||lesen||mobil||!auswahl||ziehen)return;
  if(typeof ev.button==="number"&&ev.button!==0)return;
  ziehen={thema:mehr.length<2&&/^k\d+$/.test(auswahl),ziel:null,id:ev.pointerId};
  zeiger.x=ev.clientX;zeiger.y=ev.clientY;
  try{bGriff.setPointerCapture(ev.pointerId)}catch(x){}
  document.body.classList.add("wk-zieht-aktiv");
  ziehMarken().forEach(function(m){var f=finde(m);if(f)f.classList.add("wk-zieht")});
  plus.hidden=true;stoppe(ev);zielBerechnen();
  ziehTakt=setInterval(function(){
    if(!ziehen)return;
    var rand=60,schritt=0;
    if(zeiger.y<rand)schritt=-Math.max(4,Math.round((rand-zeiger.y)/3));
    else if(zeiger.y>innerHeight-rand)schritt=Math.max(4,Math.round((zeiger.y-(innerHeight-rand))/3));
    if(schritt){scrollBy(0,schritt)}
    zielBerechnen();
  },30);
}
function endeZiehen(senden){
  if(!ziehen)return;
  var z=ziehen;ziehen=null;
  if(ziehTakt){clearInterval(ziehTakt);ziehTakt=null}
  linie.hidden=true;document.body.classList.remove("wk-zieht-aktiv");
  var a=document.querySelectorAll(".wk-zieht"),i;for(i=0;i<a.length;i++)a[i].classList.remove("wk-zieht");
  if(senden&&z.ziel){
    if(z.thema)p({wkLegeThema:z.ziel.marke});
    else p({wkLege:z.ziel.marke,wo:z.ziel.wo});
  }
  plaziere();
}
bGriff.addEventListener("pointerdown",startZiehen);
addEventListener("pointermove",function(ev){if(!ziehen)return;zeiger.x=ev.clientX;zeiger.y=ev.clientY;zielBerechnen()},{passive:true});
addEventListener("pointerup",function(){endeZiehen(true)});
addEventListener("pointercancel",function(){endeZiehen(false)});
addEventListener("blur",function(){endeZiehen(false)});

// ── Bildgröße ziehen (PROJ-104): Die Seite zeigt live und meldet am Ende genau einen Wunsch ─
var griffe=neu("div","wk-ui wk-griffe");griffe.hidden=true;
["nw","ne","sw","se","w","e"].forEach(function(g){var b=neu("button","wk-gr");b.type="button";b.setAttribute("data-gr",g);b.setAttribute("aria-label","Bildbreite ändern (Pfeiltasten: nächste Stufe, Doppelklick: ganze Breite)");griffe.appendChild(b)});
var etikett=neu("div","wk-ui wk-bl");etikett.hidden=true;
document.body.appendChild(griffe);document.body.appendChild(etikett);
var gz=null;
function bildImg(){var f=bildFigur();return f?f.querySelector("img"):null}
function griffeAktualisieren(){
  var img=modus==="bearbeiten"&&!lesen&&!mobil&&!ziehen&&!schreibt?bildImg():null;
  if(!img){griffe.hidden=true;return}
  var r=img.getBoundingClientRect();
  if(r.width<8||r.bottom<0||r.top>innerHeight){griffe.hidden=true;return}
  griffe.hidden=false;griffe.style.left=r.left+"px";griffe.style.top=r.top+"px";griffe.style.width=r.width+"px";griffe.style.height=r.height+"px";
}
function innenBreite(el){
  var cs=getComputedStyle(el);
  return el.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0);
}
function rastePunkt(p,raster){
  p=Math.max(BMIN,Math.min(BMAX,p));
  if(raster){var b=null,i;for(i=0;i<STUFEN.length;i++)if(Math.abs(STUFEN[i]-p)<=NAEHE&&(b===null||Math.abs(STUFEN[i]-p)<Math.abs(b-p)))b=STUFEN[i];if(b!==null)return b}
  return Math.round(p);
}
function naechsteStufe(p,r){
  var i;
  if(r>0){for(i=0;i<STUFEN.length;i++)if(STUFEN[i]>p+0.5)return STUFEN[i];return BMAX}
  for(i=STUFEN.length-1;i>=0;i--)if(STUFEN[i]<p-0.5)return STUFEN[i];
  return Math.max(BMIN,Math.min(p,STUFEN[0]));
}
function breiteAnwenden(fig,p){
  var paar=fig.closest&&fig.closest(".paar");
  if(paar)paar.style.setProperty("--bw",Math.min(p,50)+"%");else fig.style.width=p+"%";
}
function griffStart(ev){
  if(modus!=="bearbeiten"||lesen||mobil||gz||(typeof ev.button==="number"&&ev.button!==0))return;
  var fig=bildFigur(),img=fig&&fig.querySelector("img"),sec=fig&&fig.closest("[data-wk]");
  if(!img||!sec)return;
  var paar=!!(fig.closest&&fig.closest(".paar")),cont=paar?fig.closest(".paar"):sec,cb=innenBreite(cont);
  if(cb<=0)return;
  var seite=ev.currentTarget.getAttribute("data-gr"),startB=img.getBoundingClientRect().width/cb*100;
  gz={fig:fig,img:img,paar:paar,cb:cb,seite:seite,x:ev.clientX,startB:startB,p:startB,zentriert:!fig.classList.contains("bild-links")&&!fig.classList.contains("bild-rechts")&&!paar,id:ev.pointerId,knopf:ev.currentTarget};
  try{ev.currentTarget.setPointerCapture(ev.pointerId)}catch(x){}
  document.body.classList.add("wk-zieht-aktiv");plus.hidden=true;stoppe(ev);
}
function griffBewegt(ev){
  if(!gz)return;
  var dx=(ev.clientX-gz.x)*(/w/.test(gz.seite)?-1:1)*(gz.zentriert?2:1);
  var p=rastePunkt(gz.startB+dx/gz.cb*100,!ev.altKey);
  if(gz.paar)p=Math.min(p,50);
  gz.p=p;breiteAnwenden(gz.fig,p);
  var r=gz.img.getBoundingClientRect(),unscharf=gz.img.naturalWidth>0&&r.width>gz.img.naturalWidth*1.5;
  etikett.textContent=Math.round(p)+" %"+(unscharf?" – Bild wird unscharf":"");
  etikett.hidden=false;etikett.style.left=Math.max(4,Math.min(innerWidth-190,r.left+r.width/2-30))+"px";etikett.style.top=Math.max(4,r.top-30)+"px";
  griffeAktualisieren();
}
function griffEnde(senden){
  if(!gz)return;
  var z=gz;gz=null;etikett.hidden=true;document.body.classList.remove("wk-zieht-aktiv");
  if(senden&&Math.abs(z.p-z.startB)>=0.5&&auswahl)p({wkBreite:auswahl,prozent:z.p});
  else if(!senden||Math.abs(z.p-z.startB)<0.5){breiteAnwenden(z.fig,z.startB);plaziere()}
}
Array.prototype.forEach.call(griffe.querySelectorAll(".wk-gr"),function(g){
  g.addEventListener("pointerdown",griffStart);
  g.addEventListener("dblclick",function(e){stoppe(e);if(auswahl)p({wkBreite:auswahl,prozent:100})});
  g.addEventListener("keydown",function(e){
    var r=(e.key==="ArrowRight"||e.key==="ArrowUp")?1:((e.key==="ArrowLeft"||e.key==="ArrowDown")?-1:0);
    if(!r||!auswahl)return;
    var fig=bildFigur();if(!fig)return;
    stoppe(e);p({wkBreite:auswahl,prozent:naechsteStufe(bildBreite(fig),r)});
  });
});
addEventListener("pointermove",griffBewegt,{passive:true});
addEventListener("pointerup",function(){griffEnde(true)});
addEventListener("pointercancel",function(){griffEnde(false)});

// ── Datei auf die Seite ziehen (PROJ-104): Die App meldet den Zeiger, die Seite zeigt die Stelle ─
var dropEl=null;
function dropAus(){
  linie.hidden=true;
  if(dropEl){dropEl.classList.remove("wk-dropauf");dropEl=null}
}
function dropZeiger(z){
  if(!z||typeof z.x!=="number"||typeof z.y!=="number"||modus!=="bearbeiten"||lesen){dropAus();p({wkDropZiel:null});return}
  var t=document.elementFromPoint(z.x,z.y),fig=t&&t.closest?t.closest("figure.bild"):null,m=fig?markeVon(fig):null;
  if(fig&&fig.querySelector("img")&&m&&/-e\d+$/.test(m)){
    var sec=finde(m);
    if(dropEl&&dropEl!==sec)dropEl.classList.remove("wk-dropauf");
    dropEl=sec;if(sec)sec.classList.add("wk-dropauf");
    linie.hidden=true;p({wkDropZiel:m,wo:"auf"});return;
  }
  if(dropEl){dropEl.classList.remove("wk-dropauf");dropEl=null}
  var liste=grenzen(false,{}),beste=null,d=1e9,i;
  for(i=0;i<liste.length;i++){var dd=Math.abs(liste[i].y-z.y);if(dd<d){d=dd;beste=liste[i]}}
  if(!beste){linie.hidden=true;p({wkDropZiel:null});return}
  linie.hidden=false;linie.style.top=beste.y+"px";linie.style.left=beste.x+"px";linie.style.width=beste.b+"px";
  p({wkDropZiel:beste.marke,wo:beste.wo});
}

// ── Tastatur: nur vereinbarte Kürzel gehen an die App ─────────────────
function weitergabe(e){
  if(inZone(elt(e.target)))return false;
  var k=e.key,kl=k&&k.length===1?k.toLowerCase():k,mod=e.metaKey||e.ctrlKey;
  var t=elt(e.target),feld=istFeld(t),knopfZiel=t&&t.closest&&t.closest("button,a,summary");
  var ok=false;
  if(modus==="ausprobieren"){
    ok=(mod&&!e.altKey&&kl==="e")||(mod&&kl==="z"&&!feld);
  }else{
    var inBlock=!!(t&&t.closest&&t.closest("[data-wk]"));
    if(feld&&!inBlock)return false;
    if(ziehen){if(kl==="Escape")endeZiehen(false);stoppe(e);return true}
    if((kl==="ArrowUp"||kl==="ArrowDown")&&!mod&&!e.shiftKey)ok=!!auswahl;
    else if(kl==="Enter"&&!mod&&!e.altKey&&!e.shiftKey)ok=!!auswahl&&!knopfZiel;
    else if((kl==="Delete"||kl==="Backspace")&&!mod&&!e.altKey)ok=!!auswahl;
    else if(kl==="Escape")ok=true;
    else if(mod&&!e.altKey&&(kl==="d"||kl==="e"||kl==="z"))ok=true;
    else if(mod&&!e.altKey&&!e.shiftKey&&(kl==="c"||kl==="x"))ok=!!auswahl&&!feld&&!(typeof getSelection==="function"&&String(getSelection()).length);
    else if(mod&&!e.altKey&&!e.shiftKey&&kl==="v")ok=!feld;
    else if(e.altKey&&e.shiftKey&&!mod&&(e.code==="KeyB"||kl==="b"))ok=true;
    if(!ok&&inBlock&&k!=="Tab"&&!(e.shiftKey&&k==="Shift")&&k!=="Shift"&&k!=="Control"&&k!=="Meta"&&k!=="Alt"&&(feld||k==="Enter"||k===" "))stoppe(e);
  }
  if(!ok)return false;
  stoppe(e);
  p({wkTaste:(e.code==="KeyB"&&e.altKey?"b":kl),mod:!!mod,shift:!!e.shiftKey,alt:!!e.altKey});
  return true;
}
addEventListener("keydown",weitergabe,true);

// ── Scrollposition, Größenänderung ────────────────────────────────────
var tick=false;
function lage(){
  tick=false;
  p({wkScroll:Math.round(scrollY)});
  plaziere();
}
addEventListener("scroll",function(){if(!tick){tick=true;requestAnimationFrame(lage)}},{passive:true});
addEventListener("resize",plaziere);

function anwenden(){
  document.body.classList.toggle("wk-bearbeiten",modus==="bearbeiten");
  document.body.classList.toggle("wk-mobil",mobil);
  if(modus!=="bearbeiten"){endeZiehen(false);plus.hidden=true;if(hoverEl){hoverEl.classList.remove("wk-hover");hoverEl=null}}
  if(modus!=="bearbeiten"){griffEnde(false);dropAus()}
  baueEinfuegestellen();leisteAktualisieren();plaziere();
}

// ── Direkt schreiben (PROJ-103) ──────────────────────────────────────
function schreibZiel(t){
  var e;
  if((e=t.closest(".lehrtext")))return {teil:"text",marke:markeVon(e)};
  if((e=t.closest("p.bildunterschrift")))return {teil:"unterschrift",marke:markeVon(e)};
  if((e=t.closest("h2[data-wk]"))){var mk=e.getAttribute("data-wk");return /^k\d+$/.test(mk)?{teil:"kapitel",marke:mk}:null}
  if(t.closest('[data-wk="deckblatt"] h1'))return {teil:"titel",marke:"deckblatt"};
  if(t.closest('[data-wk="deckblatt"] p.unter'))return {teil:"untertitel",marke:"deckblatt"};
  return null;
}
function schreibElement(marke,teil){
  var b=finde(marke);if(!b)return null;
  if(teil==="text")return b.querySelector(".lehrtext");
  if(teil==="unterschrift")return b.querySelector("p.bildunterschrift");
  if(teil==="kapitel")return b.tagName==="H2"?b:null;
  if(teil==="titel")return b.querySelector("h1");
  if(teil==="untertitel")return b.querySelector("p.unter");
  return null;
}
function setzeCursor(el,k){
  el.focus();if(!k)return;
  var r=null;
  if(document.caretRangeFromPoint)r=document.caretRangeFromPoint(k.x,k.y);
  else if(document.caretPositionFromPoint){var c=document.caretPositionFromPoint(k.x,k.y);if(c){r=document.createRange();r.setStart(c.offsetNode,c.offset)}}
  if(r&&el.contains(r.startContainer)){var sel=getSelection();sel.removeAllRanges();sel.addRange(r)}
}
function schreibEnde(){document.body.classList.remove("wk-schreibt");if(schreibt)schreibt.fertig=true}
// PROJ-118: dieselbe Bearbeiten-Leiste wie beim Lehrtext: Name links, Hinweis, „Fertig“ rechts
function einfachLeiste(el,s){
  var name=W.einfachNamen[s.teil]||"Text";
  var l=neu("div","wk-ui wk-el"+(mobil?" wk-el-unten":""));
  l.setAttribute("role","toolbar");l.setAttribute("aria-label",W.leisteName.replace("#",name));
  var n=neu("span","wk-el-name");n.textContent=name;
  var mi=neu("div","wk-el-mitte"),h=neu("span","wk-el-hinweis");h.textContent=W.enter;mi.appendChild(h);
  var f=neu("button","wk-el-k wk-el-fertig");f.type="button";f.setAttribute("data-wk-aktion","fertig");
  f.setAttribute("aria-label",W.fertig.lang);f.setAttribute("title",W.fertig.lang);f.textContent=W.fertig.text;
  l.appendChild(n);l.appendChild(mi);l.appendChild(f);
  // Ein Klick auf die Leiste nimmt dem Text nicht den Fokus (sonst endete das Schreiben schon beim Drücken)
  l.addEventListener("mousedown",function(e){e.preventDefault()});
  el.parentNode.insertBefore(l,el);
  // Handy: über der Bildschirmtastatur kleben (wie Lehrtext und Aufgabe)
  var vv=mobil?window.visualViewport:null;
  if(vv){
    var ueber=function(){l.style.bottom=Math.max(0,innerHeight-(vv.height+vv.offsetTop))+"px"};
    vv.addEventListener("resize",ueber);vv.addEventListener("scroll",ueber);ueber();
    l.wkWeg=function(){vv.removeEventListener("resize",ueber);vv.removeEventListener("scroll",ueber)};
  }
  return l;
}
function einfachLeisteWeg(l){if(!l)return;if(l.wkWeg)l.wkWeg();if(l.parentNode)l.parentNode.removeChild(l)}
function einfachStart(el,s){
  var leisteE=null;
  el.classList.add("wk-schreibzone","wk-einfach");
  el.setAttribute("contenteditable","true");el.setAttribute("spellcheck","true");el.setAttribute("lang","de");
  var letzter=el.textContent.replace(/\s+/g," ").trim(),zeit=null,fertig=false;
  function text(){return el.textContent.replace(/\s+/g," ").trim()}
  function zw(){zeit=null;var t=text();if(t!==letzter){letzter=t;p({wkSchreibZwischen:s.marke,teil:s.teil,html:t})}}
  function ende(){
    if(fertig)return;fertig=true;if(zeit)clearTimeout(zeit);
    el.setAttribute("contenteditable","false");el.classList.remove("wk-schreibzone","wk-einfach");
    einfachLeisteWeg(leisteE);
    schreibEnde();p({wkSchreibEnde:s.marke,teil:s.teil,html:text()});
  }
  el.addEventListener("input",function(){if(zeit)clearTimeout(zeit);zeit=setTimeout(zw,2000)});
  el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key==="Escape"){e.preventDefault();ende()}});
  el.addEventListener("beforeinput",function(e){if(e.inputType==="insertParagraph"||e.inputType==="insertLineBreak")e.preventDefault()});
  el.addEventListener("paste",function(e){
    e.preventDefault();
    var tx=((e.clipboardData&&e.clipboardData.getData("text/plain"))||"").replace(/\s+/g," ");
    if(tx)document.execCommand("insertText",false,tx);
  });
  el.addEventListener("blur",ende);
  // Erst den Cursor an die Klickstelle, dann die Leiste einfügen (sie verschiebt die Zeile nach unten)
  setzeCursor(el,merkeKlick);
  leisteE=einfachLeiste(el,s);
  schreibt={beende:ende,ab:function(){fertig=true;if(zeit)clearTimeout(zeit);el.setAttribute("contenteditable","false");el.classList.remove("wk-schreibzone","wk-einfach");einfachLeisteWeg(leisteE);schreibEnde()},fertig:false};
}
// ── Aufgabe an Ort und Stelle bearbeiten (PROJ-114) ──────────────────
function startAufgabe(s){
  if(aufgabeOffen())aufgabe.beende();
  var el=modus==="bearbeiten"&&!lesen&&typeof s.marke==="string"?finde(s.marke):null;
  if(!el||el.tagName!=="SECTION"||!window.__wkAufgabenwerk||!s.block||typeof s.block!=="object"){p({wkAufgabeAbbruch:String(s.marke||"")});return}
  document.body.classList.add("wk-aufgabe");
  try{
    aufgabe=window.__wkAufgabenwerk.starte({ziel:el,block:s.block,marke:s.marke,typName:String(s.typName||""),eintrag:s.eintrag||null,mobil:mobil,
      // Die Leiste war während der Bearbeitung ausgeblendet (Breite 0): nach dem Einblenden neu messen und platzieren
      melde:function(n){if(n.wkAufgabeEnde){document.body.classList.remove("wk-aufgabe");leisteAktualisieren();plaziere();requestAnimationFrame(function(){plaziere()})}p(n)}});
  }catch(x){document.body.classList.remove("wk-aufgabe");aufgabe=null;p({wkAufgabeAbbruch:s.marke});return}
  leisteAktualisieren();
}
function startSchreiben(s){
  if(schreibt&&!schreibt.fertig)return;
  var el=modus==="bearbeiten"&&!lesen&&typeof s.marke==="string"?schreibElement(s.marke,s.teil):null;
  if(!el){p({wkSchreibAbbruch:String(s.marke||"")});return}
  document.body.classList.add("wk-schreibt");
  if(s.teil==="text"){
    if(!window.__wkSchreibwerk||typeof s.html!=="string"){document.body.classList.remove("wk-schreibt");p({wkSchreibAbbruch:s.marke});return}
    var w;
    try{
      w=window.__wkSchreibwerk.starte({ziel:el,html:s.html,marke:s.marke,klick:merkeKlick,mobil:mobil,name:auswahlName||"Lehrtext",melde:function(n){if(n.wkSchreibEnde){document.body.classList.remove("wk-schreibt");if(schreibt)schreibt.fertig=true;w.element.classList.remove("wk-schreibzone")}p(n)}});
    }catch(x){document.body.classList.remove("wk-schreibt");p({wkSchreibAbbruch:s.marke});return}
    schreibt={beende:function(){w.beende()},ab:function(){w.ab();schreibEnde()},fertig:false};
  }else einfachStart(el,s);
}

// ── Nachrichten der App ──────────────────────────────────────────────
addEventListener("message",function(e){
  if(e.source!==parent)return;
  var d=e.data;
  if(!d||typeof d!=="object")return;
  if(typeof d.wkSchreibwerk==="string"){
    if(!window.__wkSchreibwerk){var sc=document.createElement("script");sc.textContent=d.wkSchreibwerk;document.head.appendChild(sc)}
    return;
  }
  if(d.wkSchreibStart&&typeof d.wkSchreibStart==="object"){startSchreiben(d.wkSchreibStart);return}
  if(typeof d.wkAufgabenwerk==="string"){
    if(!window.__wkAufgabenwerk){var sa=document.createElement("script");sa.textContent=d.wkAufgabenwerk;document.head.appendChild(sa)}
    return;
  }
  if(d.wkAufgabeStart&&typeof d.wkAufgabeStart==="object"){startAufgabe(d.wkAufgabeStart);return}
  if(d.wkAufgabeStand&&typeof d.wkAufgabeStand==="object"){if(aufgabeOffen())aufgabe.setze(d.wkAufgabeStand);return}
  if(d.wkAufgabeBeende===true){if(aufgabeOffen())aufgabe.beende();return}
  if(d.wkAufgabeVorbei===true){if(aufgabeOffen())aufgabe.ab();document.body.classList.remove("wk-aufgabe");aufgabe=null;leisteAktualisieren();plaziere();return}
  if("wkDropZeiger" in d){dropZeiger(d.wkDropZeiger);return}
  if(d.wkSchreibBeende===true){if(schreibt&&!schreibt.fertig)schreibt.beende();return}
  if(d.wkSchreibVorbei===true){if(schreibt){schreibt.ab();schreibt=null}return}
  if(d.wkZustand&&typeof d.wkZustand==="object"){
    var z=d.wkZustand;
    if(z.modus==="bearbeiten"||z.modus==="ausprobieren")modus=z.modus;
    lesen=z.lesen===true;mobil=z.mobil===true;schublade=z.schublade===true;
    leer=Array.isArray(z.leer)?z.leer.filter(function(n){return typeof n==="number"&&n>=0&&n%1===0}).slice(0,500):[];
    aufgaben={};
    if(z.aufgaben&&typeof z.aufgaben==="object")Object.keys(z.aufgaben).slice(0,2000).forEach(function(k){var v=z.aufgaben[k];if(/^k\d+-e\d+$/.test(k)&&typeof v==="string"&&v.length<40)aufgaben[k]=v});
    anwenden();
    return;
  }
  if(d.wk!==null&&typeof d.wk!=="string")return;
  var x=markiere(d.wk,d.name,d.mehr);
  if(typeof d.scrollY==="number"){scrollTo({top:d.scrollY,behavior:"instant"});plaziere();return}
  if(x){
    var r=x.getBoundingClientRect();
    if(!d.still||r.bottom<40||r.top>innerHeight-80)x.scrollIntoView({block:"start",behavior:"smooth"});
  }
});
anwenden();
p({wkBereit:true});
})();
`

export const SPRUNG_SKRIPT = `<script>${SKRIPT_TEXT}</script>`

/** Fügt das Hilfsskript vor `</body>` ein (oder ans Ende, wenn es kein `</body>` gibt) */
export function mitSprungSkript(html: string): string {
  const i = html.lastIndexOf('</body>')
  return i >= 0 ? html.slice(0, i) + SPRUNG_SKRIPT + html.slice(i) : html + SPRUNG_SKRIPT
}
