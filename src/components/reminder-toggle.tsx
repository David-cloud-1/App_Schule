'use client'

import { useState } from 'react'
import { Bell } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { usePushReminder } from '@/hooks/use-push-reminder'
import { REMINDER_DAYS_LABEL, REMINDER_HOUR } from '@/lib/push-client'

/**
 * Profil-Schalter „Erinnerung“ (PROJ-18). Gilt für dieses Gerät:
 * Jedes Handy und jeder Rechner wird einzeln angemeldet.
 */
export function ReminderToggle() {
  const reminder = usePushReminder()
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  async function handleToggle(checked: boolean) {
    setMessage(null)
    if (checked) {
      const result = await reminder.enable()
      if (result === 'denied') {
        setMessage({ text: 'Dein Browser hat Benachrichtigungen blockiert. Erlaube sie in den Einstellungen für diese Seite.', error: true })
      } else if (result === 'error') {
        setMessage({ text: 'Das hat nicht geklappt. Versuch es bitte gleich noch einmal.', error: true })
      }
    } else if (!(await reminder.disable())) {
      setMessage({ text: 'Abschalten hat nicht geklappt. Versuch es bitte gleich noch einmal.', error: true })
    }
  }

  let hint: string
  let canToggle = false
  if (reminder.loading) {
    hint = 'Wird geprüft …'
  } else if (reminder.support === 'ios-install-needed') {
    hint = 'Auf dem iPhone: in Safari auf „Teilen“ → „Zum Home-Bildschirm“, dann die App über das Symbol öffnen.'
  } else if (reminder.support === 'unsupported') {
    hint = 'Dieser Browser kann keine Erinnerungen anzeigen.'
  } else if (reminder.permission === 'denied' && !reminder.subscribedHere) {
    hint = 'Benachrichtigungen sind für diese Seite blockiert. Erlaube sie in den Einstellungen deines Geräts.'
  } else {
    canToggle = true
    hint = reminder.subscribedHere
      ? `An auf diesem Gerät: ${REMINDER_DAYS_LABEL} um ${REMINDER_HOUR} Uhr, wenn du noch nicht gelernt hast`
      : reminder.server?.enabled
        ? 'Auf einem anderen Gerät an, hier aus'
        : `Aus. Höchstens zweimal pro Woche, ${REMINDER_DAYS_LABEL} um ${REMINDER_HOUR} Uhr.`
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Bell size={16} className="flex-shrink-0 text-[#9CA3AF]" aria-hidden />
          <div>
            <Label htmlFor="daily-reminder" className="cursor-pointer text-sm font-medium text-[#F9FAFB]">
              Erinnerung
            </Label>
            <p className="text-xs text-[#9CA3AF]">{hint}</p>
          </div>
        </div>
        <Switch
          id="daily-reminder"
          checked={reminder.subscribedHere}
          onCheckedChange={handleToggle}
          disabled={!canToggle || reminder.busy}
          className="data-[state=checked]:bg-[#58CC02]"
        />
      </div>
      {message && (
        <p className={message.error ? 'text-xs text-[#FF4B4B]' : 'text-xs text-[#9CA3AF]'} role={message.error ? 'alert' : 'status'}>
          {message.text}
        </p>
      )}
    </div>
  )
}
