/**
 * Regeln für Antwortoptionen — die einzige Quelle für alle Generator-Pfade:
 *
 *  1. Copy-&-Paste-UI  → src/lib/question-prompt.ts (kopierter Prompt)
 *  2. Dokument-Upload  → src/app/api/admin/ai-generate/_lib/process-job.ts (API)
 *  3. Korrekturauftrag → src/lib/question-import.ts (buildFixPrompt)
 *
 * Die Regeln stammen aus vier Bestandsdurchläufen, in denen genau diese Muster
 * als Rate-Tells nachgewiesen wurden. Sie werden deterministisch nachgeprüft
 * von src/lib/question-quality.ts — wer hier etwas ändert, sollte dort
 * mitziehen.
 *
 * Die Regeln gelten für alle Fachbereiche gleich; nur die Zielgruppe wird je
 * Bereich eingesetzt (PROJ-22). Beispiele deshalb fachneutral halten.
 */

/**
 * Gegen Detailfragen (Nutzer-Feedback 2026-10-05): externe KIs fragen sonst
 * jede Zahl und jeden Exkurs eines Skripts ab. Maßstab sind die Aufgaben im
 * Dokument. Nicht deterministisch prüfbar — wirkt nur über den Prompt.
 */
export const DETAIL_RULE = `- KEINE EXTREMEN DETAILFRAGEN. Frage das ab, was die Schüler für Prüfung und Berufsalltag wirklich können müssen: Kernaussagen, Zusammenhänge und Anwendungen. Maßstab für Tiefe und Schwerpunkt sind die Aufgaben, Übungen und Merkkästen im Dokument — was dort abgefragt wird, gehört in die Fragen.
   - Keine Fragen zu Exkursen, Randnotizen, Zusatz- oder Lehrerinfos und zu Fachbegriffen, die das Dokument nur einmal nebenbei erwähnt.
   - Keine isolierten Jahreszahlen, Maße, Mengen, Prozentwerte, Namen oder Kürzel, wenn sie nicht selbst Lernziel sind. Geschichtliche Einzelheiten nur dort, wo sie die Bedeutung eines zentralen Themas erklären — nicht als eigenes Abfragewissen.
   - Prüfe jede Frage so: Würde eine Lehrkraft sie in einer Klassenarbeit zu diesem Thema stellen? Wenn nein, weglassen. Lieber weniger Fragen zum Kern als viele zu Nebensächlichkeiten.
`

export function buildQualityRules(targetGroup: string): string {
  return `REGELN FÜR ANTWORTOPTIONEN (WICHTIG, streng einhalten):

GRUNDPRINZIP: Ein Prüfling darf die richtige Antwort NUR am Fachwissen erkennen können — nie an einer äußerlichen Eigenschaft. Prüfe jede Frage zum Schluss so: Wenn ich das Fach nicht könnte, würde mir eine Option ins Auge springen? Dann umformulieren. Die vier folgenden Muster sind die, die in der Praxis immer wieder auftreten:

1. LÄNGE: Die richtige Antwort darf NICHT die längste sein. In etwa der Hälfte der Fragen soll ein DISTRAKTOR die längste Option sein. Alle 5 Optionen etwa gleich lang und gleich detailliert.

2. SATZBAU: Alle 5 Optionen müssen grammatisch gleich gebaut sein — gleiches Anfangswort, gleiche Wortart, gleiche Satzform. Wenn vier Optionen mit "Die ..." beginnen, muss auch die richtige mit "Die ..." beginnen; beginnen sie mit "Sie muss ...", dann alle. Die richtige Antwort darf NIE die einzige sein, die aus dem Muster fällt.
   FALSCH: richtig "Unentgeltliche Überlassung zum Gebrauch" — falsch "Die entgeltliche Überlassung von Sachen", "Die Herstellung eines Werkes", "Die Leistung von Diensten" (die richtige ist die einzige ohne "Die").
   RICHTIG: "Die unentgeltliche Überlassung zum Gebrauch" — dann passen alle fünf ins selbe Muster.

3. STICHPUNKT VS. SATZ: Keine Option im Telegrammstil, wenn die anderen ganze Sätze sind. Sind die Distraktoren ausformulierte Sätze, muss die richtige Antwort ebenfalls ein ausformulierter Satz sein — nicht "Vollständig, geprüft, abgelegt", sondern "Die Unterlagen sind vollständig, geprüft und abgelegt".

4. SIGNALWÖRTER ("ausschließlich", "nur", "immer", "nie", "alle", "allein", "lediglich", "stets"): Diese dürfen vorkommen, wo sie fachlich zutreffen — auch in der richtigen Antwort, wenn der Sachverhalt tatsächlich exklusiv ist (z. B. "Man versteuert nur inländische Einkünfte"). Aber: höchstens EINE der 5 Optionen einer Frage darf ein solches Wort enthalten, und NIE dürfen alle Distraktoren eines haben, während die richtige keins hat. Baue Distraktoren nicht nach dem Schema "Ausschließlich + Stichwort" — das ist bequem, aber sofort durchschaubar. Ein Distraktor muss durch seine AUSSAGE falsch sein, nicht durch ein vorangestelltes Absolutwort.
   FALSCH: "Ausschließlich die Kirchensteuer" — RICHTIG: "Der Solidaritätszuschlag auf die Lohnsteuer"

WEITERE REGELN:
- Verteile die korrekte Antwort zufällig und ausgewogen über A–E. Nicht überwiegend A oder B, sondern über alle Fragen hinweg gleichmäßig streuen.
- Die falschen Antworten (Distraktoren) müssen plausibel und fachlich verlockend sein: typische Verwechslungen, häufige Denkfehler, ähnliche Fachbegriffe oder benachbarte Konzepte aus demselben Themengebiet. Keine offensichtlich absurden, thematisch fremden oder erkennbar falschen Optionen.
- Verwende in Distraktoren dieselbe Fachsprache und denselben Konkretheitsgrad wie in der richtigen Antwort.
- Jede Option muss die gestellte Frage grammatisch beantworten. Bei "Welche Aussage zu X ist richtig?" müssen alle Optionen Aussagen über X sein ("Sie dienen einer verursachungsgerechten Kostenrechnung"), nicht Satzfragmente wie "Für eine verursachungsgerechte Kostenrechnung".
- Vermeide "Alle Antworten sind richtig" / "Keine der genannten" als Lückenfüller.
- Erfinde keine Fragen zu Grundlagenbegriffen, die in anderen Dokumenten schon abgefragt sein könnten (Wirtschaftlichkeit, Einzelkosten, Break-even, Aktiv-/Passivseite, Inventur). Halte dich an die Inhalte, die dieses Dokument tatsächlich hergibt.
${DETAIL_RULE}- JEDE FRAGE MUSS FÜR SICH ALLEIN LÖSBAR SEIN. Die Schüler sehen in der App nur die Frage und die fünf Optionen — nicht das Dokument, keinen Text, keine Grafik, keine Tabelle, keine vorherige Aufgabe. Deshalb:
   - Nie "laut Text", "im Text genannt", "laut Grafik", "laut Tabelle", "im Beispiel", "im Heft", "siehe oben" o. Ä. schreiben. Frage stattdessen das Fachwissen selbst ab ("Was ist das vorrangige Ziel der EZB?" statt "Was ist laut Text das oberste Ziel der EZB?").
   - Keine Fragen zu Details, die nur in der Vorlage stehen und kein prüfungsrelevantes Fachwissen sind (Zahlen aus einer Grafik, Namen und Ereignisse aus einer Beispielgeschichte, Stand eines Zinssatzes an einem bestimmten Datum).
   - Bezieht sich eine Rechen- oder Fallaufgabe auf eine Situation (Firma, Auftrag, Kalkulationsdaten), müssen ALLE nötigen Angaben in der Frage selbst stehen. Nicht "Wie hoch sind die fixen Kosten von Auftrag 3?", sondern "Eine Maschine hat Fixkosten von 224 € je Tag. Ein Auftrag dauert 1,5 Tage. Wie hoch sind die fixen Kosten des Auftrags?"

TON & SPRACHNIVEAU (WICHTIG):
- Zielgruppe sind Berufsschüler (${targetGroup}) in einer spielerischen Lern-App. Formuliere fachlich korrekt, aber verständlich und geerdet — NICHT übertrieben hochgestochen oder juristisch verschachtelt (z. B. "wichtige Tatsachen" statt "verkehrswesentliche Tatsachen").
- Prüfungsrelevante Fachbegriffe dürfen und sollen vorkommen, aber erkläre sie in klarer Alltagssprache.
- Gleichzeitig keine zu einfache oder kindliche Sprache — sachlich, präzise und prüfungstauglich bleiben.`
}
