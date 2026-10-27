/**
 * Gut lesbarer Passwort-Vorschlag für „Passwort neu vergeben“ (PROJ-58),
 * z. B. „Hafen-Kran-Birke-47“. Der Admin liest ihn vor oder schreibt ihn auf.
 *
 * Die Wörter sind neutral (Logistik, Natur, Alltag) und enthalten keine
 * verwechselbaren Zeichen: kein „l“, kein großes „I“/„O“, keine Umlaute;
 * die Zahl nutzt nur die Ziffern 2–9 (keine 0/1).
 */
export const PASSWORD_WORDS = [
  'Hafen', 'Kran', 'Wagen', 'Kiste', 'Route', 'Fracht', 'Anker', 'Boje', 'Bahn', 'Zug',
  'Rampe', 'Tor', 'Dach', 'Turm', 'Paket', 'Karte', 'Kompass', 'Koffer', 'Kanu', 'Ruder',
  'Mast', 'Kajak', 'Boot', 'Rakete', 'Tanne', 'Birke', 'Ahorn', 'Eiche', 'Buche', 'Rose',
  'Krokus', 'Garten', 'Wiese', 'Berg', 'Sonne', 'Mond', 'Stern', 'Regen', 'Wind', 'Meer',
  'Strand', 'Sand', 'Kies', 'Stein', 'Fuchs', 'Hase', 'Biber', 'Dachs', 'Hirsch', 'Rabe',
  'Specht', 'Kranich', 'Taube', 'Pinguin', 'Panda', 'Tiger', 'Zebra', 'Birne', 'Kirsche', 'Traube',
  'Banane', 'Mango', 'Kiwi', 'Nuss', 'Honig', 'Kakao', 'Tee', 'Brot', 'Uhr', 'Hut',
  'Schirm', 'Feder', 'Papier', 'Kerze', 'Bogen', 'Gitarre', 'Trompete', 'Kamera', 'Rucksack', 'Kamin',
] as const

const DIGITS = '23456789'

function randomIndex(max: number): number {
  // Sicherer Zufall; die winzige Modulo-Verzerrung ist bei 2^32 / 80 bedeutungslos
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] % max
}

/** Drei verschiedene Wörter und eine zweistellige Zahl, mit Bindestrichen getrennt */
export function suggestPassword(): string {
  const words: string[] = []
  while (words.length < 3) {
    const word = PASSWORD_WORDS[randomIndex(PASSWORD_WORDS.length)]
    if (!words.includes(word)) words.push(word)
  }
  const number = DIGITS[randomIndex(DIGITS.length)] + DIGITS[randomIndex(DIGITS.length)]
  return [...words, number].join('-')
}

/** Gleiche Regel wie bei „Passwort vergessen“ (/reset-password) */
export const PASSWORD_MIN_LENGTH = 8
