import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ForumMarkdown, safeForumUrl } from './forum-markdown'

describe('ForumMarkdown (PROJ-63, E6)', () => {
  it('zeigt fett, kursiv und Aufzählungen', () => {
    const { container } = render(<ForumMarkdown text={'**fett** und *kursiv*\n\n- eins\n- zwei'} />)
    expect(container.querySelector('strong')?.textContent).toBe('fett')
    expect(container.querySelector('em')?.textContent).toBe('kursiv')
    expect(container.querySelectorAll('li')).toHaveLength(2)
  })

  it('führt kein HTML aus: Skripte, Handler und Rahmen erscheinen nicht', () => {
    const { container } = render(
      <ForumMarkdown text={'<script>alert(1)</script><img src=x onerror="alert(2)"><iframe src="https://a.de"></iframe>Text'} />,
    )
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')
  })

  it('stellt keine Bilder und keine Überschriften dar, der Text bleibt', () => {
    const { container } = render(<ForumMarkdown text={'# Große Überschrift\n\n![Bild](https://a.de/x.png)'} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('h1')).toBeNull()
    expect(screen.getByText('Große Überschrift')).toBeInTheDocument()
  })

  it('öffnet Web-Links in neuem Tab mit sicherem rel', () => {
    render(<ForumMarkdown text="[IHK](https://www.ihk.de)" />)
    const link = screen.getByRole('link', { name: 'IHK' })
    expect(link).toHaveAttribute('href', 'https://www.ihk.de')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link.getAttribute('rel')).toContain('nofollow')
  })

  it('macht aus gefährlichen oder relativen Links keinen Link', () => {
    render(<ForumMarkdown text={'[klick](javascript:alert(1)) [data](data:text/html,x) [intern](/admin/users)'} />)
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText('klick')).toBeInTheDocument()
  })

  it('erlaubt Mail-Adressen als Link', () => {
    render(<ForumMarkdown text="[Schreib mir](mailto:a@b.de)" />)
    expect(screen.getByRole('link', { name: 'Schreib mir' })).toHaveAttribute('href', 'mailto:a@b.de')
  })

  it('safeForumUrl lässt nur http, https und mailto durch', () => {
    expect(safeForumUrl('https://a.de')).toBe('https://a.de')
    expect(safeForumUrl('HTTP://a.de')).toBe('HTTP://a.de')
    expect(safeForumUrl(' javascript:alert(1)')).toBe('')
    expect(safeForumUrl('//evil.de')).toBe('')
    expect(safeForumUrl('/relativ')).toBe('')
  })
})
