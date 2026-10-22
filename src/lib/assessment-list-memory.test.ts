import { describe, it, expect, beforeEach, vi } from 'vitest'
import { listHref, saveListQuery } from './assessment-list-memory'

describe('assessment-list-memory', () => {
  beforeEach(() => sessionStorage.clear())

  it('liefert ohne gemerkte Filter die Liste mit Standardfiltern', () => {
    expect(listHref()).toBe('/admin/leistungsnachweise')
  })

  it('führt zu den zuletzt gemerkten Filtern zurück', () => {
    saveListQuery('sj=2025%2F26&klasse=k%3ASP11a&status=open')
    expect(listHref()).toBe('/admin/leistungsnachweise?sj=2025%2F26&klasse=k%3ASP11a&status=open')
  })

  it('nimmt fremde Parameter nicht mit', () => {
    saveListQuery('createFromSet=abc&sj=alle&evil=//example.com')
    expect(listHref()).toBe('/admin/leistungsnachweise?sj=alle')
  })

  it('setzt zurück, wenn die Filter wieder dem Standard entsprechen', () => {
    saveListQuery('sj=alle')
    saveListQuery('')
    expect(listHref()).toBe('/admin/leistungsnachweise')
  })

  it('übersteht einen nicht verfügbaren Speicher', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    expect(() => saveListQuery('sj=alle')).not.toThrow()
    expect(listHref()).toBe('/admin/leistungsnachweise')
    spy.mockRestore()
    get.mockRestore()
  })
})
