// Der Untergrund der Welt: Wiese, Acker, Wald, Wasser, Ortschaft, Pflaster –
// und darüber das Wegenetz vom Feldweg bis zur Autobahn.
//
// Warum nicht einfach ein Farbverlauf pro Kachel? Weil der Boden mehr Fläche
// einnimmt als alle Gebäude zusammen. Eine Karte wirkt genau so lieblos wie ihr
// Untergrund: Gras braucht Büschel, ein Acker braucht Furchen, eine Straße
// braucht Bordstein und Markierung. Erst dann sieht man eine Landschaft statt
// eines Rautenmusters.
//
// Jede Kachel ist ein SVG-Fragment im Kachelraum (99 × 50 px, Raute als Clip).
// Für die große Karte werden die Fragmente in gelaende.ts zu Kachelblöcken
// zusammengesetzt – 1.600 einzelne Bildchen ins DOM zu hängen, hält kein Handy
// aus. `bodenUrl` liefert daneben weiterhin die Einzelkachel; die
// Regionsansicht zeigt fremde Höfe in Briefmarkengröße und kommt damit aus.

import { TILE_W, TILE_H, ton } from "./iso";
import { P } from "./palette";
import type { Ortsart, Ortsrolle, WegTyp } from "./karte";

const W = TILE_W;
const H = TILE_H;
const MX = W / 2;
const MY = H / 2;

/** Punkt in Kachel-Koordinaten (u,v je -0.5 … 0.5) → SVG-Koordinate. */
const p = (u: number, v: number): string => `${r(MX + (u - v) * MX)},${r(MY + (u + v) * MY)}`;
const r = (n: number): number => Math.round(n * 10) / 10;

/** Die Kachelraute als Pfad – Silhouette und Clip zugleich. */
export const RAUTE = `${p(-0.5, -0.5)} ${p(0.5, -0.5)} ${p(0.5, 0.5)} ${p(-0.5, 0.5)}`;

const flaeche = (u0: number, v0: number, u1: number, v1: number, fill: string, extra = ""): string =>
  `<polygon points="${p(u0, v0)} ${p(u1, v0)} ${p(u1, v1)} ${p(u0, v1)}" fill="${fill}"${extra}/>`;

// --- Kanten und Nachbarn ----------------------------------------------------
//
// Bis hierher kannte jede Kachel nur sich selbst. Das reicht für ein Raster,
// aber nicht für eine Landschaft: Ein Fluss stößt dann stumpf gegen die Wiese,
// der Wald hört an einer geraden Linie auf, und der Acker beginnt mit einem
// Farbsprung. In der Natur gibt es zwischen zwei Flächen immer einen Saum –
// Uferschilf, Waldrand, Feldrain. Diese Säume liegen auf der Kachel, die an den
// Nachbarn grenzt, und brauchen deshalb dessen Bodenart.

/** Die vier Kanten einer Kachel, benannt nach dem Nachbarn dahinter. */
export type Kante = "xp" | "xm" | "yp" | "ym";
export const KANTEN: Kante[] = ["xp", "xm", "yp", "ym"];

/** Bodenart der vier direkten Nachbarn. */
export type Nachbarschaft = Partial<Record<Kante, BodenTyp>>;

/** Streifen entlang einer Kachelkante, `tiefe` misst nach innen. */
function saumFlaeche(kante: Kante, tiefe: number, fill: string, extra = ""): string {
  switch (kante) {
    case "xp":
      return flaeche(0.5 - tiefe, -0.5, 0.5, 0.5, fill, extra);
    case "xm":
      return flaeche(-0.5, -0.5, -0.5 + tiefe, 0.5, fill, extra);
    case "yp":
      return flaeche(-0.5, 0.5 - tiefe, 0.5, 0.5, fill, extra);
    default:
      return flaeche(-0.5, -0.5, 0.5, -0.5 + tiefe, fill, extra);
  }
}

/** Punkte längs einer Kante, `tiefe` misst den Abstand von der Kante nach innen. */
function kantenPunkte(kante: Kante, anzahl: number, tiefe: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < anzahl; i++) {
    const t = -0.42 + (0.84 * i) / Math.max(1, anzahl - 1);
    switch (kante) {
      case "xp":
        out.push([0.5 - tiefe, t]);
        break;
      case "xm":
        out.push([-0.5 + tiefe, t]);
        break;
      case "yp":
        out.push([t, 0.5 - tiefe]);
        break;
      default:
        out.push([t, -0.5 + tiefe]);
    }
  }
  return out;
}

/**
 * SVG → data-URI, die gefahrlos in einem CSS-`url('…')` innerhalb eines
 * HTML-`style`-Attributs stehen darf.
 *
 * `encodeURIComponent` allein reicht dafür nicht: Es lässt Apostroph und runde
 * Klammern unberührt – beides würde das CSS-`url()` beenden. Doppelte
 * Anführungszeichen werden ohnehin kodiert; nur deshalb funktioniert das
 * umgebende Attribut.
 */
export function datenUri(svg: string): string {
  const roh = encodeURIComponent(svg).replace(
    /[()']/g,
    (c) => `%${c.charCodeAt(0).toString(16)}`,
  );
  return `data:image/svg+xml,${roh}`;
}

function kachel(inhalt: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><clipPath id="c"><polygon points="${RAUTE}"/></clipPath></defs>` +
    `<g clip-path="url(#c)">${inhalt}</g></svg>`;
  return datenUri(svg);
}

// --- Gras -------------------------------------------------------------------

/**
 * Grasbüschel: kleine, feste Punktmuster. Bewusst nicht zufällig erzeugt – vier
 * feste Muster reichen für ein lebendiges Bild und bleiben über Neuaufbauten der
 * Karte hinweg identisch (sonst würde das Gras bei jedem Render zappeln).
 *
 * Warum vier und nicht zwei: Bei zwei Mustern, im Schachbrett verteilt, sieht
 * man auf einer großen Wiese genau das – ein Schachbrett. Erst ab vier Mustern,
 * die aus dem Streuwert der Kachel gezogen werden, verschwindet das Raster.
 */
// Büschelstellen je Kachel.
//
// Fünf Büschel auf einer 99 × 50 px großen Kachel ließen zwischen sich große
// glatte Flächen – aus der Nähe sah die Weide aus wie gestrichenes Papier mit
// ein paar Zeichen darauf. Neun Stellen je Satz füllen die Fläche, ohne sie
// zuzukleistern; zusammen mit der Streuung in `halme` ergibt das Grasnarbe
// statt Muster.
const BUESCHEL: [number, number][][] = [
  [
    [-0.28, -0.16], [0.05, -0.3], [0.24, 0.1], [-0.1, 0.26], [0.32, -0.12],
    [-0.34, 0.06], [0.14, -0.08], [-0.02, 0.1], [0.3, 0.3],
  ],
  [
    [-0.18, 0.3], [0.18, -0.24], [-0.32, 0.02], [0.3, 0.28], [0.0, 0.04],
    [0.1, 0.18], [-0.24, -0.28], [0.34, -0.04], [-0.08, -0.14],
  ],
  [
    [-0.06, -0.34], [-0.3, 0.18], [0.12, 0.32], [0.34, -0.02], [0.02, -0.1],
    [-0.16, 0.04], [0.22, 0.14], [-0.3, -0.1], [0.06, 0.22],
  ],
  [
    [0.08, -0.28], [-0.26, -0.04], [0.28, 0.04], [-0.04, 0.3], [0.18, 0.24],
    [-0.34, 0.24], [0.34, -0.2], [-0.12, -0.18], [0.0, 0.08],
  ],
];

/**
 * Grüntöne für die Wiese – Grünland ist nie einfarbig.
 *
 * WARUM DIE SPREIZUNG GRÖSSER WURDE: Die vier ursprünglichen Töne lagen alle
 * dicht beieinander (Helligkeit 56–62 %). Nebeneinander gelegt war der
 * Unterschied kaum zu sehen, und die Flur wirkte wie eine einzige riesige
 * Rasenfläche mit eingezeichneten Grenzen. In Wirklichkeit steht auf einem
 * Schlag frisch gemähtes Gras, auf dem nächsten hohes Futtergras und daneben
 * eine abgeweidete Koppel – und genau dieser Wechsel macht aus Fläche eine
 * Landschaft. Jeder Ton bleibt in derselben Farbfamilie; gespreizt wird nur
 * die Helligkeit, sonst zerfällt die Wiese in bunte Flecken.
 */
const GRAS_TOENE = [
  P.gras,
  P.grasDunkel,
  "#8ecb60", // frisch gemäht: heller und gelblicher
  "#5d9f45", // hohes Futtergras: satt und dunkel
  "#84c55b",
  "#6cae4c",
] as const;

/**
 * Ein Grasbüschel.
 *
 * WARUM DAS HIER STREUUNG BRAUCHT: Die erste Fassung malte immer dasselbe
 * Zeichen – drei Striche, gleiche Länge, gleiche Neigung, gleiche Farbe, an
 * festen Stellen jeder Kachel. Aus der Nähe betrachtet ist eine so bewachsene
 * Wiese kein Grünland, sondern ein TAPETENMUSTER: Das Auge erkennt sofort die
 * Wiederholung und damit auch das Kachelraster darunter. Echtes Gras wächst
 * ungleich hoch, neigt sich verschieden und hat mehrere Grüntöne nebeneinander.
 *
 * Die Streuung wird aus der Position gerechnet, nicht gewürfelt – dieselbe
 * Stelle sieht damit bei jedem Neuzeichnen gleich aus.
 */
const halme = (u: number, v: number, farbe: string, groesse = 1): string => {
  const [x, y] = [MX + (u - v) * MX, MY + (u + v) * MY];
  // Zwei unabhängige Streuwerte aus der Lage: einer für die Form, einer für Ton.
  const h1 = Math.abs(Math.sin((u * 37.7 + v * 19.3) * 12.9898) * 43758.5453) % 1;
  const h2 = Math.abs(Math.sin((u * 11.1 + v * 71.7) * 78.233) * 12345.678) % 1;
  const g = groesse * (0.6 + h1 * 0.52);
  // Neigung: Gras steht selten senkrecht.
  const kipp = (h2 - 0.5) * 2.6;
  // Der Ton wandert zwischen dem hellen Büschelgrün und einem satteren Grün –
  // nebeneinander ergibt das die Tiefe, die eine einfarbige Wiese nie bekommt.
  // Die Tonspreizung bleibt eng. Ein erster Versuch mit 0.86 ergab olivgrüne
  // Büschel, die auf der hellen Weide wie vertrocknete Flecken lagen – bei
  // neun Büscheln je Kachel wirkte die Wiese dadurch schmutzig statt bewachsen.
  const c = h2 > 0.62 ? ton(farbe, 0.94) : h2 < 0.24 ? ton(farbe, 1.08) : farbe;
  const halm = (dx: number, dy: number): string =>
    `M ${r(x)} ${r(y)} l ${r(dx * g + kipp)} ${r(dy * g)}`;
  // Mal drei, mal fünf Halme: schon dieser Wechsel bricht das Muster auf.
  const d =
    h1 > 0.55
      ? `${halm(-3.1, -4.2)} ${halm(-1.1, -5.8)} ${halm(0.9, -6.2)} ${halm(2.6, -5)} ${halm(3.8, -3.2)}`
      : `${halm(-2.5, -4.5)} ${halm(0, -5.5)} ${halm(2.5, -4.5)}`;
  return (
    `<path d="${d}" stroke="${c}" stroke-width="${r(1.35 * g)}" stroke-linecap="round" fill="none"/>`
  );
};

/**
 * Eine kleine Blume mit Stiel.
 *
 * Vorher waren Blüten nackte Kreise – aus der Nähe Konfetti auf grünem Papier.
 * Ein Stiel und drei Blütenblätter kosten drei Pfade mehr und machen daraus
 * etwas, das auf der Wiese gewachsen ist.
 */
const blume = (u: number, v: number, farbe: string, groesse = 1): string => {
  const [x, y] = [MX + (u - v) * MX, MY + (u + v) * MY];
  const g = groesse;
  const kopf = y - 5.4 * g;
  let s = `<path d="M ${r(x)} ${r(y)} q ${r(0.8 * g)} ${r(-2.8 * g)} 0 ${r(-5 * g)}" stroke="#5f9a46" stroke-width="${r(1 * g)}" fill="none" stroke-linecap="round"/>`;
  for (const [dx, dy] of [[-1.7, -0.5], [1.7, -0.5], [0, -2], [0, 1.1]] as const) {
    s += `<circle cx="${r(x + dx * g)}" cy="${r(kopf + dy * g)}" r="${r(1.5 * g)}" fill="${farbe}"/>`;
  }
  s += `<circle cx="${r(x)}" cy="${r(kopf)}" r="${r(1.1 * g)}" fill="#f7e07a"/>`;
  return s;
};

/**
 * Ein Heckenbusch – die kleinste Form von Gehölz auf einem Feldrain.
 *
 * Drei Kugeln mit dem Lichteinfall der Welt und ein weicher Bodenschatten.
 * Bewusst kleiner als der Einzelbusch auf der Weide: Eine Hecke ist eine
 * durchlaufende Linie, kein Beet, und ihre einzelnen Sträucher dürfen sich
 * nicht in den Vordergrund drängen.
 */
const heckenbusch = (u: number, v: number): string => {
  const [x, y] = [MX + (u - v) * MX, MY + (u + v) * MY];
  const h = Math.abs(Math.sin((u * 23.1 + v * 47.3) * 12.9898) * 43758.5453) % 1;
  const g = 0.82 + h * 0.42;
  return (
    `<ellipse cx="${r(x + 1.5)}" cy="${r(y + 1)}" rx="${r(7 * g)}" ry="${r(2.8 * g)}" fill="#2c3f52" opacity="0.18"/>` +
    `<circle cx="${r(x + 2.8 * g)}" cy="${r(y - 3.2 * g)}" r="${r(3.6 * g)}" fill="${P.laubTief}"/>` +
    `<circle cx="${r(x - 2.8 * g)}" cy="${r(y - 3.4 * g)}" r="${r(3.8 * g)}" fill="${P.laub}"/>` +
    `<circle cx="${r(x)}" cy="${r(y - 5.4 * g)}" r="${r(4 * g)}" fill="${P.laubHell}"/>`
  );
};

/**
 * Wiese. Der Grundton kommt aus dem Streuwert, dazu ein Lichtkeil zur Sonne hin
 * und Kleinkram: Blüten, Lesesteine, ein Busch. Nichts davon ist Spielmechanik –
 * aber die Wiese ist der häufigste Anblick des Spiels, und was man am längsten
 * ansieht, verdient die meiste Sorgfalt.
 */
function gras(streu: number, feld: number): string {
  // Der Grundton gehört der Weide, nicht der einzelnen Kachel – sonst zerfällt
  // die Wiese in ein Karo aus vier Grüntönen. Die Kachel steuert nur die
  // Büschel, Blüten und Steine bei.
  const basis = GRAS_TOENE[feld % GRAS_TOENE.length]!;
  let s = flaeche(-0.5, -0.5, 0.5, 0.5, basis);
  // KEIN Lichtkeil je Kachel mehr.
  //
  // Er sollte die Sonnenrichtung andeuten, war aber ein Dreieck, das an der
  // Kachelgrenze endet – und weil jede Kachel dasselbe Dreieck bekam, zeichnete
  // er in Wahrheit das RASTER nach. Auf einer großen Weide sah man dadurch das
  // Gitter aus Rauten durch das Gras schimmern. Die Sonnenrichtung liefern
  // inzwischen zwei Ebenen, die das gar nicht können: die Geländeschattierung
  // (`reliefTon`, an den Kachelecken abgegriffen) und das Sonnenlicht über der
  // ganzen Karte (`.stage-basis::before`).
  // Ein zweiter, größerer Grasfleck: Grünland wächst nicht gleichmäßig.
  if (streu % 3 === 0) {
    const fu = -0.2 + ((streu >> 3) % 4) * 0.12;
    const fv = -0.2 + ((streu >> 5) % 4) * 0.12;
    const [fx, fy] = [MX + (fu - fv) * MX, MY + (fu + fv) * MY];
    s += `<ellipse cx="${r(fx)}" cy="${r(fy)}" rx="22" ry="11" fill="${ton(basis, 1.07)}" opacity="0.5"/>`;
  }
  for (const [u, v] of BUESCHEL[streu % BUESCHEL.length]!) {
    s += halme(u, v, ton(P.grasBuschel, 1.02));
  }
  // Blütenhorst.
  //
  // WARUM DAVON MEHR NÖTIG WAR: Ursprünglich lag auf jeder siebten Kachel ein
  // Horst aus vier winzigen Punkten – "mehr braucht eine Wiese aus 30 m Höhe
  // nicht". Im direkten Vergleich mit den Vorbildern ist genau das der
  // Unterschied: Dort ist JEDER Fleck belegt, und die Fläche lebt von der
  // Dichte des Kleinkrams, nicht von der Grundfarbe. Eine leere Wiese liest
  // sich als unbespielter Hintergrund, eine bewachsene als Landschaft.
  if (streu % 3 === 0) {
    const bu = -0.24 + ((streu >> 2) % 5) * 0.11;
    const bv = -0.22 + ((streu >> 6) % 5) * 0.1;
    const farbe = ["#f7f3e0", "#f6d76a", "#e8b7d4"][streu % 3]!;
    for (const [du, dv] of [
      [0, 0],
      [0.06, 0.03],
      [-0.04, 0.05],
      [0.03, -0.05],
    ] as const) {
      s += blume(bu + du, bv + dv, farbe, 0.95);
    }
  }
  // Ein zweiter Horst in anderer Farbe, versetzt: Zwei Farbtupfer auf einer
  // Kachel wirken wie bewachsenes Grünland, einer wirkt wie ein Fleck.
  if (streu % 4 === 1) {
    const bu = -0.1 + ((streu >> 3) % 4) * 0.12;
    const bv = 0.04 + ((streu >> 7) % 4) * 0.1;
    const farbe = ["#ead96b", "#e3e8f0", "#d9a8dd"][(streu >> 2) % 3]!;
    for (const [du, dv] of [
      [0, 0],
      [0.05, 0.04],
      [-0.05, 0.02],
    ] as const) {
      s += blume(bu + du, bv + dv, farbe, 0.82);
    }
  }
  // Lesesteine am Feldrain.
  if (streu % 6 === 3) {
    const su = 0.1 + ((streu >> 4) % 3) * 0.1;
    const sv = -0.3 + ((streu >> 7) % 5) * 0.12;
    const [sx, sy] = [MX + (su - sv) * MX, MY + (su + sv) * MY];
    s += `<ellipse cx="${r(sx)}" cy="${r(sy)}" rx="4.5" ry="2.6" fill="#a8a396"/>`;
    s += `<ellipse cx="${r(sx - 1)}" cy="${r(sy - 1.1)}" rx="3.6" ry="1.9" fill="#c2bdaf"/>`;
    s += `<ellipse cx="${r(sx + 6)}" cy="${r(sy + 2)}" rx="2.6" ry="1.5" fill="#b3aea0"/>`;
  }
  // Einzelner Busch – die kleinste Form von Gehölz, unter der Größe eines Baums.
  if (streu % 5 === 2) {
    const gu = -0.3 + ((streu >> 8) % 6) * 0.11;
    const gv = 0.06 + ((streu >> 3) % 3) * 0.11;
    const [gx, gy] = [MX + (gu - gv) * MX, MY + (gu + gv) * MY];
    s += `<ellipse cx="${r(gx + 2)}" cy="${r(gy + 1.5)}" rx="8" ry="4" fill="${P.dunkel}" opacity="0.18"/>`;
    s += `<ellipse cx="${r(gx)}" cy="${r(gy - 2)}" rx="7.5" ry="5.5" fill="${P.laub}"/>`;
    s += `<ellipse cx="${r(gx - 2)}" cy="${r(gy - 4)}" rx="4.5" ry="3.4" fill="${P.laubHell}"/>`;
  }
  return s;
}

// --- Acker ------------------------------------------------------------------
//
// Landwirtschaft ist der häufigste Anblick zwischen zwei Gewerbegebieten. Der
// Acker macht die Landschaft lesbar: Wo Furchen liegen, ist kein Bauland – wer
// hier baut, versiegelt und braucht eine Ausgleichsfläche.

/**
 * Fünf Kulturen statt vier Brauntöne. Ein Landkreis, auf dem alles gleich
 * aussieht, ist bestellt von einem einzigen Bauern mit einer einzigen Frucht;
 * echte Feldflur ist ein Flickenteppich aus Getreide, Grünfutter, Raps,
 * frisch gepflügtem Acker und abgeerntetem Stoppelfeld. Die Kultur hängt am
 * Streuwert des Schlags, nicht an der Einzelkachel – ein Feld trägt eine Frucht.
 */
interface Kultur {
  basis: string;
  furche: number;
  /** Aufsatz auf der Fläche: Ähren, Reihen, Blüten */
  aufsatz: "aehren" | "reihen" | "bluete" | "schollen" | "stoppel";
}

const KULTUREN: Kultur[] = [
  { basis: "#d8b45c", furche: 0.9, aufsatz: "aehren" }, // reifes Getreide
  { basis: "#8fb257", furche: 0.9, aufsatz: "reihen" }, // Grünfutter, Mais jung
  { basis: "#d9c94e", furche: 0.94, aufsatz: "bluete" }, // Raps in Blüte
  { basis: "#8a6d4a", furche: 0.86, aufsatz: "schollen" }, // frisch gepflügt
  { basis: "#cfc08a", furche: 0.93, aufsatz: "stoppel" }, // abgeerntet
];

function acker(variante: 0 | 1, streu: number, feld: number): string {
  // Frucht und Furchenrichtung gehören dem Schlag, nicht der Einzelkachel.
  const kultur = KULTUREN[feld % KULTUREN.length]!;
  const basis = ton(kultur.basis, variante === 0 ? 1 : 0.97);
  let s = flaeche(-0.5, -0.5, 0.5, 0.5, basis);
  // Furchen laufen je nach Schlag in u- oder v-Richtung.
  const entlangU = feld % 2 === 0;
  const furche = ton(basis, kultur.furche);
  const streifen = (t: number, dicke: number, fill: string, extra = ""): string =>
    entlangU
      ? flaeche(-0.5, t, 0.5, t + dicke, fill, extra)
      : flaeche(t, -0.5, t + dicke, 0.5, fill, extra);

  for (let i = -4; i <= 4; i++) {
    const t = i * 0.11;
    s += streifen(t, 0.035, furche, ` opacity="0.7"`);
    // Lichtkante an der Furche: eine Ackerscholle hat zwei Seiten, eine im
    // Licht und eine im Schatten. Erst damit bekommt das Feld Struktur. Jede
    // zweite genügt – der Eindruck bleibt, die halbe Zeichenlast entfällt.
    if (i % 2 === 0) s += streifen(t + 0.035, 0.018, ton(basis, 1.08), ` opacity="0.45"`);
  }

  if (kultur.aufsatz === "bluete") {
    // Rapsblüte: dichte helle Tupfen über der ganzen Fläche.
    for (let i = 0; i < 14; i++) {
      const bu = -0.42 + ((streu * (i + 3)) % 17) * 0.05;
      const bv = -0.42 + ((streu * (i + 7)) % 19) * 0.045;
      const [bx, by] = [MX + (bu - bv) * MX, MY + (bu + bv) * MY];
      s += `<circle cx="${r(bx)}" cy="${r(by)}" r="1.8" fill="#f2e05e" opacity="0.75"/>`;
    }
  } else if (kultur.aufsatz === "schollen") {
    // Gepflügt: unregelmäßige dunkle Erdbrocken quer zur Furche.
    for (let i = 0; i < 9; i++) {
      const bu = -0.4 + ((streu * (i + 2)) % 13) * 0.065;
      const bv = -0.4 + ((streu * (i + 5)) % 11) * 0.075;
      const [bx, by] = [MX + (bu - bv) * MX, MY + (bu + bv) * MY];
      s += `<ellipse cx="${r(bx)}" cy="${r(by)}" rx="4" ry="2" fill="${ton(basis, 0.82)}" opacity="0.6"/>`;
    }
  } else if (kultur.aufsatz === "stoppel" && streu % 3 === 0) {
    // Rundballen auf dem abgeernteten Schlag – das Bild des Spätsommers.
    for (const [bu, bv] of [
      [-0.18, -0.1],
      [0.14, 0.2],
    ] as const) {
      const [bx, by] = [MX + (bu - bv) * MX, MY + (bu + bv) * MY];
      s += `<ellipse cx="${r(bx + 1.5)}" cy="${r(by + 2)}" rx="7" ry="3.4" fill="${P.dunkel}" opacity="0.16"/>`;
      s += `<ellipse cx="${r(bx)}" cy="${r(by - 3)}" rx="6" ry="5.2" fill="#e0cd8e"/>`;
      s += `<ellipse cx="${r(bx - 1.4)}" cy="${r(by - 4.4)}" rx="3.4" ry="2.8" fill="#efe0ab"/>`;
    }
  }
  return s;
}

// --- Wald -------------------------------------------------------------------
//
// Der Wald ist Bodentyp, nicht Einzelbaum: Ein geschlossener Bestand aus
// tausend Baum-Sprites würde die Karte erschlagen. Gezeichnet werden dichte
// Kronen als Kachelmuster, Einzelbäume stehen nur am Rand und auf der Wiese.

function wald(variante: 0 | 1, streu = 0): string {
  let s = flaeche(-0.5, -0.5, 0.5, 0.5, P.laubTief);
  // Nadelholz-Einschlag: Jeder dritte Bestand ist dunkler und blaustichiger.
  // Ein Forst aus einer einzigen Baumart über 40 Kacheln sieht gedruckt aus.
  const nadel = streu % 3 === 0;
  const kronen: [number, number, number][] =
    variante === 0
      ? [
          [-0.24, -0.2, 15],
          [0.16, -0.26, 13],
          [0.28, 0.14, 14],
          [-0.12, 0.22, 16],
          [-0.34, 0.06, 11],
          [0.02, -0.02, 12],
        ]
      : [
          [-0.3, 0.1, 14],
          [0.06, -0.3, 15],
          [0.3, -0.06, 12],
          [-0.06, 0.28, 13],
          [0.18, 0.28, 11],
          [-0.18, -0.1, 16],
        ];
  const tief = nadel ? "#265b3f" : P.laubTief;
  const mitte = nadel ? "#357a4f" : P.laub;
  const hell = nadel ? "#4a9560" : P.laubHell;
  for (const [u, v, groesse] of kronen) {
    const x = MX + (u - v) * MX;
    const y = MY + (u + v) * MY;
    // Schlagschatten der Krone auf den Bestand darunter – ohne ihn sieht ein
    // Wald aus wie grüne Kreise auf grünem Grund.
    s += `<ellipse cx="${r(x + 3)}" cy="${r(y + 3)}" rx="${groesse}" ry="${r(groesse * 0.62)}" fill="${tief}" opacity="0.8"/>`;
    s += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${groesse}" ry="${r(groesse * 0.6)}" fill="${mitte}"/>`;
    s += `<ellipse cx="${r(x - groesse * 0.28)}" cy="${r(y - groesse * 0.22)}" rx="${r(groesse * 0.55)}" ry="${r(groesse * 0.34)}" fill="${hell}" opacity="0.85"/>`;
    // Lichtpunkt auf der Sonnenseite der Krone.
    s += `<ellipse cx="${r(x - groesse * 0.42)}" cy="${r(y - groesse * 0.34)}" rx="${r(groesse * 0.24)}" ry="${r(groesse * 0.15)}" fill="${ton(hell, 1.18)}" opacity="0.7"/>`;
  }
  return s;
}

// --- Wasser -----------------------------------------------------------------

function wasser(variante: 0 | 1, ufer?: Nachbarschaft): string {
  let s = flaeche(-0.5, -0.5, 0.5, 0.5, P.wasser);
  s += flaeche(-0.5, -0.5, 0.5, 0.5, ton(P.wasser, 0.82), ` opacity="0.5"`);
  // Flachwasser am Ufer: Wo Land angrenzt, wird das Wasser hell und türkis.
  // Ohne diese Zone stößt ein tiefblauer Fluss stumpf gegen die Wiese – das ist
  // die auffälligste harte Kante der ganzen Karte.
  if (ufer) {
    for (const kante of KANTEN) {
      const n = ufer[kante];
      if (!n || n === "wasser") continue;
      s += saumFlaeche(kante, 0.3, ton(P.wasser, 1.3), ` opacity="0.5"`);
      s += saumFlaeche(kante, 0.16, ton(P.wasser, 1.5), ` opacity="0.55"`);
    }
  }
  // Wellenlinien: zwei versetzte Muster, damit der Fluss fließt statt zu stehen.
  const versatz = variante === 0 ? 0 : 0.18;
  for (const t of [-0.3, -0.02, 0.26]) {
    const u = t + versatz;
    s +=
      `<path d="M ${p(u - 0.2, -0.34)} Q ${p(u, -0.16)} ${p(u - 0.2, 0.02)}" ` +
      `stroke="${ton(P.wasser, 1.28)}" stroke-width="1.6" fill="none" opacity="0.65" stroke-linecap="round"/>`;
    s +=
      `<path d="M ${p(u + 0.06, 0.1)} Q ${p(u + 0.26, 0.28)} ${p(u + 0.06, 0.44)}" ` +
      `stroke="${ton(P.wasser, 1.18)}" stroke-width="1.4" fill="none" opacity="0.5" stroke-linecap="round"/>`;
  }
  return s;
}

// --- Ortschaft --------------------------------------------------------------
//
// Bebautes Gebiet, das dem Spieler nicht gehört. Auf dem BODEN liegt davon nur,
// was auch in Wirklichkeit auf dem Boden liegt: Anliegerstraßen, Gehwege,
// Einfahrten, Gärten, Betriebshöfe. Die Häuser stehen als eigene Sprites
// darüber (`ortsbauSprite` in sprites.ts).
//
// WARUM DIESE TRENNUNG: Vorher waren die Häuschen in die Bodenkachel gemalt.
// Bodenkacheln werden aber auf ihre Raute geclippt – jedes Haus, das über die
// Kante ragte, verlor seine obere Hälfte, und übrig blieb ein grauer Klotz.
// Dazu kam: Ohne Straßen und ohne Grundstücksgrenzen las sich eine Ortschaft
// nicht als Ort, sondern als gemustertes Feld. Ein Ort besteht aus Straßen und
// aus dem, was an ihnen liegt – erst diese Struktur macht Bebauung lesbar.

/** Beschreibung einer Ortskachel für die Zeichnung. Kommt aus `ortslage()`. */
export interface Ortskachel {
  /** "rasen" ist der schlichte Untergrund unter einer Ortsdurchfahrt */
  rolle: Ortsrolle | "rasen";
  /** Verlauf der Anliegerstraße */
  form: "u" | "v" | "knoten";
  /** Seite, an der die Straße liegt – dorthin zeigt die Einfahrt */
  zurStrasse: Kante;
  art: Ortsart;
  /** Ortsmitte: Kirchplatz, Rathausvorplatz, Werkstor */
  mitte: boolean;
}

const ORT_RASEN = ["#79b854", "#84c25f", "#6faa4b", "#8bc766"] as const;
const ORT_PFLASTER = "#cbc2ad";

/** Ist hier ein Betriebsgelände statt eines Wohngrundstücks? */
const istGewerbe = (art: Ortsart): boolean => art === "industrie" || art === "gewerbe";

/**
 * Der Untergrund jeder Ortskachel: Rasen mit ein paar Halmen. Er liegt unter
 * ALLEM – auch unter der Anliegerstraße. Ohne ihn bliebe neben der Fahrbahn
 * ein Loch in der Karte, durch das der Himmel scheint (genau das war der
 * erste Fehler dieser Fassung).
 */
function ortsgrund(streu: number): string {
  const rasen = ORT_RASEN[streu % ORT_RASEN.length]!;
  let s = flaeche(-0.5, -0.5, 0.5, 0.5, rasen);
  for (let i = 0; i < 3; i++) {
    const bu = -0.36 + ((streu >> (i * 2)) % 5) * 0.16;
    const bv = -0.34 + ((streu >> (i * 3 + 1)) % 5) * 0.15;
    s += halme(bu, bv, ton(rasen, 1.1), 0.85);
  }
  return s;
}

/**
 * Anliegerstraße im Ort: schmale Fahrbahn, beidseits Bordstein und Gehweg.
 *
 * Sie ist bewusst schmaler und heller als die Kreisstraße aus `weg()`. Eine
 * Wohnstraße hat keine Mittellinie und kein Bankett; was sie ausmacht, ist der
 * Bordstein und der Gehweg dahinter – daran erkennt das Auge "Ort" statt
 * "Landstraße".
 */
function anliegerstrasse(form: "u" | "v" | "knoten", art: Ortsart): string {
  // Im Gewerbegebiet sind die Straßen breiter: dort fahren Lkw.
  const breit = istGewerbe(art) ? 0.26 : 0.19;
  const gehweg = breit + (istGewerbe(art) ? 0.05 : 0.09);
  const belag = ton(P.asphalt, istGewerbe(art) ? 1.0 : 1.06);
  let s = "";

  const band = (a: number, e: number, fill: string, extra = "", achse = form): string =>
    achse === "v" ? flaeche(a, -0.5, e, 0.5, fill, extra) : flaeche(-0.5, a, 0.5, e, fill, extra);

  const strang = (achse: "u" | "v"): string => {
    let t = "";
    t += band(-gehweg, gehweg, P.bordstein, "", achse);
    t += band(-gehweg, -breit - 0.012, ton(P.bordstein, 0.86), ` opacity="0.5"`, achse);
    t += band(breit + 0.012, gehweg, ton(P.bordstein, 0.86), ` opacity="0.5"`, achse);
    t += band(-breit, breit, belag, "", achse);
    // Querneigung: innen heller, an den Rinnen dunkler – dieselbe Wölbung wie
    // bei jeder anderen Fahrbahn der Karte.
    t += band(-breit * 0.5, breit * 0.5, ton(belag, 1.07), ` opacity="0.5"`, achse);
    t += band(-breit, -breit * 0.84, P.dunkel, ` opacity="0.14"`, achse);
    t += band(breit * 0.84, breit, P.dunkel, ` opacity="0.14"`, achse);
    return t;
  };

  if (form === "knoten") {
    s += strang("u");
    s += strang("v");
    // Die Kreuzungsfläche selbst: ein Hauch heller, damit der Knoten nicht als
    // Kreuz aus zwei Bändern liegen bleibt.
    s += flaeche(-breit, -breit, breit, breit, ton(belag, 1.05));
    return s;
  }
  s += strang(form);

  // Gehwegplatten: kurze Fugen quer zum Weg. Ohne sie ist der Gehweg ein
  // heller Streifen; mit ihnen ist er ein Weg, auf dem jemand geht.
  const fuge = (a: number, seite: number): string => {
    const i0 = seite * breit + seite * 0.012;
    const i1 = seite * gehweg;
    const [lo, hi] = i0 < i1 ? [i0, i1] : [i1, i0];
    return form === "v"
      ? flaeche(lo, a, hi, a + 0.008, ton(P.bordstein, 0.82), ` opacity="0.55"`)
      : flaeche(a, lo, a + 0.008, hi, ton(P.bordstein, 0.82), ` opacity="0.55"`);
  };
  for (const a of [-0.36, -0.18, 0, 0.18, 0.36]) {
    s += fuge(a, -1);
    s += fuge(a, 1);
  }
  return s;
}

/**
 * Wohngrundstück: Rasen, Einfahrt zur Straße, Hecke zum Nachbarn, Beet.
 *
 * Das Haus selbst gehört NICHT hierher – es steht als Sprite darüber. Was hier
 * gezeichnet wird, ist der Garten, der es umgibt. Deshalb bleibt die Mitte
 * frei: Dort steht gleich das Gebäude.
 */
function grundstueck(kachel: Ortskachel, streu: number): string {
  let s = ortsgrund(streu);

  // Einfahrt: das gepflasterte Band von der Straße zum Haus.
  const einfahrt = (kante: Kante, breite: number): string => {
    switch (kante) {
      case "ym":
        return flaeche(-breite, -0.5, breite, 0.04, ORT_PFLASTER);
      case "yp":
        return flaeche(-breite, -0.04, breite, 0.5, ORT_PFLASTER);
      case "xm":
        return flaeche(-0.5, -breite, 0.04, breite, ORT_PFLASTER);
      default:
        return flaeche(-0.04, -breite, 0.5, breite, ORT_PFLASTER);
    }
  };
  s += einfahrt(kachel.zurStrasse, istGewerbe(kachel.art) ? 0.22 : 0.11);
  // Fugen in der Einfahrt – sonst ist sie ein grauer Balken.
  for (const t of [-0.3, -0.1, 0.1, 0.3]) {
    s +=
      kachel.zurStrasse === "ym" || kachel.zurStrasse === "yp"
        ? flaeche(-0.22, t, 0.22, t + 0.008, ton(ORT_PFLASTER, 0.86), ` opacity="0.6"`)
        : flaeche(t, -0.22, t + 0.008, 0.22, ton(ORT_PFLASTER, 0.86), ` opacity="0.6"`);
  }

  if (istGewerbe(kachel.art)) {
    // Betriebsgelände: befestigter Hof mit Stellplätzen, dazu ein Grünstreifen
    // an der Straße. Ein Gewerbegebiet mit Rasengrundstücken wäre eine
    // Wohnsiedlung mit Hallen darauf.
    //
    // Der Hof reicht fast bis an die Kachelkante und bekommt eine helle,
    // gebrochene Fläche statt eines dunklen Rechtecks mit Kontur: Ein scharf
    // umrandetes Feld je Kachel las sich als Raster ausgestanzter Quadrate.
    s += flaeche(-0.47, -0.47, 0.47, 0.47, ton(P.pflaster, 0.98));
    s += flaeche(-0.47, -0.47, 0.47, -0.2, ton(P.pflaster, 1.03), ` opacity="0.6"`);
    // Zwei Fugen quer über den Hof – Betonplatten, keine Asphaltdecke.
    s += flaeche(-0.47, -0.02, 0.47, -0.008, ton(P.pflasterFuge, 1.0), ` opacity="0.45"`);
    s += flaeche(-0.02, -0.47, -0.008, 0.47, ton(P.pflasterFuge, 1.0), ` opacity="0.45"`);
    for (let i = 0; i < 4; i++) {
      const v = -0.3 + i * 0.2;
      s += flaeche(0.2, v, 0.42, v + 0.012, P.markierung, ` opacity="0.55"`);
    }
    return s;
  }

  // Hecke an den Grundstücksgrenzen – aber nicht an allen vier Seiten, sonst
  // liegt über dem Ort ein grünes Gitter.
  const kanten: Kante[] = KANTEN.filter((kk) => kk !== kachel.zurStrasse);
  kanten.forEach((kante, i) => {
    if ((streu + i) % 3 === 0) return;
    for (const [hu, hv] of kantenPunkte(kante, 4, 0.06)) s += heckenbusch(hu, hv);
  });

  // Garten: ein Beet mit Reihen, eine Terrasse, ein paar Blumen. Das ist der
  // Unterschied zwischen "Haus auf grüner Fläche" und "Haus, in dem jemand
  // wohnt" – und es kostet nur ein paar Polygone.
  const beetU = kachel.zurStrasse === "xp" ? -0.34 : 0.14;
  const beetV = kachel.zurStrasse === "yp" ? -0.34 : 0.16;
  if (streu % 4 !== 0) {
    s += flaeche(beetU, beetV, beetU + 0.2, beetV + 0.18, "#9c7a52");
    for (let i = 0; i < 3; i++) {
      const v = beetV + 0.04 + i * 0.055;
      s += flaeche(beetU + 0.02, v, beetU + 0.18, v + 0.018, "#5f9a46");
    }
  } else {
    // Terrasse statt Beet: helle Platten mit Sonnenschirm-Schatten.
    s += flaeche(beetU, beetV, beetU + 0.22, beetV + 0.2, ton(ORT_PFLASTER, 1.04));
  }
  for (let i = 0; i < 3; i++) {
    const bu = -0.36 + ((streu >> (i * 2)) % 5) * 0.16;
    const bv = -0.34 + ((streu >> (i * 3 + 1)) % 5) * 0.15;
    s += blume(bu, bv, ["#f2f0e2", "#f4c453", "#e88ab0"][(streu + i) % 3]!, 0.85);
  }
  return s;
}

/**
 * Anger, Spielplatz, Festwiese: die Grünfläche zwischen den Grundstücken.
 * Ohne sie ist eine Ortschaft eine geschlossene Bebauung – und die gibt es in
 * keinem Landkreis.
 */
function ortsgruen(streu: number, feld: number): string {
  let s = gras(streu, feld);
  // Ein Kiesweg quer über den Anger, dazu eine Bank am Weg.
  const laengs = streu % 2 === 0;
  s += laengs
    ? flaeche(-0.5, -0.05, 0.5, 0.05, "#cdbb96")
    : flaeche(-0.05, -0.5, 0.05, 0.5, "#cdbb96");
  s += laengs
    ? flaeche(-0.5, -0.05, 0.5, -0.035, ton("#cdbb96", 0.88), ` opacity="0.7"`)
    : flaeche(-0.05, -0.5, -0.035, 0.5, ton("#cdbb96", 0.88), ` opacity="0.7"`);
  for (let i = 0; i < 4; i++) {
    const bu = -0.34 + ((streu >> (i * 2)) % 5) * 0.17;
    const bv = -0.32 + ((streu >> (i + 2)) % 5) * 0.16;
    s += blume(bu, bv, ["#f2f0e2", "#f4c453", "#c9d8f0"][(streu + i) % 3]!, 0.9);
  }
  return s;
}

/** Der Boden einer Ortskachel – Straße, Grundstück oder Grünfläche. */
function ortschaft(kachel: Ortskachel, streu: number, feld: number): string {
  if (kachel.rolle === "rasen") return ortsgrund(streu);
  if (kachel.rolle === "strasse") return ortsgrund(streu) + anliegerstrasse(kachel.form, kachel.art);
  if (kachel.rolle === "gruen") return ortsgruen(streu, feld);
  return grundstueck(kachel, streu);
}

// --- Pflaster ---------------------------------------------------------------

/** Betriebsfläche: großformatige Platten mit sichtbaren Fugen. */
function pflaster(variante: 0 | 1): string {
  const basis = variante === 0 ? P.pflaster : P.pflasterDunkel;
  let s = flaeche(-0.5, -0.5, 0.5, 0.5, basis);
  // Zwei Fugen je Richtung → vier Platten pro Kachel.
  for (const t of [-0.5, -0.167, 0.167]) {
    s += flaeche(t, -0.5, t + 0.012, 0.5, P.pflasterFuge, ` opacity="0.55"`);
    s += flaeche(-0.5, t, 0.5, t + 0.012, P.pflasterFuge, ` opacity="0.55"`);
  }
  // Ein leichter Ölfleck auf jeder zweiten Kachel – Betriebshof, kein Parkett.
  if (variante === 1) {
    s += `<ellipse cx="${r(MX + 12)}" cy="${r(MY + 5)}" rx="9" ry="4" fill="${P.dunkel}" opacity="0.07"/>`;
  }
  return s;
}

// --- Wege -------------------------------------------------------------------
//
// Fünf Ausbaugrade, und man muss sie auf den ersten Blick unterscheiden können –
// sonst ist die teure Umgehung optisch dasselbe wie der Feldweg, und der Spieler
// sieht nicht, wofür er bezahlt hat. Die Unterscheidungsmerkmale sind Breite,
// Markierung und Randausbildung, genau wie im echten Straßenbild.

interface WegBild {
  /** halbe Fahrbahnbreite in Kachel-Einheiten */
  breite: number;
  belag: string;
  /** Randstreifen: Bordstein, Bankett oder Leitplanke */
  rand: "bordstein" | "bankett" | "planke" | "keiner";
  /** Mittelmarkierung */
  linie: "keine" | "gestrichelt" | "doppelt" | "richtungstrennung";
}

// WARUM DIE STRASSEN SCHMALER GEWORDEN SIND: `breite` ist die HALBE Fahrbahn.
// Eine Landstraße mit 0.4 belegte damit 80 % der Kachelbreite, die Autobahn
// volle 100 %. Auf der Karte lag dadurch mehr Asphalt als Land – ein graues
// Gitter, das die Landschaft in Rechtecke zerschnitt, und der Betriebshof lag
// darin wie eine Insel. Mit 0.30 bleibt die Landstraße breit genug für zwei
// Lastzüge nebeneinander (ein Lkw misst rund 0.26 Kacheln), aber die Wiese
// gewinnt die Fläche zurück.
const WEG_BILD: Record<WegTyp, WegBild> = {
  werk: { breite: 0.24, belag: ton(P.asphalt, 1.08), rand: "keiner", linie: "keine" },
  land: { breite: 0.3, belag: P.asphalt, rand: "bankett", linie: "gestrichelt" },
  umgehung: { breite: 0.36, belag: ton(P.asphalt, 0.94), rand: "bordstein", linie: "doppelt" },
  autobahn: {
    breite: 0.42,
    belag: ton(P.asphalt, 0.88),
    rand: "planke",
    linie: "richtungstrennung",
  },
  gleis: { breite: 0.2, belag: "#8a7f6d", rand: "keiner", linie: "keine" },
  radweg: { breite: 0.15, belag: "#b06a4a", rand: "keiner", linie: "keine" },
};

/**
 * Straßenkachel. `form` sagt, wie das Stück im Netz liegt: als Gerade entlang
 * einer Achse oder als Knoten (Ecke, Einmündung, Kreuzung). Knoten werden
 * bewusst nur als Asphaltfeld ohne Markierung gezeichnet – jede Markierung
 * müsste sonst für 16 Nachbarschaftsfälle stimmen, und ein unmarkierter Knoten
 * liest sich als Kreuzung völlig richtig.
 */
function weg(typ: WegTyp, form: "u" | "v" | "knoten", imOrt = false): string {
  const b = WEG_BILD[typ];
  const breit = b.breite;
  let s = "";
  // INNERORTS STATT BANKETT: Eine Ortsdurchfahrt hat keinen Grasstreifen,
  // sondern Bordstein und Gehweg. Ohne diesen Unterschied sah die Kreisstraße
  // mitten in der Kleinstadt aus wie auf freiem Feld – und die Anliegerstraßen
  // daneben wirkten wie eine andere Welt.
  const rand = imOrt && b.rand === "bankett" ? "bordstein" : b.rand;

  const quer = (a: number, e: number, fill: string, extra = ""): string =>
    form === "v" ? flaeche(a, -0.5, e, 0.5, fill, extra) : flaeche(-0.5, a, 0.5, e, fill, extra);

  if (form === "knoten") {
    // Ein Knoten ist ein Kreuz aus zwei Fahrbahnen, keine asphaltierte Kachel.
    // Die alte Vollfläche machte aus jeder Einmündung einen grauen Platz – auf
    // der ganzen Karte lag dadurch mehr Asphalt als Landschaft.
    const bank = breit + 0.06;
    if (rand === "bordstein") {
      s += flaeche(-0.5, -bank, 0.5, bank, P.bordstein);
      s += flaeche(-bank, -0.5, bank, 0.5, P.bordstein);
    }
    if (rand === "bankett") {
      s += flaeche(-0.5, -bank, 0.5, bank, "#a49f7f");
      s += flaeche(-bank, -0.5, bank, 0.5, "#a49f7f");
    }
    s += flaeche(-0.5, -breit, 0.5, breit, b.belag);
    s += flaeche(-breit, -0.5, breit, 0.5, b.belag);
    s += `<ellipse cx="${MX}" cy="${MY}" rx="20" ry="10" fill="${ton(b.belag, 1.06)}" opacity="0.4"/>`;
    return s;
  }

  // Bankett: der unbefestigte Streifen neben der Fahrbahn – schmal, nicht die
  // ganze Kachel. Alles daneben bleibt Wiese oder Acker.
  if (rand === "bankett") s += quer(-breit - 0.07, breit + 0.07, "#a49f7f");
  if (imOrt && rand === "bordstein") {
    // Gehweg hinter dem Bordstein, so breit wie an der Anliegerstraße.
    s += quer(-breit - 0.11, breit + 0.11, P.bordstein);
    s += quer(-breit - 0.11, -breit - 0.09, ton(P.bordstein, 0.86), ` opacity="0.5"`);
    s += quer(breit + 0.09, breit + 0.11, ton(P.bordstein, 0.86), ` opacity="0.5"`);
  }

  s += quer(-breit, breit, b.belag);
  // Die Fahrbahn wölbt sich zur Mitte (Querneigung fürs Wasser): innen heller,
  // an den Rändern dunkler. Ein flach ausgefüllter Streifen sieht aus wie
  // Klebeband auf der Wiese.
  s += quer(-breit * 0.55, breit * 0.55, ton(b.belag, 1.07), ` opacity="0.55"`);
  s += quer(-breit, -breit * 0.82, P.dunkel, ` opacity="0.16"`);
  s += quer(breit * 0.82, breit, P.dunkel, ` opacity="0.16"`);

  if (rand === "bordstein") {
    s += quer(-breit - 0.05, -breit, ton(P.bordstein, 0.9));
    s += quer(breit, breit + 0.05, ton(P.bordstein, 0.9));
  } else if (rand === "planke") {
    // Leitplanke: heller Strich mit Schatten – von oben genau das, was man sieht.
    s += quer(-breit - 0.05, -breit - 0.02, ton(P.stahl, 1.25));
    s += quer(breit + 0.02, breit + 0.05, ton(P.stahl, 1.25));
    s += quer(-breit - 0.02, -breit, P.dunkel, ` opacity="0.25"`);
  }

  const laengs = (a: number, laenge: number, dicke: number, fill: string, extra = ""): string =>
    form === "v"
      ? flaeche(-dicke, a, dicke, a + laenge, fill, extra)
      : flaeche(a, -dicke, a + laenge, dicke, fill, extra);

  if (b.linie === "gestrichelt") {
    for (const a of [-0.42, -0.06, 0.3]) s += laengs(a, 0.22, 0.013, P.markierung, ` opacity="0.85"`);
  } else if (b.linie === "doppelt") {
    // Vierspurig: durchgezogene Mitte, dazu je Richtung eine Leitlinie.
    s += laengs(-0.5, 1, 0.012, P.markierung, ` opacity="0.9"`);
    for (const seite of [-1, 1]) {
      for (const a of [-0.44, -0.1, 0.24]) {
        const off = seite * breit * 0.5;
        s +=
          form === "v"
            ? flaeche(off - 0.01, a, off + 0.01, a + 0.2, P.markierung, ` opacity="0.6"`)
            : flaeche(a, off - 0.01, a + 0.2, off + 0.01, P.markierung, ` opacity="0.6"`);
      }
    }
  } else if (b.linie === "richtungstrennung") {
    // Mittelstreifen mit Doppelplanke: das Erkennungszeichen der Autobahn.
    s += laengs(-0.5, 1, 0.05, ton(P.gras, 0.9));
    s += laengs(-0.5, 1, 0.016, ton(P.stahl, 1.2));
    for (const seite of [-1, 1]) {
      const off = seite * breit * 0.62;
      s +=
        form === "v"
          ? flaeche(off - 0.02, -0.5, off + 0.02, 0.5, P.markierung, ` opacity="0.75"`)
          : flaeche(-0.5, off - 0.02, 0.5, off + 0.02, P.markierung, ` opacity="0.75"`);
    }
  }

  return s;
}

/** Anschlussgleis: Schotterbett, Schwellen, zwei Schienen. */
function gleis(form: "u" | "v" | "knoten"): string {
  const achse = form === "v" ? "v" : "u";
  const schotter = 0.24;
  let s =
    achse === "v"
      ? flaeche(-schotter, -0.5, schotter, 0.5, "#8a7f6d")
      : flaeche(-0.5, -schotter, 0.5, schotter, "#8a7f6d");
  // Schwellen quer zur Fahrtrichtung.
  for (let i = -4; i <= 4; i++) {
    const t = i * 0.11;
    s +=
      achse === "v"
        ? flaeche(-0.17, t, 0.17, t + 0.04, "#6b5b45")
        : flaeche(t, -0.17, t + 0.04, 0.17, "#6b5b45");
  }
  // Schienen.
  for (const off of [-0.1, 0.1]) {
    s +=
      achse === "v"
        ? flaeche(off - 0.018, -0.5, off + 0.018, 0.5, ton(P.stahl, 1.35))
        : flaeche(-0.5, off - 0.018, 0.5, off + 0.018, ton(P.stahl, 1.35));
  }
  return s;
}

/** Brückenbauwerk: Fahrbahn über dem Wasser, mit Widerlager und Geländer. */
function bruecke(typ: WegTyp, form: "u" | "v" | "knoten"): string {
  let s = wasser(0);
  const b = WEG_BILD[typ].breite + 0.08;
  s +=
    form === "v"
      ? flaeche(-b, -0.5, b, 0.5, P.dunkel, ` opacity="0.22"`)
      : flaeche(-0.5, -b, 0.5, b, P.dunkel, ` opacity="0.22"`);
  s += weg(typ, form === "knoten" ? "u" : form);
  // Geländer als heller Strich an beiden Kanten.
  for (const off of [-b, b]) {
    s +=
      form === "v"
        ? flaeche(off - 0.02, -0.5, off + 0.02, 0.5, ton(P.beton, 1.15))
        : flaeche(-0.5, off - 0.02, 0.5, off + 0.02, ton(P.beton, 1.15));
  }
  return s;
}

// --- Kacheltypen ------------------------------------------------------------

export type BodenTyp =
  | "wiese"
  | "acker"
  | "wald"
  | "wasser"
  | "ort"
  | "pflaster"
  // Altnamen, die die Regionsansicht noch verwendet
  | "grass"
  | "pave";

/** Vollständige Beschreibung einer Bodenkachel, wie sie gezeichnet wird. */
export interface KachelBild {
  boden: BodenTyp;
  variante: 0 | 1;
  /** Streuwert für Acker- und Ortsvarianten */
  streu: number;
  /**
   * Streuwert des Schlags: gleich für alle Kacheln eines Feldes. Er bestimmt,
   * WAS hier wächst; der Kachel-Streuwert bestimmt nur das Kleingedruckte.
   */
  feld?: number;
  /** Lage im Ort: Anliegerstraße, Grundstück oder Anger (siehe `ortslage`) */
  ortsbild?: Ortskachel;
  /** Straße auf dieser Kachel */
  weg?: { typ: WegTyp; form: "u" | "v" | "knoten"; bruecke?: boolean };
  /** zusätzlich ein Gleis (Straße und Gleis dürfen sich kreuzen) */
  gleis?: { form: "u" | "v" | "knoten" };
  /** Bodenart der vier Nachbarn – Grundlage für Ufer, Waldrand und Feldrain */
  nachbarn?: Nachbarschaft;
  /** Schlag-Streuwert der Nachbarn: verrät, wo ein Feld endet und das nächste beginnt */
  nachbarFeld?: Partial<Record<Kante, number>>;
  /**
   * Hangschattierung an den vier Kachelecken [Nord, Ost, Süd, West], jeweils
   * -1 (Schattenhang) … +1 (Sonnenhang).
   */
  reliefEcken?: [number, number, number, number];
  /** Eindeutiger Name des Farbverlaufs innerhalb des Kachelblocks. */
  reliefId?: string;
}

// --- Säume ------------------------------------------------------------------

/** Ist diese Bodenart offene Flur (also grün, bewachsen, unbefestigt)? */
const istFlur = (t: BodenTyp | undefined): boolean =>
  t === "wiese" || t === "grass" || t === "acker";

/**
 * Die Übergänge einer Kachel zu ihren Nachbarn. Sie liegen über dem Grundbild
 * und unter Straße und Relief.
 *
 * Was hier entsteht, ist der eigentliche Unterschied zwischen Raster und
 * Landschaft: Schilf am Ufer, Unterholz am Waldrand, ein Krautstreifen zwischen
 * Acker und Wiese. Jeder dieser Säume ist zugleich fachlich richtig – ein
 * Gewässerrandstreifen ist nach § 38 WHG vorgeschrieben, und der Waldrand ist
 * die Fläche, auf der ohnehin niemand bauen darf.
 */
function saeume(bild: KachelBild): string {
  const n = bild.nachbarn;
  if (!n) return "";
  const eigen = bild.boden;
  const feld = bild.feld ?? bild.streu;
  let s = "";

  for (const kante of KANTEN) {
    const nach = n[kante];
    if (!nach) continue;

    // Schlaggrenze innerhalb derselben Bodenart: Zwischen zwei Feldern liegt
    // immer ein Rain – ein schmaler, ungenutzter Streifen, auf dem Gras und
    // Kraut stehen. Ohne ihn stoßen zwei Fruchtfarben aneinander wie zwei
    // Farbfelder auf einer Palette.
    if (nach === eigen) {
      const nf = bild.nachbarFeld?.[kante];
      if ((eigen === "acker" || eigen === "wiese" || eigen === "grass") && nf !== undefined && nf !== feld) {
        // Der Rain war zu schmal, um zu wirken: 0.05 Kachelbreite sind auf dem
        // Schirm gut fünf Pixel, und in einem Ton, der sich vom Feld kaum
        // absetzt. Zwei Felder stießen deshalb weiterhin als zwei Farbflächen
        // aneinander. Ein Rain ist ungemähtes Kraut – er ist HELLER und
        // gelblicher als jede Frucht, und er braucht Breite, sonst ist er nur
        // eine Linie.
        s += saumFlaeche(kante, 0.08, "#93ad5b", ` opacity="0.85"`);
        s += saumFlaeche(kante, 0.038, "#b2c974", ` opacity="0.75"`);
        // HECKE auf dem Rain – aber nicht auf jedem.
        //
        // Ein Feldrain ist als heller Streifen zwar sichtbar, bleibt aber
        // flach: Die Landschaft besteht dann aus bemalten Flächen ohne etwas,
        // das aus ihnen herausragt. In Wirklichkeit steht auf dem Rain das,
        // was der Pflug nie erreicht – Schlehe, Holunder, Hasel. Eine
        // Buschreihe gibt der Flur Struktur und dem Auge etwas, woran es die
        // Entfernung ablesen kann.
        //
        // Bewusst nur auf jeder dritten Grenze: Bekäme jede Kante eine Hecke,
        // läge über der Karte ein grünes Gitter statt einer Feldflur.
        if ((feld + (nf ?? 0)) % 3 === 0) {
          for (const [hu, hv] of kantenPunkte(kante, 5, 0.055)) {
            s += heckenbusch(hu, hv);
          }
        }
      }
      continue;
    }

    // --- Ufer: Sandbank und Schilfgürtel auf der Landseite -------------------
    if (nach === "wasser" && eigen !== "wasser") {
      s += saumFlaeche(kante, 0.14, "#cbb98a", ` opacity="0.85"`);
      s += saumFlaeche(kante, 0.07, "#ded0a6", ` opacity="0.9"`);
      if (istFlur(eigen)) {
        for (const [u, v] of kantenPunkte(kante, 5, 0.2)) {
          s += halme(u, v, "#6d9e52", 1.15);
        }
      }
      continue;
    }

    // --- Waldrand: Unterholz, das über die Kante in die Flur wächst ----------
    if (nach === "wald" && istFlur(eigen)) {
      for (const [u, v] of kantenPunkte(kante, 4, 0.1)) {
        const [x, y] = [MX + (u - v) * MX, MY + (u + v) * MY];
        s += `<ellipse cx="${r(x)}" cy="${r(y)}" rx="9" ry="5.5" fill="${P.laub}" opacity="0.9"/>`;
        s += `<ellipse cx="${r(x - 2)}" cy="${r(y - 2)}" rx="5" ry="3" fill="${P.laubHell}" opacity="0.8"/>`;
      }
      // Der Wald steht im Nordwesten? Dann fällt sein Schatten auf diese Kachel.
      if (kante === "xm" || kante === "ym") {
        s += saumFlaeche(kante, 0.3, "#2c3f52", ` opacity="0.16"`);
      }
      continue;
    }

    // --- Feldrain zwischen Acker und Wiese ----------------------------------
    if (istFlur(eigen) && istFlur(nach)) {
      s += saumFlaeche(kante, 0.09, eigen === "acker" ? "#a3bb66" : "#86b45c", ` opacity="0.8"`);
      s += saumFlaeche(kante, 0.04, "#b8ce7c", ` opacity="0.6"`);
      continue;
    }

    // --- Ortsrand: der Übergang von der Flur in die Bebauung -----------------
    if (nach === "ort" && istFlur(eigen)) {
      s += saumFlaeche(kante, 0.09, "#8fb87c", ` opacity="0.75"`);
    }
  }
  return s;
}

/**
 * Die Wölbung des Geländes, als Licht gemalt: warme Aufhellung auf dem
 * Sonnenhang, kühle Abdunklung im Schattenhang.
 *
 * WARUM ALS FARBVERLAUF UND NICHT ALS EINGEFÄRBTE KACHEL: Ein Hang, der pro
 * Kachel einen festen Ton bekommt, macht aus der Landschaft ein Patchwork aus
 * Rauten – man sieht die Schattierung, nicht das Gelände. Deshalb bekommt jede
 * Kachel einen linearen Verlauf, der aus den Werten an ihren vier ECKEN
 * gerechnet wird. Ecken gehören immer vier Kacheln gemeinsam; wenn der Wert
 * dort übereinstimmt, geht die Schattierung ohne Kante über die Kachelgrenze.
 *
 * `ecken` ist [Nord, Ost, Süd, West] – Nord ist die hintere Spitze der Raute.
 */
function reliefTon(ecken: [number, number, number, number], id: string): string {
  const [n, o, s, w] = ecken;
  const mitte = (n + o + s + w) / 4;
  // Änderung je Einheit u (nach Südosten) und v (nach Südwesten).
  const du = (o + s - (n + w)) / 2;
  const dv = (w + s - (n + o)) / 2;
  const spanne = Math.max(Math.abs(du), Math.abs(dv));

  const farbe = (wert: number): [string, number] =>
    wert >= 0
      ? ["#fff2cd", Math.min(0.17, wert * 0.17)]
      : ["#33547a", Math.min(0.22, -wert * 0.22)];

  if (spanne < 0.02) {
    const [f, a] = farbe(mitte);
    if (a < 0.012) return "";
    return `<polygon points="${RAUTE}" fill="${f}" opacity="${r(a)}"/>`;
  }

  // Der Verlauf läuft entlang des stärksten Gefälles, von der dunkelsten zur
  // hellsten Stelle des Kachelrands.
  const kk = 0.5 / spanne;
  const amp = kk * (du * du + dv * dv);
  const pxy = (u: number, v: number): [number, number] => [MX + (u - v) * MX, MY + (u + v) * MY];
  const [ax, ay] = pxy(-du * kk, -dv * kk);
  const [bx, by] = pxy(du * kk, dv * kk);
  const [f1, a1] = farbe(mitte - amp);
  const [f2, a2] = farbe(mitte + amp);
  return (
    `<defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" ` +
    `x1="${r(ax)}" y1="${r(ay)}" x2="${r(bx)}" y2="${r(by)}">` +
    `<stop offset="0" stop-color="${f1}" stop-opacity="${r(a1)}"/>` +
    `<stop offset="1" stop-color="${f2}" stop-opacity="${r(a2)}"/>` +
    `</linearGradient></defs>` +
    `<polygon points="${RAUTE}" fill="url(#${id})"/>`
  );
}

/** Das SVG-Fragment einer Kachel – ohne Clip, ohne Rahmen. */
export function kachelInhalt(bild: KachelBild): string {
  const feld = bild.feld ?? bild.streu;
  let s: string;
  switch (bild.boden) {
    case "acker":
      s = acker(bild.variante, bild.streu, feld);
      break;
    case "wald":
      s = wald(bild.variante, feld);
      break;
    case "wasser":
      s = wasser(bild.variante, bild.nachbarn);
      break;
    case "ort":
      // Ohne Ortslage (Regionsansicht, Bauvorschau) bleibt es beim
      // Wohngrundstück – dort ist die Kachel nur briefmarkengroß.
      s = ortschaft(
        bild.ortsbild ?? { rolle: "bebaut", form: "u", zurStrasse: "ym", art: "wohnort", mitte: false },
        bild.streu,
        feld,
      );
      break;
    case "pflaster":
    case "pave":
      s = pflaster(bild.variante);
      break;
    default:
      s = gras(bild.streu, feld);
  }
  s += saeume(bild);
  if (bild.weg) {
    s = bild.weg.bruecke
      ? bruecke(bild.weg.typ, bild.weg.form)
      : s + weg(bild.weg.typ, bild.weg.form, bild.boden === "ort");
  }
  if (bild.gleis) s += gleis(bild.gleis.form);
  // Die Hangschattierung liegt zuletzt und damit über allem – auch über der
  // Straße. Eine Fahrbahn, die über eine Kuppe läuft, wird schließlich genauso
  // beschienen wie das Feld daneben.
  if (bild.reliefEcken && bild.reliefId) s += reliefTon(bild.reliefEcken, bild.reliefId);
  return s;
}

// Einmal erzeugen, dann wiederverwenden: identische data-URIs lädt der Browser
// nur ein einziges Mal, egal auf wie vielen Kacheln sie stehen.
const CACHE = new Map<string, string>();

/**
 * URL einer einzelnen Bodenkachel. Für die große Karte werden Kachelblöcke
 * verwendet (gelaende.ts); diese Funktion bedient die kleine Regionsansicht und
 * die Vorschau im Bauwerkzeug.
 */
export function bodenUrl(typ: BodenTyp | "road-x" | "road-y" | "road-c", variante: 0 | 1): string {
  const key = `${typ}${variante}`;
  const da = CACHE.get(key);
  if (da) return da;
  let bild: KachelBild;
  switch (typ) {
    case "road-x":
      bild = { boden: "wiese", variante, streu: 0, weg: { typ: "land", form: "u" } };
      break;
    case "road-y":
      bild = { boden: "wiese", variante, streu: 0, weg: { typ: "land", form: "v" } };
      break;
    case "road-c":
      bild = { boden: "wiese", variante, streu: 0, weg: { typ: "land", form: "knoten" } };
      break;
    default:
      bild = { boden: typ, variante, streu: variante * 3 };
  }
  const url = kachel(kachelInhalt(bild));
  CACHE.set(key, url);
  return url;
}

/**
 * Zaunstück an der Kante eines Betriebsgrundstücks. Wird über die Bodenkachel
 * gelegt, wenn dahinter kein eigenes Gelände mehr liegt – dadurch bekommt der
 * Hof eine sichtbare Grenze statt nur einen Farbwechsel.
 *
 * Nur die beiden hinteren Kanten werden gezäunt: "x" ist die Kante zum Nachbarn
 * (x-1, y), "y" die zum Nachbarn (x, y-1). Vorne würde der Zaun das Gebäude auf
 * der eigenen Kachel verdecken – und gesehen wird er dort ohnehin nicht.
 */
export function zaunUrl(seite: "x" | "y"): string {
  const key = `zaun-${seite}`;
  const da = CACHE.get(key);
  if (da) return da;
  // Der Zaun steht auf der hinteren Kante der Kachel und ragt nach oben aus ihr
  // heraus – deshalb ein höheres SVG mit Überstand.
  const UEBER = 16;
  const hoehe = H + UEBER;
  const py = (u: number, v: number, w = 0): string =>
    `${r(MX + (u - v) * MX)},${r(UEBER + MY + (u + v) * MY - w)}`;
  let s = "";
  // HOLZ STATT STAHL: Ein grauer Industriezaun ist technisch richtig und
  // optisch der Tod jeder warmen Landschaft – er zieht eine kalte Linie quer
  // durchs Bild. Ein Lattenzaun aus Holz grenzt genauso ab, gehört aber zu
  // einem Betrieb, den man gern ansieht. Die Pfosten stehen etwas dichter und
  // tragen eine dunklere Kontur, damit die Linie auch verkleinert hält.
  const holz = ton(P.holz, 1.18);
  const holzTief = ton(P.holz, 0.6);
  // Zwei durchlaufende Riegel zuerst, die Pfosten liegen davor.
  for (const w of [12, 5.5]) {
    const [a0, b0, a1, b1] = seite === "y" ? [-0.5, -0.5, 0.5, -0.5] : [-0.5, -0.5, -0.5, 0.5];
    s += `<polyline points="${py(a0, b0, w)} ${py(a1, b1, w)}" stroke="${holzTief}" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
    s += `<polyline points="${py(a0, b0, w)} ${py(a1, b1, w)}" stroke="${holz}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = -0.5 + i / n;
    const [a, b] = seite === "y" ? [t, -0.5] : [-0.5, t];
    s += `<polyline points="${py(a, b, 15)} ${py(a, b, 0)}" stroke="${holzTief}" stroke-width="3.8" fill="none" stroke-linecap="round"/>`;
    s += `<polyline points="${py(a, b, 14.4)} ${py(a, b, 0.6)}" stroke="${holz}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
  }
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hoehe}" viewBox="0 0 ${W} ${hoehe}">${s}</svg>`;
  const url = datenUri(svg);
  CACHE.set(key, url);
  return url;
}
