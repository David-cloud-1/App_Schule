'use client'

import { useId, useState } from 'react'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AdminSegmented } from '@/components/admin/admin-segmented'
import { cn } from '@/lib/utils'
import { typName, type Block } from '@/lib/werkzeugkiste-editor'
import { KAPITELTEST_KATALOG, beispielBlock, merkeZuletzt } from '@/lib/werkzeugkiste-katalog'
import { KatalogDialog } from '@/components/werkzeugkiste/editor/katalog-dialog'
import { KATALOG_FORMULARE } from '@/components/werkzeugkiste/editor/editor-formulare-katalog'
import { Feld, Liste, TextListe, liste, s, texte, type Eintrag, type FormProps } from '@/components/werkzeugkiste/editor/formular-bausteine'

export type { FormProps } from '@/components/werkzeugkiste/editor/formular-bausteine'

/**
 * Formulare für die häufigsten Aufgabentypen (PROJ-89, Paket 2). Jede Eingabe
 * ändert den Block sofort (automatisch gespeichert, die Vorschau zieht nach).
 * Die übrigen Typen stehen in `editor-formulare-katalog.tsx` (PROJ-90).
 */

// ── Auswahlfrage (multiple_choice, single_choice) ───────────────────────

export function AuswahlFormular({ block, onChange }: FormProps) {
  const name = useId()
  const antworten = liste(block.answers)
  const richtig = antworten.findIndex((a) => a.correct === true)
  const setzeAntworten = (a: Eintrag[]) => onChange({ ...block, answers: a }, 'answers')
  return (
    <div className="space-y-4">
      <Feld label="Frage" pflicht mehrzeilig wert={s(block.question)} onChange={(v) => onChange({ ...block, question: v }, 'question')} />
      <RadioGroup
        value={richtig >= 0 ? String(richtig) : ''}
        onValueChange={(v) => setzeAntworten(antworten.map((a, i) => ({ ...a, correct: String(i) === v })))}
        aria-label="Richtige Antwort"
      >
        <Liste
          titel="Antworten (genau eine ist richtig)"
          einzahl="Antwort"
          mindestens={2}
          eintraege={antworten}
          neu={() => ({ text: '', correct: false, feedback: '' })}
          onChange={setzeAntworten}
        >
          {(a, i, setze) => (
            <>
              <div className="flex items-center gap-2">
                <RadioGroupItem value={String(i)} id={`${name}-${i}`} aria-label={`Antwort ${i + 1} ist richtig`} />
                <Label htmlFor={`${name}-${i}`} className={cn('text-xs', a.correct === true ? 'text-ws-green' : 'text-ws-muted')}>
                  {a.correct === true ? 'Richtige Antwort' : 'Als richtig markieren'}
                </Label>
              </div>
              <Feld label={`Antwort ${i + 1}`} wert={s(a.text)} onChange={(v) => setze({ ...a, text: v })} />
              <Feld label="Rückmeldung" wert={s(a.feedback)} onChange={(v) => setze({ ...a, feedback: v })} />
            </>
          )}
        </Liste>
      </RadioGroup>
    </div>
  )
}

// ── Richtig oder falsch ──────────────────────────────────────────────────

export function RichtigFalschFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Feld label="Aussage" pflicht mehrzeilig wert={s(block.question)} onChange={(v) => onChange({ ...block, question: v }, 'question')} />
      <div className="space-y-1.5">
        <span className="text-sm font-medium">Die Aussage ist …</span>
        <AdminSegmented
          ariaLabel="Die Aussage ist"
          value={block.correct === true ? 'wahr' : 'falsch'}
          onChange={(v) => onChange({ ...block, correct: v === 'wahr' }, 'correct')}
          options={[
            { value: 'wahr', label: 'richtig' },
            { value: 'falsch', label: 'falsch' },
          ]}
        />
      </div>
      <Feld label="Rückmeldung bei richtiger Antwort" wert={s(block.feedback_correct)} onChange={(v) => onChange({ ...block, feedback_correct: v }, 'fc')} />
      <Feld label="Rückmeldung bei falscher Antwort" wert={s(block.feedback_wrong)} onChange={(v) => onChange({ ...block, feedback_wrong: v }, 'fw')} />
    </div>
  )
}

// ── Schnellfragen (single_choice_set) ────────────────────────────────────

export function SchnellfragenFormular({ block, onChange }: FormProps) {
  const fragen = liste(block.questions)
  return (
    <Liste
      titel="Fragen"
      einzahl="Frage"
      mindestens={1}
      eintraege={fragen}
      neu={() => ({ question: '', correct: '', wrong: ['', ''] })}
      onChange={(f) => onChange({ ...block, questions: f }, 'questions')}
    >
      {(f, i, setze) => (
        <>
          <Feld label={`Frage ${i + 1}`} pflicht wert={s(f.question)} onChange={(v) => setze({ ...f, question: v })} />
          <Feld label="Richtige Antwort" pflicht wert={s(f.correct)} onChange={(v) => setze({ ...f, correct: v })} />
          <TextListe titel="Falsche Antworten (mindestens zwei)" einzahl="Falsche Antwort" werte={texte(f.wrong)} onChange={(w) => setze({ ...f, wrong: w })} />
        </>
      )}
    </Liste>
  )
}

// ── Lückentexte (fill_blanks, advanced_fill_blanks, drag_words, mark_words) ─

const LUECKEN_HILFE: Record<string, string> = {
  fill_blanks: 'Lücken mit Sternchen markieren: *Frachtführer*. Mehrere richtige Schreibweisen mit Schrägstrich: *CMR/Frachtbrief*.',
  advanced_fill_blanks: 'Lücken mit Sternchen markieren, den Tipp in Klammern dahinter: *Spediteur* (Berufsbezeichnung).',
  drag_words: 'Wörter zum Ziehen mit Sternchen markieren: *Frachtführer*. Ein Tipp nach Doppelpunkt: *Gefährdungshaftung:§ 425 HGB*.',
  mark_words: 'Die Wörter, die markiert werden sollen, mit Sternchen umschließen: *CMR*. Der Text muss ein ganzer Satz sein.',
}

/** Die markierten Stellen eines Lückentextes, lesbar (für die Kontrolle unter dem Feld) */
export function luecken(typ: string, text: string): string[] {
  const out: string[] = []
  const re = typ === 'advanced_fill_blanks' ? /\*([^*]+)\*(?:\s*\(([^)]*)\))?/g : /\*([^*]+)\*/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const inhalt = m[1].trim()
    if (typ === 'drag_words' && inhalt.includes(':')) {
      const [wort, tipp] = inhalt.split(':')
      out.push(`${wort.trim()} (Tipp: ${tipp.trim()})`)
    } else if (typ === 'advanced_fill_blanks' && m[2]) {
      out.push(`${inhalt} (Tipp: ${m[2].trim()})`)
    } else if (typ === 'fill_blanks' && inhalt.includes('/')) {
      out.push(inhalt.split('/').map((x) => x.trim()).join(' oder '))
    } else {
      out.push(inhalt)
    }
  }
  return out
}

export function LueckenFormular({ block, onChange }: FormProps) {
  const typ = s(block.type)
  const text = s(block.text)
  const gefunden = luecken(typ, text)
  return (
    <div className="space-y-4">
      <Feld
        label="Aufgabentitel (optional)"
        wert={s(block.description)}
        onChange={(v) => onChange({ ...block, description: v || undefined }, 'description')}
        hinweis="Ersetzt die Standard-Überschrift, z. B. „🔍 Detektiv-Modus: Finde die fehlenden Begriffe:“"
      />
      <Feld
        label="Text"
        pflicht
        mehrzeilig
        zeilen={6}
        wert={text}
        onChange={(v) => onChange({ ...block, text: v }, 'text')}
        hinweis={LUECKEN_HILFE[typ]}
      />
      <div className="rounded-xl border border-ws-line bg-ws-bg px-3 py-2 text-sm" aria-live="polite">
        {gefunden.length === 0 ? (
          <span className="text-ws-orange">Noch keine {typ === 'mark_words' ? 'markierten Wörter' : 'Lücken'} – mit *Sternchen* markieren.</span>
        ) : (
          <>
            <span className="font-semibold">
              {gefunden.length} {typ === 'mark_words' ? 'zu markieren' : gefunden.length === 1 ? 'Lücke' : 'Lücken'}:
            </span>{' '}
            <span className="text-ws-muted">{gefunden.join(' · ')}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ── Begriffe zum Aufklappen (accordion) ─────────────────────────────────

export function AkkordeonFormular({ block, onChange }: FormProps) {
  return (
    <Liste
      titel="Begriffe"
      einzahl="Begriff"
      mindestens={1}
      eintraege={liste(block.items)}
      neu={() => ({ term: '', definition: '' })}
      onChange={(l) => onChange({ ...block, items: l }, 'items')}
    >
      {(e, i, setze) => (
        <>
          <Feld label={`Begriff ${i + 1}`} pflicht wert={s(e.term)} onChange={(v) => setze({ ...e, term: v })} />
          <Feld label="Erklärung" pflicht mehrzeilig zeilen={2} wert={s(e.definition)} onChange={(v) => setze({ ...e, definition: v })} />
        </>
      )}
    </Liste>
  )
}

// ── Lernkarten (dialog_cards) ────────────────────────────────────────────

export function KartenFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Feld label="Überschrift (optional)" wert={s(block.title)} onChange={(v) => onChange({ ...block, title: v || undefined }, 'title')} />
      <Liste
        titel="Karten"
        einzahl="Karte"
        mindestens={1}
        eintraege={liste(block.cards)}
        neu={() => ({ front: '', back: '' })}
        onChange={(l) => onChange({ ...block, cards: l }, 'cards')}
      >
        {(k, i, setze) => (
          <>
            <Feld label={`Karte ${i + 1}: Vorderseite`} pflicht wert={s(k.front)} onChange={(v) => setze({ ...k, front: v })} />
            <Feld label="Rückseite" pflicht mehrzeilig zeilen={2} wert={s(k.back)} onChange={(v) => setze({ ...k, back: v })} />
          </>
        )}
      </Liste>
    </div>
  )
}

// ── Rechenaufgabe (calculation_exercise) ────────────────────────────────

export function RechenFormular({ block, onChange }: FormProps) {
  return (
    <div className="space-y-4">
      <Feld
        label="Aufgabe"
        pflicht
        mehrzeilig
        zeilen={4}
        wert={s(block.task)}
        onChange={(v) => onChange({ ...block, task: v }, 'task')}
        hinweis="Nur die Aufgabenstellung – ohne Formel, Rechenweg oder „Ergebnis:“."
      />
      <Feld
        label="Ergebnis"
        pflicht
        wert={s(block.result)}
        onChange={(v) => onChange({ ...block, result: v }, 'result')}
        hinweis="Deutsches Zahlenformat, z. B. 4.165,00 €. Schreibweisen mit und ohne € oder Tausenderpunkt gelten automatisch."
      />
    </div>
  )
}

// ── Zusammenfassung (summary) ────────────────────────────────────────────

export function ZusammenfassungFormular({ block, onChange }: FormProps) {
  if (Array.isArray(block.statements)) {
    return (
      <TextListe
        titel="Kernaussagen"
        einzahl="Aussage"
        werte={texte(block.statements)}
        onChange={(w) => onChange({ ...block, statements: w }, 'statements')}
      />
    )
  }
  return (
    <Liste
      titel="Fragen"
      einzahl="Frage"
      mindestens={1}
      eintraege={liste(block.questions)}
      neu={() => ({ correct: '', distractors: ['', ''] })}
      onChange={(l) => onChange({ ...block, questions: l }, 'questions')}
    >
      {(q, i, setze) => (
        <>
          <Feld label={`Richtige Aussage ${i + 1}`} pflicht wert={s(q.correct)} onChange={(v) => setze({ ...q, correct: v })} />
          <TextListe
            titel="Falsche Aussagen (mindestens zwei)"
            einzahl="Falsche Aussage"
            werte={texte(q.distractors)}
            onChange={(w) => setze({ ...q, distractors: w })}
          />
        </>
      )}
    </Liste>
  )
}

// ── Kapiteltest (question_set) ───────────────────────────────────────────

/** Diese Typen erlaubt der Kern im Kapiteltest */
export const KAPITELTEST_TYPEN = ['multiple_choice', 'single_choice', 'true_false', 'fill_blanks'] as const

function neueFrage(typ: string): Block {
  if (typ === 'true_false') return { type: typ, question: '', correct: true, feedback_correct: '', feedback_wrong: '' }
  if (typ === 'fill_blanks') return { type: typ, text: '' }
  return {
    type: typ,
    question: '',
    answers: [
      { text: '', correct: true, feedback: '' },
      { text: '', correct: false, feedback: '' },
    ],
  }
}

/** Beim Typwechsel übernimmt die Frage, was passt (Fragetext), der Rest beginnt neu */
function frageUmstellen(alt: Block, typ: string): Block {
  const neu = neueFrage(typ)
  const frage = s(alt.question || alt.text)
  if (typ === 'fill_blanks') return { ...neu, text: frage }
  if (typ !== 'true_false' && (alt.type === 'multiple_choice' || alt.type === 'single_choice')) return { ...alt, type: typ }
  return { ...neu, question: frage }
}

export function KapiteltestFormular({ block, onChange }: FormProps) {
  const fragen = liste(block.questions) as Block[]
  const prozent = Number(block.pass_percentage ?? 70)
  // PROJ-90 (E6): neue Fragen über den Katalog, gefiltert auf die erlaubten Typen
  const [katalog, setKatalog] = useState(false)
  return (
    <div className="space-y-4">
      <div className="max-w-48">
        <Feld
          label="Bestehensgrenze in Prozent"
          wert={Number.isFinite(prozent) ? String(prozent) : ''}
          onChange={(v) => {
            const n = Math.max(0, Math.min(100, Math.round(Number(v.replace(',', '.')) || 0)))
            onChange({ ...block, pass_percentage: n }, 'pass_percentage')
          }}
        />
      </div>
      <Liste
        titel="Fragen"
        einzahl="Frage"
        mindestens={1}
        eintraege={fragen}
        neu={() => neueFrage('multiple_choice')}
        hinzufuegen={() => setKatalog(true)}
        onChange={(l) => onChange({ ...block, questions: l }, 'questions')}
      >
        {(f, i, setze) => (
          <>
            <div className="space-y-1.5">
              <Label>Fragetyp</Label>
              <Select value={KAPITELTEST_TYPEN.includes(f.type as never) ? f.type : undefined} onValueChange={(t) => setze(frageUmstellen(f, t))}>
                <SelectTrigger className="min-h-11 rounded-xl" aria-label={`Fragetyp von Frage ${i + 1}`}>
                  <SelectValue placeholder={typName(f.type)} />
                </SelectTrigger>
                <SelectContent>
                  {KAPITELTEST_TYPEN.map((t) => (
                    <SelectItem key={t} value={t}>
                      {typName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FrageFormular block={f} onChange={(neu) => setze(neu)} />
          </>
        )}
      </Liste>
      <KatalogDialog
        offen={katalog}
        onOpenChange={setKatalog}
        erlaubt={KAPITELTEST_KATALOG}
        bilder={0}
        onWaehle={(typ) => {
          merkeZuletzt(typ)
          setKatalog(false)
          // Neue Frage am Ende, mit Beispielinhalt (E2)
          onChange({ ...block, questions: [...fragen, beispielBlock(typ)] }, 'questions-neu')
        }}
      />
    </div>
  )
}

function FrageFormular({ block, onChange }: FormProps) {
  const F = FORMULARE[block.type]
  // Seit PROJ-90 gibt es Formulare für alle Typen – im Kapiteltest zählen trotzdem nur die erlaubten
  if (!F || !(KAPITELTEST_TYPEN as readonly string[]).includes(block.type)) {
    return (
      <p className="text-sm text-ws-orange">
        Nicht im Kapiteltest möglich – wird übersprungen. Wähle oben einen erlaubten Typ oder entferne die Frage.
      </p>
    )
  }
  return <F block={block} onChange={onChange} />
}

// ── Lernzielkontrolle (final_chapter) ───────────────────────────────────

export function AbschlussFormular({
  abschluss,
  onChange,
}: {
  abschluss: Eintrag
  onChange: (abschluss: Eintrag, feld: string) => void
}) {
  const qs = (abschluss.question_set && typeof abschluss.question_set === 'object' ? abschluss.question_set : { pass_percentage: 70, questions: [] }) as Eintrag
  const summary = (abschluss.summary && typeof abschluss.summary === 'object' ? abschluss.summary : { statements: [] }) as Eintrag
  return (
    <div className="space-y-6">
      <Feld label="Titel" wert={s(abschluss.title ?? 'Lernzielkontrolle')} onChange={(v) => onChange({ ...abschluss, title: v }, 'title')} />
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Abschlusstest</h3>
        <KapiteltestFormular
          block={{ type: 'question_set', ...qs }}
          onChange={(b, feld) => {
            const { type: _t, ...rest } = b
            void _t
            onChange({ ...abschluss, question_set: rest }, `qs-${feld}`)
          }}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-bold">Gesamtzusammenfassung</h3>
        <TextListe
          titel="Kernaussagen der ganzen Einheit"
          einzahl="Aussage"
          werte={texte(summary.statements)}
          onChange={(w) => onChange({ ...abschluss, summary: { ...summary, statements: w } }, 'statements')}
        />
      </section>
    </div>
  )
}

// ── Zuordnung Typ → Formular ─────────────────────────────────────────────

export const FORMULARE: Record<string, (p: FormProps) => React.ReactNode> = {
  accordion: AkkordeonFormular,
  multiple_choice: AuswahlFormular,
  single_choice: AuswahlFormular,
  true_false: RichtigFalschFormular,
  single_choice_set: SchnellfragenFormular,
  fill_blanks: LueckenFormular,
  advanced_fill_blanks: LueckenFormular,
  drag_words: LueckenFormular,
  mark_words: LueckenFormular,
  dialog_cards: KartenFormular,
  calculation_exercise: RechenFormular,
  summary: ZusammenfassungFormular,
  question_set: KapiteltestFormular,
  ...KATALOG_FORMULARE,
}

export function hatFormular(typ: string): boolean {
  return typ in FORMULARE
}
