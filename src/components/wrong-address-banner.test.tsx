import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DepartmentProvider, type DepartmentContextValue } from '@/components/department-provider'
import { NEUTRAL_BRANDING } from '@/lib/departments'
import { WrongAddressBanner } from './wrong-address-banner'

function renderWith(correctAddress: DepartmentContextValue['correctAddress']) {
  return render(
    <DepartmentProvider value={{ department: { ...NEUTRAL_BRANDING, iconName: 'Plane' }, examParts: [], correctAddress }}>
      <WrongAddressBanner />
    </DepartmentProvider>,
  )
}

beforeEach(() => sessionStorage.clear())

describe('WrongAddressBanner (PROJ-23)', () => {
  it('zeigt auf der Adresse eines anderen Bereichs den Hinweis mit Link zur richtigen App', async () => {
    renderWith({ appName: 'TouristikLern', domain: 'touristiklern.vercel.app' })
    expect(await screen.findByText('TouristikLern')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /hier geht's zu touristiklern\.vercel\.app/ })
    expect(link).toHaveAttribute('href', 'https://touristiklern.vercel.app')
  })

  it('zeigt nichts auf der richtigen Adresse oder einer Vorschau-Adresse', () => {
    const { container } = renderWith(null)
    expect(container).toBeEmptyDOMElement()
  })

  it('lässt sich schließen und bleibt in dieser Sitzung geschlossen', async () => {
    const first = renderWith({ appName: 'TouristikLern', domain: 'touristiklern.vercel.app' })
    fireEvent.click(await screen.findByRole('button', { name: 'Hinweis schließen' }))
    expect(screen.queryByText('TouristikLern')).not.toBeInTheDocument()
    first.unmount()

    const second = renderWith({ appName: 'TouristikLern', domain: 'touristiklern.vercel.app' })
    expect(second.container).toBeEmptyDOMElement()
  })
})
