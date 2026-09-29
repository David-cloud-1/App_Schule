export const ADJECTIVES = [
  'Schneller','Stiller','Mutiger','Kühner','Flinker','Weiser','Starker','Treuer',
  'Wilder','Eiserner','Wacher','Freier','Stolzer','Rasender','Tapferer','Leiser',
  'Kluger','Edler','Beherzter','Furchtloser','Präziser','Fixer','Agiler','Dynamischer',
  'Stabiler','Robuster','Unerschrockener','Gewandter','Entschlossener','Erfahrener',
  'Cleverer','Geschickter','Wendiger','Ausdauernder','Beharrlicher','Ehrgeiziger',
  'Fleißiger','Pünktlicher','Sorgfältiger','Tüchtiger','Tatkräftiger','Konzentrierter',
  'Effizienter','Schneidiger','Kerniger','Überlegener','Siegreicher','Unaufhaltsamer',
  'Stürmischer','Kraftvoller','Gewaltiger','Mächtiger','Majestätischer','Legendärer',
  'Ehrenhafter','Rüstiger','Wackerer','Feuriger','Leidenschaftlicher','Begeisterter',
  'Motivierter','Zielstrebiger','Fröhlicher','Frischer','Lebhafter','Schwungvoller',
  'Aufmerksamer','Gewissenhafter','Verlässlicher','Standhafter','Gewiefter',
  'Schlagfertiger','Trittsicherer','Seefester','Erprobter','Unverzagter',
  'Besonnener','Nachdenklicher','Behäbiger','Unermüdlicher',
]

/**
 * Die Nomen kommen aus dem Fachbereich (departments.pseudonym_nouns, PROJ-22).
 * Neutraler Rückfall, falls ein Bereich keine hinterlegt hat — dieselbe Liste
 * wie in der Datenbankfunktion generate_unique_pseudonym().
 */
export const FALLBACK_NOUNS = [
  'Entdecker','Lerner','Planer','Profi','Stratege','Macher','Navigator',
  'Kompass','Pionier','Tüftler','Denker','Könner','Aufsteiger','Champion',
]

export function randomPseudonym(nouns: string[]): string {
  const pool = nouns.length > 0 ? nouns : FALLBACK_NOUNS
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = pool[Math.floor(Math.random() * pool.length)]
  return `${adj} ${noun}`
}
