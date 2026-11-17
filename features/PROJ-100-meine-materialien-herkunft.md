# PROJ-100: Werkzeugkiste – „Meine Materialien“: Herkunft sichtbar & übersichtlicher

## Status: Deployed
**Created:** 2026-11-16
**Last Updated:** 2026-11-17
**Deployed:** 2026-11-17 (Commit 60aa3e2, live mit dem Produktions-Deployment von PROJ-108)

## Idee in einem Satz
In „Meine Materialien“ sieht man auf einen Blick, wer ein Material angelegt hat (Ich oder der Name aus dem Regal), kann nach Herkunft filtern, und das Übernehmen aus dem Regal legt nicht unbemerkt Dubletten an.

## Kontext
Rückfrage des Nutzers (2026-11-16, Screenshot der Liste): „Sehe ich auch Materialien von anderen unter Mein Material? Ich hätte den Ersteller gerne mit Namen drin, es wirkt unübersichtlich.“
- Die Liste zeigt nur eigene Zeilen (`owner_id` = angemeldete Lehrkraft). Kopien aus dem Regal gehören der Person, die sie übernommen hat.
- Kopien erkannte man nur an der kleinen Zeile „aus dem Regal von Lehrkraft“. „Lehrkraft“ ist der Platzhalter der Regal-Funktion, wenn im Profil kein Anzeigename steht.
- Dieselbe Regal-Vorlage wurde mehrfach übernommen („Basics rund um den LKW (Kopie)“ fünfmal), jede Übernahme legte still eine weitere Kopie an.

## Abhängigkeiten
PROJ-52 (Liste), PROJ-53 (Regal, Anpassen), PROJ-83 (`AdminSegmented`).

## Entscheidungen (Nutzer, 2026-11-16)
- E-Mail-Adresse als Herkunft ist erlaubt, wenn der Anzeigename fehlt (Kollegium, nur Lehrkräfte sehen sie).
- Alle vier Vorschläge werden umgesetzt: Spalte „Von“, E-Mail als Rückfall, Filter, Rückfrage bei Dubletten.

## Acceptance Criteria
- [x] Tabelle: neue Spalte **„Von“** zwischen „Werkzeug“ und „Regal“. Eigene Materialien: „Ich“. Kopien: Name der Urheberin oder des Urhebers (bzw. E-Mail). Entwürfe: „–“. Langer Text wird mit „…“ gekürzt, der volle Text steht im `title`.
- [x] Handy-Karte: Zeile „Von: …“ unter Werkzeug und Datum (nur Materialien).
- [x] Untertitel nennt bei Kopien nur noch „aus dem Regal“, der Name steht in „Von“.
- [x] Filter **„Alle · Selbst erstellt · Aus dem Regal“** (`AdminSegmented`, 3 Werte) neben „Nur öffentliche“. Schnittstelle: `?herkunft=eigen|regal`; „Suche zurücksetzen“ setzt ihn zurück.
- [x] Übernehmen aus dem Regal („Anpassen“): Fehlt der Anzeigename (Platzhalter „Lehrkraft“), wird die **E-Mail-Adresse** der Urheberin gespeichert. Gelingt das Nachschlagen nicht, bleibt „Lehrkraft“, das Übernehmen scheitert nie daran.
- [x] Gibt es schon eine Kopie mit gleichem Titel (`… (Kopie)`) mit Herkunft, antwortet die Schnittstelle mit 409 und Code `schon_kopiert`. Die Oberfläche fragt „Du hast davon schon eine Kopie“ mit „Abbrechen“ / „Trotzdem weitere Kopie“ (Anfrage dann mit `trotzdem: true`).

## Edge Cases / bewusst nicht enthalten
- **Bereits vorhandene Kopien** tragen weiterhin „Lehrkraft“. Die Kopie speichert nur den Namen als Text, nicht die Quelle, deshalb gibt es keine sichere automatische Nachpflege.
- **Regal-Liste selbst** zeigt weiter „von Lehrkraft“, wenn der Anzeigename fehlt. Lösung wäre ein Anzeigename im Profil („Mein Konto“, PROJ-50) oder eine Änderung der Datenbankfunktionen (eigene Migration).
- Dublettenerkennung läuft über den Titel. Wurde die Kopie umbenannt, fragt das System nicht.

## Umsetzung (2026-11-16)
Keine Datenbankänderung. `werkzeugkiste-materialien.ts` (`vonName`, `HERKUNFT_FILTER`, `untertitel`), `materialien/route.ts` (Filter), `regal/[id]/anpassen/route.ts` (E-Mail-Rückfall über `auth.admin.getUserById`, Dublettenprüfung), `werkzeugkiste-api.ts` (`passeAn(id, trotzdem)`), `meine-materialien.tsx` (Spalte, Karte, Filter), `regal-reiter.tsx` (Rückfrage-Dialog). Tests: Route (Filter, Dublette, E-Mail-Rückfall inkl. Fehlerfall), Regal-Reiter (Rückfrage), Hilfsfunktionen. Browser-Test offen.
