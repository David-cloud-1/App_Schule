/**
 * Eigene Bilder im Baukasten (PROJ-92) – was Browser und Server gemeinsam wissen.
 * Hochgeladene Bilder liegen als einzelne Dateien im Ordner des Materials und
 * heißen `eigen_<Kennung>.jpg|png` (dazu `eigen_<Kennung>.vorschau.jpg`). Im
 * Entwurf steht wie bei Skript-Bildern der Name `images/eigen_<Kennung>.jpg`.
 */

/** So viel darf ein fertig vorbereitetes Bild höchstens wiegen (Vercel lässt 4,5 MB je Anfrage zu) */
export const EIGEN_MAX_BYTES = 2_500_000
/** Das Original, das jemand auswählt, darf größer sein – es wird im Browser verkleinert */
export const ORIGINAL_MAX_BYTES = 10_000_000
/** Längste Seite, auf die der Browser verkleinert */
export const EIGEN_MAX_SEITE_PX = 1800
/** So viele hochgeladene Bilder hat ein Material höchstens */
export const EIGENE_MAX_ANZAHL = 30
/** Größte Seite, die der Kern baut (wie SEITE_MAX_BYTES im Server) */
export const SEITE_GRENZE_BYTES = 8_000_000
/** Als Bild eingebettet wird höchstens so viel von der Seitengröße gezählt (der Kern verkleinert ab 350 KB) */
export const EINGEBETTET_SCHAETZUNG_BYTES = 400_000

/** `images/eigen_abc123.jpg` – genau das Muster, das auch der Kern annimmt */
export const EIGENER_PFAD = /^images\/eigen_[A-Za-z0-9]{6,32}\.(jpg|png)$/
const EIGENER_PFAD_SUCHE = /images\/eigen_[A-Za-z0-9]{6,32}\.(?:jpg|png)/g

export const istEigenerPfad = (pfad: string) => EIGENER_PFAD.test(pfad)

/** Dateiname im Ordner des Materials: `images/eigen_x.jpg` → `eigen_x.jpg` */
export const eigeneDatei = (pfad: string) => pfad.replace(/^images\//, '')

/** Vorschau-Datei zu einem eigenen Bild: `eigen_x.jpg` → `eigen_x.vorschau.jpg` */
export const eigeneVorschauDatei = (datei: string) => datei.replace(/\.(jpg|png)$/, '.vorschau.jpg')

/** Alle eigenen Bilder, die irgendwo im Text (Entwurf als JSON, Antwort als YAML) vorkommen */
export function eigeneBilderIn(text: string): string[] {
  return [...new Set(text.match(EIGENER_PFAD_SUCHE) ?? [])]
}

/** Erkennt PNG und JPEG am Dateikopf; sonst null */
export function bildArt(bytes: Uint8Array): 'png' | 'jpg' | null {
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'png'
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'jpg'
  return null
}

export const FORMAT_FEHLER = 'Dieses Format wird nicht unterstützt. Erlaubt sind PNG, JPG und WebP.'
export const ZU_GROSS_FEHLER = 'Das Bild ist größer als 10 MB. Bitte wähle ein kleineres.'
export const ZU_VIELE_BILDER = `Dieses Material hat schon ${EIGENE_MAX_ANZAHL} eigene Bilder. Entferne nicht benutzte Bilder aus den Blöcken und veröffentliche, dann sind sie wieder frei.`

/**
 * Schätzung der Seitengröße, wenn ein Bild dazukommt: bisherige Größe plus
 * das eingebettete Bild (der Kern verkleinert ab 350 KB, in Base64 etwa ein Drittel mehr).
 */
export function seiteMitBild(groesseBisher: number | null, bildBytes: number): number | null {
  if (groesseBisher === null) return null
  return groesseBisher + Math.min(Math.ceil(bildBytes * 1.34), EINGEBETTET_SCHAETZUNG_BYTES)
}
