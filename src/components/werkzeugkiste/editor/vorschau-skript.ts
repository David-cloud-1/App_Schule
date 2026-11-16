import { SCHNELLE_TYPEN, auswahlAusMarke } from '@/components/werkzeugkiste/editor/vorschau-nachrichten'
import { typName } from '@/lib/werkzeugkiste-editor'

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
export const LEISTE_FARBEN = {
  grund: '#ffffff',
  text: '#1e3a8a',
  textTyp: '#475569',
  gefahr: '#991b1b',
  gefahrGrund: '#ffffff',
  plusGrund: '#2563eb',
  plusText: '#ffffff',
  leerText: '#334155',
  leerGrund: '#ffffff',
} as const

const F = LEISTE_FARBEN

const CSS = [
  // Seitenkopf: im Editor ohne Nutzen und verdeckt beim Scrollen Inhalt (`.navi` kommt aus dem Kern)
  '.navi{display:none!important}',
  '.wk-ui{box-sizing:border-box;font:600 13px/1.2 system-ui,sans-serif}',
  'body:not(.wk-bearbeiten) .wk-ui{display:none!important}',
  'body.wk-bearbeiten [data-wk],body.wk-bearbeiten [data-wk] *{cursor:pointer!important}',
  'body.wk-bearbeiten .wk-hover{outline:2px dashed #2563eb;outline-offset:2px}',
  'body.wk-bearbeiten .wk-aktiv{outline:3px solid #2563eb!important;outline-offset:3px}',
  `.wk-leiste{position:fixed;z-index:2147483000;display:flex;align-items:center;gap:2px;padding:3px;background:${F.grund};border:1px solid ${F.text};border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.2)}`,
  '.wk-leiste[hidden],.wk-b[hidden]{display:none!important}',
  'body.wk-bearbeiten.wk-mobil{padding-bottom:72px}',
  '.wk-leiste-unten{left:0;right:0;bottom:0;flex-wrap:wrap;justify-content:space-between;border-radius:12px 12px 0 0;border-width:1px 0 0}',
  `.wk-typ{padding:0 8px;color:${F.textTyp};white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}`,
  `.wk-b{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:${F.text};font:inherit;cursor:pointer}`,
  `.wk-b:hover{background:#eff6ff;border-color:${F.text}}`,
  '.wk-b:focus-visible{outline:3px solid #2563eb;outline-offset:1px}',
  `.wk-d{color:${F.gefahr}}.wk-d:hover{background:#fef2f2;border-color:${F.gefahr}}`,
  '.wk-griff{cursor:grab!important;touch-action:none;padding:4px 6px}',
  'body.wk-zieht-aktiv,body.wk-zieht-aktiv *{cursor:grabbing!important;user-select:none!important}',
  'body.wk-bearbeiten .wk-zieht{opacity:.4}',
  '.wk-linie{position:fixed;z-index:2147483001;height:4px;margin-top:-2px;border-radius:2px;background:#2563eb;pointer-events:none;box-shadow:0 0 0 2px rgba(37,99,235,.25)}',
  '.wk-linie[hidden]{display:none!important}',
  '.wk-plus{position:fixed;z-index:2147482999;height:24px;display:flex;align-items:center;justify-content:center;pointer-events:none}',
  '.wk-plus[hidden]{display:none!important}',
  '.wk-plus::before{content:"";position:absolute;left:0;right:0;top:11px;height:2px;background:#2563eb}',
  `.wk-plus .wk-b{pointer-events:auto;position:relative;background:${F.plusGrund};color:${F.plusText};border-radius:999px;min-height:24px;padding:0 10px}`,
  '.wk-plus .wk-b:hover{background:#1d4ed8;border-color:#1d4ed8}',
  `.wk-leer{margin:12px 0;padding:16px;border:2px dashed #64748b;border-radius:12px;background:${F.leerGrund};color:${F.leerText}}`,
  '.wk-leer p{margin:0 0 10px;font-weight:600}',
  `.wk-leer-knoepfe{display:flex;flex-wrap:wrap;gap:8px}.wk-leer .wk-b{border-color:${F.text};background:#fff}`,
  `.wk-ende{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:12px 0}.wk-ende .wk-b{border:1px dashed ${F.text}}`,
  '@media (hover:none),(pointer:coarse){.wk-b{min-height:44px;min-width:44px;justify-content:center}.wk-plus{display:none!important}}',
  '@media (prefers-reduced-motion:no-preference){.wk-leiste{animation:wkein .15s ease-out}@keyframes wkein{from{opacity:0}to{opacity:1}}}',
  // PROJ-103: Beim Schreiben verschwinden Leiste, Einfügelinie und Rahmen
  'body.wk-schreibt .wk-leiste,body.wk-schreibt .wk-plus,body.wk-schreibt .wk-linie{display:none!important}',
  'body.wk-schreibt .wk-hover{outline:none!important}',
  '.wk-einfach{outline:2px solid #2563eb;outline-offset:4px;border-radius:4px;cursor:text!important}',
  '@media print{.wk-ui{display:none!important}.wk-aktiv,.wk-hover{outline:none!important}}',
].join('')

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
var ICON=${JSON.stringify(ICONS)};
var modus="bearbeiten",lesen=false,mobil=false,leer=[],auswahl=null,auswahlName="",hoverEl=null,plusZiel=null,mehr=[],ziehen=null,schreibt=null,merkeKlick=null;
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
function inZone(t){return !!(t&&t.closest&&t.closest(".wk-schreibzone"))}
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
var bBearb=knopf("bearbeite",ICON.stift+"<span>Bearbeiten</span>","Bearbeiten");
var bPlus=knopf("einfuegen",ICON.plus+"<span>Darunter</span>","Block darunter einfügen");
var bKopie=knopf("dupliziere",ICON.kopie+"<span>Duplizieren</span>","Block duplizieren");
var bMehr=knopf("menue",ICON.mehr,"Weitere Aktionen");bMehr.setAttribute("aria-haspopup","menu");
var bWeg=knopf("loesche",ICON.papierkorb,"Block löschen","wk-d");
[bGriff,typ,bBearb,bPlus,bHoch,bRunter,bKopiere,bKopie,bMehr,bWeg].forEach(function(x){leiste.appendChild(x)});
document.body.appendChild(leiste);

var plus=neu("div","wk-ui wk-plus");plus.hidden=true;
var plusKnopf=knopf("einfuegen",ICON.plus+"<span>Block</span>","Block hier einfügen");
plus.appendChild(plusKnopf);document.body.appendChild(plus);

function leisteAktualisieren(){
  var viele=mehr.length>1;
  var art=!auswahl?"":(viele?"viele":(/-e\d+$/.test(auswahl)?"block":(/^k\d+$/.test(auswahl)?"thema":"sonst")));
  typ.textContent=viele?(mehr.length+" Blöcke ausgewählt"):auswahlName;
  bGriff.hidden=lesen||mobil||(art!=="block"&&art!=="thema"&&art!=="viele");
  bBearb.hidden=viele;
  bPlus.hidden=lesen||viele||(art!=="block"&&art!=="thema");
  bPlus.querySelector("span").textContent=art==="thema"?"Block":"Darunter";
  bPlus.setAttribute("aria-label",art==="thema"?"Block am Anfang des Themas einfügen":"Block darunter einfügen");
  bHoch.hidden=lesen||!mobil||(art!=="block"&&art!=="viele");
  bRunter.hidden=bHoch.hidden;
  bKopiere.hidden=viele?false:true;
  bKopie.hidden=lesen||(art!=="block"&&art!=="viele");
  bMehr.hidden=lesen||(art!=="block"&&art!=="viele");
  bWeg.hidden=lesen||(art!=="block"&&art!=="thema"&&art!=="viele");
  bWeg.setAttribute("aria-label",art==="thema"?"Thema löschen":(viele?"Ausgewählte Blöcke löschen":"Block löschen"));
}
function plaziere(){
  var e=modus==="bearbeiten"&&auswahl?finde(auswahl):null;
  if(!e){leiste.hidden=true;return}
  var r=e.getBoundingClientRect();
  if(mobil){leiste.className="wk-ui wk-leiste wk-leiste-unten";leiste.hidden=false;leiste.style.top="";leiste.style.left="";return}
  if(r.bottom<0||r.top>innerHeight){leiste.hidden=true;return}
  leiste.className="wk-ui wk-leiste";leiste.hidden=false;
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
      var alle=knopf("einfuegen",ICON.plus+"<span>Alle Blöcke …</span>",null);alle.setAttribute("data-wk-marke",m);reihe.appendChild(alle);
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
    var bb=knopf("einfuegen",ICON.plus+"<span>Block</span>","Block am Ende des Themas einfügen");
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
  plusKnopf.querySelector("span").textContent="Block";
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
  if(t==="bearbeite")p({wkBearbeite:m});
  else if(t==="einfuegen")p({wkEinfuegen:m});
  else if(t==="dupliziere")p({wkDupliziere:m});
  else if(t==="loesche")p({wkLoesche:m});
  else if(t==="thema")p({wkThemaNeu:true});
  else if(t==="schnell")p({wkSchnell:m,typ:a.getAttribute("data-wk-typ")});
  else if(t==="kopiere")p({wkKopiere:m});
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
  var m=markeVon(t);
  if(!m){p({wkAbwaehle:true});return}
  var mitMod=e.metaKey||e.ctrlKey||e.shiftKey;
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
function einfachStart(el,s){
  el.classList.add("wk-schreibzone","wk-einfach");
  el.setAttribute("contenteditable","true");el.setAttribute("spellcheck","true");el.setAttribute("lang","de");
  var letzter=el.textContent.replace(/\s+/g," ").trim(),zeit=null,fertig=false;
  function text(){return el.textContent.replace(/\s+/g," ").trim()}
  function zw(){zeit=null;var t=text();if(t!==letzter){letzter=t;p({wkSchreibZwischen:s.marke,teil:s.teil,html:t})}}
  function ende(){
    if(fertig)return;fertig=true;if(zeit)clearTimeout(zeit);
    el.setAttribute("contenteditable","false");el.classList.remove("wk-schreibzone","wk-einfach");
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
  setzeCursor(el,merkeKlick);
  schreibt={beende:ende,ab:function(){fertig=true;if(zeit)clearTimeout(zeit);el.setAttribute("contenteditable","false");el.classList.remove("wk-schreibzone","wk-einfach");schreibEnde()},fertig:false};
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
      w=window.__wkSchreibwerk.starte({ziel:el,html:s.html,marke:s.marke,klick:merkeKlick,mobil:mobil,melde:function(n){if(n.wkSchreibEnde){document.body.classList.remove("wk-schreibt");if(schreibt)schreibt.fertig=true;w.element.classList.remove("wk-schreibzone")}p(n)}});
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
  if(d.wkSchreibBeende===true){if(schreibt&&!schreibt.fertig)schreibt.beende();return}
  if(d.wkSchreibVorbei===true){if(schreibt){schreibt.ab();schreibt=null}return}
  if(d.wkZustand&&typeof d.wkZustand==="object"){
    var z=d.wkZustand;
    if(z.modus==="bearbeiten"||z.modus==="ausprobieren")modus=z.modus;
    lesen=z.lesen===true;mobil=z.mobil===true;
    leer=Array.isArray(z.leer)?z.leer.filter(function(n){return typeof n==="number"&&n>=0&&n%1===0}).slice(0,500):[];
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
