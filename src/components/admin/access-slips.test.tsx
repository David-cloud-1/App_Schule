import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { AccessSlipsPrint, SLIPS_PER_PAGE, paginateSlips } from './access-slips'

const account = (i: number) => ({ name: `Person ${i}`, email: `p${i}@example.de`, password: `Hafen-Kran-Birke-${i}` })

describe('paginateSlips', () => {
  it(`legt höchstens ${SLIPS_PER_PAGE} Zettel auf eine Seite`, () => {
    const pages = paginateSlips(Array.from({ length: 19 }, (_, i) => i))
    expect(pages.map((p) => p.length)).toEqual([8, 8, 3])
  })
  it('keine Zettel, keine Seite', () => {
    expect(paginateSlips([])).toEqual([])
  })
})

describe('AccessSlipsPrint (PROJ-62)', () => {
  afterEach(() => vi.useRealTimers())

  it('zeigt je Person Adresse, E-Mail, Start-Passwort und den Hinweis zum eigenen Passwort', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<AccessSlipsPrint accounts={[account(1)]} appUrl="https://app.example.de" onDone={() => {}} />)
    const zettel = document.querySelector('[data-zettel-druck]') as HTMLElement
    expect(zettel).toBeInTheDocument()
    expect(zettel).toHaveTextContent('Person 1')
    expect(zettel).toHaveTextContent('https://app.example.de')
    expect(zettel).toHaveTextContent('p1@example.de')
    expect(zettel).toHaveTextContent('Hafen-Kran-Birke-1')
    expect(screen.getByText('Beim ersten Login legst du ein eigenes Passwort fest.')).toBeInTheDocument()
  })

  it('macht aus 9 Personen zwei Seiten mit Seitenumbruch', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    render(
      <AccessSlipsPrint accounts={Array.from({ length: 9 }, (_, i) => account(i))} appUrl="https://app.example.de" onDone={() => {}} />,
    )
    const pages = document.querySelectorAll('[data-zettel-druck] section')
    expect(pages).toHaveLength(2)
    expect(pages[0].querySelectorAll('article')).toHaveLength(8)
    expect(pages[0].className).toContain('print:break-after-page')
  })

  it('öffnet den Druckdialog und meldet das Ende des Druckens', () => {
    vi.useFakeTimers()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const onDone = vi.fn()
    render(<AccessSlipsPrint accounts={[account(1)]} appUrl="https://app.example.de" onDone={onDone} />)
    act(() => {
      vi.advanceTimersByTime(60)
    })
    expect(print).toHaveBeenCalledTimes(1)
    act(() => {
      window.dispatchEvent(new Event('afterprint'))
    })
    expect(onDone).toHaveBeenCalledTimes(1)
  })

  it('legt A4 mit festem Rand fest, damit 8 Zettel pro Seite passen (BUG-7)', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<AccessSlipsPrint accounts={[account(1)]} appUrl="x" onDone={() => {}} />)
    expect(document.querySelector('[data-zettel-druck] style')?.textContent).toContain('@page { size: A4; margin: 10mm; }')
  })

  it('nutzt die Adresse des Bereichs, wenn das Konto eine hat', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    render(
      <AccessSlipsPrint
        accounts={[{ ...account(1), appUrl: 'https://touristiklern.vercel.app' }, account(2)]}
        appUrl="https://spedilern.vercel.app"
        onDone={() => {}}
      />,
    )
    const [a, b] = Array.from(document.querySelectorAll('[data-zettel-druck] article'))
    expect(a).toHaveTextContent('https://touristiklern.vercel.app')
    expect(b).toHaveTextContent('https://spedilern.vercel.app')
  })

  it('bleibt auf dem Bildschirm unsichtbar (nur für den Druck)', () => {
    vi.spyOn(window, 'print').mockImplementation(() => {})
    render(<AccessSlipsPrint accounts={[account(1)]} appUrl="x" onDone={() => {}} />)
    const zettel = document.querySelector('[data-zettel-druck]') as HTMLElement
    expect(zettel.className).toContain('hidden')
    expect(zettel.className).toContain('print:block')
  })
})
