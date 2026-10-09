// Der Baukasten: aus diesen Teilen entstehen alle Gebäude der Welt.
//
// Zwei Ebenen:
//   1. Archetypen (halle, buerohaus, pavillon, zweckbau) – die Baukörper.
//   2. Details (rolltor, rampe, schornstein, kran, schranke, …) – das, was ein
//      Gebäude zu *diesem* Gebäude macht.
//
// Eine Umschlaghalle ist "halle + rampe + rolltore", ein Zollamt ist
// "zweckbau + schranke + fahnen". So bleiben 50 Gebäude überschaubar, und ein
// neues entsteht als Kombination statt als neue Zeichnung.

import {
  iso,
  ton,
  quader,
  satteldach,
  tonnendach,
  flaeche,
  mast,
  schatten,
  fensterLinks,
  fensterRechts,
  LICHT,
  TILE_H,
} from "./iso";
import { P } from "./palette";

const r1 = (n: number): number => Math.round(n * 10) / 10;
const pt = (u: number, v: number, w = 0): string => {
  const [x, y] = iso(u, v, w);
  return `${r1(x)},${r1(y)}`;
};

/** Ein fertiger Baukörper mitsamt seiner Gesamthöhe (für die Sprite-Größe). */
export interface Teil {
  svg: string;
  hoehe: number;
}

const zusammen = (...teile: (Teil | string)[]): Teil => {
  let svg = "";
  let hoehe = 0;
  for (const t of teile) {
    if (typeof t === "string") svg += t;
    else {
      svg += t.svg;
      hoehe = Math.max(hoehe, t.hoehe);
    }
  }
  return { svg, hoehe };
};

// --- Archetyp: Halle --------------------------------------------------------
// Der Grundtyp jedes Logistikgebäudes. Trapezblech, Sockel, Rolltore zur
// Hofseite. Die Dachform unterscheidet die Nutzung: Tonnendach = Umschlaghalle,
// Satteldach = Werkstatt/Lager, Flachdach = moderne Logistikhalle.

export interface HalleOpt {
  u0?: number;
  v0?: number;
  u1?: number;
  v1?: number;
  /** Unterkante über dem Boden – für Hallen auf einer Kaimauer o.ä. */
  z?: number;
  /** Höhe der Traufe (Wandhöhe) */
  wand?: number;
  /** zusätzliche Dachhöhe über der Traufe */
  dach?: number;
  dachForm?: "tonne" | "sattel" | "flach";
  farbe?: string;
  dachFarbe?: string;
  /** Rolltore an der Südost-Wand */
  tore?: number;
  /** Fensterband unter der Traufe */
  fensterband?: boolean;
}

export function halle(o: HalleOpt = {}): Teil {
  const u0 = o.u0 ?? -0.44;
  const v0 = o.v0 ?? -0.44;
  const u1 = o.u1 ?? 0.44;
  const v1 = o.v1 ?? 0.44;
  const wand = o.wand ?? 30;
  const dachH = o.dach ?? 16;
  const farbe = o.farbe ?? P.blech;
  const dachFarbe = o.dachFarbe ?? P.blechDunkel;

  const zBoden = o.z ?? 0;
  const teile: string[] = [];
  // Auf einer Kaimauer o.ä. liegt der Schatten bereits auf dem Sockelbauwerk –
  // dann wäre ein zweiter Schatten auf dem Boden falsch.
  if (zBoden === 0) teile.push(schatten(u0, v0, u1, v1));

  // Betonsockel – hebt die Halle optisch vom Boden ab.
  teile.push(quader({ u0: u0 - 0.02, v0: v0 - 0.02, u1: u1 + 0.02, v1: v1 + 0.02, z: zBoden, h: 4, farbe: P.beton }));
  // Baukörper
  teile.push(quader({ u0, v0, u1, v1, z: zBoden + 4, h: wand, farbe }));
  // Trapezblech: schmale, dunklere Streifen auf der Südost-Wand
  teile.push(profilRechts(u1, v0, v1, zBoden + 4, wand, farbe));

  if (o.fensterband) {
    teile.push(fensterLinks({ u0, u1, v: v1 }, zBoden + 4 + wand - 11, 7, 4, ton(P.glas, 0.9)));
  }

  const zDach = zBoden + 4 + wand;
  let hoehe = zDach;
  if (o.dachForm === "sattel") {
    teile.push(
      satteldach({ u0: u0 - 0.03, v0: v0 - 0.03, u1: u1 + 0.03, v1: v1 + 0.03, z: zDach, hoehe: dachH, farbe: dachFarbe }),
    );
    hoehe = zDach + dachH;
  } else if (o.dachForm === "flach") {
    // Attika: ein schmaler Kranz, damit das Flachdach eine Kante bekommt.
    teile.push(quader({ u0: u0 - 0.03, v0: v0 - 0.03, u1: u1 + 0.03, v1: v1 + 0.03, z: zDach, h: 4, farbe: dachFarbe }));
    hoehe = zDach + 4;
  } else {
    teile.push(
      tonnendach({ u0: u0 - 0.02, v0: v0 - 0.02, u1: u1 + 0.02, v1: v1 + 0.02, z: zDach, hoehe: dachH, farbe: dachFarbe }),
    );
    hoehe = zDach + dachH;
  }

  if (o.tore) teile.push(rolltore(u1, v0, v1, zBoden + 4, wand, o.tore));

  return { svg: teile.join(""), hoehe };
}

/** Senkrechte Blechprofile auf der Südost-Wand – macht aus der Fläche eine Halle. */
function profilRechts(u: number, v0: number, v1: number, z: number, h: number, farbe: string): string {
  const teile: string[] = [];
  const n = 9;
  const dunkel = ton(farbe, LICHT.rechts * 0.93);
  for (let i = 0; i < n; i++) {
    const a = v0 + ((v1 - v0) * (i + 0.35)) / n;
    const b = v0 + ((v1 - v0) * (i + 0.62)) / n;
    teile.push(
      `<polygon points="${pt(u, a, z + h)} ${pt(u, b, z + h)} ${pt(u, b, z)} ${pt(u, a, z)}" fill="${dunkel}"/>`,
    );
  }
  return teile.join("");
}

/** Rolltore an der Südost-Wand: die Ladeseite, zu der die Lkw rückwärts fahren. */
export function rolltore(u: number, v0: number, v1: number, z: number, wandH: number, anzahl: number): string {
  const teile: string[] = [];
  const spanne = v1 - v0;
  const luft = spanne / (anzahl * 2 + 1);
  const torH = Math.min(wandH * 0.62, 20);
  for (let i = 0; i < anzahl; i++) {
    const a = v0 + luft * (i * 2 + 1);
    const b = a + luft;
    // Torblatt
    teile.push(
      `<polygon points="${pt(u, a, z + torH)} ${pt(u, b, z + torH)} ${pt(u, b, z)} ${pt(u, a, z)}" fill="${ton(P.dunkel, 1.35)}"/>`,
    );
    // Lamellen
    for (let k = 1; k < 4; k++) {
      const zz = z + (torH * k) / 4;
      teile.push(
        `<polygon points="${pt(u, a, zz + 1)} ${pt(u, b, zz + 1)} ${pt(u, b, zz)} ${pt(u, a, zz)}" fill="${ton(P.dunkel, 1.7)}" opacity="0.5"/>`,
      );
    }
  }
  return teile.join("");
}

/**
 * Laderampe vor der Torseite: die Betonzunge, an der der Lkw andockt. Ohne sie
 * sieht jede Halle aus wie eine Lagerhalle für Fahrräder.
 */
export function rampe(u: number, v0: number, v1: number, tiefe = 0.16, hoehe = 11): Teil {
  const u1 = u + tiefe;
  return {
    svg:
      quader({ u0: u, v0, u1, v1, h: hoehe, farbe: P.beton }) +
      // Gelbe Anfahrkante – im Betrieb markiert, damit niemand die Rampe rammt.
      `<polygon points="${pt(u1, v0, hoehe)} ${pt(u1, v1, hoehe)} ${pt(u1, v1, hoehe - 2.5)} ${pt(u1, v0, hoehe - 2.5)}" fill="${P.signal}"/>`,
    hoehe,
  };
}

// --- Archetyp: Bürogebäude --------------------------------------------------
// Etagen mit Fensterbändern. Jede zusätzliche Etage ist eine Ausbaustufe – das
// Wachstum des Betriebs ist damit auf der Karte sofort ablesbar.

export interface BueroOpt {
  u0?: number;
  v0?: number;
  u1?: number;
  v1?: number;
  etagen?: number;
  etagenHoehe?: number;
  farbe?: string;
  dachFarbe?: string;
  /** Eingang mit Vordach an der Südost-Seite */
  eingang?: boolean;
  /** durchgehende Glasfassade statt einzelner Fenster */
  glasfassade?: boolean;
}

export function buerohaus(o: BueroOpt = {}): Teil {
  const u0 = o.u0 ?? -0.38;
  const v0 = o.v0 ?? -0.38;
  const u1 = o.u1 ?? 0.38;
  const v1 = o.v1 ?? 0.38;
  const etagen = o.etagen ?? 2;
  const eh = o.etagenHoehe ?? 21;
  const farbe = o.farbe ?? P.putz;
  const teile: string[] = [schatten(u0, v0, u1, v1)];

  teile.push(quader({ u0: u0 - 0.02, v0: v0 - 0.02, u1: u1 + 0.02, v1: v1 + 0.02, h: 5, farbe: P.beton }));
  teile.push(quader({ u0, v0, u1, v1, z: 5, h: etagen * eh, farbe }));

  // Fensterbänder je Etage auf beiden sichtbaren Wänden.
  const glasL = ton(P.glas, 0.95);
  const glasR = ton(P.glasDunkel, 0.95);
  for (let e = 0; e < etagen; e++) {
    const z = 5 + e * eh + eh * 0.32;
    const fh = eh * 0.42;
    if (o.glasfassade) {
      teile.push(
        `<polygon points="${pt(u0 + 0.04, v1, z + fh)} ${pt(u1 - 0.04, v1, z + fh)} ${pt(u1 - 0.04, v1, z)} ${pt(u0 + 0.04, v1, z)}" fill="${glasL}"/>`,
        `<polygon points="${pt(u1, v0 + 0.04, z + fh)} ${pt(u1, v1 - 0.04, z + fh)} ${pt(u1, v1 - 0.04, z)} ${pt(u1, v0 + 0.04, z)}" fill="${glasR}"/>`,
      );
    } else {
      teile.push(fensterLinks({ u0, u1, v: v1 }, z, fh, 3, glasL));
      teile.push(fensterRechts({ v0, v1, u: u1 }, z, fh, 3, glasR));
    }
  }

  // Flachdach mit Attika und einem kleinen Technikaufbau – nie eine leere Platte.
  const zDach = 5 + etagen * eh;
  teile.push(
    quader({ u0: u0 - 0.03, v0: v0 - 0.03, u1: u1 + 0.03, v1: v1 + 0.03, z: zDach, h: 4, farbe: o.dachFarbe ?? P.dachGrau }),
  );
  teile.push(quader({ u0: u0 + 0.08, v0: v0 + 0.08, u1: u0 + 0.26, v1: v0 + 0.3, z: zDach + 4, h: 7, farbe: P.stahl }));
  let hoehe = zDach + 11;

  if (o.eingang) {
    // Vordach über dem Eingang an der Südost-Seite.
    const vm = (v0 + v1) / 2;
    teile.push(
      `<polygon points="${pt(u1, vm - 0.14, 24)} ${pt(u1, vm + 0.14, 24)} ${pt(u1, vm + 0.14, 22)} ${pt(u1, vm - 0.14, 22)}" fill="${ton(P.signal, 0.9)}"/>`,
      quader({ u0: u1, v0: vm - 0.14, u1: u1 + 0.13, v1: vm + 0.14, z: 22, h: 2.5, farbe: P.signal }),
      // Glastür
      `<polygon points="${pt(u1, vm - 0.1, 5 + 17)} ${pt(u1, vm + 0.1, 5 + 17)} ${pt(u1, vm + 0.1, 5)} ${pt(u1, vm - 0.1, 5)}" fill="${ton(P.glasDunkel, 1.15)}"/>`,
    );
    hoehe = Math.max(hoehe, 26);
  }

  return { svg: teile.join(""), hoehe };
}

// --- Archetyp: Zweckbau -----------------------------------------------------
// Der kleine eingeschossige Bau mit Satteldach: Pförtner, Zollschalter,
// Sozialgebäude, Fahrerlounge. Klein, aber mit Dach – wirkt sofort wie ein Haus.

export interface ZweckOpt {
  u0?: number;
  v0?: number;
  u1?: number;
  v1?: number;
  wand?: number;
  dach?: number;
  farbe?: string;
  dachFarbe?: string;
  fenster?: number;
  /** First entlang u (Standard) oder v */
  entlang?: "u" | "v";
}

export function zweckbau(o: ZweckOpt = {}): Teil {
  const u0 = o.u0 ?? -0.34;
  const v0 = o.v0 ?? -0.34;
  const u1 = o.u1 ?? 0.34;
  const v1 = o.v1 ?? 0.34;
  const wand = o.wand ?? 20;
  const dachH = o.dach ?? 13;
  const farbe = o.farbe ?? P.putz;
  const teile: string[] = [schatten(u0, v0, u1, v1)];

  teile.push(quader({ u0, v0, u1, v1, h: wand, farbe }));

  // SOCKEL: ein dunkleres Band am Fuß der Wand. Häuser stehen nicht auf einer
  // Schnittkante, sie haben unten einen Spritzschutz aus Putz oder Stein – und
  // ohne dieses Band sieht ein Baukörper aus, als wäre er in den Boden gesteckt.
  const sockel = wand * 0.16;
  teile.push(
    `<polygon points="${pt(u0, v1, sockel)} ${pt(u1, v1, sockel)} ${pt(u1, v1, 0)} ${pt(u0, v1, 0)}" fill="${ton(farbe, 0.72)}"/>`,
    `<polygon points="${pt(u1, v0, sockel)} ${pt(u1, v1, sockel)} ${pt(u1, v1, 0)} ${pt(u1, v0, 0)}" fill="${ton(farbe, 0.6)}"/>`,
  );

  teile.push(fensterLinks({ u0, u1, v: v1 }, wand * 0.42, wand * 0.34, o.fenster ?? 2, ton(P.glas, 0.95)));
  teile.push(fensterRechts({ v0, v1, u: u1 }, wand * 0.42, wand * 0.34, Math.max(1, (o.fenster ?? 2) - 1), ton(P.glasDunkel, 1.0)));

  // TRAUFSCHATTEN: Das Dach ragt über die Wand hinaus und wirft darauf einen
  // Schatten. Diese schmale dunkle Zone ist der Grund, warum ein Dach AUFLIEGT
  // statt aufgemalt zu zwei sein.
  teile.push(
    `<polygon points="${pt(u0, v1, wand)} ${pt(u1, v1, wand)} ${pt(u1, v1, wand - 2.4)} ${pt(u0, v1, wand - 2.4)}" fill="#2c3f52" opacity="0.2"/>`,
    `<polygon points="${pt(u1, v0, wand)} ${pt(u1, v1, wand)} ${pt(u1, v1, wand - 2.4)} ${pt(u1, v0, wand - 2.4)}" fill="#2c3f52" opacity="0.26"/>`,
  );

  teile.push(
    satteldach({
      u0: u0 - 0.05,
      v0: v0 - 0.05,
      u1: u1 + 0.05,
      v1: v1 + 0.05,
      z: wand,
      hoehe: dachH,
      farbe: o.dachFarbe ?? P.dachRot,
      entlang: o.entlang,
    }),
  );
  return { svg: teile.join(""), hoehe: wand + dachH };
}

// --- Archetyp: Hoffläche ----------------------------------------------------
// Kein Gebäude, sondern befestigte Fläche: Stellplätze, Übungsplatz,
// Grünanlage. Wichtig, damit Kleinbauten nicht fälschlich als Haus erscheinen.

export function hofflaeche(fill: string = P.asphalt): Teil {
  const u = 0.46;
  return {
    svg:
      flaeche(-u, -u, u, u, fill) +
      // leichte Kante, damit die Fläche nicht mit dem Untergrund verschwimmt
      flaeche(-u, -u, u, u, "none", 0, ` stroke="${ton(fill, 0.85)}" stroke-width="1.5"`),
    hoehe: 1,
  };
}

/** Parkplatzmarkierung: weiße Linien quer über die Fläche. */
export function stellplatzLinien(anzahl = 4, farbe = P.markierung): string {
  const teile: string[] = [];
  const a = -0.4;
  const b = 0.4;
  for (let i = 0; i <= anzahl; i++) {
    const v = a + ((b - a) * i) / anzahl;
    teile.push(
      `<polygon points="${pt(a, v)} ${pt(b, v)} ${pt(b, v + 0.025)} ${pt(a, v + 0.025)}" fill="${farbe}" opacity="0.85"/>`,
    );
  }
  return teile.join("");
}

// --- Details ----------------------------------------------------------------
//
// Alles, was über den Baukörper hinausragt, liefert ein `Teil` mit seiner Höhe.
// Das ist keine Förmlichkeit: die Sprite-Fläche wird aus der größten gemeldeten
// Höhe berechnet. Wer hier nur einen String zurückgibt, dessen Fahnenmast wird
// an der oberen SVG-Kante abgeschnitten.

/** Schornstein – macht aus einem Klotz eine Fabrik. */
export function schornstein(u: number, v: number, z: number, h: number): Teil {
  const [x, y] = iso(u, v, z + h + 3);
  // Drei versetzt startende Kreise statt einem Puff – eine einzelne
  // aufsteigende Fläche liest sich als Fehler, drei gestaffelte als Rauch.
  const wolke = (dx: number, r: number, verzoegerung: number): string =>
    `<circle class="bt-rauch" style="animation-delay:${verzoegerung}s" cx="${r1(x + dx)}" cy="${r1(y - 2)}" r="${r}" fill="#d7dde3"/>`;
  return {
    svg:
      quader({ u0: u - 0.05, v0: v - 0.05, u1: u + 0.05, v1: v + 0.05, z, h, farbe: P.ziegel }) +
      quader({ u0: u - 0.07, v0: v - 0.07, u1: u + 0.07, v1: v + 0.07, z: z + h, h: 3, farbe: ton(P.ziegel, 0.8) }) +
      wolke(0, 3, 0) + wolke(1.1, 2.4, 1.2) + wolke(-0.9, 2.7, 2.4),
    hoehe: z + h + 3 + 24, // Zusatzhöhe, damit die aufsteigenden Kreise nicht am Sprite-Rand abschneiden.
  };
}

/** Funkmast/Antenne – Kennzeichen der Disposition und des Towers. */
export function antenne(u: number, v: number, z: number, h: number): Teil {
  const [x, y] = iso(u, v, z);
  return {
    svg:
      `<rect x="${r1(x - 1)}" y="${r1(y - h)}" width="2" height="${r1(h)}" fill="${P.stahl}"/>` +
      `<circle cx="${r1(x)}" cy="${r1(y - h)}" r="2.6" fill="${P.rot}"/>` +
      `<path d="M ${r1(x - 6)} ${r1(y - h + 8)} Q ${r1(x)} ${r1(y - h + 2)} ${r1(x + 6)} ${r1(y - h + 8)}" fill="none" stroke="${P.stahl}" stroke-width="1.6"/>`,
    hoehe: z + h + 4,
  };
}

/** Fahnenmast mit wehender Fahne. */
export function fahne(u: number, v: number, h: number, farbe: string): Teil {
  const [x, y] = iso(u, v, 0);
  // Ursprung am Mast, nicht an der Fahnenmitte – sonst kippt die Animation um
  // den Flächenschwerpunkt und die Fahne löst sich sichtbar vom Mast.
  const ox = r1(x + 1);
  const oy = r1(y - h + 2);
  return {
    svg:
      `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="7" ry="3.5" fill="#2c3f52" opacity="0.24"/>` +
      mast(u, v, h, 2.6, P.stahl) +
      `<path class="bt-fahne" style="transform-origin:${ox}px ${oy}px" d="M ${ox} ${oy} L ${r1(x + 17)} ${r1(y - h + 6)} L ${ox} ${r1(y - h + 13)} Z" fill="${farbe}"/>`,
    hoehe: h + 2,
  };
}

/**
 * Baum – Landschaft und Grünanlage.
 *
 * Drei Arten, weil eine Landschaft aus einer einzigen Baumform als Muster
 * gelesen wird und nicht als Bewuchs: der breite Laubbaum (Eiche, Linde), die
 * schmale Pappel an Weg und Bach, die dunkle Fichte am Waldrand. Die Art kommt
 * von außen, damit dieselbe Kachel immer denselben Baum trägt.
 */
export function baum(u: number, v: number, groesse = 1, art: "laub" | "pappel" | "nadel" = "laub"): Teil {
  const [x, y] = iso(u, v, 0);
  const s = groesse;
  const stamm = (breite: number, hoehe: number, farbe: string = P.holz): string =>
    `<rect x="${r1(x - breite / 2)}" y="${r1(y - hoehe)}" width="${r1(breite)}" height="${r1(hoehe)}" rx="${r1(breite / 2)}" fill="${farbe}"/>`;
  const wurfschatten = (rx: number): string =>
    `<ellipse cx="${r1(x + 4 * s)}" cy="${r1(y + 1)}" rx="${r1(rx * s)}" ry="${r1(rx * 0.46 * s)}" fill="#2c3f52" opacity="0.26"/>`;

  if (art === "nadel") {
    // Fichte: drei gestapelte Kegel, unten breit. Die Silhouette allein
    // unterscheidet sie schon aus der Ferne vom Laubbaum.
    const kegel = (zy: number, halb: number, hoehe: number, fill: string): string =>
      `<path d="M ${r1(x)} ${r1(y - zy - hoehe)} L ${r1(x + halb)} ${r1(y - zy)} L ${r1(x - halb)} ${r1(y - zy)} Z" fill="${fill}"/>`;
    return {
      svg:
        wurfschatten(9) +
        stamm(4 * s, 10 * s, "#7a5a3c") +
        kegel(6 * s, 11 * s, 14 * s, P.laubTief) +
        kegel(15 * s, 9 * s, 13 * s, P.laub) +
        kegel(23 * s, 6.5 * s, 12 * s, P.laub) +
        `<path d="M ${r1(x)} ${r1(y - 35 * s)} L ${r1(x - 5 * s)} ${r1(y - 23 * s)} L ${r1(x - 1 * s)} ${r1(y - 23 * s)} Z" fill="${P.laubHell}" opacity="0.75"/>`,
      hoehe: 40 * s,
    };
  }

  if (art === "pappel") {
    // Pappel: schmal und hoch, wie sie an Feldwegen und Bächen steht.
    return {
      svg:
        wurfschatten(7) +
        stamm(3.6 * s, 14 * s, "#8a6a45") +
        `<ellipse cx="${r1(x + 1.5 * s)}" cy="${r1(y - 26 * s)}" rx="${r1(7 * s)}" ry="${r1(16 * s)}" fill="${P.laubTief}"/>` +
        `<ellipse cx="${r1(x - 1 * s)}" cy="${r1(y - 27 * s)}" rx="${r1(6 * s)}" ry="${r1(15 * s)}" fill="${P.laub}"/>` +
        `<ellipse cx="${r1(x - 2.6 * s)}" cy="${r1(y - 32 * s)}" rx="${r1(3 * s)}" ry="${r1(7.5 * s)}" fill="${P.laubHell}" opacity="0.85"/>`,
      hoehe: 46 * s,
    };
  }

  return {
    svg:
      wurfschatten(13) +
      stamm(5 * s, 15 * s) +
      // Drei Kugeln mit demselben Lichteinfall wie die Gebäude: oben links hell,
      // unten rechts im Schatten.
      `<circle cx="${r1(x + 6 * s)}" cy="${r1(y - 19 * s)}" r="${r1(9 * s)}" fill="${P.laubTief}"/>` +
      `<circle cx="${r1(x - 6 * s)}" cy="${r1(y - 18 * s)}" r="${r1(9 * s)}" fill="${P.laub}"/>` +
      `<circle cx="${r1(x)}" cy="${r1(y - 24 * s)}" r="${r1(12 * s)}" fill="${P.laub}"/>` +
      `<circle cx="${r1(x - 3.5 * s)}" cy="${r1(y - 27 * s)}" r="${r1(7 * s)}" fill="${P.laubHell}"/>`,
    hoehe: 38 * s,
  };
}

/** Container – Stapelware am Terminal und im Hafen. */
export function container(u: number, v: number, z: number, farbe: string, laenge = 0.32): Teil {
  const teile = [
    quader({ u0: u - laenge / 2, v0: v - 0.09, u1: u + laenge / 2, v1: v + 0.09, z, h: 11, farbe }),
  ];
  // Sicken der Containerwand
  for (let i = 1; i < 6; i++) {
    const uu = u - laenge / 2 + (laenge * i) / 6;
    teile.push(
      `<polygon points="${pt(uu, v + 0.09, z + 11)} ${pt(uu + 0.015, v + 0.09, z + 11)} ${pt(uu + 0.015, v + 0.09, z)} ${pt(uu, v + 0.09, z)}" fill="${ton(farbe, LICHT.links * 0.86)}"/>`,
    );
  }
  return { svg: teile.join(""), hoehe: z + 11 };
}

/** Zapfsäulen unter einem Vordach – die Betriebstankstelle. */
export function tankdach(): Teil {
  return {
    svg: [
      flaeche(-0.46, -0.46, 0.46, 0.46, P.asphalt),
      // Zapfinsel
      quader({ u0: -0.26, v0: -0.12, u1: 0.26, v1: 0.12, h: 3, farbe: P.beton }),
      quader({ u0: -0.16, v0: -0.06, u1: -0.04, v1: 0.06, z: 3, h: 15, farbe: P.rot }),
      quader({ u0: 0.04, v0: -0.06, u1: 0.16, v1: 0.06, z: 3, h: 15, farbe: P.rot }),
      // Stützen
      mast(-0.3, -0.3, 34, 3.5, P.stahl),
      mast(0.3, -0.3, 34, 3.5, P.stahl),
      mast(-0.3, 0.3, 34, 3.5, P.stahl),
      mast(0.3, 0.3, 34, 3.5, P.stahl),
      // Vordach
      quader({ u0: -0.42, v0: -0.42, u1: 0.42, v1: 0.42, z: 34, h: 5, farbe: P.putz, dachFarbe: P.signal }),
    ].join(""),
    hoehe: 39,
  };
}

/** Waschportal: der Bügel, durch den der Lkw fährt. */
export function waschportal(): Teil {
  return {
    svg: [
      flaeche(-0.46, -0.46, 0.46, 0.46, P.asphalt),
      flaeche(-0.46, -0.12, 0.46, 0.12, ton(P.asphalt, 1.12)),
      mast(-0.05, -0.3, 30, 6, P.blau),
      mast(-0.05, 0.3, 30, 6, P.blau),
      quader({ u0: -0.12, v0: -0.34, u1: 0.02, v1: 0.34, z: 30, h: 7, farbe: P.blau }),
      quader({ u0: -0.1, v0: -0.3, u1: 0.0, v1: 0.3, z: 26, h: 4, farbe: P.glas }),
    ].join(""),
    hoehe: 37,
  };
}

/** Schlagbaum – das Erkennungszeichen von Zollamt und Grenzübergang. */
export function schranke(u: number, v: number): Teil {
  const [x, y] = iso(u, v, 0);
  return {
    svg:
      mast(u, v, 13, 4, P.stahl) +
      `<rect x="${r1(x - 2)}" y="${r1(y - 15)}" width="34" height="4.5" rx="2" fill="${P.rot}"/>` +
      `<rect x="${r1(x + 6)}" y="${r1(y - 15)}" width="8" height="4.5" fill="${P.markierung}"/>` +
      `<rect x="${r1(x + 22)}" y="${r1(y - 15)}" width="8" height="4.5" fill="${P.markierung}"/>`,
    hoehe: 16,
  };
}

/** Gleis (entlang u) – Bahnanschluss und KV-Terminal. */
export function gleis(v: number, u0 = -0.48, u1 = 0.48): Teil {
  const teile: string[] = [
    // Schotterbett
    flaeche(u0, v - 0.13, u1, v + 0.13, "#8d8479"),
  ];
  // Schwellen
  for (let i = 0; i < 8; i++) {
    const a = u0 + ((u1 - u0) * (i + 0.2)) / 8;
    teile.push(flaeche(a, v - 0.12, a + 0.055, v + 0.12, P.holz));
  }
  // Schienen
  teile.push(flaeche(u0, v - 0.075, u1, v - 0.05, P.stahl));
  teile.push(flaeche(u0, v + 0.05, u1, v + 0.075, P.stahl));
  return { svg: teile.join(""), hoehe: 1 };
}

/** Portalkran über dem Terminal – hebt Wechselbrücken auf die Bahn. */
export function portalkran(z = 0): Teil {
  const h = 44;
  return {
    svg: [
      mast(-0.34, -0.36, z + h, 5, P.signal),
      mast(0.34, -0.36, z + h, 5, P.signal),
      mast(-0.34, 0.36, z + h, 5, P.signal),
      mast(0.34, 0.36, z + h, 5, P.signal),
      // Kranbrücke
      quader({ u0: -0.42, v0: -0.09, u1: 0.42, v1: 0.09, z: z + h, h: 7, farbe: P.signal }),
      // Laufkatze
      quader({ u0: -0.06, v0: -0.12, u1: 0.08, v1: 0.12, z: z + h - 6, h: 6, farbe: P.dunkel }),
    ].join(""),
    hoehe: z + h + 7,
  };
}

/** Fotovoltaik auf einer Dachfläche – schräge, dunkelblaue Module. */
export function pvFeld(u0: number, v0: number, u1: number, v1: number, z: number): Teil {
  const teile: string[] = [];
  const reihen = 3;
  for (let i = 0; i < reihen; i++) {
    const a = v0 + ((v1 - v0) * (i + 0.15)) / reihen;
    const b = v0 + ((v1 - v0) * (i + 0.8)) / reihen;
    // Modulreihe leicht angestellt: hintere Kante höher
    teile.push(
      `<polygon points="${pt(u0, a, z + 7)} ${pt(u1, a, z + 7)} ${pt(u1, b, z + 1)} ${pt(u0, b, z + 1)}" fill="#2b4a86"/>`,
      `<polygon points="${pt(u0, a, z + 7)} ${pt(u1, a, z + 7)} ${pt(u1, a, z + 6)} ${pt(u0, a, z + 6)}" fill="#6d8fd0"/>`,
    );
  }
  return { svg: teile.join(""), hoehe: z + 7 };
}

/** Werbepylon mit Firmenlogo – das Schild an der Zufahrt. */
export function pylon(farbe: string): Teil {
  const [x, y] = iso(0, 0, 0);
  return {
    svg:
      `<ellipse cx="${r1(x + 3)}" cy="${r1(y + 1)}" rx="12" ry="5.5" fill="#2c3f52" opacity="0.24"/>` +
      quader({ u0: -0.1, v0: -0.1, u1: 0.1, v1: 0.1, h: 4, farbe: P.beton }) +
      mast(0, 0, 40, 7, P.stahl) +
      `<rect x="${r1(x - 13)}" y="${r1(y - 54)}" width="26" height="17" rx="3" fill="${farbe}"/>` +
      `<rect x="${r1(x - 9)}" y="${r1(y - 50)}" width="18" height="3.5" rx="1.5" fill="${P.markierung}" opacity="0.9"/>` +
      `<rect x="${r1(x - 9)}" y="${r1(y - 45)}" width="12" height="3" rx="1.5" fill="${P.markierung}" opacity="0.65"/>`,
    hoehe: 56,
  };
}

/** Hoflaterne – Lichtpunkt auf befestigten Flächen. */
export function laterne(u: number, v: number): Teil {
  const [x, y] = iso(u, v, 0);
  return {
    svg:
      mast(u, v, 30, 2.6, P.stahl) +
      `<path d="M ${r1(x)} ${r1(y - 30)} q 0 -4 7 -4" fill="none" stroke="${P.stahl}" stroke-width="2.2"/>` +
      `<ellipse class="bt-licht" cx="${r1(x + 7)}" cy="${r1(y - 33)}" rx="4" ry="2.2" fill="${P.signal}"/>`,
    hoehe: 36,
  };
}

/** Gefahrgut-Warntafel (orange, schwarz umrandet) an einer Wand. */
export function warntafel(u: number, v: number, z: number): Teil {
  const [x, y] = iso(u, v, z);
  return {
    svg:
      `<rect x="${r1(x - 8)}" y="${r1(y - 6)}" width="16" height="11" rx="1.5" fill="${P.warnOrange}" stroke="${P.dunkel}" stroke-width="1.6"/>` +
      `<line x1="${r1(x - 8)}" y1="${r1(y - 0.5)}" x2="${r1(x + 8)}" y2="${r1(y - 0.5)}" stroke="${P.dunkel}" stroke-width="1.2"/>`,
    hoehe: z + 6,
  };
}

/** Baustelle: Fundament, Gerüst, Kran – das Bild eines Ausbaus im Gange. */
export function baustelle(): Teil {
  const teile: string[] = [
    schatten(-0.42, -0.42, 0.42, 0.42, 0.22),
    flaeche(-0.44, -0.44, 0.44, 0.44, P.erde),
    // Fundamentplatte
    quader({ u0: -0.34, v0: -0.34, u1: 0.34, v1: 0.34, h: 5, farbe: P.beton }),
    // Gerüststangen
    mast(-0.28, -0.28, 26, 3, P.signal),
    mast(0.28, -0.28, 26, 3, P.signal),
    mast(-0.28, 0.28, 26, 3, P.signal),
    mast(0.28, 0.28, 26, 3, P.signal),
    quader({ u0: -0.3, v0: -0.3, u1: 0.3, v1: 0.3, z: 26, h: 2.5, farbe: P.signal }),
    // Materialstapel
    quader({ u0: -0.2, v0: 0.02, u1: 0.02, v1: 0.22, z: 5, h: 7, farbe: P.ziegel }),
  ];
  return { svg: teile.join(""), hoehe: 30 };
}

/** Wartehäuschen: Glasunterstand mit Bank und Haltestellenmast. */
export function wartehaus(u: number, v: number): Teil {
  const [x, y] = iso(u, v, 0);
  return {
    svg: [
      schatten(u - 0.18, v - 0.16, u + 0.18, v + 0.16, 0.2),
      // Rückwand aus Glas, seitliche Stützen, Flachdach darüber
      `<polygon points="${pt(u - 0.16, v - 0.14, 22)} ${pt(u + 0.16, v - 0.14, 22)} ${pt(u + 0.16, v - 0.14, 3)} ${pt(u - 0.16, v - 0.14, 3)}" fill="${ton(P.glas, 1.05)}" opacity="0.85"/>`,
      mast(u - 0.16, v + 0.14, 22, 2.4, P.stahl),
      mast(u + 0.16, v + 0.14, 22, 2.4, P.stahl),
      quader({ u0: u - 0.2, v0: v - 0.18, u1: u + 0.2, v1: v + 0.18, z: 22, h: 2.5, farbe: P.blechDunkel }),
      // Sitzbank darunter (die Bank aus sprites.ts steht dort dem Baukasten
      // nicht zur Verfügung – hier reichen Sitzfläche und zwei Wangen).
      quader({ u0: u - 0.12, v0: v - 0.02, u1: u + 0.12, v1: v + 0.04, z: 6, h: 2, farbe: P.holz }),
      mast(u - 0.1, v + 0.01, 6, 1.8, P.stahl),
      mast(u + 0.1, v + 0.01, 6, 1.8, P.stahl),
      // Der Mast mit dem grünen H – daran erkennt man eine Haltestelle sofort.
      mast(u + 0.28, v - 0.02, 26, 2.2, P.stahl),
      `<circle cx="${r1(x + 26)}" cy="${r1(y - 30)}" r="7" fill="${P.markierung}" stroke="${P.gruen}" stroke-width="2.4"/>`,
      `<text x="${r1(x + 26)}" y="${r1(y - 26.5)}" font-size="9" font-weight="700" text-anchor="middle" fill="${P.gruen}" font-family="sans-serif">H</text>`,
    ].join(""),
    hoehe: 34,
  };
}

/**
 * Pkw – Mitarbeiter- und Besucherstellplätze werden erst dadurch lesbar.
 *
 * Der erste Entwurf war zu klein und hatte keine Räder: Auf dem Hof standen
 * dann graue Klötze, die niemand als Auto erkannte. Karosserie, abgesetzte
 * Fahrgastzelle, Scheibe und zwei sichtbare Räder sind das Mindeste.
 */
export function pkw(u: number, v: number, farbe: string): Teil {
  const [x, y] = iso(u, v, 0);
  return {
    svg: [
      schatten(u - 0.14, v - 0.07, u + 0.14, v + 0.07, 0.24),
      quader({ u0: u - 0.13, v0: v - 0.06, u1: u + 0.13, v1: v + 0.06, z: 1.5, h: 6, farbe }),
      // Fahrgastzelle: schmaler und höher, sonst wirkt der Wagen wie eine Kiste
      quader({ u0: u - 0.06, v0: v - 0.05, u1: u + 0.07, v1: v + 0.05, z: 7.5, h: 6, farbe: ton(farbe, 0.88) }),
      `<polygon points="${pt(u - 0.055, v + 0.05, 13)} ${pt(u + 0.065, v + 0.05, 13)} ${pt(u + 0.065, v + 0.05, 8.5)} ${pt(u - 0.055, v + 0.05, 8.5)}" fill="${ton(P.glasDunkel, 1.15)}"/>`,
      `<circle cx="${r1(x - 8)}" cy="${r1(y + 3.5)}" r="2.8" fill="${P.dunkel}"/>`,
      `<circle cx="${r1(x + 8)}" cy="${r1(y - 0.5)}" r="2.8" fill="${P.dunkel}"/>`,
    ].join(""),
    hoehe: 14,
  };
}

/** Geeichte Brückenwaage: Stahlplatte im Boden, Anzeigesäule daneben. */
export function bruecken_waage(): Teil {
  const [x, y] = iso(0.3, -0.3, 0);
  return {
    svg: [
      flaeche(-0.46, -0.46, 0.46, 0.46, P.asphalt),
      // Die Wiegeplatte selbst, umlaufende Fuge
      flaeche(-0.36, -0.2, 0.36, 0.2, ton(P.stahl, 1.18)),
      flaeche(-0.36, -0.2, 0.36, 0.2, "none", 0, ` stroke="${ton(P.stahl, 0.7)}" stroke-width="2"`),
      flaeche(-0.36, -0.02, 0.36, 0.02, ton(P.stahl, 0.82)),
      // Auffahrkeile vorn und hinten
      flaeche(-0.46, -0.2, -0.36, 0.2, P.beton),
      flaeche(0.36, -0.2, 0.46, 0.2, P.beton),
      // Anzeigesäule mit Display – ohne sie wäre es nur ein Blechfleck
      mast(0.3, -0.3, 20, 3, P.stahl),
      `<rect x="${r1(x - 7)}" y="${r1(y - 32)}" width="14" height="11" rx="2" fill="${P.dunkel}"/>`,
      `<rect x="${r1(x - 4.5)}" y="${r1(y - 29)}" width="9" height="4" rx="1" fill="${P.gruen}"/>`,
    ].join(""),
    hoehe: 34,
  };
}

/** Ladesäule für schwere Lkw: Schrank mit Kabel und Ladepunkt-Anzeige. */
export function ladesaeule(u: number, v: number): Teil {
  const [x, y] = iso(u, v, 0);
  return {
    svg: [
      schatten(u - 0.07, v - 0.07, u + 0.07, v + 0.07, 0.2),
      quader({ u0: u - 0.06, v0: v - 0.06, u1: u + 0.06, v1: v + 0.06, h: 3, farbe: P.beton }),
      quader({ u0: u - 0.05, v0: v - 0.05, u1: u + 0.05, v1: v + 0.05, z: 3, h: 20, farbe: ton(P.gruen, 0.95) }),
      `<rect x="${r1(x - 4)}" y="${r1(y - 21)}" width="8" height="6" rx="1.5" fill="${P.dunkel}"/>`,
      // Ladekabel, das in einem Bogen herunterhängt
      `<path d="M ${r1(x + 5)} ${r1(y - 18)} q 7 4 5 12" fill="none" stroke="${P.dunkel}" stroke-width="2.2" stroke-linecap="round"/>`,
    ].join(""),
    hoehe: 26,
  };
}

/** Freies, noch nicht bebautes Grundstück in Betriebsbesitz. */
export function bauplatz(): Teil {
  return {
    svg:
      flaeche(-0.46, -0.46, 0.46, 0.46, P.pflaster) +
      flaeche(-0.46, -0.46, 0.46, 0.46, "none", 0, ` stroke="${P.markierung}" stroke-width="2" stroke-dasharray="6 5" opacity="0.8"`),
    hoehe: 1,
  };
}

export { zusammen, TILE_H };
