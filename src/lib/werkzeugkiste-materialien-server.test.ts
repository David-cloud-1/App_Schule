import { describe, expect, it, vi } from 'vitest'
import { chainMock } from '@/test/supabase-chain-mock'
import {
  entferneAlteSkripte,
  istSkriptDatei,
  skriptGrenze,
  suchbegriff,
  titelNachBauen,
  zeileZuMaterial,
  type ListenZeile,
} from './werkzeugkiste-materialien-server'

const BASIS: ListenZeile = {
  id: 'a1', werkzeug: 'skript', status: 'fertig', schritt: 5, titel: null, datei_name: null, hat_antwort: false,
  skript_entfernt_am: null, created_at: '2026-10-01T08:00:00Z', updated_at: '2026-10-02T08:00:00Z', laeuft_ab_am: null,
  video_url: null, ergebnis_titel: null, ergebnis_format: null, ergebnis_vorschau: null, ergebnis_text: null,
}

describe('zeileZuMaterial (PROJ-52)', () => {
  it('nimmt als Titel zuerst den gespeicherten, dann den aus dem Ergebnis, dann den Skriptnamen, dann das Werkzeug', () => {
    expect(zeileZuMaterial({ ...BASIS, titel: 'Mein Titel', ergebnis_titel: 'KI', datei_name: 'x.pdf' }).titel).toBe('Mein Titel')
    expect(zeileZuMaterial({ ...BASIS, ergebnis_titel: 'KI', datei_name: 'x.pdf' }).titel).toBe('KI')
    expect(zeileZuMaterial({ ...BASIS, datei_name: 'x.pdf' }).titel).toBe('x.pdf')
    expect(zeileZuMaterial(BASIS).titel).toBe('Ganzes Skript')
  })

  it('zeigt bei Entwürfen den Skriptnamen bzw. den Video-Link und ignoriert einen alten Titel', () => {
    const entwurf = { ...BASIS, status: 'laeuft' as const, titel: 'alt', datei_name: 'Heft.docx', laeuft_ab_am: '2026-11-05T03:30:00Z', schritt: 3 }
    expect(zeileZuMaterial(entwurf)).toMatchObject({ art: 'entwurf', titel: 'Heft.docx', laeuftAbAm: '2026-11-05T03:30:00Z', format: null, hatDatei: false })
    expect(zeileZuMaterial({ ...entwurf, datei_name: null, video_url: 'https://youtu.be/x' }).titel).toBe('https://youtu.be/x')
  })

  it('gibt bei Material nie einen Ablauftermin heraus', () => {
    expect(zeileZuMaterial({ ...BASIS, laeuft_ab_am: '2026-11-05T03:30:00Z' }).laeuftAbAm).toBeNull()
  })

  it('hält den Schritt im gültigen Bereich', () => {
    expect(zeileZuMaterial({ ...BASIS, schritt: 9 }).schritt).toBe(5)
    expect(zeileZuMaterial({ ...BASIS, schritt: 0 }).schritt).toBe(1)
  })
})

describe('suchbegriff', () => {
  it('macht Trennzeichen und Platzhalter des Filters unschädlich', () => {
    expect(suchbegriff('  Haftung  im Frachtrecht ')).toBe('Haftung im Frachtrecht')
    expect(suchbegriff('a%b_c,d(e)f*"g":h;i\\j')).toBe('a b c d e f g h i j')
    expect(suchbegriff('%%,,')).toBe('')
  })
})

describe('titelNachBauen', () => {
  const ergebnis = { titel: '  Neuer KI-Titel  ' }
  it('nimmt beim ersten Bauen den Titel der KI, getrimmt', () => {
    expect(titelNachBauen({ titel: null, ergebnis: null, datei_name: 'x.pdf' }, ergebnis)).toBe('Neuer KI-Titel')
  })
  it('fällt auf den Skriptnamen zurück, wenn die KI keinen Titel lieferte', () => {
    expect(titelNachBauen({ titel: null, ergebnis: null, datei_name: 'Heft 2.pdf' }, { titel: '' })).toBe('Heft 2.pdf')
    expect(titelNachBauen({ titel: null, ergebnis: null, datei_name: null }, { titel: '' })).toBeNull()
  })
  it('kürzt auf 120 Zeichen', () => {
    expect(titelNachBauen({ titel: null, ergebnis: null, datei_name: null }, { titel: 'x'.repeat(200) })).toHaveLength(120)
  })
  it('behält den Titel der Lehrkraft, folgt aber der KI, solange nie umbenannt wurde', () => {
    const altes = { titel: 'Alter KI-Titel', dateiname: 'a', format: 'h5p', kapitel: 1, aufgaben: 1 }
    expect(titelNachBauen({ titel: 'Mein Titel', ergebnis: altes, datei_name: null }, ergebnis)).toBe('Mein Titel')
    expect(titelNachBauen({ titel: 'Alter KI-Titel', ergebnis: altes, datei_name: null }, ergebnis)).toBe('Neuer KI-Titel')
  })
})

describe('12-Monats-Grenze', () => {
  it('liegt genau zwölf Kalendermonate zurück', () => {
    expect(skriptGrenze(new Date(2026, 9, 30, 12)).getTime()).toBe(new Date(2025, 9, 30, 12).getTime())
  })
  it('erkennt Skriptdatei und Einlesung, aber weder Ergebnis noch Vorschau', () => {
    expect(['skript.pdf', 'skript.docx', 'einlesung.zip'].every(istSkriptDatei)).toBe(true)
    expect(['ausgabe', 'vorschau.html', 'teil-1.txt'].some(istSkriptDatei)).toBe(false)
  })
})

describe('entferneAlteSkripte', () => {
  function umgebung(remove = vi.fn().mockResolvedValue({ data: [], error: null })) {
    const list = vi.fn().mockResolvedValue({
      data: [{ name: 'skript.pdf', metadata: { size: 100 } }, { name: 'einlesung.zip', metadata: { size: 50 } }, { name: 'ausgabe', metadata: { size: 20 } }, { name: 'vorschau.html' }],
    })
    const svc = chainMock((_t, calls) => (calls.some((c) => c.method === 'select') ? { data: [{ id: 'a1', owner_id: 'u1' }] } : { data: null }), {
      storage: { from: () => ({ list, remove }) },
    })
    return { svc, list, remove }
  }

  it('löscht nur Skript und Einlesung fertiger Materialien und merkt es in der Zeile', async () => {
    const { svc, remove } = umgebung()
    const jetzt = new Date(2027, 0, 15, 3, 30)
    expect(await entferneAlteSkripte(svc.client, jetzt)).toBe(1)

    const abfrage = svc.queries[0].calls
    expect(abfrage.find((c) => c.method === 'eq')!.args).toEqual(['status', 'fertig'])
    expect(abfrage.find((c) => c.method === 'is')!.args).toEqual(['skript_entfernt_am', null])
    expect(abfrage.find((c) => c.method === 'lt')!.args).toEqual(['skript_hochgeladen_am', skriptGrenze(jetzt).toISOString()])

    expect(remove).toHaveBeenCalledWith(['u1/a1/skript.pdf', 'u1/a1/einlesung.zip'])
    const vermerke = svc.writes.filter((w) => w.method === 'update').map((w) => w.payload)
    expect(vermerke[0]).toEqual({ skript_entfernt_am: jetzt.toISOString() })
    // danach wird die Speichergröße neu eingetragen (der Mock-Speicher listet immer dieselben Dateien)
    expect(vermerke[1]).toMatchObject({ speicher_bytes: expect.any(Number) })
  })

  it('setzt den Vermerk nicht, wenn das Löschen im Speicher scheitert', async () => {
    const { svc } = umgebung(vi.fn().mockResolvedValue({ data: null, error: { message: 'weg' } }))
    expect(await entferneAlteSkripte(svc.client)).toBe(0)
    expect(svc.writes.some((w) => w.method === 'update')).toBe(false)
  })

  it('macht bei einem Fehler mit dem nächsten Material weiter', async () => {
    const list = vi.fn().mockRejectedValueOnce(new Error('Netz')).mockResolvedValue({ data: [{ name: 'skript.pdf' }] })
    const svc = chainMock((_t, calls) => (calls.some((c) => c.method === 'select') ? { data: [{ id: 'a1', owner_id: 'u1' }, { id: 'a2', owner_id: 'u2' }] } : { data: null }), {
      storage: { from: () => ({ list, remove: vi.fn().mockResolvedValue({ data: [], error: null }) }) },
    })
    expect(await entferneAlteSkripte(svc.client)).toBe(1)
  })
})
