'use client'

import { Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  FOCUS_AUTO_SUBMIT_MAX,
  FOCUS_AUTO_SUBMIT_MIN,
  FOCUS_COUNT_FROM_SECONDS,
  validateFocusSettings,
} from '@/lib/focus-tracking'

// Einstellungen des Fokus-Verlust-Protokolls (PROJ-30) — im Anlegen-Dialog
// und im Entwurf eines Leistungsnachweises. Nach dem Öffnen nicht mehr änderbar.

export type FocusFormValue = {
  tracking: boolean
  autoEnabled: boolean
  /** Eingabefeld als Text, damit eine halb getippte Zahl nicht sofort umspringt */
  autoAfter: string
}

/** Voreinstellung für neue Nachweise: Protokollierung an, Auto-Abgabe aus. */
export const DEFAULT_FOCUS_FORM: FocusFormValue = { tracking: true, autoEnabled: false, autoAfter: '3' }

export function focusFormFromDetail(focusTracking: boolean, focusAutoSubmitAfter: number | null): FocusFormValue {
  return {
    tracking: focusTracking,
    autoEnabled: focusAutoSubmitAfter != null,
    autoAfter: String(focusAutoSubmitAfter ?? 3),
  }
}

export function focusFormToPayload(value: FocusFormValue) {
  return {
    focusTracking: value.tracking,
    focusAutoSubmitAfter: value.tracking && value.autoEnabled ? Number(value.autoAfter) : null,
  }
}

/** null = gültig */
export function validateFocusForm(value: FocusFormValue): string | null {
  return validateFocusSettings(focusFormToPayload(value))
}

interface Props {
  value: FocusFormValue
  onChange: (value: FocusFormValue) => void
  error?: string
  disabled?: boolean
}

export function FocusSettingsFields({ value, onChange, error, disabled }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-[#4B5563] bg-[#111827] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Label htmlFor="focus-tracking" className="flex items-center gap-2 text-[#F9FAFB]">
            <Eye size={16} className="text-[#FF9600]" />
            Verlassen der Prüfung protokollieren
          </Label>
          <p className="text-xs text-[#9CA3AF]">
            Tab- und App-Wechsel (ab {FOCUS_COUNT_FROM_SECONDS} Sekunden) werden erfasst und dir bei der Auswertung
            angezeigt. Die Azubis werden vor dem Start darauf hingewiesen.
          </p>
        </div>
        <Switch
          id="focus-tracking"
          checked={value.tracking}
          disabled={disabled}
          onCheckedChange={(checked) => onChange({ ...value, tracking: checked, autoEnabled: checked ? value.autoEnabled : false })}
          aria-label="Verlassen der Prüfung protokollieren"
        />
      </div>

      <div className="flex items-start justify-between gap-4 border-t border-[#374151] pt-3">
        <div className="space-y-1">
          <Label htmlFor="focus-auto" className="text-[#F9FAFB]">Automatisch abgeben ab N Wechseln</Label>
          <p className="text-xs text-[#9CA3AF]">
            Standardmäßig aus: dann wird nur markiert, und du entscheidest über die Wertung.
          </p>
          {value.tracking && value.autoEnabled && (
            <div className="flex items-center gap-2 pt-1">
              <Input
                type="number"
                inputMode="numeric"
                min={FOCUS_AUTO_SUBMIT_MIN}
                max={FOCUS_AUTO_SUBMIT_MAX}
                value={value.autoAfter}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, autoAfter: e.target.value })}
                aria-label="Zahl der Wechsel bis zur automatischen Abgabe"
                className="bg-[#1F2937] border-[#4B5563] text-[#F9FAFB] w-24"
              />
              <span className="text-xs text-[#9CA3AF]">Wechsel ({FOCUS_AUTO_SUBMIT_MIN}–{FOCUS_AUTO_SUBMIT_MAX})</span>
            </div>
          )}
        </div>
        <Switch
          id="focus-auto"
          checked={value.tracking && value.autoEnabled}
          disabled={disabled || !value.tracking}
          onCheckedChange={(checked) => onChange({ ...value, autoEnabled: checked })}
          aria-label="Automatisch abgeben"
        />
      </div>

      <p className="text-xs text-[#6B7280]">
        Ein zweites Gerät oder Split-Screen wird nicht erkannt — das ersetzt keine Aufsicht.
      </p>
      {error && <p className="text-xs text-[#FF4B4B]">{error}</p>}
    </div>
  )
}
