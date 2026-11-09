/**
 * Gruppen A/B bei Leistungsnachweisen (PROJ-76): feste Reihenfolge der Fragen
 * und Antwortoptionen je Gruppe. Reine Rechnung ohne Datenbank, damit Vorschau,
 * Öffnen und Beitritt immer dasselbe Ergebnis liefern.
 */

export type GroupLabel = 'A' | 'B'
export const GROUP_LABELS: GroupLabel[] = ['A', 'B']

export type GroupOrder = {
  questionOrder: string[]
  /** Frage-ID → Antwortoptions-IDs in angezeigter Reihenfolge */
  optionOrder: Record<string, string[]>
}
export type GroupOrders = Record<GroupLabel, GroupOrder>

export type MixOption = { id: string; text: string; order: number }
export type MixQuestion = { id: string; options: MixOption[] }

/** Kleiner, bewusst einfacher Zufallsgenerator mit Startwert (reproduzierbar) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(items: T[], random: () => number): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function newMixSeed(): number {
  return Math.floor(Math.random() * 2147483646) + 1
}

/** Sammeloptionen, die auf andere Antworten verweisen: bleiben am Ende stehen */
const COLLECTIVE_OPTION = /\b(alle|keine)\b.{0,25}\b(oben|obigen|genannten|vorstehenden|aussagen|antworten|richtig|falsch)\b|\bnichts davon\b|\bkeine der\b/i
/** Verweise auf Buchstaben („A und B“, „a) und c)“): die Optionen der Frage werden nicht gemischt */
const LETTER_REFERENCE = /(^|[\s(])[A-Da-d]\)?\s*(und|oder|sowie|\+|,|&)\s*[A-Da-d]\)?($|[\s.,;)])/
const LETTER_ONLY = /\b(antwort|aussage|option)\s*[A-Da-d]\b/i

export function isCollectiveOption(text: string): boolean {
  return COLLECTIVE_OPTION.test(text)
}

/** Verweist eine Option auf Buchstaben anderer Optionen? Dann ändert Mischen den Sinn. */
export function referencesLetters(text: string): boolean {
  return LETTER_REFERENCE.test(text) || LETTER_ONLY.test(text)
}

/** Fragen, bei denen Mischen die Antworten verfälschen könnte (Hinweis an die Lehrkraft) */
export function questionsNeedingReview(questions: MixQuestion[]): string[] {
  return questions
    .filter((q) => q.options.some((o) => isCollectiveOption(o.text) || referencesLetters(o.text)))
    .map((q) => q.id)
}

function mixOptions(options: MixOption[], random: () => number): string[] {
  const sorted = [...options].sort((a, b) => a.order - b.order)
  if (sorted.some((o) => referencesLetters(o.text))) return sorted.map((o) => o.id)
  const movable = sorted.filter((o) => !isCollectiveOption(o.text))
  const pinned = sorted.filter((o) => isCollectiveOption(o.text))
  return [...seededShuffle(movable, random), ...pinned].map((o) => o.id)
}

/**
 * Gruppe A = Originalreihenfolge (Fragen wie gewählt, Antworten nach display_order).
 * Gruppe B = Mischung aus dem Mischwert. Gleicher Mischwert und gleiche Fragen
 * ergeben immer dieselbe Reihenfolge.
 */
export function buildGroupOrders(questions: MixQuestion[], seed: number): GroupOrders {
  const random = mulberry32(seed)
  const original: GroupOrder = {
    questionOrder: questions.map((q) => q.id),
    optionOrder: Object.fromEntries(
      questions.map((q) => [q.id, [...q.options].sort((a, b) => a.order - b.order).map((o) => o.id)]),
    ),
  }
  const mixed: GroupOrder = {
    questionOrder: seededShuffle(
      questions.map((q) => q.id),
      random,
    ),
    optionOrder: Object.fromEntries(questions.map((q) => [q.id, mixOptions(q.options, random)])),
  }
  // Gruppe B soll sich spürbar von A unterscheiden (bei ≥ 2 Fragen)
  if (questions.length >= 2 && mixed.questionOrder.join() === original.questionOrder.join()) {
    mixed.questionOrder = [...mixed.questionOrder.slice(1), mixed.questionOrder[0]]
  }
  return { A: original, B: mixed }
}

/** Beitrittsposition 0, 1, 2 … → A, B, A, B … */
export function groupForSlot(slot: number): GroupLabel {
  return slot % 2 === 0 ? 'A' : 'B'
}

type OrderableQuestion = { id: string; answer_options?: { id: string; display_order: number }[] }

/**
 * Bringt Fragen und Antwortoptionen in die Reihenfolge einer Gruppe und
 * nummeriert display_order neu. Unbekannte IDs (Frage nachträglich gelöscht)
 * werden ans Ende gestellt, nichts geht verloren.
 */
export function applyGroupOrder<T extends OrderableQuestion>(questions: T[], order: GroupOrder): T[] {
  const rank = new Map(order.questionOrder.map((id, i) => [id, i]))
  const sorted = [...questions].sort((a, b) => (rank.get(a.id) ?? 1e9) - (rank.get(b.id) ?? 1e9))
  return sorted.map((q) => {
    const optRank = new Map((order.optionOrder[q.id] ?? []).map((id, i) => [id, i]))
    const options = [...(q.answer_options ?? [])]
      .sort((a, b) => (optRank.get(a.id) ?? 1e9) - (optRank.get(b.id) ?? 1e9))
      .map((o, i) => ({ ...o, display_order: i + 1 }))
    return { ...q, answer_options: options }
  })
}

export function isGroupLabel(value: unknown): value is GroupLabel {
  return value === 'A' || value === 'B'
}

export function isGroupOrders(value: unknown): value is GroupOrders {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return GROUP_LABELS.every((g) => {
    const o = v[g] as GroupOrder | undefined
    return !!o && Array.isArray(o.questionOrder) && !!o.optionOrder && typeof o.optionOrder === 'object'
  })
}

/** Verteilung für den Hinweis in der Teilnehmerliste, z. B. „Gruppe A: 14 · Gruppe B: 13“ */
export function groupDistribution(labels: (GroupLabel | null | undefined)[]): { A: number; B: number } {
  return {
    A: labels.filter((l) => l === 'A').length,
    B: labels.filter((l) => l === 'B').length,
  }
}

/** Buchstabe der Antwortposition (1 → A) */
export function optionLetter(position: number): string {
  return String.fromCharCode(64 + position)
}
