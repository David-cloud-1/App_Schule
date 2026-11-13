// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { chainMock } from '@/test/supabase-chain-mock'
import { auszugBildnamen, auszugPfad, einlesungPfad, erzeugeAuszug } from '@/lib/werkzeugkiste-server'
import { schrittAusParam, schrittErlaubt } from '@/lib/werkzeugkiste'
import {
  anderesWerkzeugErlaubt,
  HINWEIS_AUS_REGAL,
  HINWEIS_SKRIPT_ENTFERNT,
  ueberarbeitenErlaubt,
  untertitel,
} from '@/lib/werkzeugkiste-materialien'

/**
 * Bilder-Auszug (PROJ-53, Paket 2): Nur die im Material benutzten Bilder gehen an
 * eine Kopie, nie der Skripttext. Das Format entspricht der Einlesung, damit der
 * Kern (der text.txt und images/… erwartet) die Kopie ohne Änderung neu bauen kann.
 * (Mit dem echten Kern gegengeprüft: Seite und H5P-Bilder sind identisch.)
 */

const OWNER = 'u1'
const ID = 'a1'
const GEHEIM = 'GEHEIMER SKRIPTTEXT aus dem Verlagsheft'

function einlesung(): Uint8Array {
  return zipSync({
    'text.txt': strToU8(GEHEIM),
    'images/seite1_x9.jpeg': new Uint8Array([1, 1, 1]),
    'images/seite3_x44.jpeg': new Uint8Array([3, 3, 3]),
    'images/seite9_x106.png': new Uint8Array([9, 9, 9]),
  })
}

function speicherMit(zip: Uint8Array | null, optionen: { downloadFehler?: boolean; uploadFehler?: boolean } = {}) {
  const hoch = vi.fn().mockResolvedValue({ error: optionen.uploadFehler ? { message: 'x' } : null })
  const download = vi.fn().mockResolvedValue(
    zip && !optionen.downloadFehler
      ? { data: new Blob([zip as unknown as BlobPart]), error: null }
      : { data: null, error: { message: 'nicht da' } },
  )
  const update = chainMock(() => ({ data: null }))
  const service = {
    storage: { from: () => ({ download, upload: hoch }) },
    from: update.from,
  } as never
  return { service, hoch, download, update }
}

describe('Bilder-Auszug mit eigenen Bildern (PROJ-92)', () => {
  const eigeneAntwort = 'path: images/eigen_abc123de.jpg\npath: images/seite3_x44.jpeg\npath: images/eigen_nichtda99.png'

  function speicherMitEigenen(zip: Uint8Array | null) {
    const hoch = vi.fn().mockResolvedValue({ error: null })
    const download = vi.fn(async (pfad: string) => {
      if (pfad === `${OWNER}/${ID}/eigen_abc123de.jpg`) return { data: new Blob([new Uint8Array([7, 7])]), error: null }
      if (pfad.endsWith('einlesung.zip') && zip) return { data: new Blob([zip as unknown as BlobPart]), error: null }
      return { data: null, error: { message: 'nicht da' } }
    })
    const update = chainMock(() => ({ data: null }))
    return { service: { storage: { from: () => ({ download, upload: hoch }) }, from: update.from } as never, hoch }
  }

  it('nimmt die benutzten hochgeladenen Bilder neben den Skript-Bildern in den Auszug', async () => {
    const { service, hoch } = speicherMitEigenen(einlesung())
    expect(await erzeugeAuszug(service, OWNER, ID, eigeneAntwort)).toBe(true)
    const entpackt = unzipSync(hoch.mock.calls[0][1] as Uint8Array)
    expect(Object.keys(entpackt).sort()).toEqual(['images/eigen_abc123de.jpg', 'images/seite3_x44.jpeg', 'text.txt'])
    expect(Array.from(entpackt['images/eigen_abc123de.jpg'])).toEqual([7, 7])
  })

  it('macht auch ohne Einlesung einen Auszug, wenn es hochgeladene Bilder gibt', async () => {
    const { service, hoch } = speicherMitEigenen(null)
    expect(await erzeugeAuszug(service, OWNER, ID, eigeneAntwort)).toBe(true)
    expect(Object.keys(unzipSync(hoch.mock.calls[0][1] as Uint8Array)).sort()).toEqual(['images/eigen_abc123de.jpg', 'text.txt'])
  })

  it('ohne Einlesung und ohne hochgeladene Bilder bleibt es beim bisherigen false', async () => {
    const { service, hoch } = speicherMitEigenen(null)
    expect(await erzeugeAuszug(service, OWNER, ID, 'path: images/seite3_x44.jpeg')).toBe(false)
    expect(hoch).not.toHaveBeenCalled()
  })

  it('PROJ-94: bei einer eigenen Seite entsteht auch ohne Einlesung und ohne Bilder ein Auszug (nur Platzhalter)', async () => {
    const { service, hoch } = speicherMitEigenen(null)
    expect(await erzeugeAuszug(service, OWNER, ID, 'path: nichts', undefined, true)).toBe(true)
    expect(auszugBildnamen(hoch.mock.calls[0][1] as Uint8Array)).toEqual([])
  })
})

describe('Bilder-Auszug', () => {
  it('behält nur Bilder, die in der Antwort vorkommen, und nie den Skripttext', async () => {
    const { service, hoch } = speicherMit(einlesung())
    const antwort = 'chapters:\n- elements:\n  - type: image\n    path: images/seite3_x44.jpeg\n  - type: image\n    path: images/seite9_x106.png'
    expect(await erzeugeAuszug(service, OWNER, ID, antwort)).toBe(true)

    expect(hoch).toHaveBeenCalledTimes(1)
    const [pfad, inhalt, opt] = hoch.mock.calls[0]
    expect(pfad).toBe(auszugPfad(OWNER, ID))
    expect(opt).toMatchObject({ upsert: true, contentType: 'application/zip' })
    const entpackt = unzipSync(inhalt as Uint8Array)
    expect(Object.keys(entpackt).sort()).toEqual(['images/seite3_x44.jpeg', 'images/seite9_x106.png', 'text.txt'])
    expect(auszugBildnamen(inhalt as Uint8Array).sort()).toEqual(['images/seite3_x44.jpeg', 'images/seite9_x106.png'])
    // Der Platzhalter steht an der Stelle des Skripttexts, der echte Text nirgends im Auszug
    expect(strFromU8(entpackt['text.txt'])).not.toContain('GEHEIM')
    expect(Buffer.from(inhalt as Uint8Array).includes(Buffer.from(GEHEIM))).toBe(false)
    expect(Array.from(entpackt['images/seite3_x44.jpeg'])).toEqual([3, 3, 3])
  })

  it('liest aus der Einlesung des Ablaufs und merkt sich den Zeitpunkt in der Zeile', async () => {
    const { service, download, update } = speicherMit(einlesung())
    await erzeugeAuszug(service, OWNER, ID, 'images/seite1_x9.jpeg')
    expect(download).toHaveBeenCalledWith(einlesungPfad(OWNER, ID))
    const schreib = update.writes.find((w) => w.table === 'werkzeug_ablaeufe' && w.method === 'update')
    expect(schreib?.payload).toMatchObject({ auszug_am: expect.any(String) })
  })

  it('legt auch ohne benutzte Bilder einen gültigen Auszug an (nur Platzhalter)', async () => {
    const { service, hoch } = speicherMit(einlesung())
    expect(await erzeugeAuszug(service, OWNER, ID, 'ein Material ganz ohne Bilder')).toBe(true)
    expect(Object.keys(unzipSync(hoch.mock.calls[0][1] as Uint8Array))).toEqual(['text.txt'])
  })

  it('scheitert ruhig: fehlende Einlesung, defektes Archiv, Upload-Fehler', async () => {
    expect(await erzeugeAuszug(speicherMit(null, { downloadFehler: true }).service, OWNER, ID, 'x')).toBe(false)
    expect(await erzeugeAuszug(speicherMit(new Uint8Array([1, 2, 3])).service, OWNER, ID, 'x')).toBe(false)
    const { service, update } = speicherMit(einlesung(), { uploadFehler: true })
    expect(await erzeugeAuszug(service, OWNER, ID, 'x')).toBe(false)
    expect(update.writes).toHaveLength(0) // ohne Datei kein Vermerk
    expect(await erzeugeAuszug(undefined as never, OWNER, ID, 'x')).toBe(false)
  })
})

describe('Kopie aus dem Regal – Ablauf und Anzeige', () => {
  const kopie = { kennzahlen: { seiten: 0, loesungen: 0, bilder: 0, tabellen: 0 }, prompt: null, ergebnis: { titel: 't' }, herkunft: 'Frau Meier' } as never

  it('öffnet nur Antwort überarbeiten und Fertig, nie Hochladen, Einstellungen oder Prompt', () => {
    expect(schrittErlaubt(kopie, 1)).toBe(false)
    expect(schrittErlaubt(kopie, 2)).toBe(false)
    expect(schrittErlaubt(kopie, 3)).toBe(false)
    expect(schrittErlaubt(kopie, 4)).toBe(true)
    expect(schrittErlaubt(kopie, 5)).toBe(true)
    expect(schrittErlaubt({ ...(kopie as object), ergebnis: null } as never, 5)).toBe(false)
  })

  it('führt eine Kopie immer zu Schritt 4, auch bei ungültigem oder zu frühem Wunsch', () => {
    const k = { ...(kopie as object), schritt: 5 } as never
    expect(schrittAusParam('1', k)).toBe(4)
    expect(schrittAusParam('3', k)).toBe(4)
    expect(schrittAusParam(null, k)).toBe(5)
    expect(schrittAusParam('quatsch', { ...(kopie as object), schritt: 5, ergebnis: null } as never)).toBe(4)
  })

  it('lässt normale Abläufe unverändert', () => {
    const normal = { kennzahlen: { seiten: 1, loesungen: 0, bilder: 0, tabellen: 0 }, prompt: 'P', ergebnis: null, herkunft: null } as never
    expect(schrittErlaubt(normal, 2)).toBe(true)
    expect(schrittErlaubt(normal, 4)).toBe(true)
    expect(schrittErlaubt(normal, 5)).toBe(false)
  })

  it('erlaubt Überarbeiten bei einer Kopie, auch wenn „Skript entfernt“ gesetzt ist, aber nicht „anderes Werkzeug“', () => {
    const z = { skriptEntfernt: true, werkzeug: 'skript', ausRegal: 'Frau Meier' }
    expect(ueberarbeitenErlaubt(z)).toEqual({ erlaubt: true })
    expect(anderesWerkzeugErlaubt(z)).toEqual({ erlaubt: false, grund: HINWEIS_AUS_REGAL })
    // Nach 12 Monaten gilt weiter der alte Satz
    expect(ueberarbeitenErlaubt({ skriptEntfernt: true })).toEqual({ erlaubt: false, grund: HINWEIS_SKRIPT_ENTFERNT })
    expect(anderesWerkzeugErlaubt({ skriptEntfernt: true, werkzeug: 'skript' }).grund).toBe(HINWEIS_SKRIPT_ENTFERNT)
  })

  it('nennt die Urheberin oder den Urheber unter dem Titel', () => {
    expect(untertitel({ art: 'material', format: 'h5p', skriptName: null, ausRegal: 'Frau Meier' })).toBe('H5P für Moodle · aus dem Regal von Frau Meier')
    expect(untertitel({ art: 'material', format: 'h5p', skriptName: 'Heft.pdf' })).toBe('H5P für Moodle · aus Heft.pdf')
  })
})
