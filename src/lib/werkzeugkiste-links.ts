/**
 * Öffentlicher Link „Link für alle“ (PROJ-67) — Typen, Texte und reine
 * Hilfsfunktionen, die auch die Oberfläche nutzt. Server-Teil: siehe
 * `werkzeugkiste-links-server.ts`.
 *
 * Ein Link gehört zu einem fertigen Material im Format „Interaktive Seite“.
 * Er zeigt die fertige HTML-Seite ohne Anmeldung, ohne Angaben zur Person.
 */

/** Nur dieses Ergebnis-Format bekommt einen Link (H5P lässt sich ohne Player nicht öffnen) */
export const LINK_FORMAT = 'seite'
/** Der Code hat genau 48 Hexzeichen (mehr als 180 Bit Zufall) */
export const LINK_CODE_MUSTER = /^[0-9a-f]{48}$/
export const LINK_ADMIN_SEITE = 50

export const LINK_TEXTE = {
  erzeugen: 'Link für alle erzeugen',
  kopieren: 'Link kopieren',
  kopiert: 'Link kopiert',
  abschalten: 'Link abschalten',
  nurSeite: 'Nur bei Interaktiver Seite',
  nichtAktiv: 'Dieser Link ist nicht mehr aktiv.',
  hinweisTitel: 'Link für alle erzeugen?',
  hinweis: 'Jeder, der diesen Link hat, kann das Material öffnen, auch ohne Konto. Du kannst ihn jederzeit abschalten.',
  hinweisFortschritt:
    'Im Link merkt sich die Seite deinen Lernfortschritt nicht. Heruntergeladen und lokal geöffnet merkt sie ihn sich wie bisher.',
  hinweisDatenschutz: 'Bitte stehen keine Namen oder Noten von Schülerinnen und Schülern im Material.',
  abschaltenTitel: 'Link abschalten?',
  abschaltenText: 'Der Link funktioniert danach nicht mehr. Wer ihn schon hat, sieht „nicht mehr aktiv“.',
  loeschenHinweis: 'Der öffentliche Link wird dabei ebenfalls abgeschaltet.',
  ueberarbeitenHinweis: 'Dein öffentlicher Link zeigt danach die neue Fassung.',
} as const

export interface LinkStand {
  code: string
  erzeugtAm: string
  aufrufe: number
  letzterAufruf: string | null
}

/** Kennzeichen „Öffentlich“ in der Liste „Meine Materialien“ */
export interface MaterialLink {
  aufrufe: number
}

export interface LinkAdminZeile {
  id: string
  titel: string
  werkzeug: string
  besitzerName: string
  erzeugtAm: string
  aufrufe: number
  letzterAufruf: string | null
}

export interface LinkAdminListe {
  eintraege: LinkAdminZeile[]
  gesamt: number
  hatMehr: boolean
}

/** Bekommt dieses Material einen Link? Fertige Interaktive Seite mit Datei, sonst nicht */
export function kannLinkHaben(format: string | null | undefined, hatDatei: boolean): boolean {
  return format === LINK_FORMAT && hatDatei
}

/** Vollständige Adresse für die Zwischenablage; `herkunft` ist `window.location.origin` */
export function linkAdresse(herkunft: string, code: string): string {
  return `${herkunft.replace(/\/+$/, '')}/s/${code}`
}
