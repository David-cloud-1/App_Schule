import { describe, expect, it } from 'vitest'
import { uebersetzeHinweis } from '@/lib/werkzeugkiste-hinweise'

describe('uebersetzeHinweis', () => {
  it('übersetzt bekannte Titel in einen Satz mit Vorschlag und sagt „Kapitel“ statt „Kapitel“', () => {
    expect(uebersetzeHinweis('Kapitel 4 – Kapitel zu groß')).toBe('Kapitel 4 – Das Kapitel ist sehr lang. Teile es in zwei Kapitel auf.')
    expect(uebersetzeHinweis('Kapitel 1 – Lernziele fehlen')).toBe('Kapitel 1 – Am Anfang des Kapitels fehlen die Lernziele.')
  })

  it('nennt die ganze Datei „Ganzes Material“', () => {
    expect(uebersetzeHinweis('gesamte Datei – Sehr viele Aufklapper')).toBe(
      'Ganzes Material – Sehr viele Aufklapp-Felder. Schreibe einige als normalen Text.',
    )
  })

  it('lässt unbekannte Titel stehen, nur „Kapitel“ wird zu „Kapitel“ (nichts wird verschluckt)', () => {
    expect(uebersetzeHinweis('Kapitel 2 – Etwas ganz Neues aus dem Kern')).toBe('Kapitel 2 – Etwas ganz Neues aus dem Kern')
    expect(uebersetzeHinweis('Etwas ohne Ort')).toBe('Etwas ohne Ort')
  })

  it('kommt mit mehreren Stellen im Ort zurecht', () => {
    expect(uebersetzeHinweis('Kapitel 3 und 2 weitere Stelle(n) – Kapitel ohne Spiel-Aufgabe')).toBe(
      'Kapitel 3 und 2 weitere Stelle(n) – Keine spielerische Aufgabe. Füge zum Beispiel Memory oder Wörter ziehen hinzu.',
    )
  })
})
