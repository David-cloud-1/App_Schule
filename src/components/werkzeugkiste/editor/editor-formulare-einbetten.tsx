'use client'

import type { ReactNode } from 'react'
import {
  AlertTriangle,
  Blocks,
  ChartBar,
  ClipboardList,
  ExternalLink,
  Gamepad2,
  Hash,
  Puzzle,
  Shapes,
  StickyNote,
  Video,
} from 'lucide-react'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { Feld, s, type FormProps } from '@/components/werkzeugkiste/editor/formular-bausteine'
import {
  leseDarstellung,
  linkHost,
  pruefeEinbettung,
  titelVorschlag,
  type Darstellung,
} from '@/lib/werkzeugkiste-einbettung'
import type { Block } from '@/lib/werkzeugkiste-editor'

/**
 * Formular für den Block „Einbetten“ (PROJ-109). Hier wird nichts vom Anbieter
 * geladen: Der Anbieter wird nur am Text des Links erkannt.
 */

const DARSTELLUNGEN = [
  { value: 'einbetten', label: 'Einbetten (nach Klick)' },
  { value: 'link', label: 'Nur Link und QR-Code' },
] as const

/** Eigene Symbole je Anbieter (keine Logos, nichts wird vom Anbieter geladen) */
const SYMBOL_KLASSE = 'mt-0.5 size-4 shrink-0'
const SYMBOLE: Record<string, ReactNode> = {
  youtube: <Video className={SYMBOL_KLASSE} aria-hidden />,
  vimeo: <Video className={SYMBOL_KLASSE} aria-hidden />,
  learningapps: <Puzzle className={SYMBOL_KLASSE} aria-hidden />,
  kahoot: <Gamepad2 className={SYMBOL_KLASSE} aria-hidden />,
  padlet: <StickyNote className={SYMBOL_KLASSE} aria-hidden />,
  mentimeter: <ChartBar className={SYMBOL_KLASSE} aria-hidden />,
  h5p: <Blocks className={SYMBOL_KLASSE} aria-hidden />,
  geogebra: <Shapes className={SYMBOL_KLASSE} aria-hidden />,
  'google-forms': <ClipboardList className={SYMBOL_KLASSE} aria-hidden />,
  'google-forms-kurz': <ClipboardList className={SYMBOL_KLASSE} aria-hidden />,
  'microsoft-forms': <ClipboardList className={SYMBOL_KLASSE} aria-hidden />,
}

/** Leeres optionales Feld entfernen statt "" zu speichern */
function optional(b: Block, feld: string, wert: string): Block {
  const neu = { ...b }
  if (wert.trim() === '') delete neu[feld]
  else neu[feld] = wert
  return neu
}

export function EinbettenFormular({ block, onChange }: FormProps) {
  const sicht = pruefeEinbettung(block)
  const titel = s(block.titel)

  function setzeLink(v: string) {
    const neu: Block = { ...block, url: v.trim() }
    // Titel mitführen, solange die Lehrkraft ihn nicht selbst geändert hat
    if (!titel.trim() || titel === titelVorschlag(s(block.url))) {
      const vorschlag = titelVorschlag(v.trim())
      if (vorschlag) neu.titel = vorschlag
    }
    onChange(neu, 'url')
  }

  const anbieter = sicht.art === 'link' ? sicht.anbieter : null
  const darstellung: Darstellung = leseDarstellung(block.darstellung, anbieter)

  return (
    <div className="space-y-4">
      <Feld
        label="Link einfügen"
        pflicht
        wert={s(block.url)}
        onChange={setzeLink}
        hinweis="Zum Beispiel von YouTube, LearningApps oder Kahoot. Bei Kahoot geht auch die PIN."
      />
      {sicht.fehler && (
        <p role="alert" className="flex items-start gap-2 text-sm text-ws-red">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {sicht.fehler}
        </p>
      )}
      {sicht.art === 'pin' && (
        <p className="flex items-start gap-2 rounded-xl border border-ws-blue/30 bg-ws-blue/15 px-3 py-2 text-sm text-ws-blue">
          <Hash className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Kahoot-PIN {sicht.pin}. Die Schüler sehen sie groß mit einem Link zu kahoot.it. Die PIN gilt nur für das laufende Spiel.
          </span>
        </p>
      )}
      {sicht.art === 'link' && (
        <p
          className="flex items-start gap-2 rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm text-ws-muted"
          data-anbieter={anbieter?.id ?? 'fremd'}
        >
          {(anbieter && SYMBOLE[anbieter.id]) ?? <ExternalLink className={SYMBOL_KLASSE} aria-hidden />}
          <span>
            {anbieter
              ? `Erkannt: ${anbieter.name}. Der Anbieter wird erst geladen, wenn ein Schüler „Inhalt laden“ klickt.`
              : 'Dieser Anbieter steht nicht auf der Liste. Die Schüler bekommen den Link und einen QR-Code, eingebettet wird nicht.'}
          </span>
        </p>
      )}

      <Feld label="Titel" wert={titel} onChange={(v) => onChange(optional(block, 'titel', v), 'titel')} hinweis="Steht über der Karte, z. B. „Video ansehen“." />

      {anbieter?.einbettbar && sicht.art === 'link' && (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">Darstellung</span>
          <div>
            <AdminSegmented ariaLabel="Darstellung" value={darstellung} onChange={(v) => onChange({ ...block, darstellung: v }, 'darstellung')} options={DARSTELLUNGEN} />
          </div>
          <p className="text-xs text-ws-muted">
            {darstellung === 'einbetten'
              ? `Die Schüler klicken „Inhalt laden“, dann erscheint der Inhalt in der Seite (Daten gehen an ${anbieter.anzeigeHost}). Im Link für Azubis und in der Vorschau öffnet er sich stattdessen in einem neuen Tab.`
              : `Die Schüler bekommen den Link und einen QR-Code, zum Beispiel für den Ausdruck. Beim Öffnen gehen Daten an ${sicht.url ? linkHost(sicht.url) : anbieter.anzeigeHost}.`}
          </p>
        </div>
      )}

      {anbieter?.zeiten && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Feld label="Startzeit (optional)" wert={s(block.start)} onChange={(v) => onChange(optional(block, 'start', v), 'start')} hinweis="z. B. 1:30" />
          <Feld label="Endzeit (optional)" wert={s(block.ende)} onChange={(v) => onChange(optional(block, 'ende', v), 'ende')} hinweis="z. B. 2:45" />
        </div>
      )}

      <Feld
        label="Arbeitsauftrag (optional)"
        mehrzeilig
        wert={s(block.description)}
        onChange={(v) => onChange(optional(block, 'description', v), 'description')}
        hinweis="Steht über der Karte, z. B. „Sieh das Video an und notiere drei Stichpunkte.“"
      />

      {sicht.hinweise.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm" aria-live="polite">
          {sicht.hinweise.map((h) => (
            <li key={h} className="text-ws-orange">
              {h}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
