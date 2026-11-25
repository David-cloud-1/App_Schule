/**
 * Block „Einbetten“ (PROJ-109): Links zu Video, Kahoot, LearningApps u. Ä.
 *
 * Diese Datei ist die App-Seite der Anbieterliste. Der Kern (`seite.py`) hat eine
 * Kopie und baut beim Erzeugen der Seite die Einbett-Adresse selbst neu. Hier wird
 * nur zur schnellen Rückmeldung beim Tippen geprüft; maßgeblich ist die Prüfung
 * im Kern. Beide Listen müssen gleich bleiben (Vergleichstest im Kern).
 *
 * Feldnamen des Blocks (der Kern liest dieselben):
 *  - `type: 'einbetten'`
 *  - `url`        Link oder Kahoot-PIN, so wie die Lehrkraft ihn eingefügt hat
 *  - `titel`      Überschrift der Karte
 *  - `darstellung` `'einbetten'` (nach Klick) oder `'link'` (nur Link und QR-Code)
 *  - `start`, `ende`  nur Video, als Text („1:30“)
 *  - `description`    Arbeitsauftrag
 */

export type Verhaeltnis = '16:9' | '4:3' | 'hoch'

export interface Anbieter {
  id: string
  name: string
  /** Anzeige im Datenschutz-Hinweis („Beim Laden werden Daten an … übertragen.“) */
  anzeigeHost: string
  /** Erlaubte Hosts; Unterdomänen sind mit erlaubt */
  hosts: string[]
  /** Nur Adressen mit diesem Pfadanfang zählen (z. B. Google Forms) */
  pfad?: string
  /** Darf nach Klick im Fenster geladen werden (sonst nur Link und QR-Code) */
  einbettbar: boolean
  /** Was vorgewählt ist, wenn beides geht */
  standard: 'einbetten' | 'link'
  verhaeltnis: Verhaeltnis
  /** Hat Start- und Endzeit */
  zeiten?: boolean
}

export const ANBIETER: Anbieter[] = [
  { id: 'youtube', name: 'YouTube', anzeigeHost: 'youtube-nocookie.com', hosts: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'], einbettbar: true, standard: 'einbetten', verhaeltnis: '16:9', zeiten: true },
  { id: 'vimeo', name: 'Vimeo', anzeigeHost: 'vimeo.com', hosts: ['vimeo.com'], einbettbar: true, standard: 'einbetten', verhaeltnis: '16:9', zeiten: true },
  { id: 'learningapps', name: 'LearningApps', anzeigeHost: 'learningapps.org', hosts: ['learningapps.org'], einbettbar: true, standard: 'einbetten', verhaeltnis: '4:3' },
  { id: 'kahoot', name: 'Kahoot', anzeigeHost: 'kahoot.it', hosts: ['kahoot.it', 'kahoot.com'], einbettbar: true, standard: 'link', verhaeltnis: 'hoch' },
  { id: 'padlet', name: 'Padlet', anzeigeHost: 'padlet.com', hosts: ['padlet.com'], einbettbar: true, standard: 'einbetten', verhaeltnis: '4:3' },
  { id: 'mentimeter', name: 'Mentimeter', anzeigeHost: 'mentimeter.com', hosts: ['mentimeter.com', 'menti.com'], einbettbar: true, standard: 'einbetten', verhaeltnis: '16:9' },
  { id: 'h5p', name: 'H5P', anzeigeHost: 'h5p.com', hosts: ['h5p.com', 'h5p.org', 'lumi.education'], einbettbar: true, standard: 'einbetten', verhaeltnis: '4:3' },
  { id: 'geogebra', name: 'GeoGebra', anzeigeHost: 'geogebra.org', hosts: ['geogebra.org'], einbettbar: true, standard: 'einbetten', verhaeltnis: '4:3' },
  { id: 'google-forms', name: 'Google Forms', anzeigeHost: 'docs.google.com', hosts: ['docs.google.com'], pfad: '/forms', einbettbar: true, standard: 'link', verhaeltnis: 'hoch' },
  { id: 'google-forms-kurz', name: 'Google Forms', anzeigeHost: 'forms.gle', hosts: ['forms.gle'], einbettbar: false, standard: 'link', verhaeltnis: 'hoch' },
  { id: 'microsoft-forms', name: 'Microsoft Forms', anzeigeHost: 'forms.office.com', hosts: ['forms.office.com', 'forms.microsoft.com'], einbettbar: true, standard: 'link', verhaeltnis: 'hoch' },
]

/** Ab so vielen Zeichen wird der QR-Code schwer lesbar (Hinweis an die Lehrkraft) */
export const LINK_LANG = 300

export type LinkPruefung = { ok: true; url: URL } | { ok: false; grund: string }

export const LINK_ABGELEHNT = 'Dieser Link kann nicht eingebettet werden.'

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/
const LOKAL_ENDUNGEN = ['.local', '.localhost', '.internal', '.lan', '.home', '.intranet', '.corp']

/**
 * Nur Web-Adressen mit https, ohne Zugangsdaten, ohne IP-Adressen und lokale Namen.
 * Kein Abruf, nur Prüfung des Textes.
 */
export function pruefeLink(roh: string): LinkPruefung {
  const text = roh.trim()
  if (!text) return { ok: false, grund: 'leer' }
  // Leerzeichen und Steuerzeichen lehnt der Kern ab, also hier auch (sonst fehlte der Block in der Seite)
  if (text.length > 2000 || /[\s\x00-\x1f]/.test(text)) return { ok: false, grund: LINK_ABGELEHNT }
  let u: URL
  try {
    u = new URL(text)
  } catch {
    return { ok: false, grund: LINK_ABGELEHNT }
  }
  if (u.protocol !== 'https:') return { ok: false, grund: LINK_ABGELEHNT }
  if (u.username || u.password) return { ok: false, grund: LINK_ABGELEHNT }
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  if (!host.includes('.') || host.includes(':') || host.startsWith('[')) return { ok: false, grund: LINK_ABGELEHNT }
  if (IPV4.test(host)) return { ok: false, grund: LINK_ABGELEHNT }
  if (host === 'localhost' || LOKAL_ENDUNGEN.some((e) => host.endsWith(e))) return { ok: false, grund: LINK_ABGELEHNT }
  // nur Buchstaben, Ziffern, Bindestrich und Punkt (Umlaut-Domains kommen vom Browser schon als xn--)
  if (!/^[a-z0-9.-]+$/.test(host)) return { ok: false, grund: LINK_ABGELEHNT }
  return { ok: true, url: u }
}

/** 6 bis 7 Ziffern (mit oder ohne Leerzeichen) = Kahoot-PIN */
export function erkenneKahootPin(roh: string): string | null {
  const t = roh.replace(/\s+/g, '')
  return /^\d{6,7}$/.test(t) ? t : null
}

/** Anbieter der Liste zu einer geprüften Adresse (sonst null) */
export function erkenneAnbieter(u: URL): Anbieter | null {
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  for (const a of ANBIETER) {
    const treffer = a.hosts.some((h) => host === h || host.endsWith('.' + h))
    if (!treffer) continue
    if (a.pfad && !(u.pathname === a.pfad || u.pathname.startsWith(a.pfad + '/'))) continue
    return a
  }
  return null
}

const ID11 = /^[A-Za-z0-9_-]{11}$/
const ZIFFERN = /^\d{1,12}$/
const ALNUM = /^[A-Za-z0-9_-]{1,40}$/

function youtubeId(u: URL): string | null {
  const host = u.hostname.toLowerCase()
  const teile = u.pathname.split('/').filter(Boolean)
  let kandidat = ''
  if (host === 'youtu.be' || host.endsWith('.youtu.be')) kandidat = teile[0] ?? ''
  else if (teile[0] && ['embed', 'shorts', 'live', 'v'].includes(teile[0])) kandidat = teile[1] ?? ''
  else kandidat = u.searchParams.get('v') ?? ''
  return ID11.test(kandidat) ? kandidat : null
}

/**
 * Einbett-Adresse wie im Kern (`einbett_block.einbett_adresse`), ohne Zeiten.
 * Nur zur Rückmeldung im Editor: null = aus diesem Link lässt sich kein Fenster bauen,
 * die Schüler bekommen dann Link und QR-Code. Maßgeblich bleibt der Kern.
 */
export function einbettAdresse(anbieter: Anbieter | null | undefined, u: URL): string | null {
  if (!anbieter || !anbieter.einbettbar) return null
  const pfad = u.pathname.split('/').filter(Boolean)
  const host = u.hostname.toLowerCase().replace(/\.$/, '')
  switch (anbieter.id) {
    case 'youtube': {
      const id = youtubeId(u)
      return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null
    }
    case 'vimeo': {
      const id = [...pfad].reverse().find((p) => ZIFFERN.test(p))
      return id ? `https://player.vimeo.com/video/${id}?dnt=1` : null
    }
    case 'learningapps': {
      if (pfad.length === 1 && ZIFFERN.test(pfad[0])) return `https://learningapps.org/watch?app=${pfad[0]}`
      if (pfad.length === 1 && pfad[0] === 'watch') {
        const art = u.searchParams.has('v') ? 'v' : 'app'
        const kennung = u.searchParams.get('v') ?? u.searchParams.get('app') ?? ''
        return ALNUM.test(kennung) ? `https://learningapps.org/watch?${art}=${kennung}` : null
      }
      return null
    }
    case 'padlet': {
      if (pfad.length !== 2) return null
      const kennung = pfad[0] === 'embed' ? pfad[1] : (pfad[1].split('-').pop() ?? '')
      return /^[a-z0-9]{8,40}$/.test(kennung) ? `https://padlet.com/embed/${kennung}` : null
    }
    case 'mentimeter':
      return pfad.length >= 3 && pfad[0] === 'app' && pfad[1] === 'presentation' && ALNUM.test(pfad[2])
        ? `https://www.mentimeter.com/app/presentation/${pfad[2]}/embed`
        : null
    case 'geogebra':
      return pfad.length === 2 && pfad[0] === 'm' && ALNUM.test(pfad[1])
        ? `https://www.geogebra.org/material/iframe/id/${pfad[1]}`
        : null
    case 'h5p':
      if (!host.endsWith('h5p.com')) return u.toString()
      return pfad.length >= 2 && pfad[0] === 'content' && ZIFFERN.test(pfad[1])
        ? `https://${host}/content/${pfad[1]}/embed`
        : null
    case 'google-forms': {
      const m = /^\/forms\/d\/(e\/)?([A-Za-z0-9_-]{10,120})\/(viewform|formResponse)$/.exec(u.pathname)
      return m ? `https://docs.google.com/forms/d/${m[1] ?? ''}${m[2]}/viewform?embedded=true` : null
    }
    case 'microsoft-forms': {
      if (pfad.length === 2 && pfad[0] === 'r' && ALNUM.test(pfad[1])) return `https://${host}/r/${pfad[1]}?embed=true`
      const kennung = u.searchParams.get('id') ?? ''
      return u.pathname.toLowerCase() === '/pages/responsepage.aspx' && /^[A-Za-z0-9_-]{10,200}$/.test(kennung)
        ? `https://${host}/Pages/ResponsePage.aspx?id=${kennung}&embed=true`
        : null
    }
    default:
      // Kahoot, H5P.org, Lumi: dieselbe Adresse ohne Fragment
      return `https://${host}${u.pathname}${u.search}`
  }
}

/** Beim Öffnen im Tab: der Host des Links ohne „www.“ (z. B. youtube.com, nicht youtube-nocookie.com) */
export function linkHost(u: URL): string {
  const h = u.hostname.toLowerCase()
  return h.startsWith('www.') ? h.slice(4) : h
}

export const KEIN_FENSTER =
  'Aus diesem Link kann ich kein Fenster bauen. Die Schüler bekommen Link und QR-Code. Nimm den Teilen- oder Einbetten-Link des Anbieters, wenn es in der Seite erscheinen soll.'

/** Zeitangabe „90“, „1:30“, „1:02:03“ in Sekunden; leer = null; Unsinn = NaN */
export function zeitInSekunden(roh: string): number | null {
  const t = roh.trim()
  if (!t) return null
  if (!/^\d{1,5}(:[0-5]?\d){0,2}$/.test(t)) return Number.NaN
  const teile = t.split(':').map(Number)
  return teile.reduce((summe, z) => summe * 60 + z, 0)
}

export interface EinbettungSicht {
  art: 'leer' | 'pin' | 'link' | 'ungueltig'
  pin?: string
  url?: URL
  anbieter?: Anbieter | null
  /** Meldung (Rot), wenn der Link nicht geht */
  fehler?: string
  /** Hinweise (Orange), sperren nicht */
  hinweise: string[]
  /** Darf der Block eingebettet werden (Anbieter der Liste + Darstellung „einbetten“)? */
  wirdEingebettet: boolean
}

export type Darstellung = 'einbetten' | 'link'

export function leseDarstellung(wert: unknown, anbieter: Anbieter | null | undefined): Darstellung {
  if (!anbieter || !anbieter.einbettbar) return 'link'
  if (wert === 'einbetten' || wert === 'link') return wert
  return anbieter.standard
}

/** Alles, was das Formular über den Block wissen muss */
export function pruefeEinbettung(block: Record<string, unknown>): EinbettungSicht {
  const roh = typeof block.url === 'string' ? block.url : ''
  const hinweise: string[] = []
  if (!roh.trim()) return { art: 'leer', hinweise, wirdEingebettet: false }
  const pin = erkenneKahootPin(roh)
  if (pin) return { art: 'pin', pin, hinweise, wirdEingebettet: false }
  const p = pruefeLink(roh)
  if (!p.ok) return { art: 'ungueltig', fehler: p.grund, hinweise, wirdEingebettet: false }
  const anbieter = erkenneAnbieter(p.url)
  if (roh.trim().length > LINK_LANG) {
    hinweise.push('Der Link ist sehr lang. Nimm einen kürzeren, sonst lässt sich der QR-Code schwer scannen.')
  }
  const darstellung = leseDarstellung(block.darstellung, anbieter)
  if (anbieter?.zeiten) {
    const s = typeof block.start === 'string' ? block.start : ''
    const e = typeof block.ende === 'string' ? block.ende : ''
    const sv = zeitInSekunden(s)
    const ev = zeitInSekunden(e)
    if (Number.isNaN(sv)) hinweise.push('Die Startzeit verstehe ich nicht. Schreibe sie so: 1:30')
    if (Number.isNaN(ev)) hinweise.push('Die Endzeit verstehe ich nicht. Schreibe sie so: 2:45')
    if (sv !== null && ev !== null && !Number.isNaN(sv) && !Number.isNaN(ev) && ev <= sv) {
      hinweise.push('Die Endzeit muss nach der Startzeit liegen.')
    }
  }
  let wirdEingebettet = !!anbieter?.einbettbar && darstellung === 'einbetten'
  if (wirdEingebettet && !einbettAdresse(anbieter, p.url)) {
    hinweise.push(KEIN_FENSTER)
    wirdEingebettet = false
  }
  return { art: 'link', url: p.url, anbieter, hinweise, wirdEingebettet }
}

/** Titelvorschlag aus dem Link, damit das Feld nie leer starten muss */
export function titelVorschlag(roh: string): string {
  if (erkenneKahootPin(roh)) return 'Kahoot spielen'
  const p = pruefeLink(roh)
  if (!p.ok) return ''
  const a = erkenneAnbieter(p.url)
  if (!a) return ''
  switch (a.id) {
    case 'youtube':
    case 'vimeo':
      return 'Video ansehen'
    case 'kahoot':
      return 'Kahoot spielen'
    case 'learningapps':
      return 'LearningApp ausprobieren'
    case 'google-forms':
    case 'google-forms-kurz':
    case 'microsoft-forms':
      return 'Formular ausfüllen'
    default:
      return `${a.name} öffnen`
  }
}
