// Die Fahrzeuge des Betriebs – selbst gezeichnet, isometrisch, in vier Richtungen.
//
// WARUM SELBST ZEICHNEN: Bis hierher rollten fremde Kachel-PNGs über die Karte
// (Kenney, CC0). Sie waren der letzte Stilbruch der Welt – flache Klötzchen mit
// vier gleich großen Rädern, neben selbst gezeichneten Hallen mit Wandverlauf
// und Kantenlicht. Vor allem aber kennen sie keinen Sattelzug, keinen
// Silo-Aufbau und keine Wechselbrücke: Der Fuhrpark unterscheidet neun
// Fahrzeugtypen, und wer einen Kühlauflieger kauft, soll einen Kühlauflieger
// fahren sehen. Das Fahrzeug auf der Straße ist die einzige Stelle, an der der
// Fuhrpark sichtbar wird.
//
// KOORDINATEN: Ein Fahrzeug wird in seinen eigenen Maßen gedacht –
//   l  → Länge, in Fahrtrichtung (0 = Fahrzeugmitte, negativ = hinten)
//   b  → Breite, quer dazu (positiv = die dem Betrachter zugewandte Seite)
//   w  → Höhe über der Fahrbahn, in Pixeln
// Erst beim Zeichnen wird daraus je nach Fahrtrichtung ein Iso-Punkt. Dadurch
// steht jedes Fahrzeug nur einmal im Code und trotzdem in vier Richtungen auf
// der Karte.

import { TILE_W, TILE_H, LICHT, ton } from "./iso";
import { P, HAUS_HEX } from "./palette";

export type Richtung = "se" | "sw" | "ne" | "nw";

/** Eine Kachellänge in Fahrzeugmaßen: so lang ist ein Sattelzug ungefähr. */
const M = TILE_W; // Umrechnung Kachel → px in der Breite

// --- Projektion -------------------------------------------------------------
//
// Der Betrachter schaut von Südosten oben. Sichtbar sind deshalb IMMER die
// beiden südlichen Flanken eines Körpers – die Fahrtrichtung entscheidet nur
// darüber, ob das die Front oder das Heck ist:
//
//   se (↘) Front rechts, Fahrerseite links   |  nw (↖) Heck rechts
//   sw (↙) Front links,  Fahrerseite rechts  |  ne (↗) Heck links
//
// Genau deshalb genügt EINE Zeichnung je Fahrzeug: Die Front wird nur gemalt,
// wenn sie zum Betrachter zeigt, und die Räder nur auf der Seite, die man sieht.

interface Blick {
  /** Länge → Iso: [du, dv] je Einheit l */
  l: [number, number];
  /** Breite → Iso: [du, dv] je Einheit b */
  b: [number, number];
  /** Zeigt die Front zum Betrachter? */
  frontSichtbar: boolean;
  /** Liegt die Front auf der rechten (Südost-) Fläche? Sonst links. */
  frontRechts: boolean;
  /**
   * Vorzeichen der Fahrzeugflanke, die zum Betrachter zeigt. Alles, was auf
   * der Seite sitzt – Räder, Spanngurte, Warntafel, Stützbeine – muss dieses
   * Vorzeichen benutzen, sonst zeichnet man es auf die abgewandte Seite und es
   * verschwindet hinter dem Fahrzeug.
   */
  flanke: 1 | -1;
}

const BLICK: Record<Richtung, Blick> = {
  se: { l: [1, 0], b: [0, 1], frontSichtbar: true, frontRechts: true, flanke: 1 },
  nw: { l: [-1, 0], b: [0, -1], frontSichtbar: false, frontRechts: true, flanke: -1 },
  sw: { l: [0, 1], b: [1, 0], frontSichtbar: true, frontRechts: false, flanke: 1 },
  ne: { l: [0, -1], b: [-1, 0], frontSichtbar: false, frontRechts: false, flanke: -1 },
};

type Pkt = [number, number];

/** Fahrzeugkoordinate → Bildschirmversatz zur Standmitte. */
function fp(d: Blick, l: number, b: number, w: number): Pkt {
  const u = d.l[0] * l + d.b[0] * b;
  const v = d.l[1] * l + d.b[1] * b;
  return [((u - v) * TILE_W) / 2, ((u + v) * TILE_H) / 2 - w];
}

const r1 = (n: number): number => Math.round(n * 10) / 10;

const poly = (pkte: Pkt[], fill: string, extra = ""): string =>
  `<polygon points="${pkte.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ")}" fill="${fill}"${extra}/>`;

/**
 * Dasselbe Polygon mit Kontur.
 *
 * DAS IST DER SCHRITT VON "VEKTORGRAFIK" ZU "GEMALT". Ein Cartoon-Spiel wie das
 * Vorbild setzt jede Fläche mit einer dunkleren Linie ab – nicht schwarz,
 * sondern ein tiefer Ton der Fläche selbst. Ohne sie zerfallen kleine Objekte
 * auf buntem Untergrund: Ein blauer Lkw auf einer grünen Wiese hat zwar
 * Kontrast, aber keine Kante, und aus drei Metern Abstand auf einem Handy
 * verschwimmt er zum Fleck. Mit Kontur behält er seine Silhouette.
 */
// Standardbreite 1.5: Die Sprites werden mit gut zwei Dritteln ihrer Zeichengröße
// dargestellt (FAHRZEUG_SKALA), aus 1.5 px werden also gut 1 px auf dem Schirm.
// Dünner gezeichnet verschwindet die Kontur beim Verkleinern ganz.
const polyK = (pkte: Pkt[], fill: string, kontur: string, breite = 1.5, extra = ""): string =>
  poly(
    pkte,
    fill,
    ` stroke="${kontur}" stroke-width="${breite}" stroke-linejoin="round"${extra}`,
  );

/** Der Konturton einer Farbe: deutlich dunkler, aber farbig – nie Schwarz. */
const kanteVon = (c: string): string => ton(c, 0.52);

let nr = 0;
const id = (): string => `f${(nr++).toString(36)}`;

/**
 * Welche Kante eines Bauteils zeigt zum Betrachter?
 *
 * Der häufigste Fehler beim isometrischen Zeichnen: Man malt immer die
 * "vordere" Fläche des Datenmodells. Sichtbar sind aber immer die Flächen mit
 * dem größten u und dem größten v – und ob das die Front oder das Heck des
 * Fahrzeugs ist, entscheidet die Fahrtrichtung. Fährt der Lkw nach Nordwesten,
 * sieht man seine Rückseite; malt man trotzdem die Frontscheibe, fährt er
 * rückwärts durch die Welt.
 */
const sichtL = (d: Blick, l0: number, l1: number): [number, number] =>
  d.l[0] + d.l[1] > 0 ? [l0, l1] : [l1, l0];
const sichtB = (d: Blick, b0: number, b1: number): [number, number] =>
  d.b[0] + d.b[1] > 0 ? [b0, b1] : [b1, b0];

/**
 * Der Maler: sammelt Bauteile mit ihrer Tiefe und gibt sie von hinten nach
 * vorne aus. Ohne ihn liegt bei einem nach Nordwesten fahrenden Sattelzug die
 * Zugmaschine vor dem Auflieger, obwohl sie hinter ihm steht.
 */
class Maler {
  private teile: { t: number; svg: string }[] = [];
  private tiefe: number;
  // Ausgeschriebener Konstruktor statt Parameter-Eigenschaft: Das Projekt
  // übersetzt mit `erasableSyntaxOnly`, und `constructor(private d)` erzeugt
  // Code, den ein reiner Typ-Entferner nicht wegstreichen kann.
  constructor(d: Blick) {
    this.tiefe = d.l[0] + d.l[1];
  }
  /** `l` ist die Position des Bauteils auf der Fahrzeugachse. */
  add(l: number, svg: string): void {
    this.teile.push({ t: this.tiefe * l, svg });
  }
  /** Etwas, das immer ganz hinten liegt (Bodenschatten). */
  grund(svg: string): void {
    this.teile.push({ t: -1e6, svg });
  }
  fertig(): string {
    return this.teile
      .map((teil, i) => ({ teil, i }))
      // Stabil sortieren: gleich tiefe Teile behalten ihre Reihenfolge, sonst
      // springen Räder und Kotflügel bei jedem Neuzeichnen übereinander.
      .sort((a, b) => a.teil.t - b.teil.t || a.i - b.i)
      .map((x) => x.teil.svg)
      .join("");
  }
}

/**
 * Ein Fahrzeugkörper: Dach, die sichtbare Flanke und die sichtbare Stirnseite.
 *
 * Die Flächen bekommen denselben Dreiklang wie die Gebäude (Dach hell,
 * Südwest mittel, Südost dunkel) – eine Welt hat eine Sonne. Zusätzlich läuft
 * über jede Wand ein Verlauf nach unten: Blech fängt oben den Himmel und steht
 * unten im Schatten des eigenen Fahrwerks. Ohne diesen Verlauf sieht ein
 * Lastzug aus wie ein farbiges Rechteck.
 */
function korpus(
  d: Blick,
  m: { l0: number; l1: number; b0: number; b1: number; w0: number; w1: number },
  farbe: string,
  o: { dachFarbe?: string; rundung?: number; glanz?: boolean } = {},
): string {
  const { w0, w1 } = m;
  const c = farbe;
  const dachC = o.dachFarbe ?? c;

  // Nicht die "vordere" Kante des Datenmodells zeichnen, sondern die, die zum
  // Betrachter zeigt – sonst fährt der Lkw in zwei von vier Richtungen rückwärts.
  const [lFern, lNah] = sichtL(d, m.l0, m.l1);
  const [bFern, bNah] = sichtB(d, m.b0, m.b1);

  const A = (l: number, b: number, w: number) => fp(d, l, b, w);

  const teile: string[] = [];
  const kante = kanteVon(c);

  // --- Dach
  teile.push(
    polyK(
      [A(lFern, bFern, w1), A(lNah, bFern, w1), A(lNah, bNah, w1), A(lFern, bNah, w1)],
      ton(dachC, LICHT.dach),
      kante,
    ),
  );

  // --- Verläufe für die beiden sichtbaren Wände
  const gid = id();
  const [, yO] = A(lNah, bNah, w1);
  const [, yU] = A(lNah, bNah, w0);
  const verlauf = (name: string, hell: number, dunkel: number): string =>
    `<linearGradient id="${name}" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(yO)}" x2="0" y2="${r1(yU)}">` +
    `<stop offset="0" stop-color="${ton(c, hell)}"/>` +
    `<stop offset="1" stop-color="${ton(c, dunkel)}"/></linearGradient>`;
  teile.push(
    `<defs>${verlauf(`${gid}a`, LICHT.links * 1.06, LICHT.links * 0.8)}` +
      `${verlauf(`${gid}b`, LICHT.rechts * 1.1, LICHT.rechts * 0.82)}</defs>`,
  );

  // Welche Fahrzeugfläche liegt auf welcher Bildschirmseite? Die Flanke (b1)
  // und die Stirnseite (l1) tauschen je nach Richtung ihren Platz.
  const flankeLinks = !d.frontRechts;
  const flankeFill = `url(#${gid}${flankeLinks ? "a" : "b"})`;
  const stirnFill = `url(#${gid}${flankeLinks ? "b" : "a"})`;

  // --- Flanke (die lange Seite)
  teile.push(
    polyK(
      [A(lFern, bNah, w1), A(lNah, bNah, w1), A(lNah, bNah, w0), A(lFern, bNah, w0)],
      flankeFill,
      kante,
    ),
  );
  // --- Stirnseite (Front oder Heck)
  teile.push(
    polyK(
      [A(lNah, bFern, w1), A(lNah, bNah, w1), A(lNah, bNah, w0), A(lNah, bFern, w0)],
      stirnFill,
      kante,
    ),
  );

  // --- Kantenlicht auf der Dachkante: der schmale Reflex, an dem das Auge die
  // Kante erst als Kante liest. Bei Fahrzeugen ist er entscheidend, weil sie
  // klein sind – ohne ihn verschwimmt die Silhouette mit dem Untergrund.
  if (o.glanz !== false && w1 - w0 > 4) {
    const k = 1.3;
    teile.push(
      poly(
        [A(lFern, bNah, w1), A(lNah, bNah, w1), A(lNah, bNah, w1 - k), A(lFern, bNah, w1 - k)],
        ton(c, Math.min(1.4, LICHT.links * 1.32)),
        ` opacity="0.85"`,
      ),
    );
    teile.push(
      poly(
        [A(lNah, bFern, w1), A(lNah, bNah, w1), A(lNah, bNah, w1 - k), A(lNah, bFern, w1 - k)],
        ton(c, Math.min(1.3, LICHT.rechts * 1.34)),
        ` opacity="0.8"`,
      ),
    );
  }

  return teile.join("");
}

/** Eine flache Platte (Ladefläche, Chassis, Rahmen) ohne Wände. */
function platte(
  d: Blick,
  m: { l0: number; l1: number; b0: number; b1: number; w: number },
  farbe: string,
): string {
  const A = (l: number, b: number) => fp(d, l, b, m.w);
  return polyK([A(m.l0, m.b0), A(m.l1, m.b0), A(m.l1, m.b1), A(m.l0, m.b1)], farbe, kanteVon(farbe), 1.1);
}

/**
 * Ein liegender Zylinder in Fahrtrichtung – Silo, Tank, Betonmischer.
 *
 * Wie beim Tonnendach der Hallen wird der Bogen in Streifen zerlegt statt in
 * Quader gestapelt: Ein Stapel ergibt eine sichtbare Treppe, Streifen ergeben
 * eine weiche Rundung. Die Helligkeit wandert dabei mit der Neigung.
 */
function zylinder(
  d: Blick,
  m: { l0: number; l1: number; bMitte: number; radius: number; wMitte: number },
  farbe: string,
  stufen = 12,
): string {
  const teile: string[] = [];
  const { l0, l1, bMitte, radius, wMitte } = m;
  // Der Querschnitt wird in Fahrzeugbreite (b) und Höhe (w) beschrieben. Ein
  // Kreis in Weltmaßen: b in Kachelanteilen, w in Pixeln – deshalb wird b mit
  // der Kachelbreite skaliert, damit die Röhre rund bleibt und nicht oval.
  const rb = radius / M;
  // Welche Flanke der Röhre zum Betrachter zeigt, hängt an der Fahrtrichtung.
  const s = d.b[0] + d.b[1] > 0 ? 1 : -1;
  const punkt = (t: number) => {
    // t = 0 an der abgewandten Seite (oben-hinten), t = 1 an der zugewandten.
    const a = Math.PI * (1 - t);
    return { b: bMitte + s * Math.cos(a) * rb, w: wMitte + Math.sin(a) * radius };
  };
  for (let i = 0; i < stufen; i++) {
    const a = punkt(i / stufen);
    const c2 = punkt((i + 1) / stufen);
    const t = (i + 0.5) / stufen;
    // Licht: der Scheitel bekommt am meisten, die zugewandte Flanke fällt ab.
    const f = LICHT.links + (LICHT.dach + 0.1 - LICHT.links) * Math.sin(Math.PI * t) ** 0.7 -
      Math.max(0, t - 0.55) * 0.34;
    const flaeche: Pkt[] = [
      fp(d, l0, a.b, a.w),
      fp(d, l1, a.b, a.w),
      fp(d, l1, c2.b, c2.w),
      fp(d, l0, c2.b, c2.w),
    ];
    const fill = ton(farbe, Math.max(0.35, f));
    // Nur der erste und der letzte Streifen tragen die Kontur: Sie bilden die
    // Silhouette der Röhre. Bekämen alle Streifen eine, sähe der Tank aus wie
    // ein Wellblechrohr.
    const rand = i === 0 || i === stufen - 1;
    teile.push(rand ? polyK(flaeche, fill, kanteVon(farbe)) : poly(flaeche, fill));
  }
  // Stirnscheibe an der zum Betrachter zeigenden Seite: der halbrunde Abschluss.
  const lNah = sichtL(d, l0, l1)[1];
  const rand: Pkt[] = [];
  for (let i = 0; i <= stufen; i++) {
    const p = punkt(i / stufen);
    rand.push(fp(d, lNah, p.b, p.w));
  }
  // Der Bogen beginnt und endet auf der Mittelhöhe – das Polygon schließt sich
  // von selbst zur Halbscheibe, ein zusätzlicher Fußpunkt würde sie überschlagen.
  teile.push(polyK(rand, ton(farbe, LICHT.rechts * 1.04), kanteVon(farbe)));
  return teile.join("");
}

/**
 * Ein Rad an der sichtbaren Flanke. Räder sind der Grund, warum ein Kasten zum
 * Fahrzeug wird: Sie geben ihm Bodenkontakt und Maßstab. Gezeichnet wird nur,
 * was man sieht – die Räder der abgewandten Seite kosten nur Rechenzeit.
 */
function rad(d: Blick, l: number, b: number, r: number): string {
  const [x, y] = fp(d, l, b, r);
  return (
    `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 0.92)}" ry="${r1(r)}" fill="#232830"/>` +
    `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(r * 0.44)}" ry="${r1(r * 0.5)}" fill="#8e97a3"/>` +
    `<ellipse cx="${r1(x - r * 0.16)}" cy="${r1(y - r * 0.24)}" rx="${r1(r * 0.2)}" ry="${r1(r * 0.24)}" fill="#c3cad3" opacity="0.7"/>`
  );
}

/** Eine Achsgruppe: mehrere Räder in gleichem Abstand. */
function achsen(d: Blick, l0: number, anzahl: number, abstand: number, b: number, r: number): string {
  const out: string[] = [];
  for (let i = 0; i < anzahl; i++) out.push(rad(d, l0 + i * abstand, b, r));
  return out.join("");
}

/**
 * Windschutzscheibe und Seitenfenster des Führerhauses.
 *
 * Die Scheibe bekommt einen Verlauf von hell (Himmelsspiegelung oben) nach
 * dunkel und einen schrägen Glanzstreifen. Das ist die teuerste Fläche des
 * ganzen Fahrzeugs, gemessen an ihrer Größe – ein Lkw ohne Scheibe sieht aus
 * wie ein Spielzeugklotz, mit Scheibe hat er ein Gesicht.
 */
function scheiben(
  d: Blick,
  m: { lFront: number; lSeite: number; b0: number; b1: number; w0: number; w1: number },
): string {
  const [bFern, bNah] = sichtB(d, m.b0, m.b1);
  const teile: string[] = [];

  // Seitenfenster auf der sichtbaren Flanke – das sieht man in jeder Richtung.
  // `lSeite` liegt hinter der Front; welche der beiden Kanten weiter hinten
  // liegt, entscheidet wieder die Fahrtrichtung.
  teile.push(
    poly(
      [
        fp(d, m.lSeite, bNah, m.w1),
        fp(d, m.lFront, bNah, m.w1),
        fp(d, m.lFront, bNah, m.w0),
        fp(d, m.lSeite, bNah, m.w0),
      ],
      ton(P.glasDunkel, 1.05),
    ),
  );

  // Die Frontscheibe nur, wenn die Front auch zum Betrachter zeigt. Sie hier
  // bedingungslos zu malen war der Fehler, der die Lkw rückwärts fahren ließ.
  if (!d.frontSichtbar) return teile.join("");

  const gid = id();
  const [, yO] = fp(d, m.lFront, bNah, m.w1);
  const [, yU] = fp(d, m.lFront, bNah, m.w0);
  teile.push(
    `<defs><linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="${r1(yO)}" x2="0" y2="${r1(yU)}">` +
      `<stop offset="0" stop-color="${P.glas}"/><stop offset="1" stop-color="${P.glasDunkel}"/></linearGradient></defs>`,
  );
  teile.push(
    poly(
      [
        fp(d, m.lFront, bFern, m.w1),
        fp(d, m.lFront, bNah, m.w1),
        fp(d, m.lFront, bNah, m.w0),
        fp(d, m.lFront, bFern, m.w0),
      ],
      `url(#${gid})`,
    ),
  );
  // Glanzstreifen quer über die Scheibe: die Spiegelung, die aus einer dunklen
  // Fläche erst Glas macht.
  teile.push(
    poly(
      [
        fp(d, m.lFront, bFern, m.w1),
        fp(d, m.lFront, bFern + (bNah - bFern) * 0.55, m.w1),
        fp(d, m.lFront, bFern, m.w0 + (m.w1 - m.w0) * 0.35),
      ],
      "#ffffff",
      ` opacity="0.34"`,
    ),
  );
  return teile.join("");
}

/**
 * Die Rückseite eines Aufbaus: Türflügel, Rückleuchten, Unterfahrschutz.
 *
 * WARUM DAS NÖTIG IST: In zwei der vier Fahrtrichtungen sieht der Spieler
 * ausschließlich das Heck. Ohne Details ist das eine leere, einfarbige Fläche –
 * die Hälfte aller fahrenden Fahrzeuge auf der Karte wäre ein Rechteck. Zwei
 * Türflügel und zwei rote Leuchten genügen, damit auch von hinten ein Lastzug
 * zu erkennen ist.
 */
function heckdetails(
  d: Blick,
  m: { lHeck: number; b0: number; b1: number; w0: number; w1: number },
  farbe: string,
): string {
  if (d.frontSichtbar) return "";
  // Das Heck liegt bei abgewandter Front auf der zum Betrachter zeigenden
  // Kante; der kleine Versatz hebt die Details von der Wand ab.
  const l = m.lHeck - 0.003;
  const [bFern, bNah] = sichtB(d, m.b0, m.b1);
  const mitte = (bFern + bNah) / 2;
  const teile: string[] = [];

  // Türspalt in der Mitte – die einzige Linie, die ein Kofferheck braucht.
  teile.push(
    poly(
      [
        fp(d, l, mitte - 0.006, m.w1 - 1.5),
        fp(d, l, mitte + 0.006, m.w1 - 1.5),
        fp(d, l, mitte + 0.006, m.w0 + 1),
        fp(d, l, mitte - 0.006, m.w0 + 1),
      ],
      ton(farbe, 0.62),
    ),
  );
  // Rückleuchten: der einzige rote Punkt am ganzen Fahrzeug – deshalb liest ihn
  // das Auge sofort als "Rückseite".
  const leuchte = (b: number) =>
    poly(
      [
        fp(d, l, b - 0.02, m.w0 + 5),
        fp(d, l, b + 0.02, m.w0 + 5),
        fp(d, l, b + 0.02, m.w0 + 2),
        fp(d, l, b - 0.02, m.w0 + 2),
      ],
      "#e2503c",
    );
  teile.push(leuchte(bFern + (bNah - bFern) * 0.2), leuchte(bFern + (bNah - bFern) * 0.8));
  return teile.join("");
}

/**
 * Der Bodenschatten. Anders als bei Gebäuden ist er hier eine weiche Ellipse:
 * Ein Fahrzeug steht auf Rädern, nicht auf einem Fundament, und der Schatten
 * unter ihm hat keine Kante. Der Farbverlauf nach außen ersetzt einen echten
 * Weichzeichner – der wäre bei hunderten Sprites pro Karte zu teuer.
 */
function bodenschatten(d: Blick, l0: number, l1: number, breite: number): string {
  const gid = id();
  const [x0, y0] = fp(d, l0, 0, 0);
  const [x1, y1] = fp(d, l1, 0, 0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = Math.abs(x1 - x0) / 2 + breite * TILE_W * 0.42;
  const ry = Math.abs(y1 - y0) / 2 + breite * TILE_H * 0.5;
  return (
    `<defs><radialGradient id="${gid}">` +
    // Blaugrau statt Schwarz: Schatten ist Himmelslicht ohne Sonne.
    `<stop offset="0.35" stop-color="#2c3f52" stop-opacity="0.4"/>` +
    `<stop offset="1" stop-color="#2c3f52" stop-opacity="0"/></radialGradient></defs>` +
    `<ellipse cx="${r1(cx + 3)}" cy="${r1(cy + 2)}" rx="${r1(rx)}" ry="${r1(ry)}" fill="url(#${gid})"/>`
  );
}

// --- Die Fahrzeuge ----------------------------------------------------------
//
// Jeder Typ des Fuhrparks bekommt eine eigene Silhouette. Der Maßstab richtet
// sich nach der Wirklichkeit: Ein Transporter ist halb so lang wie ein
// Sattelzug, und man soll das auf einen Blick sehen.

/** Führerhaus mit Fahrwerk – die gemeinsame Basis aller Motorwagen. */
function fuehrerhaus(
  d: Blick,
  lFront: number,
  farbe: string,
  o: { hoch?: boolean; breite?: number } = {},
): string {
  const bb = o.breite ?? 0.115;
  const hoehe = o.hoch ? 30 : 24;
  const lHeck = lFront - 0.2;
  const teile: string[] = [];
  teile.push(korpus(d, { l0: lHeck, l1: lFront, b0: -bb, b1: bb, w0: 9, w1: hoehe }, farbe));
  teile.push(
    scheiben(d, {
      lFront: lFront + 0.001,
      lSeite: lHeck + 0.045,
      b0: -bb * 0.86,
      b1: bb * 0.86,
      w0: hoehe - 12,
      w1: hoehe - 2.5,
    }),
  );
  // Stoßfänger und Scheinwerfer nur, wenn die Front zu sehen ist.
  if (d.frontSichtbar) {
    teile.push(
      poly(
        [
          fp(d, lFront, -bb, 9),
          fp(d, lFront, bb, 9),
          fp(d, lFront, bb, 4.5),
          fp(d, lFront, -bb, 4.5),
        ],
        ton(P.stahl, 0.95),
      ),
    );
    const licht = (bo: number) =>
      poly(
        [
          fp(d, lFront + 0.002, bo - 0.022, 12),
          fp(d, lFront + 0.002, bo + 0.022, 12),
          fp(d, lFront + 0.002, bo + 0.022, 9.4),
          fp(d, lFront + 0.002, bo - 0.022, 9.4),
        ],
        "#ffe9a8",
      );
    teile.push(licht(-bb * 0.6), licht(bb * 0.6));
  }
  return teile.join("");
}

interface Bauplan {
  /** hinterste und vorderste Kante in Kachellängen */
  l0: number;
  l1: number;
  /** Höhe des höchsten Punktes in px – bestimmt die Sprite-Höhe */
  hoch: number;
  /** halbe Breite in Kachelanteilen – bestimmt die Sprite-Breite */
  breit: number;
  /**
   * Zeichnet das Fahrzeug in den Maler. Jedes Bauteil meldet dabei an, WO auf
   * der Fahrzeugachse es sitzt – der Maler bringt sie danach in die richtige
   * Reihenfolge. Direkt aneinandergehängte Fragmente würden sonst in zwei der
   * vier Fahrtrichtungen falsch übereinanderliegen.
   */
  zeichne: (d: Blick, farbe: string, m: Maler) => void;
}

const RAD = 5.2;

/** Sattelzug: Zugmaschine plus Auflieger – die Silhouette des Fernverkehrs. */
function sattelzug(
  aufbau: (d: Blick, farbe: string, m: Maler) => void,
  hoch: number,
): Bauplan {
  return {
    l0: -0.6,
    l1: 0.58,
    hoch,
    breit: 0.13,
    zeichne: (d, farbe, m) => {
      m.grund(bodenschatten(d, -0.55, 0.52, 0.26));
      // Die Achsen des Aufliegers, die Sattelachse und die Vorderachse.
      m.add(-0.47, achsen(d, -0.52, 2, 0.1, d.flanke * 0.125, RAD));
      m.add(0.02, achsen(d, 0.02, 1, 0, d.flanke * 0.125, RAD * 0.94));
      m.add(0.3, achsen(d, 0.3, 1, 0, d.flanke * 0.125, RAD));
      aufbau(d, farbe, m);
      m.add(0.45, fuehrerhaus(d, 0.55, farbe, { hoch: true }));
    },
  };
}

/** Planenauflieger: Curtainsider mit senkrechten Spanngurten. */
function planenAufbau(d: Blick, farbe: string, m: Maler): void {
  const bb = 0.125;
  const teile: string[] = [];
  teile.push(
    korpus(d, { l0: -0.58, l1: 0.3, b0: -bb, b1: bb, w0: 11, w1: 36 }, farbe, {
      dachFarbe: ton(farbe, 1.12),
    }),
  );
  // Spanngurte: schmale, dunklere Streifen auf der Plane. Sie geben der großen
  // Fläche Rhythmus – eine einfarbige Plane wirkt wie ein Aufkleber.
  const bF = d.flanke * bb;
  for (let i = 0; i < 7; i++) {
    const l = -0.53 + i * 0.118;
    teile.push(
      poly(
        [fp(d, l, bF, 34.5), fp(d, l + 0.014, bF, 34.5), fp(d, l + 0.014, bF, 12), fp(d, l, bF, 12)],
        ton(farbe, 0.86),
        ` opacity="0.75"`,
      ),
    );
  }
  // Unterfahrschutz
  teile.push(platte(d, { l0: -0.58, l1: 0.3, b0: -bb, b1: bb, w: 10.5 }, ton(P.stahl, 0.7)));
  teile.push(heckdetails(d, { lHeck: -0.58, b0: -bb, b1: bb, w0: 11, w1: 36 }, farbe));
  m.add(-0.14, teile.join(""));
}

/** Kühlauflieger: weißer Koffer mit Aggregat an der Stirnwand. */
function kuehlAufbau(d: Blick, farbe: string, m: Maler): void {
  const bb = 0.125;
  const teile: string[] = [];
  teile.push(
    korpus(d, { l0: -0.58, l1: 0.3, b0: -bb, b1: bb, w0: 11, w1: 37 }, P.putz, {
      dachFarbe: ton(P.putz, 1.02),
    }),
  );
  // Farbstreifen des Betriebs an der Flanke – sonst wäre der Kühler farblos.
  const bF = d.flanke * bb;
  teile.push(
    poly(
      [fp(d, -0.58, bF, 22), fp(d, 0.3, bF, 22), fp(d, 0.3, bF, 16), fp(d, -0.58, bF, 16)],
      ton(farbe, 0.95),
    ),
  );
  teile.push(heckdetails(d, { lHeck: -0.58, b0: -bb, b1: bb, w0: 11, w1: 37 }, P.putz));
  m.add(-0.14, teile.join(""));
  // Kühlaggregat vorn oben: das Erkennungszeichen des Kühlaufliegers. Es steht
  // vor der Stirnwand und braucht deshalb eine eigene Tiefe.
  m.add(0.3, korpus(d, { l0: 0.26, l1: 0.33, b0: -0.09, b1: 0.09, w0: 26, w1: 41 }, P.blechDunkel));
}

/** Tank- oder Silofahrzeug: liegende Röhre auf dem Chassis. */
function roehrenAufbau(farbe: string, warn: boolean) {
  return (d: Blick, _f: string, m: Maler): void => {
    const teile: string[] = [];
    teile.push(platte(d, { l0: -0.58, l1: 0.32, b0: -0.115, b1: 0.115, w: 12 }, ton(P.stahl, 0.72)));
    teile.push(zylinder(d, { l0: -0.56, l1: 0.3, bMitte: 0, radius: 12.5, wMitte: 13 }, farbe));
    if (warn) {
      // Orangefarbene Warntafel nach ADR – Pflicht am Gefahrguttransport und
      // hier zugleich das, was das Fahrzeug auf der Karte unverwechselbar macht.
      const bF = d.flanke * 0.116;
      teile.push(
        poly(
          [fp(d, -0.05, bF, 17), fp(d, 0.11, bF, 17), fp(d, 0.11, bF, 10.5), fp(d, -0.05, bF, 10.5)],
          P.warnOrange,
        ),
      );
    }
    m.add(-0.13, teile.join(""));
    // Domdeckel auf dem Scheitel – jeder mit eigener Tiefe, sonst liegt der
    // hinterste über dem vordersten.
    for (const l of [-0.42, -0.16, 0.1]) {
      m.add(l, korpus(d, { l0: l, l1: l + 0.05, b0: -0.032, b1: 0.032, w0: 24.5, w1: 27.5 }, P.stahl));
    }
  };
}

/** Containerchassis: der 40'-Container auf dem nackten Rahmen. */
function containerAufbau(d: Blick, farbe: string, m: Maler): void {
  const teile: string[] = [];
  teile.push(platte(d, { l0: -0.6, l1: 0.32, b0: -0.115, b1: 0.115, w: 11 }, ton(P.stahl, 0.68)));
  teile.push(
    korpus(d, { l0: -0.56, l1: 0.28, b0: -0.115, b1: 0.115, w0: 12, w1: 33 }, farbe, {
      dachFarbe: ton(farbe, 1.08),
    }),
  );
  // Trapezprofil des Containers: enge, senkrechte Sicken.
  const bF = d.flanke * 0.115;
  for (let i = 0; i < 13; i++) {
    const l = -0.545 + i * 0.064;
    teile.push(
      poly(
        [fp(d, l, bF, 32), fp(d, l + 0.02, bF, 32), fp(d, l + 0.02, bF, 13), fp(d, l, bF, 13)],
        ton(farbe, 0.88),
        ` opacity="0.55"`,
      ),
    );
  }
  teile.push(heckdetails(d, { lHeck: -0.56, b0: -0.115, b1: 0.115, w0: 12, w1: 33 }, farbe));
  m.add(-0.14, teile.join(""));
}

/** Gliederzug mit Wechselbrücken: Motorwagen plus Anhänger, zwei Brücken. */
const gliederzug: Bauplan = {
  l0: -0.72,
  l1: 0.6,
  hoch: 38,
  breit: 0.13,
  zeichne: (d, farbe, m) => {
    m.grund(bodenschatten(d, -0.66, 0.54, 0.26));
    m.add(-0.58, achsen(d, -0.64, 2, 0.11, d.flanke * 0.125, RAD));
    m.add(0.08, achsen(d, 0.03, 2, 0.11, d.flanke * 0.125, RAD));
    const bruecke = (l0: number, l1: number, c: string): string => {
      const t: string[] = [];
      // Der Fahrzeugrahmen, auf dem die Brücke sitzt. Er ist der Grund, warum
      // eine Wechselbrücke höher steht als ein fester Kofferaufbau.
      t.push(platte(d, { l0: l0 - 0.02, l1: l1 + 0.02, b0: -0.115, b1: 0.115, w: 14 }, ton(P.stahl, 0.66)));
      t.push(korpus(d, { l0, l1, b0: -0.125, b1: 0.125, w0: 15, w1: 38 }, c, { dachFarbe: ton(c, 1.1) }));
      // Die eingeklappten Stützbeine an der Flanke: das Merkmal, an dem man
      // eine Wechselbrücke vom Anhänger unterscheidet. Sie kann ohne Kran
      // abgestellt werden – deshalb trägt sie vier Beine mit sich herum.
      const bF = d.flanke * 0.126;
      for (const l of [l0 + 0.06, l1 - 0.06]) {
        t.push(
          poly(
            [fp(d, l, bF, 22), fp(d, l + 0.018, bF, 22), fp(d, l + 0.018, bF, 15.5), fp(d, l, bF, 15.5)],
            ton(P.stahl, 0.78),
          ),
        );
      }
      t.push(heckdetails(d, { lHeck: l0, b0: -0.125, b1: 0.125, w0: 15, w1: 38 }, c));
      return t.join("");
    };
    m.add(-0.44, bruecke(-0.68, -0.2, farbe));
    m.add(0.11, bruecke(-0.1, 0.32, ton(farbe, 1.16)));
    m.add(0.47, fuehrerhaus(d, 0.57, farbe));
  },
};

/** Solo-Lkw mit Kofferaufbau: der klassische Nahverkehrs-Motorwagen. */
const soloLkw: Bauplan = {
  l0: -0.44,
  l1: 0.42,
  hoch: 34,
  breit: 0.12,
  zeichne: (d, farbe, m) => {
    m.grund(bodenschatten(d, -0.4, 0.36, 0.24));
    m.add(-0.29, achsen(d, -0.34, 2, 0.1, d.flanke * 0.115, RAD * 0.95));
    m.add(0.22, achsen(d, 0.22, 1, 0, d.flanke * 0.115, RAD * 0.95));
    m.add(
      -0.12,
      korpus(d, { l0: -0.4, l1: 0.16, b0: -0.115, b1: 0.115, w0: 12, w1: 34 }, farbe, {
        dachFarbe: ton(farbe, 1.12),
      }) + heckdetails(d, { lHeck: -0.4, b0: -0.115, b1: 0.115, w0: 12, w1: 34 }, farbe),
    );
    m.add(0.29, fuehrerhaus(d, 0.39, farbe));
  },
};

/** Transporter 3,5 t: kurz, gedrungen, ein Stück niedriger. */
const transporter: Bauplan = {
  l0: -0.3,
  l1: 0.3,
  hoch: 26,
  breit: 0.1,
  zeichne: (d, farbe, m) => {
    m.grund(bodenschatten(d, -0.26, 0.24, 0.2));
    m.add(-0.2, achsen(d, -0.2, 1, 0, d.flanke * 0.098, RAD * 0.82));
    m.add(0.16, achsen(d, 0.16, 1, 0, d.flanke * 0.098, RAD * 0.82));
    const bb = 0.098;
    // Ein Kastenwagen ist EIN Körper – Kabine und Laderaum gehen ineinander
    // über. Die Kabine wird nur durch die abgesenkte Front angedeutet.
    m.add(
      -0.07,
      korpus(d, { l0: -0.28, l1: 0.14, b0: -bb, b1: bb, w0: 8, w1: 26 }, farbe, {
        dachFarbe: ton(farbe, 1.1),
      }) + heckdetails(d, { lHeck: -0.28, b0: -bb, b1: bb, w0: 8, w1: 26 }, farbe),
    );
    const kabine: string[] = [];
    kabine.push(korpus(d, { l0: 0.1, l1: 0.28, b0: -bb, b1: bb, w0: 8, w1: 21 }, farbe));
    kabine.push(scheiben(d, { lFront: 0.281, lSeite: 0.115, b0: -bb * 0.86, b1: bb * 0.86, w0: 12, w1: 20 }));
    if (d.frontSichtbar) {
      const licht = (bo: number) =>
        poly(
          [
            fp(d, 0.283, bo - 0.02, 11),
            fp(d, 0.283, bo + 0.02, 11),
            fp(d, 0.283, bo + 0.02, 8.8),
            fp(d, 0.283, bo - 0.02, 8.8),
          ],
          "#ffe9a8",
        );
      kabine.push(licht(-bb * 0.6), licht(bb * 0.6));
    }
    m.add(0.19, kabine.join(""));
  },
};

/** Tieflader: tiefe Ladefläche zwischen den Achsen, für Schwergut. */
const tieflader: Bauplan = {
  l0: -0.62,
  l1: 0.58,
  hoch: 32,
  breit: 0.13,
  zeichne: (d, farbe, m) => {
    m.grund(bodenschatten(d, -0.56, 0.52, 0.26));
    m.add(-0.45, achsen(d, -0.54, 3, 0.095, d.flanke * 0.125, RAD * 0.9));
    m.add(0.02, achsen(d, 0.02, 1, 0, d.flanke * 0.125, RAD * 0.94));
    // Der abgesenkte Ladeboden – die Silhouette, an der man einen Tieflader
    // von jedem anderen Auflieger unterscheidet.
    const rahmen: string[] = [];
    rahmen.push(platte(d, { l0: -0.36, l1: 0.16, b0: -0.13, b1: 0.13, w: 7 }, ton(P.stahl, 0.8)));
    rahmen.push(korpus(d, { l0: -0.58, l1: -0.34, b0: -0.125, b1: 0.125, w0: 7, w1: 15 }, ton(P.stahl, 0.9)));
    rahmen.push(korpus(d, { l0: 0.14, l1: 0.3, b0: -0.125, b1: 0.125, w0: 7, w1: 16 }, ton(P.stahl, 0.9)));
    m.add(-0.2, rahmen.join(""));
    // Ladung: ein verzurrter Kubus aus Beton, damit der Tieflader nicht leer
    // wirkt und man sieht, wofür er gekauft wurde.
    const last: string[] = [];
    last.push(korpus(d, { l0: -0.3, l1: 0.1, b0: -0.11, b1: 0.11, w0: 7.5, w1: 25 }, P.beton));
    const bF = d.flanke * 0.111;
    for (const l of [-0.22, -0.02]) {
      last.push(
        poly(
          [fp(d, l, bF, 25), fp(d, l + 0.016, bF, 25), fp(d, l + 0.016, bF, 7.5), fp(d, l, bF, 7.5)],
          P.signal,
        ),
      );
    }
    m.add(-0.1, last.join(""));
    m.add(0.45, fuehrerhaus(d, 0.55, farbe, { hoch: true }));
  },
};

/** Pkw – Fremdverkehr und Besucher, damit die Straßen nicht nur Lkw kennen. */
const pkw: Bauplan = {
  l0: -0.24,
  l1: 0.24,
  hoch: 19,
  breit: 0.09,
  zeichne: (d, farbe, m) => {
    m.grund(bodenschatten(d, -0.2, 0.2, 0.17));
    m.add(-0.15, achsen(d, -0.15, 1, 0, d.flanke * 0.088, RAD * 0.72));
    m.add(0.14, achsen(d, 0.14, 1, 0, d.flanke * 0.088, RAD * 0.72));
    const bb = 0.088;
    m.add(-0.02, korpus(d, { l0: -0.22, l1: 0.22, b0: -bb, b1: bb, w0: 6, w1: 13 }, farbe));
    // Dachkabine schmaler und kürzer als der Wagenkörper: erst dieser Absatz
    // macht aus dem Kasten ein Auto.
    const dach: string[] = [];
    dach.push(
      korpus(d, { l0: -0.11, l1: 0.08, b0: -bb * 0.82, b1: bb * 0.82, w0: 13, w1: 19 }, farbe, {
        dachFarbe: ton(farbe, 1.14),
      }),
    );
    dach.push(scheiben(d, { lFront: 0.081, lSeite: -0.1, b0: -bb * 0.72, b1: bb * 0.72, w0: 13.5, w1: 18.4 }));
    m.add(-0.015, dach.join(""));
  },
};

/** Jeder Fuhrpark-Typ auf seinen Bauplan. */
const BAUPLAENE: Record<string, Bauplan> = {
  transporter,
  solo: soloLkw,
  planensattel: sattelzug(planenAufbau, 40),
  wechselbruecke: gliederzug,
  kuehlkoffer: sattelzug(kuehlAufbau, 43),
  silo: sattelzug(roehrenAufbau(P.blech, false), 30),
  "tank-adr": sattelzug(roehrenAufbau(P.stahl, true), 30),
  "container-chassis": sattelzug(containerAufbau, 36),
  tieflader,
  pkw,
};

export type FahrzeugArt = keyof typeof BAUPLAENE | string;

export interface FahrzeugBild {
  w: number;
  h: number;
  url: string;
  /**
   * Abstand vom Standpunkt des Fahrzeugs bis zur Unterkante des Bildes.
   * Die Karte setzt Fahrzeuge über `bottom`; ohne diesen Wert müsste jeder
   * Aufrufer den Fußpunkt raten, und jedes Fahrzeug stünde ein paar Pixel
   * neben seiner Kachel.
   */
  fuss: number;
}

/**
 * Maßstab der Fahrzeuge auf der Karte.
 *
 * Bis hierher bekam jedes Fahrzeug dieselbe Breite von 58 px – ein Transporter
 * war so lang wie ein Sattelzug. Jetzt wird die gezeichnete Größe übernommen
 * und nur noch gemeinsam skaliert: Ein Sattelzug misst damit rund zwei Drittel
 * einer Kachel, ein Transporter knapp die Hälfte davon. Genau daran erkennt man
 * aus der Vogelperspektive, was da fährt.
 */
export const FAHRZEUG_SKALA = 0.73;

/** Die Farbe eines Fahrzeugs: Hausfarbe des Betriebs oder eine neutrale. */
function lack(farbe: string): string {
  return HAUS_HEX[farbe] ?? (farbe.startsWith("#") ? farbe : P.blau);
}

const cache = new Map<string, FahrzeugBild>();

/**
 * Das fertige Sprite eines Fahrzeugs als data-URI.
 *
 * Der Ursprung liegt dort, wo das Fahrzeug den Boden berührt: waagerecht in der
 * Mitte, senkrecht auf der Standlinie. Die Karte setzt das Sprite damit genauso
 * wie ein Gebäude – links = cx - w/2, unten = die Kachelmitte.
 */
export function fahrzeugBild(art: FahrzeugArt, farbe: string, dir: Richtung): FahrzeugBild {
  const key = `${art}|${farbe}|${dir}`;
  const alt = cache.get(key);
  if (alt) return alt;

  const plan = BAUPLAENE[art] ?? BAUPLAENE.solo!;
  const d = BLICK[dir];
  const c = lack(farbe);

  // Wie groß muss das Bild sein? Die vier Grundecken eines Fahrzeugs, projiziert,
  // spannen die Fläche auf; oben kommt die Bauhöhe dazu, unten die halbe Raute.
  const ecken: Pkt[] = [
    fp(d, plan.l0, -plan.breit, 0),
    fp(d, plan.l1, -plan.breit, 0),
    fp(d, plan.l1, plan.breit, 0),
    fp(d, plan.l0, plan.breit, 0),
  ];
  const xs = ecken.map((e) => e[0]);
  const ys = ecken.map((e) => e[1]);
  const luft = 9; // Platz für Schattensaum und Spiegel
  // Waagerecht symmetrisch zuschneiden: Dann liegt der Standpunkt des Fahrzeugs
  // genau in der Bildmitte, und die Karte kann es wie bisher mit
  // `left = Kachelmitte - Breite/2` setzen.
  const rx = Math.max(Math.abs(Math.min(...xs)), Math.abs(Math.max(...xs))) + luft;
  const yMin = Math.min(...ys) - plan.hoch - 4;
  const yMax = Math.max(...ys) + luft;

  const w = Math.ceil(rx * 2);
  const h = Math.ceil(yMax - yMin);
  const maler = new Maler(d);
  plan.zeichne(d, c, maler);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<g transform="translate(${r1(w / 2)} ${r1(-yMin)})">${maler.fertig()}</g></svg>`;

  const bild: FahrzeugBild = {
    w,
    h,
    fuss: yMax,
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
  cache.set(key, bild);
  return bild;
}

/** Alle zeichenbaren Arten – für Vorschau und Prüfung. */
export const FAHRZEUG_ARTEN = Object.keys(BAUPLAENE);
