import type { Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'

/**
 * Hilfsskript der Editor-Vorschau (PROJ-89, PROJ-96).
 *
 * Die App fügt es erst im Browser in die gebaute Seite ein, nie in die
 * gespeicherte oder veröffentlichte Datei. Es kann:
 *  - zu einer Stelle springen und sie hervorheben (Nachricht `{ wk }` von der App),
 *  - an jedem Thema, Block und an der Lernzielkontrolle einen „Bearbeiten“-Knopf
 *    zeigen, der die Sprungmarke an die App zurückschickt (`{ wkWaehle }`),
 *  - die Scrollposition melden (`{ wkScroll }`), damit sie nach einem Neubau
 *    wiederhergestellt wird, und melden, dass es bereit ist (`{ wkBereit }`).
 *
 * Die Seite läuft abgeschottet (kein `allow-same-origin`): Nur Text-Nachrichten
 * gehen hin und her, und beide Seiten prüfen den Absender.
 */

/** Gültige Marke: Thema (k0), Block (k0-e3) oder Lernzielkontrolle (abschluss) */
const MARKE_KNOPF = /^(k\d+(-e\d+)?|abschluss)$/
/** Marken, die die App aus dem Rahmen annimmt – auch Teile der Lernzielkontrolle */
const MARKE_ANNAHME = /^(k\d+(-e\d+)?|abschluss(-[a-z_]+)?)$/

/** Aus der Marke aus der Vorschau wird eine Auswahl im Editor; alles Fremde ergibt null */
export function auswahlAusMarke(marke: unknown): Auswahl {
  if (typeof marke !== 'string' || marke.length > 40 || !MARKE_ANNAHME.test(marke)) return null
  if (marke.startsWith('abschluss')) return { art: 'abschluss' }
  const m = /^k(\d+)(?:-e(\d+))?$/.exec(marke)
  if (!m) return null
  return m[2] === undefined ? { art: 'thema', thema: Number(m[1]) } : { art: 'block', thema: Number(m[1]), block: Number(m[2]) }
}

// Farben: Die Knöpfe stehen auf der weißen Seite und brauchen Kontrast ≥ 4,5 : 1
const CSS = [
  '.wk-k{position:absolute;top:8px;right:8px;z-index:50;display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:4px 10px;',
  'border:1px solid #1e3a8a;border-radius:8px;background:#fff;color:#1e3a8a;font:600 13px/1 system-ui,sans-serif;cursor:pointer;',
  'box-shadow:0 1px 3px rgba(0,0,0,.2);opacity:0;transition:opacity .2s ease-out}',
  '[data-wk]:hover>.wk-k,.wk-k:focus,.wk-aktiv>.wk-k{opacity:1}',
  // Aufgaben: Der Knopf sitzt in der Kopfzeile neben „Aufgabe n“ und lässt „gelöst“ (rechts) frei
  '.aufgabe>.wk-k{right:110px;top:2px}',
  '.wk-k:focus-visible{outline:3px solid #2563eb;outline-offset:2px}',
  '.wk-aktiv{outline:3px solid #2563eb!important;outline-offset:3px}',
  '@media (hover:none),(pointer:coarse){.wk-k{opacity:1;min-height:44px;min-width:44px;justify-content:center}}',
  '@media (prefers-reduced-motion:reduce){.wk-k{transition:none}}',
  '@media print{.wk-k{display:none!important}.wk-aktiv{outline:none!important}}',
].join('')

const ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'

const SKRIPT_TEXT = String.raw`
(function(){
var MUSTER=${MARKE_KNOPF.toString()};
function finde(m){return document.querySelector('[data-wk="'+String(m).replace(/[^a-z0-9_-]/gi,"")+'"]')}
function markiere(m){var a=document.querySelectorAll(".wk-aktiv"),i;for(i=0;i<a.length;i++)a[i].classList.remove("wk-aktiv");var e=m?finde(m):null;if(e)e.classList.add("wk-aktiv");return e}
var st=document.createElement("style");st.textContent=${JSON.stringify(CSS)};(document.head||document.documentElement).appendChild(st);
var n=document.querySelectorAll("[data-wk]"),i;
for(i=0;i<n.length;i++){
  var m=n[i].getAttribute("data-wk");
  if(!MUSTER.test(m))continue;
  if(getComputedStyle(n[i]).position==="static")n[i].style.position="relative";
  var b=document.createElement("button");
  b.type="button";b.className="wk-k";b.setAttribute("data-wk-knopf",m);
  b.setAttribute("aria-label","Bearbeiten: "+(n[i].textContent||"").replace(/\s+/g," ").trim().slice(0,60));
  b.innerHTML=${JSON.stringify(ICON)}+"<span>Bearbeiten</span>";
  n[i].appendChild(b);
}
document.addEventListener("click",function(e){
  var t=e.target&&e.target.closest?e.target.closest(".wk-k"):null;
  if(!t)return;
  e.preventDefault();e.stopPropagation();
  parent.postMessage({wkWaehle:t.getAttribute("data-wk-knopf")},"*");
},true);
var tick=false;
function lage(){
  tick=false;
  var k=document.querySelectorAll(".wk-k"),j,r;
  for(j=0;j<k.length;j++){
    r=k[j].parentNode.getBoundingClientRect();
    if(r.bottom<0||r.top>innerHeight)continue;
    var o=k[j].parentNode.classList.contains("aufgabe")?2:8;
    k[j].style.top=Math.max(o,Math.min(o-r.top,r.height-48))+"px";
  }
  parent.postMessage({wkScroll:Math.round(scrollY)},"*");
}
addEventListener("scroll",function(){if(!tick){tick=true;requestAnimationFrame(lage)}},{passive:true});
addEventListener("message",function(e){
  if(e.source!==parent)return;
  var d=e.data;
  if(!d||typeof d!=="object")return;
  if(d.wk!==null&&typeof d.wk!=="string")return;
  var x=markiere(d.wk);
  if(typeof d.scrollY==="number"){scrollTo({top:d.scrollY,behavior:"instant"});return}
  if(x){
    var r=x.getBoundingClientRect();
    if(!d.still||r.bottom<40||r.top>innerHeight-80)x.scrollIntoView({block:"start",behavior:"smooth"});
  }
});
parent.postMessage({wkBereit:true},"*");
})();
`

export const SPRUNG_SKRIPT = `<script>${SKRIPT_TEXT}</script>`

/** Fügt das Hilfsskript vor `</body>` ein (oder ans Ende, wenn es kein `</body>` gibt) */
export function mitSprungSkript(html: string): string {
  const i = html.lastIndexOf('</body>')
  return i >= 0 ? html.slice(0, i) + SPRUNG_SKRIPT + html.slice(i) : html + SPRUNG_SKRIPT
}
