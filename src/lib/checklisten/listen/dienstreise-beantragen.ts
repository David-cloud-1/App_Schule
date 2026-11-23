import type { Checkliste } from '../liste'

const DR = 'dienstreise'
const MIT_ANTRAG = ['dienstreise-inland', 'dienstreise-ausland', 'fortbildungsreise-inland', 'fortbildungsreise-ausland', 'fortbildungsgang', 'bezirksreise'] as const

/**
 * Pilot (PROJ-122): „Dienstreise beantragen“ – nach der Leitlinie
 * „Dienst- und Fortbildungsreise“ (4.2.1). Schritt-Kennungen und Varianten
 * werden nie umbenannt (Haken verweisen darauf).
 */
export const dienstreiseBeantragen: Checkliste = {
  id: 'dienstreise-beantragen',
  titel: 'Dienstreise beantragen',
  beschreibung: 'Antrag vor der Reise: Was musst du ausfüllen, beilegen und wohin geben?',
  fuerWen: ['Lehrkraft'],
  quellen: [
    {
      schluessel: DR,
      leitlinie: 'Dienst- und Fortbildungsreise',
      pruefsumme: 'dfa22f5dcef6',
      stand: '2025-05-07',
      ueberschriften: ['Definitionen'],
    },
  ],
  variantenFrage: 'Um welche Art von Reise oder Gang geht es?',
  varianten: [
    { id: 'dienstreise-inland', label: 'Dienstreise Inland' },
    { id: 'dienstreise-ausland', label: 'Dienstreise Ausland' },
    { id: 'fortbildungsreise-inland', label: 'Fortbildungsreise Inland' },
    { id: 'fortbildungsreise-ausland', label: 'Fortbildungsreise Ausland' },
    { id: 'fortbildungsgang', label: 'Fortbildungsgang (Stadtgebiet)' },
    { id: 'bezirksreise', label: 'Bezirksreise (Achatswies)' },
    {
      id: 'dienstgang',
      label: 'Dienstgang (Stadtgebiet)',
      keinAntrag: 'Für einen Dienstgang ist kein Antrag nötig. Die mündliche Genehmigung der Schulleitung genügt. Ein Dienstgang ist zum Beispiel ein Besuch im Ausbildungsbetrieb innerhalb der Stadtgrenze, beim RBS oder bei anderen städtischen Dienststellen.',
    },
  ],
  hinweise: [
    {
      id: 'ohne-antrag',
      art: 'warnung',
      text: 'Keine Fortbildung und keine Dienstreise ohne Antrag! Die Schulleitung genehmigt nicht nachträglich.',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'Keine nachträglichen Genehmigungen durch die Schulleitung' },
    },
    {
      id: 'unvollstaendig',
      art: 'info',
      text: 'Fehlen Unterlagen oder ist der Antrag nicht korrekt ausgefüllt, geht er zur Vervollständigung an dich zurück.',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'geht er zurück an den/die Antragsteller/in, zur Vervollständigung' },
    },
    {
      id: 'kosten',
      art: 'info',
      text: 'Willst du Kosten erstattet bekommen, geht das nur über eine Reisekostenabrechnung.',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'geht das nur über eine Reisekostenabrechnung' },
    },
  ],
  schritte: [
    {
      id: 'antrag-ausfuellen',
      text: 'Den Dienstreiseantrag ausfüllen und die passende Art ankreuzen',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'Ankreuzen entsprechend den Definitionen' },
    },
    {
      id: 'begruendung-notwendigkeit',
      text: 'Die dienstliche Notwendigkeit ausführlich begründen',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'Ausführliche Begründung der dienstlichen Notwendigkeit' },
    },
    {
      id: 'begruendung-pkw-flug',
      text: 'Die Notwendigkeit für PKW oder Flug ausführlich begründen',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'Ausführliche Begründung der Notwendigkeit für PKW/Flug' },
    },
    {
      id: 'anlage-programm-einladung',
      text: 'Programm und persönliche Einladung beifügen',
      varianten: ['dienstreise-inland', 'dienstreise-ausland'],
      anker: { quelle: DR, text: 'bei Dienstreisen: Programm, persönliche Einladung' },
    },
    {
      id: 'anlage-klassenfahrt-formular',
      text: 'Bei einer Klassenfahrt das Formular „Genehmigung einer ein- oder mehrtägigen Lehr- und Studienfahrt außerhalb des Schulgebäudes“ beifügen',
      varianten: ['dienstreise-inland', 'dienstreise-ausland'],
      anker: { quelle: DR, text: 'bei Klassenfahrten das Formular' },
    },
    {
      id: 'anlage-einladung',
      text: 'Die persönliche Einladung beifügen',
      varianten: ['fortbildungsreise-inland', 'fortbildungsreise-ausland'],
      anker: { quelle: DR, text: 'bei Fortbildungsreisen: persönliche Einladung' },
    },
    {
      id: 'anlage-a1',
      text: 'Die A1-Bescheinigung beifügen',
      zusatz: 'Nötig bei einer Auslandstätigkeit von mehr als einer Woche.',
      varianten: ['dienstreise-ausland', 'fortbildungsreise-ausland'],
      anker: { quelle: DR, text: 'bei Auslandstätigkeiten länger als eine Woche, ist eine A1 Bescheinigung erforderlich' },
    },
    {
      id: 'antrag-sekretariat',
      text: 'Den Antrag über das Sekretariat zur Genehmigung an die Schulleitung geben',
      frist: 'mindestens 14 Tage vor der geplanten Reise',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'Antragstellung: mind. 14 Tage vor der geplanten Reise' },
    },
    {
      id: 'genehmigung-abwarten',
      text: 'Die Genehmigung abwarten',
      zusatz: 'Nach der Genehmigung ist dein Name auf dem Antrag gelb angeleuchtet, das Original kommt zu dir zurück.',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'mit gelb angeleuchtet und das Original geht zurück' },
    },
    {
      id: 'original-aufbewahren',
      text: 'Das genehmigte Original gut aufbewahren',
      zusatz: 'Es muss einer späteren Reisekostenabrechnung zwingend beiliegen.',
      varianten: MIT_ANTRAG,
      anker: { quelle: DR, text: 'Das Original ist zwingend dem ggf. folgenden Reisekostenabrechnungsantrag beizulegen' },
    },
  ],
  weiter: { id: 'reisekosten-abrechnen', label: 'Weiter mit „Reisekosten abrechnen“' },
}
