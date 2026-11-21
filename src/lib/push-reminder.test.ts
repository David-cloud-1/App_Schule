import { describe, expect, it } from 'vitest'
import {
  addDays,
  berlinTime,
  buildPayload,
  dayDiff,
  decideReminder,
  isAllowedPushEndpoint,
  isReminderWindow,
  reactedToLast,
  REMINDER_TEXTS,
  streakText,
  type ReminderCandidate,
} from './push-reminder'

// Dienstag 2026-11-24, 19:30 Berlin (Winterzeit, UTC+1) = 18:30 UTC
const DI_19 = new Date('2026-11-24T18:30:00Z')
const TODAY = '2026-11-24'

function cand(over: Partial<ReminderCandidate> = {}): ReminderCandidate {
  return {
    currentStreak: 0,
    lastSessionDate: null,
    everPlayed: true,
    state: null,
    activityDays: new Set<string>(),
    ...over,
  }
}

describe('Termin', () => {
  it('Dienstag 19 Uhr Berlin (Winterzeit) ist Erinnerungszeit', () => {
    expect(isReminderWindow(DI_19)).toBe(true)
  })
  it('Donnerstag 19 Uhr Berlin (Sommerzeit, 17 Uhr UTC) ist Erinnerungszeit', () => {
    expect(isReminderWindow(new Date('2026-07-02T17:15:00Z'))).toBe(true)
  })
  it('der falsche der zwei Cron-Läufe fällt durch: Sommer 18 Uhr UTC = 20 Uhr Berlin', () => {
    expect(isReminderWindow(new Date('2026-07-02T18:15:00Z'))).toBe(false)
  })
  it('der falsche der zwei Cron-Läufe fällt durch: Winter 17 Uhr UTC = 18 Uhr Berlin', () => {
    expect(isReminderWindow(new Date('2026-11-24T17:15:00Z'))).toBe(false)
  })
  it.each([
    ['Montag', '2026-11-23T18:30:00Z'],
    ['Mittwoch', '2026-11-25T18:30:00Z'],
    ['Freitag', '2026-11-27T18:30:00Z'],
    ['Samstag', '2026-11-28T18:30:00Z'],
    ['Sonntag', '2026-11-29T18:30:00Z'],
  ])('%s ist kein Erinnerungstag', (_n, iso) => {
    expect(isReminderWindow(new Date(iso))).toBe(false)
  })
  it('Tag in Berlin, nicht in UTC: Dienstag 23:30 UTC ist schon Mittwoch in Berlin', () => {
    const t = berlinTime(new Date('2026-11-24T23:30:00Z'))
    expect(t.weekday).toBe(3)
    expect(t.dateStr).toBe('2026-11-25')
  })
  it('Sommerzeit-Umstellung 2026-03-29: Dienstag danach gilt weiter 19 Uhr Ortszeit', () => {
    // 2026-03-31 ist Dienstag, Sommerzeit: 19 Uhr = 17 Uhr UTC
    expect(isReminderWindow(new Date('2026-03-31T17:00:00Z'))).toBe(true)
    expect(isReminderWindow(new Date('2026-03-31T18:00:00Z'))).toBe(false)
  })
})

describe('dayDiff / addDays', () => {
  it('rechnet über Monats- und Zeitumstellungsgrenzen', () => {
    expect(dayDiff('2026-10-20', '2026-11-03')).toBe(14)
    expect(dayDiff('2026-03-24', '2026-04-07')).toBe(14)
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-11-24', -1)).toBe('2026-11-23')
  })
})

describe('decideReminder', () => {
  it('Spieler ohne Reaktionshistorie, heute nicht gelernt: senden', () => {
    const d = decideReminder(cand(), DI_19)
    expect(d).toMatchObject({ send: true, ignoredInARow: 0, streak: null })
  })

  it('nie gespielt: nichts', () => {
    expect(decideReminder(cand({ everPlayed: false }), DI_19)).toMatchObject({ send: false, reason: 'nie-gespielt' })
  })

  it('heute schon gelernt (Runde, Blitzrunde oder Prüfung): nichts', () => {
    expect(decideReminder(cand({ activityDays: new Set([TODAY]) }), DI_19)).toMatchObject({
      send: false,
      reason: 'heute-gelernt',
    })
  })

  it('Lernen am Vortag zählt nicht als „heute gelernt“', () => {
    expect(decideReminder(cand({ activityDays: new Set(['2026-11-23']) }), DI_19).send).toBe(true)
  })

  it('zweiter Lauf am selben Tag sendet nichts (Doppelversand)', () => {
    const state = { last_sent_date: TODAY, sent_count: 3, ignored_in_a_row: 0 }
    expect(decideReminder(cand({ state }), DI_19)).toMatchObject({ send: false, reason: 'heute-schon-gesendet' })
  })

  describe('Streak-Text', () => {
    it('Streak läuft und letzte Runde war gestern: rettbar', () => {
      const d = decideReminder(cand({ currentStreak: 4, lastSessionDate: '2026-11-23' }), DI_19)
      expect(d).toMatchObject({ send: true, streak: 4 })
    })
    it('Streak schon gebrochen (letzte Runde vorgestern): neutraler Text, keine falsche Behauptung', () => {
      const d = decideReminder(cand({ currentStreak: 4, lastSessionDate: '2026-11-22' }), DI_19)
      expect(d).toMatchObject({ send: true, streak: null })
    })
    it('Streak 0: neutraler Text', () => {
      const d = decideReminder(cand({ currentStreak: 0, lastSessionDate: '2026-11-23' }), DI_19)
      expect(d).toMatchObject({ send: true, streak: null })
    })
  })

  describe('Abklingen', () => {
    const sentThu = (ignored: number) => ({ last_sent_date: '2026-11-19', sent_count: 8, ignored_in_a_row: ignored })

    it('Reaktion am Erinnerungstag setzt den Zähler zurück', () => {
      const d = decideReminder(cand({ state: sentThu(3), activityDays: new Set(['2026-11-19']) }), DI_19)
      expect(d).toMatchObject({ send: true, ignoredInARow: 0 })
    })
    it('Reaktion am Folgetag zählt ebenfalls', () => {
      const d = decideReminder(cand({ state: sentThu(3), activityDays: new Set(['2026-11-20']) }), DI_19)
      expect(d).toMatchObject({ send: true, ignoredInARow: 0 })
    })
    it('Lernen erst zwei Tage später zählt nicht als Reaktion', () => {
      const d = decideReminder(cand({ state: sentThu(0), activityDays: new Set(['2026-11-21']) }), DI_19)
      expect(d).toMatchObject({ send: true, ignoredInARow: 1 })
    })
    it('3 ignoriert + diese ignoriert = 4: danach nur noch alle 14 Tage → heute nichts', () => {
      const d = decideReminder(cand({ state: sentThu(3) }), DI_19)
      expect(d).toMatchObject({ send: false, reason: 'abgeklungen', ignoredInARow: 4 })
    })
    it('abgeklungen, aber 14 Tage seit der letzten: wieder eine', () => {
      const state = { last_sent_date: '2026-11-10', sent_count: 9, ignored_in_a_row: 4 }
      const d = decideReminder(cand({ state }), DI_19)
      expect(d).toMatchObject({ send: true, ignoredInARow: 5 })
    })
    it('abgeklungen, 13 Tage seit der letzten: noch nicht', () => {
      const state = { last_sent_date: '2026-11-11', sent_count: 9, ignored_in_a_row: 4 }
      expect(decideReminder(cand({ state }), DI_19)).toMatchObject({ send: false, reason: 'abgeklungen' })
    })
    it('nach Reaktion beginnt der Rhythmus von vorn, auch aus der Pause', () => {
      const state = { last_sent_date: '2026-11-10', sent_count: 9, ignored_in_a_row: 6 }
      const d = decideReminder(cand({ state, activityDays: new Set(['2026-11-11']) }), DI_19)
      expect(d).toMatchObject({ send: true, ignoredInARow: 0 })
    })
    it('wiederholtes Prüfen ohne Versand ändert die Bewertung nicht (idempotent)', () => {
      const c = cand({ state: sentThu(3) })
      expect(decideReminder(c, DI_19)).toEqual(decideReminder(c, DI_19))
    })
  })

  it('Konto mit Ablehnung der Karte, aber noch nie gesendet: normaler Erstversand', () => {
    const state = { last_sent_date: null, sent_count: 0, ignored_in_a_row: 0 }
    expect(decideReminder(cand({ state }), DI_19)).toMatchObject({ send: true, ignoredInARow: 0 })
  })
})

describe('reactedToLast', () => {
  it('Tag selbst und Folgetag', () => {
    expect(reactedToLast('2026-11-19', new Set(['2026-11-19']))).toBe(true)
    expect(reactedToLast('2026-11-19', new Set(['2026-11-20']))).toBe(true)
    expect(reactedToLast('2026-11-19', new Set(['2026-11-18', '2026-11-21']))).toBe(false)
  })
})

describe('Texte', () => {
  const brand = { appName: 'SpediLern', currencyName: 'Frachtmünzen', hofName: 'Betrieb', iconPrefix: 'sped' }

  it('wechselt reihum', () => {
    const bodies = REMINDER_TEXTS.map((_t, i) => buildPayload(i, null, brand).body)
    expect(new Set(bodies).size).toBe(REMINDER_TEXTS.length)
    expect(buildPayload(REMINDER_TEXTS.length, null, brand).body).toBe(bodies[0])
  })
  it('setzt Münzname und Hofname des Fachbereichs ein, keine Platzhalter bleiben', () => {
    for (let i = 0; i < REMINDER_TEXTS.length; i++) {
      expect(buildPayload(i, null, brand).body).not.toMatch(/[{}]/)
    }
    expect(REMINDER_TEXTS.some((t) => t.includes('{münzen}'))).toBe(true)
    const tour = { appName: 'TouristikLern', currencyName: 'Reisetaler', hofName: 'Resort', iconPrefix: 'tour' }
    expect(REMINDER_TEXTS.map((_t, i) => buildPayload(i, null, tour).body).join('|')).toContain('Reisetaler')
    expect(REMINDER_TEXTS.map((_t, i) => buildPayload(i, null, tour).body).join('|')).toContain('Resort')
  })
  it('Streak-Text nennt die Tage', () => {
    expect(buildPayload(3, 4, brand).body).toBe(streakText(4))
    expect(streakText(4)).toContain('4-Tage-Streak')
  })
  it('Inhalt: Titel = App-Name, Ziel = Quiz, Symbol je Fachbereich', () => {
    expect(buildPayload(0, null, brand)).toMatchObject({ title: 'SpediLern', url: '/quiz', icon: '/icons/sped-192.png' })
  })
  it('Datenschutz: kein Platzhalter für Namen oder Lerninhalte', () => {
    for (const t of REMINDER_TEXTS) expect(t).not.toMatch(/\{(name|email|frage|thema)/i)
  })
  it('Texte sind kurz genug für eine Meldung', () => {
    for (const t of REMINDER_TEXTS) expect(t.length).toBeLessThanOrEqual(80)
  })
  it('negative Zähler brechen nicht', () => {
    expect(buildPayload(-3, null, brand).body).toBe(REMINDER_TEXTS[0].replace('{münzen}', 'Frachtmünzen').replace('{hof}', 'Betrieb'))
  })
})

describe('isAllowedPushEndpoint (SSRF-Schutz)', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://web.push.apple.com/QAbc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
    'https://api.push.apple.com/3/device/abc',
  ])('erlaubt %s', (u) => expect(isAllowedPushEndpoint(u)).toBe(true))

  it.each([
    ['fremder Server', 'https://evil.example.com/push'],
    ['interne Adresse', 'https://169.254.169.254/latest/meta-data'],
    ['localhost', 'https://localhost/push'],
    ['kein https', 'http://fcm.googleapis.com/fcm/send/abc'],
    ['Zugangsdaten in der Adresse', 'https://user:pw@fcm.googleapis.com/x'],
    ['andere Portnummer', 'https://fcm.googleapis.com:8443/x'],
    ['Trick: erlaubter Name als Vorsilbe', 'https://fcm.googleapis.com.evil.com/x'],
    ['Trick: erlaubter Name im Pfad', 'https://evil.com/fcm.googleapis.com'],
    ['Trick: ähnliche Endung', 'https://evilnotify.windows.com.attacker.io/x'],
    ['Müll', 'kein url'],
    ['leer', ''],
  ])('lehnt ab: %s', (_n, u) => expect(isAllowedPushEndpoint(u)).toBe(false))

  it('Groß-/Kleinschreibung im Host ändert nichts', () => {
    expect(isAllowedPushEndpoint('https://FCM.GoogleAPIs.com/fcm/send/abc')).toBe(true)
  })
})
