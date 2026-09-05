# Spielspaß-Muster

> Wissensbasis für den **Fun Auditor**. Beschreibt, welche Mechanik welches
> Verhalten erzeugt — damit Vorschläge aus einem Katalog begründet werden
> statt aus dem Bauch.

Der Lernerfolg dieser App steht und fällt mit der Rückkehr. Eine Frage, die
niemand mehr aufruft, kann fachlich perfekt sein und lehrt trotzdem nichts.
Die Fragen-Qualität sichert `/quality`, die Rückkehr sichert `/fun`.

## Die vier Fragen, an denen sich jede Idee messen lassen muss

1. **Ankommen** — schafft es jemand von der Anmeldung in die erste Runde?
2. **Wiederkommen** — gibt es morgen einen Grund, die App zu öffnen?
3. **Freude in der Session** — ist die Runde selbst angenehm, nicht nur nützlich?
4. **Anreize** — wirken Streak, XP, Badges und Rangliste noch, oder sind sie Tapete?

Eine Idee, die keine dieser Fragen beantwortet, ist Dekoration. Sie darf ins
Backlog, aber nie vor eine Idee, die eine kritische Kennzahl adressiert.

---

## Was Duolingo tut, und warum es wirkt

### Streak — Verlustangst statt Belohnung
Der Streak wirkt nicht, weil das Weiterzählen Freude macht, sondern weil das
Zurücksetzen wehtut. Entscheidend sind drei Details, die oft vergessen werden:

- **Sichtbarkeit vor dem Verlust.** Die Zahl steht dauerhaft im Blick, nicht
  erst im Profil. Wer seinen Streak nicht sieht, trauert ihm nicht nach.
- **Auffangnetz.** Streak-Freeze (ein Ruhetag ohne Verlust) und Streak-Reparatur
  (nachträgliches Retten am Folgetag) halten Leute, für die ein Bruch sonst
  bedeutet: „jetzt ist es eh egal".
- **Milde erste Hürde.** Bis Streak 3 muss es leicht sein. Danach steigt der
  Einsatz von selbst, weil mehr auf dem Spiel steht.

Wirkt auf: Wiederkommen, Gewohnheit.

### Tagesziel statt offenes Ende
Duolingo fragt nicht „wie lange willst du lernen", sondern gibt ein kleines,
selbstgewähltes Tagesziel (z. B. 20 XP) mit einem Ring, der sich füllt. Ein
sichtbar erreichbares Ende macht den Einstieg billig: „nur schnell den Ring
vollmachen" ist eine viel kleinere Entscheidung als „jetzt lernen".

Wirkt auf: Ankommen, Wiederkommen.

### Ligen — Wettbewerb in kleiner Gruppe
Eine Gesamtrangliste über alle Nutzer demotiviert alle außer den ersten drei.
Duolingo teilt in Gruppen von ~30 mit Auf- und Abstieg. Jeder ist irgendwo
Mittelfeld, jeder kann diese Woche aufsteigen, und die Woche endet — es gibt
immer einen neuen Anlauf.

Für eine Berufsschulklasse liegt die Gruppe auf der Hand: die eigene Klasse
oder der eigene Jahrgang. Das ist zugleich der Wettbewerb, der im Klassenraum
tatsächlich zählt.

Wirkt auf: Wiederkommen, Anreize.

### Erinnerung zur richtigen Zeit
Die Erinnerung kommt zu der Uhrzeit, zu der jemand üblicherweise lernt — nicht
zu einer festen. Das Tageszeit-Histogramm im Audit liefert genau diese Zeit.
Ohne Erinnerung ist die App auf Zufall angewiesen, dass jemand an sie denkt.

Für eine Web-App ohne Store gibt es zwei Wege: Web-Push (setzt voraus, dass die
App als PWA zum Home-Bildschirm hinzugefügt wurde — auf iOS zwingend) oder eine
E-Mail-Erinnerung. Beides braucht eine bewusste Zustimmung.

Wirkt auf: Wiederkommen.

### Erfolgserlebnis in der Session
Duolingo lobt großzügig, feiert kleine Serien („5 richtige in Folge!") und
schließt jede Runde mit einer Zusammenfassung ab, die etwas Positives findet.
Das Ende einer Runde ist der Moment, in dem entschieden wird, ob eine zweite
folgt.

Wirkt auf: Freude in der Session.

### Schwierigkeit im Flow-Korridor
Zwischen 65 % und 85 % Trefferquote liegt der Bereich, in dem Lernende sich
gefordert, aber kompetent fühlen. Darunter Frust, darüber Langeweile. Duolingo
mischt deshalb bewusst Wiederholung (sicher richtig) unter neuen Stoff.

Wirkt auf: Freude in der Session, Wiederkommen.

### Fehler als Weiterkommen, nicht als Strafe
Falsch beantwortete Fragen kommen zurück — am Ende der Runde und in späteren
Sessions. Der Fehler wird zur Aufgabe statt zum Urteil. In dieser App gibt es
dafür bereits „Lücken schließen" (PROJ-14).

Wirkt auf: Freude in der Session.

### Sichtbarer Fortschritt auf einer Landkarte
Der Lernpfad zeigt, wo man steht und was als Nächstes kommt. Eine Fächerliste
zeigt nur Kategorien; ein Pfad zeigt eine Reise. Für die IHK-Prüfung gibt es
ein natürliches Ziel: den Prüfungstermin.

Wirkt auf: Ankommen, Wiederkommen.

### Ein Gesicht für die App
Duo, die Eule, drängelt, freut sich, ist beleidigt. Eine Figur macht eine
Erinnerung persönlich statt technisch. Für Speditionskaufleute liegt eine
Figur aus dem Berufsalltag nahe — sie muss aber zur Zielgruppe passen und
darf nicht kindlich wirken.

Wirkt auf: Freude in der Session, Wiederkommen.

---

## Was hier nicht geht

Diese Grenzen stehen im PRD und sind keine Verhandlungsmasse — Ideen, die sie
verletzen, gehören nicht ins Backlog:

- **Keine native App**, kein App Store. Alles läuft im Browser (PWA erlaubt).
- **Kein Chat, keine Kollaboration** zwischen Azubis. Wettbewerb ja, Unterhaltung nein.
- **Nur ein Admin**, keine Lehrerverwaltung mit mehreren Konten.
- **Keine Videos oder Audiodateien** als Lerninhalt.
- **Knappes Budget**: Supabase Free Tier, Vercel Hobby. Nichts, was einen
  Dauerdienst oder teure externe Anbieter braucht.
- **Dark Mode, mobile-first, shadcn/ui** — siehe `docs/DESIGN.md`. Eine Idee,
  die einen hellen Hintergrund oder Desktop-Layout voraussetzt, ist keine.

## Was diese App schon hat

XP und Level (PROJ-4), Streak (PROJ-5), Badges (PROJ-7), Rangliste mit
Pseudonym und Opt-out (PROJ-8), Fortschritts-Dashboard (PROJ-6), Lücken
schließen (PROJ-14), Prüfungssimulation (PROJ-11), Themenwahl (PROJ-13).

Die Bausteine sind also da. Wo eine Kennzahl trotzdem schlecht steht, ist die
erste Frage deshalb nicht „was fehlt?", sondern **„warum greift das Vorhandene
nicht?"** — meist ist es unsichtbar, kommt zu spät oder hat kein Auffangnetz.
