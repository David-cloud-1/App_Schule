import type { Checkliste } from '../liste'

const DR = 'dienstreise'
const KF = 'klassenfahrt'
const OHNE_KF = ['dienstreise', 'fortbildungsreise'] as const

/**
 * Pilot (PROJ-122): „Reisekosten abrechnen“ – nach „Dienst- und
 * Fortbildungsreise“ (4.2.1) und „Voraussetzungen Klassenfahrt, Erasmus,
 * Auslandspraktika“ (2.1). Eine eigene Leitlinie „Reisekostenabrechnung“ gibt
 * es in der Sammlung nicht.
 *
 * Die Sechs-Monats-Frist steht in der Leitlinie nur bei Klassenfahrten. Für
 * Dienst- und Fortbildungsreisen ist sie eine Annahme (E10), bis die
 * Schulleitung bestätigt hat: dann `fristAnnahme` und den Hinweis `frist-annahme` entfernen.
 */
export const reisekostenAbrechnen: Checkliste = {
  id: 'reisekosten-abrechnen',
  titel: 'Reisekosten abrechnen',
  beschreibung: 'Nach der Reise: Was gehört zur Abrechnung, und bis wann musst du sie stellen?',
  fuerWen: ['Lehrkraft'],
  quellen: [
    { schluessel: DR, leitlinie: 'Dienst- und Fortbildungsreise', pruefsumme: 'dfa22f5dcef6', stand: '2025-05-07', ueberschriften: ['Definitionen'] },
    {
      schluessel: KF,
      leitlinie: 'Voraussetzungen Klassenfahrt, Erasmus, Auslandspraktika',
      pruefsumme: '41a68d77bdf3',
      stand: null,
      ueberschriften: [
        'Zielsetzung',
        'Hinweise zur Organisation und Abrechnung von Klassenfahrten',
        'Erstattungsfähige Kosten',
        '1. Planung, Abstimmung und Teilnehmerlisten',
        '2. Klassenfahrten und Studienfahrten',
        'Zeitraum',
        'Mindestteilnahme',
        'Stundenabrechnung',
        '3. Erasmus-Fahrten',
        '4. Auslandspraktika (Standorte Barcelona, Bordeaux, Klaipėda)',
        'Blockplanung',
        'Individuelle Regelung',
      ],
    },
  ],
  variantenFrage: 'Wofür rechnest du ab?',
  varianten: [
    { id: 'dienstreise', label: 'Dienstreise' },
    { id: 'fortbildungsreise', label: 'Fortbildungsreise' },
    { id: 'klassenfahrt', label: 'Klassenfahrt' },
  ],
  hinweise: [
    {
      id: 'privat',
      art: 'info',
      text: 'Private Ausgaben werden nicht erstattet.',
      varianten: ['klassenfahrt'],
      anker: { quelle: KF, text: 'Private Ausgaben der Lehrkraft werden nicht erstattet' },
    },
    {
      id: 'frist-annahme',
      art: 'info',
      text: 'Annahme: Die Frist von sechs Monaten gilt vermutlich auch für Dienst- und Fortbildungsreisen, ebenso der Weg über das Sekretariat. In der Leitlinie „Dienst- und Fortbildungsreise“ steht dazu nichts, beides nennt nur die Leitlinie zur Klassenfahrt. Im Sekretariat nachfragen.',
      varianten: OHNE_KF,
    },
  ],
  schritte: [
    {
      id: 'antrag-original-beilegen',
      text: 'Das genehmigte Original des Dienstreiseantrags beilegen',
      anker: { quelle: DR, text: 'Das Original ist zwingend dem ggf. folgenden Reisekostenabrechnungsantrag beizulegen' },
    },
    {
      id: 'originalbelege-beilegen',
      text: 'Die Originalbelege beilegen',
      anker: { quelle: DR, text: 'OriginalBelege und Programm sind zwingend beizulegen' },
    },
    {
      id: 'programm-beilegen',
      text: 'Das Programm beilegen',
      zusatz: 'Bei einer Fortbildungsreise gehört die persönliche Einladung zum Antrag; das Programm legst du bei, wenn es eines gibt.',
      anker: { quelle: DR, text: 'OriginalBelege und Programm sind zwingend beizulegen' },
    },
    {
      id: 'programm-bezug',
      text: 'Prüfen, ob der Bezug zum Programm der Klassenfahrt erkennbar ist',
      varianten: ['klassenfahrt'],
      anker: { quelle: KF, text: 'Der Bezug des Programms zur Klassenfahrt muss erkennbar sein' },
    },
    {
      id: 'kosten-pruefen',
      text: 'Prüfen, welche Kosten erstattet werden',
      zusatz:
        'Erstattet werden bis zu drei Hotelübernachtungen mit Frühstück (prüfen, ob zwei genügen, weil die Kosten aus dem Schuletat kommen), Fahrtkosten zum Zielort und zurück, öffentliche Verkehrsmittel vor Ort und ein Kulturbudget von bis zu 30 € für die gesamte Fahrt.',
      varianten: ['klassenfahrt'],
      anker: { quelle: KF, text: 'Erstattet werden:' },
    },
    {
      id: 'antrag-stellen',
      text: 'Den Antrag auf Erstattung der Reisekosten über das Sekretariat stellen',
      frist: 'innerhalb von sechs Monaten nach der Reise',
      fristAnnahme: OHNE_KF,
      anker: { quelle: KF, text: 'innerhalb von sechs Monaten nach der Reise über das Sekretariat gestellt werden' },
    },
  ],
  bemerkung: 'Zusammengestellt aus „Dienst- und Fortbildungsreise“ und „Voraussetzungen Klassenfahrt, Erasmus, Auslandspraktika“.',
}
