/**
 * Bedien-Design des Baukastens (PROJ-117): EINE Quelle für Farben, Maße und Grundformen aller
 * Bearbeiten-Knöpfe in der Vorschau-Seite (Block-Leiste und „+“, Schreibwerk, Aufgabenwerk).
 *
 * Vorher gab es drei fast gleiche Farbtabellen (`LEISTE_FARBEN`, `SCHREIB_FARBEN`, `AW_FARBEN`),
 * die auseinandergelaufen sind. Jetzt lesen alle drei hier. Die Datei ist reine Zahlen und Texte
 * (kein Browser, kein React), damit sie in die abgeschotteten Pakete hineingebaut werden kann.
 * `bedien-design.test.ts` wacht darüber, dass keine Stelle eine eigene Farbe erfindet.
 */

/** Farbpaare (Text auf Grund); der Test prüft den Kontrast (≥ 4,5 : 1) */
export const BEDIEN_FARBEN = {
  grund: '#ffffff',
  text: '#1e3a8a',
  textTyp: '#475569',
  akzent: '#2563eb',
  akzentText: '#ffffff',
  aktivGrund: '#dbeafe',
  hoverGrund: '#eff6ff',
  gefahr: '#991b1b',
  gefahrGrund: '#ffffff',
  gefahrHover: '#fef2f2',
  hinweis: '#92400e',
  hinweisGrund: '#fffbeb',
  leerText: '#334155',
  leerGrund: '#ffffff',
  trenner: '#cbd5e1',
} as const

/** Maße in Pixel: Knopfhöhe am Rechner, auf Touch-Geräten, Rundungen */
export const BEDIEN_MASSE = {
  knopfHoehe: 36,
  knopfTouch: 44,
  knopfRundung: 8,
  leistenRundung: 10,
} as const

const F = BEDIEN_FARBEN
const M = BEDIEN_MASSE

/** Schrift aller Bearbeiten-Knöpfe in der Seite */
export const BEDIEN_SCHRIFT = '600 13px/1.2 system-ui,sans-serif'

/** Sichtbarer Fokus-Rahmen (für jede Auswahl von Elementen) */
export function fokusCss(auswahl: string): string {
  return `${auswahl}{outline:3px solid ${F.akzent};outline-offset:1px}`
}

/** Rahmen einer schwebenden Leiste (Block-Leiste, Textleiste) */
export function leistenRahmenCss(): string {
  return `background:${F.grund};border:1px solid ${F.text};border-radius:${M.leistenRundung}px;box-shadow:0 4px 14px rgba(0,0,0,.2)`
}

/**
 * Grundform eines Leisten-Knopfes: Höhe, Rundung, Farben, Hover. `klasse` ist der CSS-Name
 * (z. B. `.wk-b`). Der Aktiv-Zustand (`aria-pressed`) und der Touch-Zuschlag sind eingeschlossen.
 */
export function knopfCss(klasse: string, mitAktiv = true): string {
  return [
    `${klasse}{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:${M.knopfHoehe}px;min-height:${M.knopfHoehe}px;padding:4px 10px;border:1px solid transparent;border-radius:${M.knopfRundung}px;background:transparent;color:${F.text};font:inherit;cursor:pointer}`,
    `${klasse}:hover{background:${F.hoverGrund};border-color:${F.text}}`,
    mitAktiv ? `${klasse}[aria-pressed="true"]{background:${F.aktivGrund};border-color:${F.text}}` : '',
    fokusCss(`${klasse}:focus-visible`),
    `@media (hover:none),(pointer:coarse){${klasse}{min-height:${M.knopfTouch}px;min-width:${M.knopfTouch}px}}`,
  ].join('')
}

/** Gefüllter Hauptknopf („Fertig“) */
export function fertigCss(klasse: string): string {
  return `${klasse}{background:${F.akzent};border-color:${F.akzent};color:${F.akzentText};font-weight:700}${klasse}:hover{background:${F.text};border-color:${F.text}}`
}

/** Auswahlfeld in der Leiste (Box …, Diese Box …) */
export function auswahlCss(klasse: string): string {
  return [
    `${klasse}{min-height:${M.knopfHoehe}px;max-width:11rem;padding:4px 6px;border:1px solid ${F.text};border-radius:${M.knopfRundung}px;background:${F.grund};color:${F.text};font:inherit}`,
    fokusCss(`${klasse}:focus-visible`),
    `@media (hover:none),(pointer:coarse){${klasse}{min-height:${M.knopfTouch}px}}`,
  ].join('')
}
