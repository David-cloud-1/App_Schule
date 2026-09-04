/**
 * Regeln für Antwortoptionen — die einzige Quelle für beide Generator-Pfade:
 *
 *  1. Dokument-Upload  → src/app/api/admin/ai-generate/_lib/process-job.ts (API)
 *  2. Copy-&-Paste-UI  → src/app/admin/ai-generator/page.tsx (manueller Import)
 *
 * Die Regeln stammen aus vier Bestandsdurchläufen, in denen genau diese Muster
 * als Rate-Tells nachgewiesen wurden. Sie werden deterministisch nachgeprüft
 * von src/lib/question-quality.ts — wer hier etwas ändert, sollte dort
 * mitziehen.
 */

export const QUESTION_QUALITY_RULES = `REGELN FÜR ANTWORTOPTIONEN (WICHTIG, streng einhalten):

GRUNDPRINZIP: Ein Prüfling darf die richtige Antwort NUR am Fachwissen erkennen können — nie an einer äußerlichen Eigenschaft. Prüfe jede Frage zum Schluss so: Wenn ich das Fach nicht könnte, würde mir eine Option ins Auge springen? Dann umformulieren. Die vier folgenden Muster sind die, die in der Praxis immer wieder auftreten:

1. LÄNGE: Die richtige Antwort darf NICHT die längste sein. In etwa der Hälfte der Fragen soll ein DISTRAKTOR die längste Option sein. Alle 5 Optionen etwa gleich lang und gleich detailliert.

2. SATZBAU: Alle 5 Optionen müssen grammatisch gleich gebaut sein — gleiches Anfangswort, gleiche Wortart, gleiche Satzform. Wenn vier Optionen mit "Die ..." beginnen, muss auch die richtige mit "Die ..." beginnen; beginnen sie mit "Sie muss ...", dann alle. Die richtige Antwort darf NIE die einzige sein, die aus dem Muster fällt.
   FALSCH: richtig "Unentgeltliche Überlassung zum Gebrauch" — falsch "Die entgeltliche Überlassung von Sachen", "Die Herstellung eines Werkes", "Die Leistung von Diensten" (die richtige ist die einzige ohne "Die").
   RICHTIG: "Die unentgeltliche Überlassung zum Gebrauch" — dann passen alle fünf ins selbe Muster.

3. STICHPUNKT VS. SATZ: Keine Option im Telegrammstil, wenn die anderen ganze Sätze sind. Sind die Distraktoren ausformulierte Sätze, muss die richtige Antwort ebenfalls ein ausformulierter Satz sein — nicht "Versandfertig, markiert, Papiere dabei", sondern "Die Sendung ist versandfertig verpackt, markiert und dokumentiert".

4. SIGNALWÖRTER ("ausschließlich", "nur", "immer", "nie", "alle", "allein", "lediglich", "stets"): Diese dürfen vorkommen, wo sie fachlich zutreffen — auch in der richtigen Antwort, wenn der Sachverhalt tatsächlich exklusiv ist (z. B. "Man versteuert nur inländische Einkünfte"). Aber: höchstens EINE der 5 Optionen einer Frage darf ein solches Wort enthalten, und NIE dürfen alle Distraktoren eines haben, während die richtige keins hat. Baue Distraktoren nicht nach dem Schema "Ausschließlich + Stichwort" — das ist bequem, aber sofort durchschaubar. Ein Distraktor muss durch seine AUSSAGE falsch sein, nicht durch ein vorangestelltes Absolutwort.
   FALSCH: "Ausschließlich die Kirchensteuer" — RICHTIG: "Der Solidaritätszuschlag auf die Lohnsteuer"

WEITERE REGELN:
- Verteile die korrekte Antwort zufällig und ausgewogen über A–E. Nicht überwiegend A oder B, sondern über alle Fragen hinweg gleichmäßig streuen.
- Die falschen Antworten (Distraktoren) müssen plausibel und fachlich verlockend sein: typische Verwechslungen, häufige Denkfehler, ähnliche Fachbegriffe oder benachbarte Konzepte aus demselben Themengebiet. Keine offensichtlich absurden, thematisch fremden oder erkennbar falschen Optionen.
- Verwende in Distraktoren dieselbe Fachsprache und denselben Konkretheitsgrad wie in der richtigen Antwort.
- Jede Option muss die gestellte Frage grammatisch beantworten. Bei "Welche Aussage zu X ist richtig?" müssen alle Optionen Aussagen über X sein ("Sie dienen einer verursachungsgerechten Kostenrechnung"), nicht Satzfragmente wie "Für eine verursachungsgerechte Kostenrechnung".
- Vermeide "Alle Antworten sind richtig" / "Keine der genannten" als Lückenfüller.
- Erfinde keine Fragen zu Grundlagenbegriffen, die in anderen Dokumenten schon abgefragt sein könnten (Wirtschaftlichkeit, Einzelkosten, Break-even, Aktiv-/Passivseite, Inventur). Halte dich an die Inhalte, die dieses Dokument tatsächlich hergibt.

TON & SPRACHNIVEAU (WICHTIG):
- Zielgruppe sind Berufsschüler (angehende Speditionskaufleute) in einer spielerischen Lern-App. Formuliere fachlich korrekt, aber verständlich und geerdet — NICHT übertrieben hochgestochen oder juristisch verschachtelt (z. B. "wichtige Tatsachen" statt "verkehrswesentliche Tatsachen").
- Prüfungsrelevante Fachbegriffe dürfen und sollen vorkommen, aber erkläre sie in klarer Alltagssprache.
- Gleichzeitig keine zu einfache oder kindliche Sprache — sachlich, präzise und prüfungstauglich bleiben.`
