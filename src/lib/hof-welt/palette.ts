// Die Farbwelt des Spiels: heller Tag, satte Cartoon-Farben.
//
// Alle Farben der Karte stehen hier – Boden, Gebäude, Details. Eine Karte wirkt
// dann wie aus einem Guss, wenn jedes Objekt aus derselben, kleinen Palette
// schöpft. Wer eine neue Farbe braucht, nimmt zuerst eine von hier; erst wenn
// wirklich keine passt, kommt eine dazu.

export const P = {
  // --- Untergrund ---
  //
  // WARUM DAS GRÜN GELB IST: Die erste Fassung dieser Palette hatte ein Gras
  // bei 110° Farbton – ein kühles Blaugrün, wie es Bildschirme gern zeigen.
  // Neben den warmen Ockertönen der Getreidefelder ergab das einen
  // Flickenteppich: zwei Farbfamilien, die nichts miteinander zu tun haben.
  // Sonnenbeschienenes Gras ist gelblich (um 90°). Mit dieser Drehung liegen
  // Wiese, Stoppelfeld und Acker plötzlich in EINER Landschaft.
  gras: "#7ed44e",
  grasDunkel: "#6abf3f",
  grasBuschel: "#a6e66c",
  // Laub bewusst dunkler und satter als das Gras: ein Baum, der die Grasfarbe
  // nur aufhellt, verschwindet auf der Wiese.
  laub: "#36a845",
  laubHell: "#5cc450",
  laubTief: "#25803a",
  pflaster: "#e6d2a6",
  pflasterDunkel: "#d8c192",
  pflasterFuge: "#c3a97a",
  // Auch der Asphalt ist warm gehalten. Ein blaugrauer Belag legt sich wie ein
  // kaltes Gitter über die Landschaft; ein Grau mit etwas Erde darin liest sich
  // als Straße in der Sonne.
  asphalt: "#8c8079",
  asphaltDunkel: "#7d726c",
  markierung: "#f6f1de",
  bordstein: "#f0e3c4",
  erde: "#a9825a",
  // Planierter Baugrund: hell und sandig. Elf gesperrte Abteilungen liegen zu
  // Spielbeginn gleichzeitig auf der Karte – in Dunkelbraun wären das elf Löcher
  // in der Wiese.
  baugrund: "#cdbb96",
  baugrundHell: "#dcccab",
  wasser: "#4aa8d8",

  // --- Baukörper ---
  putz: "#fff2d8", // heller Putz, das Grundweiß der Betriebsgebäude
  putzWarm: "#fbd9a0", // zweiter, wärmerer Ton für Abwechslung
  ziegel: "#e2543a",
  blech: "#f4c95a", // Trapezblech der Hallen
  blechDunkel: "#e0a43a",
  beton: "#e0d0b0",
  holz: "#c98a45",
  glas: "#8fd3f0",
  glasDunkel: "#4fa6cd",
  stahl: "#b79c88",

  // --- Akzente & Signale ---
  dachRot: "#da4a2e",
  // WARUM DAS DACHGRAU HELLER UND WÄRMER IST: Es war ein kaltes Blaugrau
  // (#7b8798) – und weil man in der Isometrie vor allem DÄCHER sieht, war das
  // die dominante Farbe jedes Betriebsgebäudes. Zwei kalte Klötze standen so
  // mitten in einer warmen Landschaft. Ein Flachdach ist in Wirklichkeit auch
  // gar nicht dunkel: Darauf liegt helle Kiesschüttung.
  dachGrau: "#e0553b",
  dachGruen: "#38b36c",
  signal: "#ffb21c", // dieselbe Akzentfarbe wie im HUD
  warnOrange: "#e8762a", // Gefahrgut
  blau: "#4da3ff",
  gruen: "#3ad29f",
  rot: "#ff6b6b",
  dunkel: "#2b3346",
} as const;

/**
 * Fahrzeug- und Hausfarben des Betriebs.
 *
 * WARUM NICHT DIE HUD-FARBEN: Bis hierher wurden Gebäude und Fahrzeuge mit
 * `P.blau`, `P.gruen`, `P.rot` lackiert – denselben Tönen wie die Schaltflächen
 * der Bedienoberfläche. Bildschirmfarben sind aber hell und dünn; sie sollen
 * auf dunklem Grund leuchten. Auf einer sonnigen Wiese verlieren sie ihr
 * Gewicht: Ein Lkw in HUD-Grün verschwindet auf der Weide, einer in HUD-Blau
 * wirkt wie aus Papier. Lack ist satter und dunkler als Licht – deshalb hat der
 * Betrieb hier seine eigene, kräftigere Farbwelt.
 */
export const HAUS_HEX: Record<string, string> = {
  // Kobaltblau statt Himmelblau: dunkel genug, um gegen den Himmel zu stehen.
  blue: "#2f8cf0",
  // Tannengrün mit Blaustich – ein Laubgrün wäre auf der Wiese unsichtbar.
  green: "#2fb36a",
  // Warmes Tomatenrot, kein Signalrot: es soll neben Ziegeldächern liegen.
  red: "#ec4636",
};
