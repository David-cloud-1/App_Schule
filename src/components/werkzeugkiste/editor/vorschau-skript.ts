import type { Auswahl } from '@/components/werkzeugkiste/editor/editor-gliederung'

/**
 * Hilfsskript der Editor-Vorschau (PROJ-89, PROJ-96).
 *
 * Die App fügt es erst im Browser in die gebaute Seite ein, nie in die
 * gespeicherte oder veröffentlichte Datei. Es kann:
 *  - zu einer Stelle springen und sie hervorheben (Nachricht `{ wk }` von der App),
 *  - über jedem Thema, Block und der Lernzielkontrolle eine schmale Knopfzeile
 *    zeigen (PROJ-97): „Bearbeiten“ schickt die Sprungmarke an die App zurück
 *    (`{ wkWaehle }`), „+ Darunter“ bzw. „+ Block“ bittet um einen neuen Block an
 *    dieser Stelle (`{ wkEinfuegen }`); Deckblatt und Lernzielkontrolle haben kein „+“,
 *  - den klebenden Seitenkopf der Seite (Titel, Fortschritt, Drucken, Zurücksetzen)
 *    ausblenden: Im Editor verdeckt er nur Inhalt,
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

// Farben: Die Knöpfe stehen auf der Seite und brauchen Kontrast ≥ 4,5 : 1 (dunkles Blau auf Weiß/Beige).
// Die Knopfzeile ist ein eigener Streifen über dem Block (PROJ-97, V4 a): Sie überdeckt nie Inhalt.
const CSS = [
  // Seitenkopf: im Editor ohne Nutzen und verdeckt beim Scrollen Inhalt (`.navi` kommt aus dem Kern)
  '.navi{display:none!important}',
  '.wk-leiste{display:flex;justify-content:flex-end;align-items:center;gap:6px;min-height:32px;margin:0 0 4px;font:600 13px/1 system-ui,sans-serif}',
  '.wk-k,.wk-p{display:inline-flex;align-items:center;gap:6px;min-height:32px;padding:4px 10px;',
  'border:1px solid transparent;border-radius:8px;background:transparent;color:#1e3a8a;font:inherit;cursor:pointer}',
  '.wk-k:hover,.wk-p:hover,.wk-leiste-aktiv .wk-k{border-color:#1e3a8a;background:#fff}',
  '.wk-k:focus-visible,.wk-p:focus-visible{outline:3px solid #2563eb;outline-offset:2px}',
  '.wk-aktiv{outline:3px solid #2563eb!important;outline-offset:3px}',
  '@media (hover:none),(pointer:coarse){.wk-leiste{min-height:44px}.wk-k,.wk-p{min-height:44px;min-width:44px;justify-content:center;border-color:#1e3a8a;background:#fff}}',
  '@media print{.wk-k{display:none!important}.wk-p,.wk-leiste{display:none!important}}',
].join('')

const ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>'

const ICON_PLUS =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M12 5v14M5 12h14"/></svg>'

const SKRIPT_TEXT = String.raw`
(function(){
var MUSTER=${MARKE_KNOPF.toString()};
function finde(m){return document.querySelector('[data-wk="'+String(m).replace(/[^a-z0-9_-]/gi,"")+'"]')}
function markiere(m){var a=document.querySelectorAll(".wk-aktiv,.wk-leiste-aktiv"),i;for(i=0;i<a.length;i++)a[i].classList.remove("wk-aktiv","wk-leiste-aktiv");var e=m?finde(m):null;if(e){e.classList.add("wk-aktiv");var l=e.previousElementSibling;if(l&&l.classList.contains("wk-leiste"))l.classList.add("wk-leiste-aktiv")}return e}
var st=document.createElement("style");st.textContent=${JSON.stringify(CSS)};(document.head||document.documentElement).appendChild(st);
var n=document.querySelectorAll("[data-wk]"),i;
for(i=0;i<n.length;i++){
  var m=n[i].getAttribute("data-wk");
  if(!MUSTER.test(m))continue;
  var z=document.createElement("div");
  z.className="wk-leiste";z.setAttribute("data-wk-leiste",m);
  var t=(n[i].textContent||"").replace(/\s+/g," ").trim().slice(0,60);
  var b=document.createElement("button");
  b.type="button";b.className="wk-k";b.setAttribute("data-wk-knopf",m);
  b.setAttribute("aria-label","Bearbeiten: "+t);
  b.innerHTML=${JSON.stringify(ICON)}+"<span>Bearbeiten</span>";
  z.appendChild(b);
  if(m!=="abschluss"){
    var p=document.createElement("button");
    var th=m.indexOf("-e")<0;
    p.type="button";p.className="wk-p";p.setAttribute("data-wk-plus",m);
    p.setAttribute("aria-label",(th?"Block am Anfang des Themas einfügen: ":"Block darunter einfügen: ")+t);
    p.innerHTML=${JSON.stringify(ICON_PLUS)}+"<span>"+(th?"Block":"Darunter")+"</span>";
    z.appendChild(p);
  }
  n[i].parentNode.insertBefore(z,n[i]);
}
document.addEventListener("click",function(e){
  var c=e.target&&e.target.closest?e.target.closest(".wk-k,.wk-p"):null;
  if(!c)return;
  e.preventDefault();e.stopPropagation();
  if(c.classList.contains("wk-p"))parent.postMessage({wkEinfuegen:c.getAttribute("data-wk-plus")},"*");
  else parent.postMessage({wkWaehle:c.getAttribute("data-wk-knopf")},"*");
},true);
var tick=false;
function lage(){
  tick=false;
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
