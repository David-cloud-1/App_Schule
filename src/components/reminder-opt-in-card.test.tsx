import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { PushReminderState } from '@/hooks/use-push-reminder'

const state: { current: PushReminderState } = { current: {} as PushReminderState }
vi.mock('@/hooks/use-push-reminder', () => ({ usePushReminder: () => state.current }))

import { ReminderOptInCard } from './reminder-opt-in-card'

function make(over: Partial<PushReminderState> = {}): PushReminderState {
  return {
    loading: false,
    support: 'supported',
    permission: 'default',
    subscribedHere: false,
    server: { enabled: false, declined_at: null, decline_count: 0 },
    busy: false,
    enable: vi.fn().mockResolvedValue('enabled'),
    disable: vi.fn().mockResolvedValue(true),
    decline: vi.fn().mockResolvedValue(undefined),
    ...over,
  }
}

describe('ReminderOptInCard (PROJ-18)', () => {
  beforeEach(() => {
    state.current = make()
  })

  it('zeigt beide Antworten, solange nicht entschieden', () => {
    render(<ReminderOptInCard variant="result" />)
    expect(screen.getByText('Erinnert werden?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ja, bitte' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nein danke' })).toBeInTheDocument()
  })

  it('heißt auf „Heute“ „Erinnerung einrichten“', () => {
    render(<ReminderOptInCard variant="home" />)
    expect(screen.getByText('Erinnerung einrichten')).toBeInTheDocument()
  })

  it('fragt den Browser erst nach „Ja“ und bestätigt danach', async () => {
    render(<ReminderOptInCard variant="result" />)
    expect(state.current.enable).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Ja, bitte' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Erinnerung ist an'))
    expect(state.current.enable).toHaveBeenCalledOnce()
  })

  it('erklärt ruhig, wenn der Browser die Erlaubnis verweigert', async () => {
    state.current = make({ enable: vi.fn().mockResolvedValue('denied') })
    render(<ReminderOptInCard variant="result" />)
    fireEvent.click(screen.getByRole('button', { name: 'Ja, bitte' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Wir fragen nicht noch einmal'))
  })

  it('„Nein danke“ speichert die Ablehnung und blendet die Karte aus', async () => {
    const { container } = render(<ReminderOptInCard variant="home" />)
    fireEvent.click(screen.getByRole('button', { name: 'Nein danke' }))
    await waitFor(() => expect(container).toBeEmptyDOMElement())
    expect(state.current.decline).toHaveBeenCalledOnce()
  })

  it('zeigt auf dem iPhone in Safari die Anleitung statt eines Ja-Knopfs', () => {
    state.current = make({ support: 'ios-install-needed' })
    render(<ReminderOptInCard variant="home" />)
    expect(screen.getByText('Zum Home-Bildschirm')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Ja, um/ })).not.toBeInTheDocument()
  })

  it.each<[string, Partial<PushReminderState>]>([
    ['beim Laden', { loading: true }],
    ['ohne Server-Stand', { server: null }],
    ['wenn schon aktiv', { server: { enabled: true, declined_at: null, decline_count: 0 } }],
    ['wenn schon abgelehnt', { server: { enabled: false, declined_at: new Date().toISOString(), decline_count: 1 } }],
    ['ohne Push-Unterstützung', { support: 'unsupported' }],
    ['wenn der Browser schon blockiert', { permission: 'denied' }],
  ])('bleibt unsichtbar %s', (_name, over) => {
    state.current = make(over)
    const { container } = render(<ReminderOptInCard variant="home" />)
    expect(container).toBeEmptyDOMElement()
  })
})
