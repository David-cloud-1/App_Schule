import { BEDIEN_FARBEN } from '@/components/werkzeugkiste/editor/bedien-design'
import { LOESUNGEN_SICHTBAR } from '@/components/werkzeugkiste/editor/bedien-woerter'

/**
 * Lösungen im Modus „Bearbeiten“ sichtbar (PROJ-116).
 *
 * Jede vom Kern gebaute Seite trägt die Lösungen ihrer Aufgaben im Datenblock `LOESUNGEN`
 * (die Seite prüft ohne Server). Das Hilfsskript der Editor-Vorschau liest ihn und kennzeichnet die
 * richtigen Stellen **nur im Modus „Bearbeiten“**. Der Kern und die gespeicherte Struktur ändern sich nicht;
 * Download, öffentlicher Link, Regal und Druck bekommen das Hilfsskript nie.
 *
 * Es entstehen nur Klassen und Attribute an vorhandenen Elementen (nie neue Knoten, nie `innerHTML`):
 * Die Prüf-Logik und der Text der Aufgabe bleiben unberührt, und beim Wechsel zu „Ausprobieren“ lässt sich alles
 * vollständig zurücknehmen. Was nicht eindeutig zu finden ist, bleibt ohne Kennzeichen („lieber nichts als falsch“).
 */

/** Typen, bei denen die Seite etwas kennzeichnen kann (für den Hinweis in der Kopfzeile) */
export const LOESUNG_TYPEN: readonly string[] = [
  'multiple_choice',
  'single_choice',
  'true_false',
  'fill_blanks',
  'advanced_fill_blanks',
  'drag_words',
  'mark_words',
  'reihenfolge',
  'image_sequencing',
  'drag_drop',
  'single_choice_set',
  'summary',
  'question_set',
  'interactive_video',
]

const F = BEDIEN_FARBEN

/** Nie die Farbe allein: ✓, Unterstreichung, Nummer oder Schild kommen immer dazu. Nur am Bildschirm (nie im Druck). */
export const LOESUNG_CSS =
  '@media screen{' +
  `.wk-lk-ok{box-shadow:inset 0 0 0 3px ${F.loesung};background:${F.loesungGrund}!important;color:${F.loesung}!important}` +
  `.wk-lk-ok::before{content:"\\2713\\00a0";font-weight:800}` +
  `input.wk-lk-feld{border-bottom:3px solid ${F.loesung}!important}` +
  `input.wk-lk-feld::placeholder{color:${F.loesung};opacity:1;font-weight:700;text-decoration:underline}` +
  `.wk-lk-zielwort.leer .wert{display:none}` +
  `.wk-lk-zielwort.leer::after{content:attr(data-wk-loes);color:${F.loesung};font-weight:700;text-decoration:underline}` +
  `.wk-lk-zusatz{font-style:italic}` +
  `.wk-lk-zusatz::after{content:"\\00a0\\2717\\00a0${LOESUNGEN_SICHTBAR.passtNirgends}";margin-left:4px;padding:0 5px;border-radius:6px;background:#fff;color:${F.gefahr};font-size:.8em;font-weight:700}` +
  `.wk-lk-wort{background:${F.loesungGrund}!important;color:${F.loesung}!important;text-decoration:underline 3px ${F.loesung};text-underline-offset:3px}` +
  `.wk-lk-pos::after{content:attr(data-wk-pos);display:inline-block;margin-left:6px;min-width:1.4em;padding:0 5px;border-radius:999px;background:${F.loesung};color:#fff;font-weight:800;font-size:.85em;text-align:center}` +
  `.wk-lk-kat::after{content:"\\00a0\\2192\\00a0" attr(data-wk-kat);margin-left:6px;padding:0 6px;border-radius:6px;background:${F.loesungGrund};color:${F.loesung};font-weight:700;font-size:.85em}` +
  '}' +
  // Im Druck bleibt von den Kennzeichen nichts: auch der Platzhalter im Lückenfeld nicht (er wäre sonst mitgedruckt)
  '@media print{input.wk-lk-feld::placeholder{color:transparent!important;text-decoration:none}}'

/**
 * Das Stück Skript, das in das Hilfsskript der Vorschau gehört (liest `modus` von dort).
 * `lkZeichne()` räumt erst alles weg und zeichnet dann – es darf jederzeit wieder aufgerufen werden.
 */
export const LOESUNG_JS = String.raw`
// ── Lösungen in „Bearbeiten“ kennzeichnen (PROJ-116) ───────────────────
function lkKurz(t,n){return String(t==null?"":t).replace(/\s+/g," ").slice(0,n||60)}
function lkNr(el){var n=Number(el.getAttribute("data-i"));return n%1===0&&n>=0?n:-1}
// Die Spur steht am Element selbst (Attribut data-wk-lk: Klasse und ursprüngliche Werte). Setzt eine Aufgabe ihren Inhalt aus einer
// Abschrift zurück, trägt die Kopie die Spur mit – so räumt lkWeg auch sie vollständig weg (QA PROJ-116, BUG-1).
var LK_ATTR={title:1,placeholder:1,"data-wk-pos":1,"data-wk-kat":1,"data-wk-loes":1};
function lkSetze(el,klasse,attrs){
  if(el.hasAttribute("data-wk-lk"))return;
  var orig={};
  el.classList.add("wk-lk",klasse);
  for(var n in attrs){if(Object.prototype.hasOwnProperty.call(attrs,n)&&LK_ATTR[n]){orig[n]=el.getAttribute(n);el.setAttribute(n,attrs[n])}}
  el.setAttribute("data-wk-lk",JSON.stringify({k:klasse,o:orig}));
}
function lkWeg(wurzel){
  [].slice.call((wurzel||document).querySelectorAll("[data-wk-lk]")).forEach(function(el){
    var r=null;
    try{r=JSON.parse(el.getAttribute("data-wk-lk"))}catch(e){r=null}
    el.removeAttribute("data-wk-lk");
    el.classList.remove("wk-lk");
    if(!r||typeof r!=="object")return;
    if(typeof r.k==="string"&&/^wk-lk-[a-z]+$/.test(r.k))el.classList.remove(r.k);
    var o=r.o&&typeof r.o==="object"?r.o:{};
    for(var n in o){
      if(!Object.prototype.hasOwnProperty.call(o,n)||!LK_ATTR[n])continue;
      if(o[n]===null)el.removeAttribute(n);else if(typeof o[n]==="string")el.setAttribute(n,o[n]);
    }
  });
}
function lkAuswahl(wurzel,richtig){
  // Der Kern prüft genau eine Antwort: gekennzeichnet wird, was die Seite wirklich als richtig prüft
  if(typeof richtig==="number"){
    wurzel.querySelectorAll(".antwort[data-i]").forEach(function(b){if(lkNr(b)===richtig)lkSetze(b,"wk-lk-ok",{title:"Lösung"})});
  }else if(typeof richtig==="string"){
    var treffer=[].filter.call(wurzel.querySelectorAll(".antwort"),function(b){return b.textContent===richtig});
    if(treffer.length===1)lkSetze(treffer[0],"wk-lk-ok",{title:"Lösung"});
  }
}
function lkLuecken(wurzel,loes){
  if(!Array.isArray(loes))return;
  wurzel.querySelectorAll("input.luecke").forEach(function(f){
    var v=loes[lkNr(f)];
    if(!Array.isArray(v)||!v.length||typeof v[0]!=="string")return;
    var alle=v.filter(function(x){return typeof x==="string"}).map(function(x){return lkKurz(x,40)});
    lkSetze(f,"wk-lk-feld",{placeholder:alle[0]+(alle.length>1?" …":""),title:"Lösung: "+alle.join(" / ")});
  });
}
function lkFragen(wurzel,fragen,wahl){
  if(!Array.isArray(fragen))return;
  var bloecke=wurzel.querySelectorAll(wahl);
  fragen.forEach(function(f,n){
    var b=bloecke[n];if(!b||!f||typeof f!=="object")return;
    if(f.typ==="fill_blanks")lkLuecken(b,f.loesungen);
    else lkAuswahl(b,f.richtig);
  });
}
function lkTyp(sec,typ,l){
  if(typ==="multiple_choice"||typ==="single_choice"||typ==="true_false")lkAuswahl(sec,l.richtig);
  else if(typ==="fill_blanks"||typ==="advanced_fill_blanks")lkLuecken(sec,l.loesungen);
  else if(typ==="drag_words"&&Array.isArray(l.woerter)){
    var ziele=sec.querySelectorAll("button.luecke");
    ziele.forEach(function(g){var w=l.woerter[lkNr(g)];if(typeof w==="string"&&w)lkSetze(g,"wk-lk-zielwort",{"data-wk-loes":lkKurz(w,40)})});
    sec.querySelectorAll(".vorrat .chip[data-i]").forEach(function(c){if(lkNr(c)>=ziele.length)lkSetze(c,"wk-lk-zusatz",{title:"Zusatzwort: passt in keine Lücke"})});
  }else if(typ==="mark_words"&&Array.isArray(l.richtige)){
    sec.querySelectorAll(".wort[data-i]").forEach(function(w){if(l.richtige.indexOf(lkNr(w))>=0)lkSetze(w,"wk-lk-wort",{title:"Lösung"})});
  }else if((typ==="reihenfolge"||typ==="image_sequencing")&&Array.isArray(l.reihe)){
    sec.querySelectorAll(".vorrat .chip[data-i]").forEach(function(c){var i=lkNr(c);if(i>=0&&i<l.reihe.length)lkSetze(c,"wk-lk-pos",{"data-wk-pos":String(i+1),title:"Richtige Position: "+(i+1)})});
  }else if(typ==="drag_drop"&&Array.isArray(l.items)){
    sec.querySelectorAll(".vorrat .chip[data-i]").forEach(function(c){
      var it=l.items[lkNr(c)];
      if(it&&typeof it.kategorie==="string"&&it.kategorie)lkSetze(c,"wk-lk-kat",{"data-wk-kat":lkKurz(it.kategorie,40),title:"Gehört zu: "+lkKurz(it.kategorie,40)});
    });
  }else if(typ==="single_choice_set"||typ==="summary")lkFragen(sec,l.fragen,".teilfrage");
  else if(typ==="question_set"||typ==="interactive_video")lkFragen(sec,l.fragen,".quizfrage");
}
function lkZeichne(){
  lkWeg();
  if(modus!=="bearbeiten")return;
  var alle=null;
  try{alle=typeof LOESUNGEN!=="undefined"&&LOESUNGEN&&typeof LOESUNGEN==="object"?LOESUNGEN:null}catch(e){alle=null}
  if(!alle)return;
  document.querySelectorAll("section.aufgabe[data-typ][data-nr]").forEach(function(sec){
    if(sec.closest(".wk-aufgabenzone"))return;
    var l=alle[sec.getAttribute("data-nr")];
    if(!l||typeof l!=="object")return;
    try{lkTyp(sec,sec.getAttribute("data-typ"),l)}catch(e){}
  });
}
`

/**
 * Hat das Material mindestens eine Aufgabe, die die Vorschau kennzeichnen kann? (Themen und Lernzielkontrolle;
 * auch Typen ohne Bauplan wie die Bilder-Reihenfolge zählen.) Danach richtet sich der Hinweis in der Kopfzeile.
 */
export function hatKennzeichenFaehige(struktur: { chapters?: Array<{ elements?: Array<{ type?: unknown }> }>; final_chapter?: Record<string, unknown> }): boolean {
  const imThema = (struktur.chapters ?? []).some((k) => (k.elements ?? []).some((b) => typeof b?.type === 'string' && LOESUNG_TYPEN.includes(b.type)))
  if (imThema) return true
  const a = struktur.final_chapter
  return !!a && ['question_set', 'summary'].some((t) => !!a[t] && typeof a[t] === 'object')
}
