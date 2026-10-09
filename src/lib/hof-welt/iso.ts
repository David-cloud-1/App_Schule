// Iso-Zeichenwerkzeug: aus Quadern, Dächern und Flächen werden Gebäude-Sprites
// als SVG erzeugt – statt fertige PNG-Kacheln zu laden.
//
// Warum selbst zeichnen? Ein Kachelsatz von der Stange kennt keine Umschlaghalle
// mit Laderampe, kein Zollamt mit Schranke und kein KV-Terminal mit Portalkran.
// Genau diese Gebäude sind aber der Betrieb, den die Schüler aufbauen. Wer die
// Welt selbst zeichnet, kann außerdem die Hausfarbe auf die Gebäude durchschlagen
// lassen und Ausbaustufen wirklich wachsen lassen.
//
// Koordinatensystem (rechtshändig gedacht, 2:1-Isometrie):
//   u  → nach rechts-unten (Südost), 1.0 = eine Kachelbreite
//   v  → nach links-unten  (Südwest), 1.0 = eine Kachelbreite
//   w  → nach oben (Höhe), direkt in Pixeln
// Der Ursprung (0,0,0) ist die Mitte der Grundkachel.

export const TILE_W = 99; // Breite der Boden-Raute
export const TILE_H = 50; // Höhe der Boden-Raute (2:1)

/** Iso-Punkt → Bildschirmversatz relativ zur Kachelmitte. */
export function iso(u: number, v: number, w = 0): [number, number] {
  return [((u - v) * TILE_W) / 2, ((u + v) * TILE_H) / 2 - w];
}

// --- Licht ------------------------------------------------------------------
// Eine Lichtquelle für die ganze Welt: von links oben. Dachflächen bekommen das
// volle Licht, die linke (südwestliche) Wand etwas weniger, die rechte
// (südöstliche) am wenigsten. Dieser feste Dreiklang ist der Grund, warum eine
// Cartoon-Stadt wie aus einem Guss wirkt – jede Abweichung fällt sofort auf.

export const LICHT = {
  dach: 1.0,
  links: 0.82, // Südwest-Wand
  rechts: 0.62, // Südost-Wand
  boden: 0.5, // Sockel, Schattenseiten
} as const;

/** Hellt eine Farbe auf oder dunkelt sie ab (f = 1 lässt sie unverändert). */
export function ton(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const kanal = (shift: number) => {
    const c = (n >> shift) & 255;
    // Über 1.0 wird nicht multipliziert, sondern Richtung Weiß gemischt –
    // sonst laufen helle Farben aus und verlieren ihren Ton.
    const v = f <= 1 ? c * f : c + (255 - c) * (f - 1);
    return Math.max(0, Math.min(255, Math.round(v)));
  };
  return `#${((1 << 24) | (kanal(16) << 16) | (kanal(8) << 8) | kanal(0)).toString(16).slice(1)}`;
}

// --- Bausteine --------------------------------------------------------------
// Jede Funktion liefert SVG-Fragmente. Sie werden in Zeichenreihenfolge
// aneinandergehängt: was zuerst kommt, liegt hinten.

type Pkt = [number, number];

const poly = (punkte: Pkt[], fill: string, extra = ""): string =>
  `<polygon points="${punkte.map(([x, y]) => `${round(x)},${round(y)}`).join(" ")}" fill="${fill}"${extra}/>`;

/**
 * Dasselbe Polygon mit Kontur – der Schritt von "Vektorgrafik" zu "gemalt".
 *
 * Die Fahrzeuge hatten sie zuerst, und danach war der Unterschied im Bild nicht
 * mehr zu übersehen: Ein Lkw mit abgesetzten Kanten steht in der Landschaft,
 * ein Gebäude ohne sie ist eine Ansammlung farbiger Flächen. Ein Cartoon-Spiel
 * setzt JEDE Fläche ab – nie schwarz, sondern mit einem tiefen Ton der Fläche
 * selbst, sonst wird aus der warmen Welt ein Ausmalbild.
 */
const polyK = (punkte: Pkt[], fill: string, kontur: string, breite = 1.2): string =>
  poly(punkte, fill, ` stroke="${kontur}" stroke-width="${breite}" stroke-linejoin="round"`);

/** Der Konturton einer Farbe: deutlich dunkler, aber farbig – nie Schwarz. */
export const kantenTon = (hex: string): string => ton(hex, 0.55);

const round = (n: number): number => Math.round(n * 10) / 10;

export interface Quader {
  /** Grundfläche in Kachel-Einheiten (0 = Kachelmitte, ±0.5 = Kachelrand) */
  u0: number;
  v0: number;
  u1: number;
  v1: number;
  /** Unterkante über dem Boden (px) */
  z?: number;
  /** Höhe (px) */
  h: number;
  farbe: string;
  /** Farbe der Dachfläche, falls sie sich vom Körper unterscheidet */
  dachFarbe?: string;
}

/**
 * Laufende Nummer für Farbverläufe. Sie muss nur innerhalb eines Sprite-SVG
 * eindeutig sein; ein globaler Zähler ist dafür die einfachste sichere Lösung.
 */
let verlaufNr = 0;

/**
 * Ein isometrischer Quader: Dachfläche, linke und rechte Wand. Die verdeckten
 * Seiten werden nicht gezeichnet – bei tausenden Flächen pro Karte spart das
 * spürbar, und sichtbar wäre davon ohnehin nichts.
 *
 * WARUM DIE WÄNDE EINEN VERLAUF HABEN: Eine Wand aus einer einzigen Farbe ist
 * ein Rechteck, kein Baukörper. In Wirklichkeit trifft eine Fassade oben das
 * volle Himmelslicht und steht unten im zurückgeworfenen Licht des Bodens –
 * deshalb wird sie zum Fuß hin dunkler. Zusammen mit dem hellen Strich an der
 * Dachkante (dem Reflex auf der Attika) macht das aus dem Klotz ein Gebäude.
 */
export function quader(q: Quader): string {
  const z = q.z ?? 0;
  const o = z + q.h;
  const c = q.farbe;
  const kc = kantenTon(q.dachFarbe ?? c);
  // Dach
  const d = polyK(
    [iso(q.u0, q.v0, o), iso(q.u1, q.v0, o), iso(q.u1, q.v1, o), iso(q.u0, q.v1, o)],
    ton(q.dachFarbe ?? c, LICHT.dach),
    kc,
  );

  // Wandverläufe: oben die volle Wandfarbe, unten abgedunkelt.
  const id = `w${(verlaufNr++).toString(36)}`;
  const [, yOben] = iso(q.u1, q.v1, o);
  const [, yUnten] = iso(q.u1, q.v1, z);
  const verlauf = (name: string, hell: number, dunkel: number): string =>
    `<linearGradient id="${name}" gradientUnits="userSpaceOnUse" ` +
    `x1="0" y1="${round(yOben)}" x2="0" y2="${round(yUnten)}">` +
    `<stop offset="0" stop-color="${ton(c, hell)}"/>` +
    `<stop offset="1" stop-color="${ton(c, dunkel)}"/></linearGradient>`;
  const defs =
    `<defs>${verlauf(`${id}l`, LICHT.links * 1.05, LICHT.links * 0.84)}` +
    `${verlauf(`${id}r`, LICHT.rechts * 1.08, LICHT.rechts * 0.86)}</defs>`;

  const kw = kantenTon(c);
  // Linke Wand (Südwest-Seite: v = v1)
  const l = polyK(
    [iso(q.u0, q.v1, o), iso(q.u1, q.v1, o), iso(q.u1, q.v1, z), iso(q.u0, q.v1, z)],
    `url(#${id}l)`,
    kw,
  );
  // Rechte Wand (Südost-Seite: u = u1)
  const r = polyK(
    [iso(q.u1, q.v0, o), iso(q.u1, q.v1, o), iso(q.u1, q.v1, z), iso(q.u1, q.v0, z)],
    `url(#${id}r)`,
    kw,
  );

  // Kantenlicht an der oberen Wandkante – der schmale Reflex, an dem das Auge
  // die Kante überhaupt erst als Kante liest.
  const kante =
    q.h < 6
      ? ""
      : poly(
          [iso(q.u0, q.v1, o), iso(q.u1, q.v1, o), iso(q.u1, q.v1, o - 1.4), iso(q.u0, q.v1, o - 1.4)],
          ton(c, Math.min(1.35, LICHT.links * 1.3)),
        ) +
        poly(
          [iso(q.u1, q.v0, o), iso(q.u1, q.v1, o), iso(q.u1, q.v1, o - 1.4), iso(q.u1, q.v0, o - 1.4)],
          ton(c, Math.min(1.2, LICHT.rechts * 1.3)),
        );

  return defs + d + l + r + kante;
}

/**
 * Satteldach über einer Grundfläche. Der First läuft entlang u (also von
 * hinten-links nach vorne-rechts) oder entlang v – je nachdem, wie das Gebäude
 * steht. Zwei Dachflächen mit unterschiedlichem Licht, sonst wirkt es flach.
 */
/**
 * Schindelreihen auf einer Dachfläche.
 *
 * WARUM DAS DEN GRÖSSTEN UNTERSCHIED MACHT: In der Isometrie ist das Dach die
 * größte sichtbare Fläche eines Gebäudes. Solange sie eine einzige Farbe hat,
 * bleibt jedes Haus ein Klotz mit einem Deckel – egal wie gut Farbe und
 * Kontur gewählt sind. Vorbilder wie Hay Day malen dort einzelne Schindeln;
 * das ist der Grund, warum ihre Häuser aus jeder Entfernung "gebaut" aussehen.
 *
 * Nachgezeichnet wird das mit Reihen, die von der Traufe zum First laufen:
 * jede Reihe eine Spur anders hell, darunter eine dunkle Fuge. Aus zwei
 * Dutzend Polygonen entsteht so eine Fläche mit Struktur – und weil die Reihen
 * der Dachneigung folgen, stimmt die Perspektive von selbst.
 *
 * `a` und `b` sind die beiden Traufecken, `a2`/`b2` die zugehörigen Firstecken.
 * Jede Ecke ist ein (u, v, w)-Tripel in Kachel-/Pixelmaßen.
 */
function schindeln(
  a: [number, number, number],
  b: [number, number, number],
  a2: [number, number, number],
  b2: [number, number, number],
  farbe: string,
  licht: number,
  reihen = 7,
): string {
  const misch = (
    p: [number, number, number],
    q: [number, number, number],
    t: number,
  ): [number, number, number] => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
    p[2] + (q[2] - p[2]) * t,
  ];
  const teile: string[] = [];
  for (let i = 0; i < reihen; i++) {
    const t0 = i / reihen;
    const t1 = (i + 1) / reihen;
    const l0 = misch(a, a2, t0);
    const r0 = misch(b, b2, t0);
    const l1 = misch(a, a2, t1);
    const r1 = misch(b, b2, t1);
    // Reihen wechseln leicht in der Helligkeit – nie stark, sonst wird aus dem
    // Dach ein Zebrastreifen.
    const f = licht * (i % 2 === 0 ? 1.03 : 0.97);
    teile.push(
      poly(
        [iso(...l0), iso(...r0), iso(...r1), iso(...l1)],
        ton(farbe, f),
      ),
    );
    // Die Schattenfuge an der Unterkante der Reihe: erst sie macht aus dem
    // Farbwechsel eine Kante, an der eine Schindel über der nächsten liegt.
    const s0 = misch(l0, l1, 0.16);
    const s1 = misch(r0, r1, 0.16);
    teile.push(
      poly([iso(...l0), iso(...r0), iso(...s1), iso(...s0)], ton(farbe, licht * 0.78), ` opacity="0.75"`),
    );
  }
  return teile.join("");
}

export function satteldach(
  q: Omit<Quader, "h" | "dachFarbe"> & { hoehe: number; entlang?: "u" | "v" },
): string {
  const z = q.z ?? 0;
  const first = z + q.hoehe;
  const c = q.farbe;
  if ((q.entlang ?? "u") === "u") {
    // First in der Mitte zwischen v0 und v1
    const vm = (q.v0 + q.v1) / 2;
    const kd = kantenTon(c);
    const hinten =
      polyK(
        [iso(q.u0, q.v0, z), iso(q.u1, q.v0, z), iso(q.u1, vm, first), iso(q.u0, vm, first)],
        ton(c, LICHT.dach),
        kd,
      ) +
      schindeln(
        [q.u0, q.v0, z],
        [q.u1, q.v0, z],
        [q.u0, vm, first],
        [q.u1, vm, first],
        c,
        LICHT.dach,
      );
    const vorne =
      polyK(
        [iso(q.u0, vm, first), iso(q.u1, vm, first), iso(q.u1, q.v1, z), iso(q.u0, q.v1, z)],
        ton(c, LICHT.links * 0.95),
        kd,
      ) +
      schindeln(
        [q.u0, q.v1, z],
        [q.u1, q.v1, z],
        [q.u0, vm, first],
        [q.u1, vm, first],
        c,
        LICHT.links * 0.95,
      );
    // Giebel rechts (Dreieck an der Südost-Seite)
    const giebel = polyK(
      [iso(q.u1, q.v0, z), iso(q.u1, vm, first), iso(q.u1, q.v1, z)],
      ton(c, LICHT.rechts),
      kd,
    );
    return hinten + vorne + giebel;
  }
  const um = (q.u0 + q.u1) / 2;
  const kd = kantenTon(c);
  const hinten =
    polyK(
      [iso(q.u0, q.v0, z), iso(um, q.v0, first), iso(um, q.v1, first), iso(q.u0, q.v1, z)],
      ton(c, LICHT.dach),
      kd,
    ) +
    schindeln(
      [q.u0, q.v0, z],
      [q.u0, q.v1, z],
      [um, q.v0, first],
      [um, q.v1, first],
      c,
      LICHT.dach,
    );
  const vorne =
    polyK(
      [iso(um, q.v0, first), iso(q.u1, q.v0, z), iso(q.u1, q.v1, z), iso(um, q.v1, first)],
      ton(c, LICHT.rechts * 1.05),
      kd,
    ) +
    schindeln(
      [q.u1, q.v0, z],
      [q.u1, q.v1, z],
      [um, q.v0, first],
      [um, q.v1, first],
      c,
      LICHT.rechts * 1.05,
    );
  const giebel = polyK(
    [iso(q.u0, q.v1, z), iso(um, q.v1, first), iso(q.u1, q.v1, z)],
    ton(c, LICHT.links),
    kd,
  );
  return hinten + vorne + giebel;
}

/**
 * Tonnendach (Rundhalle) – die typische Silhouette einer Umschlaghalle.
 *
 * Wichtig: nicht als Stapel von Quadern bauen. Das ergibt eine sichtbare Treppe.
 * Stattdessen wird der Bogen in Streifen entlang der Firstrichtung zerlegt; jeder
 * Streifen ist ein sauberes Parallelogramm, und die Helligkeit wandert mit der
 * Neigung von hell (dem Licht zugewandt) nach dunkel. So wirkt die Rundung weich.
 */
export function tonnendach(
  q: Omit<Quader, "h" | "dachFarbe"> & { hoehe: number; stufen?: number },
): string {
  const z = q.z ?? 0;
  const n = q.stufen ?? 14;
  const teile: string[] = [];
  const spanne = q.v1 - q.v0;
  const bogen = (t: number) => ({
    v: q.v0 + spanne * t,
    w: z + q.hoehe * Math.sin(Math.PI * t),
  });

  for (let i = 0; i < n; i++) {
    const a = bogen(i / n);
    const b = bogen((i + 1) / n);
    // Neigung → Licht: hinten (t=0) zum Licht gedreht, vorne (t=1) weg.
    const t = (i + 0.5) / n;
    const f = LICHT.links + (LICHT.dach + 0.06 - LICHT.links) * (Math.cos(Math.PI * t) * 0.5 + 0.5);
    teile.push(
      poly(
        [iso(q.u0, a.v, a.w), iso(q.u1, a.v, a.w), iso(q.u1, b.v, b.w), iso(q.u0, b.v, b.w)],
        ton(q.farbe, f),
      ),
    );
  }

  // Giebelscheibe an der Südost-Seite: der halbrunde Abschluss der Halle.
  const rand: Pkt[] = [];
  for (let i = 0; i <= n; i++) {
    const p = bogen(i / n);
    rand.push(iso(q.u1, p.v, p.w));
  }
  rand.push(iso(q.u1, q.v1, z), iso(q.u1, q.v0, z));
  teile.push(poly(rand, ton(q.farbe, LICHT.rechts)));

  return teile.join("");
}

/** Flache Fläche auf dem Boden (Hofmarkierung, Rasenstück, Rampenkante). */
export function flaeche(
  u0: number,
  v0: number,
  u1: number,
  v1: number,
  fill: string,
  z = 0,
  extra = "",
): string {
  return poly([iso(u0, v0, z), iso(u1, v0, z), iso(u1, v1, z), iso(u0, v1, z)], fill, extra);
}

/** Senkrechter Mast/Pfosten (Fahnenmast, Laterne, Zaunpfosten, Kranstütze). */
export function mast(u: number, v: number, h: number, breite: number, farbe: string): string {
  const [x, y] = iso(u, v, 0);
  return `<rect x="${round(x - breite / 2)}" y="${round(y - h)}" width="${round(breite)}" height="${round(h)}" fill="${ton(farbe, LICHT.links)}" rx="${round(breite / 2)}"/>`;
}

/**
 * Bodenschatten: die Grundfläche noch einmal, dunkel und weich, leicht nach
 * rechts-unten versetzt (die Sonne steht links oben). Ohne diesen Schatten
 * schweben alle Gebäude über der Karte – er ist der größte einzelne Schritt von
 * "Bildchen auf Kacheln" zu "steht in einer Welt".
 */
export function schatten(u0: number, v0: number, u1: number, v1: number, staerke = 0.26): string {
  // Zwei gestaffelte Umrisse statt eines harten: der äußere breit und schwach,
  // der innere enger und kräftiger. Ein echter Schatten hat einen weichen Saum
  // (Halbschatten), und ohne ihn wirkt jedes Gebäude wie aus Pappe geschnitten.
  const lage = (d: number, kraft: number): string =>
    poly(
      [
        iso(u0 + d * 0.5, v0 + d * 0.5),
        iso(u1 + d, v0 + d * 0.5),
        iso(u1 + d, v1 + d),
        iso(u0 + d * 0.5, v1 + d),
      ],
      // Blaugrau statt Schwarz: ein Schatten ist Himmelslicht ohne Sonne, nie
      // ein dunkler Fleck. Auf Gras wie auf Asphalt bleibt er dadurch neutral.
      "#2c3f52",
      ` opacity="${Math.round(kraft * 1000) / 1000}"`,
    );
  return lage(0.16, staerke * 0.45) + lage(0.1, staerke * 0.8);
}

// --- Fenster, Tore, Bänder --------------------------------------------------

/**
 * Fensterband auf der linken (Südwest-) Wand. Fenster machen aus einem Klotz
 * ein Haus – und die Anzahl der Bänder zeigt die Etagen, also die Ausbaustufe.
 */
export function fensterLinks(
  q: { u0: number; u1: number; v: number },
  z: number,
  hoehe: number,
  anzahl: number,
  farbe: string,
): string {
  const teile: string[] = [];
  const spanne = q.u1 - q.u0;
  const luft = spanne / (anzahl * 2 + 1);
  for (let i = 0; i < anzahl; i++) {
    const a = q.u0 + luft * (i * 2 + 1);
    const b = a + luft;
    teile.push(fensterMitRahmen((u, w) => iso(u, q.v, w), a, b, z, hoehe, farbe));
  }
  return teile.join("");
}

/**
 * Ein einzelnes Fenster mit Rahmen, Sprossenkreuz und Fensterbank.
 *
 * WARUM DER AUFWAND FÜR EIN 8-PIXEL-OBJEKT: Ein Fenster ohne Rahmen ist ein
 * farbiger Fleck in einer Wand. Erst der helle Rahmen macht daraus eine
 * Öffnung, erst das Sprossenkreuz macht daraus GLAS, und erst die Bank darunter
 * macht daraus ein Haus statt einer Fabrikwand. Genau diese drei Striche
 * unterscheiden ein gezeichnetes Spiel von einem Diagramm.
 *
 * `pkt` bildet (Längsmaß, Höhe) auf den Bildschirm ab – dadurch funktioniert
 * dieselbe Zeichnung auf beiden sichtbaren Wänden.
 */
function fensterMitRahmen(
  pkt: (l: number, w: number) => Pkt,
  a: number,
  b: number,
  z: number,
  hoehe: number,
  glas: string,
): string {
  const breite = b - a;
  const rand = Math.min(breite * 0.16, 0.02);
  const randH = hoehe * 0.14;
  const mitte = (a + b) / 2;
  const zM = z + hoehe / 2;

  // Rahmen: ein helles Rechteck, das etwas größer ist als die Scheibe.
  const rahmen = poly(
    [pkt(a - rand, z + hoehe + randH), pkt(b + rand, z + hoehe + randH), pkt(b + rand, z - randH * 0.5), pkt(a - rand, z - randH * 0.5)],
    "#f6f1e4",
  );
  // Scheibe mit Verlauf von oben hell nach unten dunkel wäre hier zu teuer –
  // stattdessen ein heller Keil oben links, der die Himmelsspiegelung andeutet.
  const scheibe = poly([pkt(a, z + hoehe), pkt(b, z + hoehe), pkt(b, z), pkt(a, z)], glas);
  const glanz = poly(
    [pkt(a, z + hoehe), pkt(mitte, z + hoehe), pkt(a, zM)],
    "#ffffff",
    ` opacity="0.3"`,
  );
  // Sprossenkreuz
  const sprosseQ = poly(
    [pkt(a, zM + hoehe * 0.035), pkt(b, zM + hoehe * 0.035), pkt(b, zM - hoehe * 0.035), pkt(a, zM - hoehe * 0.035)],
    "#f6f1e4",
    ` opacity="0.9"`,
  );
  const sprosseS = poly(
    [pkt(mitte - breite * 0.05, z + hoehe), pkt(mitte + breite * 0.05, z + hoehe), pkt(mitte + breite * 0.05, z), pkt(mitte - breite * 0.05, z)],
    "#f6f1e4",
    ` opacity="0.9"`,
  );
  // Fensterbank: der kleine Vorsprung, der unten einen Schatten wirft.
  const bank = poly(
    [pkt(a - rand * 1.6, z - randH * 0.5), pkt(b + rand * 1.6, z - randH * 0.5), pkt(b + rand * 1.6, z - randH * 1.3), pkt(a - rand * 1.6, z - randH * 1.3)],
    "#e5dcc6",
  );
  return rahmen + scheibe + glanz + sprosseQ + sprosseS + bank;
}

/** Fensterband auf der rechten (Südost-) Wand. */
export function fensterRechts(
  q: { v0: number; v1: number; u: number },
  z: number,
  hoehe: number,
  anzahl: number,
  farbe: string,
): string {
  const teile: string[] = [];
  const spanne = q.v1 - q.v0;
  const luft = spanne / (anzahl * 2 + 1);
  for (let i = 0; i < anzahl; i++) {
    const a = q.v0 + luft * (i * 2 + 1);
    const b = a + luft;
    teile.push(fensterMitRahmen((v, w) => iso(q.u, v, w), a, b, z, hoehe, farbe));
  }
  return teile.join("");
}

// --- Sprite zusammensetzen --------------------------------------------------

export interface Sprite {
  /** Breite des SVG in px */
  w: number;
  /** Höhe des SVG in px */
  h: number;
  /** fertige data-URI */
  url: string;
}

/** Breite aller Gebäude-Sprites: eine Kachel plus Luft für Rampen und Vordächer. */
export const SPRITE_W = 132;

/**
 * Packt gezeichnete Fragmente in ein SVG. Der Ursprung (Kachelmitte) liegt so,
 * dass die untere Spitze der Grundraute genau auf der SVG-Unterkante sitzt –
 * dadurch kann die Karte das Sprite ohne Korrekturwert an die Kachel setzen.
 *
 * `bauhoehe` ist die reine Höhe des Bauwerks über dem Boden. Die halbe Raute
 * nach unten (bis zur vorderen Spitze) und die halbe nach hinten (bis zur
 * hinteren Ecke) kommen automatisch dazu – sonst würde jedes Sprite oben
 * abgeschnitten.
 */
// Ohne Bewegung ist die Karte tot, sobald kein Fahrzeug fährt (Optik-Review
// B15). Jedes Sprite ist eine statische data-URI – CSS von außen erreicht sie
// nicht. Deshalb liegt hier EIN Stilblock, der mit in jedes SVG wandert; er
// kostet nur dann etwas, wenn ein Teil (fahne/schornstein/laterne) eine der
// Klassen tatsächlich setzt.
const BEWEGUNG =
  `<style>` +
  `.bt-fahne{animation:bt-wehen 2.6s ease-in-out infinite}` +
  `@keyframes bt-wehen{0%,100%{transform:skewY(0deg)}50%{transform:skewY(-7deg)}}` +
  `.bt-rauch{animation:bt-steigen 3.6s ease-out infinite;transform-box:fill-box;transform-origin:50% 100%}` +
  `@keyframes bt-steigen{0%{transform:translateY(0) scale(0.6);opacity:0.55}70%{opacity:0.3}100%{transform:translateY(-20px) scale(1.3);opacity:0}}` +
  `.bt-licht{animation:bt-pulsieren 3.4s ease-in-out infinite}` +
  `@keyframes bt-pulsieren{0%,100%{opacity:0.55}50%{opacity:1}}` +
  `@media (prefers-reduced-motion:reduce){.bt-fahne,.bt-rauch,.bt-licht{animation:none}}` +
  `</style>`;

export function sprite(teile: string, bauhoehe: number): Sprite {
  const h = Math.round(TILE_H + bauhoehe + 6);
  const svg =
    // Ohne shape-rendering-Vorgabe: die Iso-Diagonalen brauchen Antialiasing,
    // sonst treppen alle Dachkanten sichtbar.
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SPRITE_W}" height="${h}" viewBox="0 0 ${SPRITE_W} ${h}">` +
    BEWEGUNG +
    `<g transform="translate(${SPRITE_W / 2} ${h - TILE_H / 2})">${teile}</g></svg>`;
  return {
    w: SPRITE_W,
    h,
    // encodeURIComponent statt base64: bleibt lesbar, ist kürzer und spart den
    // Umweg über btoa (das an Umlauten scheitern würde).
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
}
