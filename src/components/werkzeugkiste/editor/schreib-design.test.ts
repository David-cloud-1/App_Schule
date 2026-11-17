import { describe, expect, it } from 'vitest'
import { SCHREIB_CSS } from '@/components/werkzeugkiste/editor/schreibwerk/schreib-design'
import { SCHREIBWERK_CODE } from '@/components/werkzeugkiste/editor/schreibwerk/schreibwerk-bundle.generated'

describe('Schreib-Design (PROJ-111)', () => {
  it('die Bearbeiten-Leiste (PROJ-118) verschwindet wirklich, wenn sie `hidden` bekommt (sonst steht sie nach „Fertig“ neben der Block-Leiste)', () => {
    expect(SCHREIB_CSS).toContain('.wk-el[hidden]{display:none!important}')
  })
  it('das gebaute Schreibwerk enthält die Regel', () => {
    expect(SCHREIBWERK_CODE).toContain('.wk-el[hidden]')
  })
})
