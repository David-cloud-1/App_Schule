/**
 * Test-Helfer für den Aufgabentyp-Katalog (PROJ-114 Schritt 5): Ein Klick auf eine Zeile wählt nur aus,
 * eingefügt wird mit „Einfügen“. Verwandte Typen stehen als eine Zeile mit „Arten“.
 */
import { fireEvent, screen } from '@testing-library/react'
import { FAMILIEN } from '@/lib/werkzeugkiste-katalog'

/** Zeile, in der ein Typ steht (auch als Art einer Familie); null, wenn der Katalog ihn nicht zeigt */
export function katalogZeile(typ: string): HTMLButtonElement | null {
  return (
    [...document.querySelectorAll<HTMLButtonElement>('[data-katalog-zeile]')].find((z) =>
      (z.dataset.katalogTypen ?? '').split(' ').includes(typ),
    ) ?? null
  )
}

/** Wählt einen Typ aus (Zeile, bei Familien auch die Art) und gibt den Einfügen-Knopf zurück; null, wenn der Typ fehlt */
export function zeigeImKatalog(typ: string): HTMLButtonElement | null {
  const zeile = katalogZeile(typ)
  if (!zeile) return null
  fireEvent.click(zeile)
  const knopf = () => document.querySelector<HTMLButtonElement>('[data-katalog-einfuegen]')
  if (knopf()?.dataset.katalogEintrag !== typ) {
    const art = FAMILIEN.flatMap((f) => f.arten).find((a) => a.typ === typ)
    if (art) fireEvent.click(screen.getByRole('radio', { name: art.label }))
  }
  return knopf()
}

/** Wählt einen Typ aus und fügt ihn ein */
export function waehleImKatalog(typ: string) {
  const knopf = zeigeImKatalog(typ)
  if (!knopf) throw new Error(`Katalog: kein Eintrag für „${typ}“`)
  fireEvent.click(knopf)
}
