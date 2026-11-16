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
  '.wk-leiste-unten{left:0;right:0;bottom:0;justify-content:space-between;border-radius:12px 12px 0 0;border-width:1px 0 0}',
  `.wk-typ{padding:0 8px;color:${F.textTyp};white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis}`,
  `.wk-b{display:inline-flex;align-items:center;gap:6px;min-height:34px;padding:4px 10px;border:1px solid transparent;border-radius:8px;background:transparent;color:${F.text};font:inherit;cursor:pointer}`,
  `.wk-b:hover{background:#eff6ff;border-color:${F.text}}`,
  '.wk-b:focus-visible{outline:3px solid #2563eb;outline-offset:1px}',
  `.wk-d{color:${F.gefahr}}.wk-d:hover{background:#fef2f2;border-color:${F.gefahr}}`,
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
var modus="bearbeiten",lesen=false,mobil=false,leer=[],auswahl=null,auswahlName="",hoverEl=null,plusZiel=null;
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
var bBearb=knopf("bearbeite",ICON.stift+"<span>Bearbeiten</span>","Bearbeiten");
var bPlus=knopf("einfuegen",ICON.plus+"<span>Darunter</span>","Block darunter einfügen");
var bKopie=knopf("dupliziere",ICON.kopie+"<span>Duplizieren</span>","Block duplizieren");
var bMehr=knopf("menue",ICON.mehr,"Weitere Aktionen");bMehr.setAttribute("aria-haspopup","menu");
var bWeg=knopf("loesche",ICON.papierkorb,"Block löschen","wk-d");
[typ,bBearb,bPlus,bKopie,bMehr,bWeg].forEach(function(x){leiste.appendChild(x)});
document.body.appendChild(leiste);

var plus=neu("div","wk-ui wk-plus");plus.hidden=true;
var plusKnopf=knopf("einfuegen",ICON.plus+"<span>Block</span>","Block hier einfügen");
plus.appendChild(plusKnopf);document.body.appendChild(plus);

function leisteAktualisieren(){
  var art=!auswahl?"":(/-e\d+$/.test(auswahl)?"block":(/^k\d+$/.test(auswahl)?"thema":"sonst"));
  typ.textContent=auswahlName;
  bBearb.hidden=false;
  bPlus.hidden=lesen||(art!=="block"&&art!=="thema");
  bPlus.querySelector("span").textContent=art==="thema"?"Block":"Darunter";
  bPlus.setAttribute("aria-label",art==="thema"?"Block am Anfang des Themas einfügen":"Block darunter einfügen");
  bKopie.hidden=lesen||art!=="block";
  bMehr.hidden=lesen||art!=="block";
  bWeg.hidden=lesen||art!=="block";
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
  if(top<4)top=4;
  if(top>r.bottom-h)top=Math.max(4,r.bottom-h);
  var left=Math.min(Math.max(4,r.right-w),Math.max(4,innerWidth-w-4));
  leiste.style.top=top+"px";leiste.style.left=left+"px";
}
function markiere(m,name){
  var a=document.querySelectorAll(".wk-aktiv"),i;
  for(i=0;i<a.length;i++)a[i].classList.remove("wk-aktiv");
  var e=m?finde(m):null;
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
  if(modus!=="bearbeiten"||lesen||mobil||grob())return;
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
  else if(t==="menue"){var r=a.getBoundingClientRect();p({wkMenue:m,x:Math.round(r.right),y:Math.round(r.bottom)})}
}

// ── Einfrieren: Im Modus „bearbeiten“ bekommt die Seite keine Eingaben ─
var EINFRIEREN=["mousedown","mouseup","pointerdown","pointerup","touchstart","touchend","dblclick","dragstart","drop","keypress","keyup","input","change","submit","auxclick"];
EINFRIEREN.forEach(function(name){
  addEventListener(name,function(e){
    if(modus!=="bearbeiten")return;
    var t=elt(e.target);
    if(!t||!t.closest||t.closest(".wk-ui")||!t.closest("[data-wk]"))return;
    if(name==="touchstart"||name==="touchend"){e.stopImmediatePropagation();return}
    stoppe(e);
  },true);
});
addEventListener("focusin",function(e){
  if(modus!=="bearbeiten")return;
  var t=elt(e.target);
  if(t&&t.closest&&t.closest("[data-wk]")&&!t.closest(".wk-ui")&&t.blur)t.blur();
},true);
addEventListener("click",function(e){
  var t=elt(e.target);
  if(!t)return;
  var a=t.closest?t.closest("[data-wk-aktion]"):null;
  if(a){stoppe(e);if(modus==="bearbeiten")aktion(a);return}
  if(modus!=="bearbeiten")return;
  if(t.closest&&t.closest(".wk-ui")){stoppe(e);return}
  stoppe(e);
  var m=markeVon(t);
  if(!m){p({wkAbwaehle:true});return}
  if(e.detail>=2)p({wkBearbeite:m});else p({wkWaehle:m});
},true);

// ── Tastatur: nur vereinbarte Kürzel gehen an die App ─────────────────
function weitergabe(e){
  var k=e.key,kl=k&&k.length===1?k.toLowerCase():k,mod=e.metaKey||e.ctrlKey;
  var t=elt(e.target),feld=istFeld(t),knopfZiel=t&&t.closest&&t.closest("button,a,summary");
  var ok=false;
  if(modus==="ausprobieren"){
    ok=(mod&&!e.altKey&&kl==="e")||(mod&&kl==="z"&&!feld);
  }else{
    var inBlock=!!(t&&t.closest&&t.closest("[data-wk]"));
    if(feld&&!inBlock)return false;
    if((kl==="ArrowUp"||kl==="ArrowDown")&&!mod&&!e.altKey)ok=!!auswahl;
    else if(kl==="Enter"&&!mod&&!e.altKey&&!e.shiftKey)ok=!!auswahl&&!knopfZiel;
    else if((kl==="Delete"||kl==="Backspace")&&!mod&&!e.altKey)ok=!!auswahl;
    else if(kl==="Escape")ok=true;
    else if(mod&&!e.altKey&&(kl==="d"||kl==="e"||kl==="z"))ok=true;
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
  if(modus!=="bearbeiten"){plus.hidden=true;if(hoverEl){hoverEl.classList.remove("wk-hover");hoverEl=null}}
  baueEinfuegestellen();leisteAktualisieren();plaziere();
}

// ── Nachrichten der App ──────────────────────────────────────────────
addEventListener("message",function(e){
  if(e.source!==parent)return;
  var d=e.data;
  if(!d||typeof d!=="object")return;
  if(d.wkZustand&&typeof d.wkZustand==="object"){
    var z=d.wkZustand;
    if(z.modus==="bearbeiten"||z.modus==="ausprobieren")modus=z.modus;
    lesen=z.lesen===true;mobil=z.mobil===true;
    leer=Array.isArray(z.leer)?z.leer.filter(function(n){return typeof n==="number"&&n>=0&&n%1===0}).slice(0,500):[];
    anwenden();
    return;
  }
  if(d.wk!==null&&typeof d.wk!=="string")return;
  var x=markiere(d.wk,d.name);
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
