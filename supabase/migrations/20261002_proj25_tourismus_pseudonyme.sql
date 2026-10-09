-- PROJ-25: Touristiklern-Wortliste für Pseudonyme
--
-- Beim Tourismus-Bootstrap (20261001_proj25_tourismus_bootstrap.sql) wurde
-- pseudonym_nouns bewusst leer gelassen (Entscheidung sollte der künftigen
-- Lehrkraft gehören). Bis diese feststeht, soll TOUR aber bereits eigene,
-- thematisch passende Pseudonyme bekommen statt des neutralen Rückfalls
-- ("Entdecker", "Lerner" ...) — analog zur Schifffahrts-/Logistik-Wortliste
-- von SPED. Reine Datenänderung, keine Schema-Änderung.
--
-- Rückweg: siehe 20261002_proj25_tourismus_pseudonyme_down.sql

BEGIN;

UPDATE departments
SET pseudonym_nouns = ARRAY[
  'Kreuzfahrtschiff','Flusskreuzer','Linienflug','Charterflug','Direktflug',
  'Reisebus','Fähre','Katamaran','Schnellfähre','Panoramazug','Sonderzug',
  'Gondel','Seilbahn','Yacht','Segelboot','Ballon','Zeppelin','Mietwagen',
  'Shuttlebus','Ausflugsboot',
  'Hotel','Resort','Ferienanlage','Ferienclub','Terminal','Lounge',
  'Rezeption','Lobby','Pool','Spa','Strand','Promenade','Hafen',
  'Anlegestelle','Gate','Zollschalter','Reisebüro','Gepäckband',
  'Sicherheitskontrolle','Gästehaus','Pension','Jugendherberge',
  'Campingplatz','Kurort','Badeort','Ferieninsel','Bergresort',
  'Wellnessoase','Boardingbereich','Wartehalle',
  'Koffer','Rucksack','Reisepass','Visum','Ticket','Boardingpass',
  'Gepäckstück','Reiseführer','Landkarte','Kompass','Fernglas',
  'Sonnenschirm','Liegestuhl','Reisetasche','Handgepäck','Reisekissen',
  'Adapter','Reiseversicherung','Souvenir','Reisekatalog',
  'Reiseleiter','Guide','Animateur','Pilot','Steward','Stewardess',
  'Concierge','Rezeptionist','Reisebegleiter','Dolmetscher','Kapitän',
  'Tourmanager','Hotelmanager','Eventmanager','Gästebetreuer',
  'Flugbegleiter','Fremdenführer','Reiseveranstalter','Reiseberater',
  'Destinationsmanager',
  'Pauschalreise','Individualreise','Lastminute','Frühbucher',
  'Reisepaket','Transfer','Checkin','Checkout','Destination',
  'Reiseroute','Stopover','Layover','Vollpension','Halbpension',
  'Städtereise','Fernreise','Gruppenreise','Rundreise','Kreuzfahrt',
  'Safari','Trekkingtour','Bildungsreise','Kurzurlaub','Wellnessurlaub',
  'Aktivurlaub','Abenteuerreise','Studienreise','Incentivereise',
  'Geschäftsreise','Pauschalangebot',
  'Flugservice','Hotelservice','Gästeservice','Reiseservice',
  'Shuttleservice','Zimmerservice','Buchungsservice','Visaservice',
  'Transferservice','Charterservice'
]
WHERE code = 'TOUR';

COMMIT;
