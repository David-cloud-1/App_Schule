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

export const NOUNS = [
  // Wasserfahrzeuge
  'Tanker','Frachter','Kutter','Schlepper','Barge','Fähre','Containerschiff',
  'Motorschiff','Eisbrecher','Bulkcarrier','Kühlschiff','Schwergutschiff',
  'Feederschiff','Gastanker','Hochseeschlepper','Schubboot','Schubleichter',
  'Katamaran','Schnellboot','Küstenmotorschiff','Massengutfrachter',
  'Stückgutfrachter','Mehrzweckfrachter','Autofrachter','Tankschiff',
  'Küstenfahrer','Schleppkahn','Lotsenboot','Patrouillenboot','Schwimmkran',
  // Landfahrzeuge
  'Trailer','Sattelzug','Tieflader','Transporter','Tankwagen','Waggon',
  'Lokomotive','Güterzug','Gliederzug','Hängerzug','Kühlfahrzeug','Kranwagen',
  'Hubwagen','Muldenkipper','Tankzug','Silowagen','Autotransporter',
  'Schienenfahrzeug','Rangierlokomotive','Güterwaggon',
  // Luftfahrt
  'Frachtflieger','Frachtflugzeug','Hubschrauber','Drohne','Zeppelin',
  'Transportflugzeug','Luftfrachter','Chartermaschine',
  // Infrastruktur
  'Hafen','Kai','Dock','Terminal','Depot','Hub','Rampe','Lager','Hangar',
  'Schleuse','Rollfeld','Bahnhof','Güterbahnhof','Freizone','Umschlaghalle',
  'Containerterminal','Verteilzentrum','Logistikzentrum','Freihafen',
  'Binnenhafen','Seehafen','Flughafen','Rangierbahnhof','Anleger','Pier',
  'Mole','Kanal','Verladebahnhof','Umschlagzentrum','Kühlhaus',
  'Hochregallager','Ladehof','Güterhalle','Außenlager','Zollager',
  'Umschlagbahnhof','Abfertigungshalle','Kommissionierlager','Blocklager','Pufferlager',
  // Ausrüstung
  'Kran','Gabelstapler','Palette','Container','Anker','Kompass','Radar','Mast',
  'Ladebrücke','Rolltor','Portalkran','Brückenkran','Schwenkkran','Reachstacker',
  'Hubstapler','Förderband','Scanner','Transponder','Leuchtturm','Leine',
  'Trosse','Winde','Spreader','Signalhorn','Klampe','Bake','Seilzug',
  'Kettenzug','Rollwagen','Hubgerüst','Ladebordwand','Stapler','Radlader',
  'Schienenweiche','Rangiermotor',
  // Berufe
  'Lotse','Kapitän','Stauer','Reeder','Spediteur','Kurier','Zöllner',
  'Disponent','Frachtführer','Funker','Navigator','Steuermann','Matrose',
  'Bootsmann','Hafenmeister','Lagerist','Verlader','Makler','Prüfer',
  'Schiffsmakler','Charterer','Frachtmakler',
  // Fachbegriffe
  'Fracht','Cargo','Express','Charter','Manifest','Frachtbrief','Konossement',
  'Sendung','Ladung','Stückgut','Sammelgut','Eilgut','Massengut','Schüttgut',
  'Gefahrgut','Kühlgut','Schwergut','Langgut','Sperrgut','Transit','Zoll',
  'Route','Tour','Disposition','Verladung','Entladung','Abfertigung',
  'Konsolidierung','Umschlag','Lieferung','Routing','Korridor','Umlauf',
  'Frachtrate','Akkreditiv',
  // Prozesse & Dienste
  'Schnelldienst','Direktdienst','Sammeldienst','Liniendienst','Expressversand',
  'Nachtsprung','Stafette','Shuttle','Kurierdienst','Linienfracht',
]

export function randomPseudonym(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)]
  return `${adj} ${noun}`
}
