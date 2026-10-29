import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ablaufAenderungSchema,
  einstellungenFuerWechsel,
  standardEinstellungen,
  frischStempel,
  kern,
  KernFehler,
  neuerAblaufSchema,
  skriptPfad,
  vorbelegung,
  zeileZuAblauf,
  type AblaufZeile,
} from './werkzeugkiste-server'

const ZEILE: AblaufZeile = {
  id: '11111111-1111-4111-8111-111111111111',
  owner_id: 'u1',
  werkzeug: 'skript',
  status: 'laeuft',
  schritt: 2,
  datei_name: 'heft.docx',
  datei_groesse: 1234,
  kennzahlen: { seiten: 3, loesungen: 4, bilder: 1, tabellen: 0 },
  gliederung: null,
  auswahl: null,
  einstellungen: { niveau: 'schwer' },
  prompt: null,
  antwort: null,
  pruefung: null,
  ergebnis: null,
  updated_at: '2026-10-28T08:00:00Z',
}

describe('Server-Grundlage der Werkzeugkiste (PROJ-51)', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('legt Skripte je Lehrkraft und Ablauf ab', () => {
    expect(skriptPfad('u1', 'a1', 'Heft 2.PDF')).toBe('u1/a1/skript.pdf')
  })

  it('belegt Niveau, Bildungsgang und Format aus dem letzten Ablauf vor – Lernfeld und Umfang nicht', () => {
    expect(vorbelegung('skript', null)).toEqual({ format: 'h5p', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' })
    expect(
      vorbelegung('skript', { format: 'seite', niveau: 'leicht', bildungsgang: 'tourismus', lernfeld: '3', umfang: '90' }),
    ).toEqual({ format: 'seite', niveau: 'leicht', bildungsgang: 'tourismus', lernfeld: '', umfang: '' })
    expect(vorbelegung('skript', { format: 'xlsx' }).format).toBe('h5p')
  })

  it('macht aus einem unbekannten Format das Standardformat des Werkzeugs', () => {
    const e = { format: 'gift', niveau: 'mittel', bildungsgang: 'auto', lernfeld: '', umfang: '' }
    expect(einstellungenFuerWechsel('skript', e).format).toBe('h5p')
    expect(einstellungenFuerWechsel('skript', { ...e, format: 'seite' }).format).toBe('seite')
  })

  it('wandelt eine Tabellenzeile in den Ablauf der Oberfläche um und füllt Lücken', () => {
    const a = zeileZuAblauf(ZEILE)
    expect(a.datei).toEqual({ name: 'heft.docx', groesse: 1234 })
    expect(a.gliederung).toEqual([])
    expect(a.auswahl).toEqual({ seiten: '', abschnitte: [] })
    expect(a.einstellungen).toEqual({ format: 'h5p', niveau: 'schwer', bildungsgang: 'auto', lernfeld: '', umfang: '' })
    expect(a.aktualisiertAm).toBe(ZEILE.updated_at)
  })

  it('setzt bei jeder Änderung den Ablauf 7 Tage nach vorn', () => {
    const s = frischStempel(new Date('2026-10-28T10:00:00Z'))
    expect(s).toEqual({ updated_at: '2026-10-28T10:00:00.000Z', laeuft_ab_am: '2026-11-04T10:00:00.000Z' })
  })

  it('prüft neue Abläufe: nur freigeschaltete Werkzeuge, erlaubte Dateien bis 50 MB', () => {
    const datei = { name: 'heft.docx', groesse: 1000, typ: '' }
    expect(neuerAblaufSchema.safeParse({ werkzeug: 'skript', datei }).success).toBe(true)
    expect(neuerAblaufSchema.safeParse({ werkzeug: 'kahoot', datei }).success).toBe(false)
    for (const w of ['kreativ', 'differenzierung', 'arbeitsblatt', 'lernsituation']) {
      expect(neuerAblaufSchema.safeParse({ werkzeug: w, datei }).success, w).toBe(true)
    }
    const bild = neuerAblaufSchema.safeParse({ werkzeug: 'skript', datei: { ...datei, name: 'foto.jpg' } })
    expect(bild.success).toBe(false)
    expect(bild.error?.issues[0].message).toMatch(/Format geht nicht/)
    expect(neuerAblaufSchema.safeParse({ werkzeug: 'skript', datei: { ...datei, groesse: 60 * 1024 * 1024 } }).success).toBe(false)
  })

  it('lehnt unbekannte Felder beim Speichern ab', () => {
    expect(ablaufAenderungSchema.safeParse({ schritt: 3 }).success).toBe(true)
    expect(ablaufAenderungSchema.safeParse({ prompt: 'eingeschmuggelt' }).success).toBe(false)
    expect(ablaufAenderungSchema.safeParse({ schritt: 9 }).success).toBe(false)
  })

  it('ruft den Kern mit Kennwort auf und reicht dessen verständliche Fehler durch', async () => {
    vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test/')
    vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'geheim')
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(kern('/api/einlesen', { a: 1 })).resolves.toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://kern.test/api/einlesen')
    expect(init.headers['X-Kern-Secret']).toBe('geheim')
    expect(init.method).toBe('POST')

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Die Datei lässt sich nicht öffnen.', hint: 'Passwort?' }), { status: 400 }),
    )
    await expect(kern('/api/einlesen', {})).rejects.toMatchObject({ message: 'Die Datei lässt sich nicht öffnen.', status: 400, hinweis: 'Passwort?' })
  })

  it('meldet einen falsch eingerichteten oder fehlenden Kern als „nicht erreichbar“', async () => {
    await expect(kern('/api/optionen')).rejects.toBeInstanceOf(KernFehler)
    vi.stubEnv('WERKZEUGKISTE_KERN_URL', 'https://kern.test')
    vi.stubEnv('WERKZEUGKISTE_KERN_SECRET', 'falsch')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'nicht erlaubt' }), { status: 401 })))
    await expect(kern('/api/optionen')).rejects.toMatchObject({ status: 502, message: expect.stringMatching(/nicht erreichbar/) })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')))
    await expect(kern('/api/optionen')).rejects.toMatchObject({ status: 504 })
  })
})

describe('Werkzeugeigene Einstellungen (PROJ-54)', () => {
  it('belegt Standardwerte je Werkzeug vor', () => {
    expect(standardEinstellungen('arbeitsblatt')).toMatchObject({ format: 'word', anzahl: '12', dauer: '60' })
    expect(standardEinstellungen('differenzierung')).toMatchObject({ format: 'word', art: 'lernniveau', stufen: 'leicht,mittel,schwer' })
  })

  it('verwirft Felder, die das Werkzeug nicht kennt, und füllt fehlende auf', () => {
    const e = einstellungenFuerWechsel('lernsituation', {
      ...standardEinstellungen('skript'),
      format: 'ungueltig',
      dauer: '90',
      stufen: 'A1',
    })
    expect(e.format).toBe('word')
    expect(e.dauer).toBe('90')
    expect(e.sozialform).toBe('auto')
    expect(e.stufen).toBeUndefined()
  })
})
