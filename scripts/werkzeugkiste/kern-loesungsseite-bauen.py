"""Baut die Beispielseite für den Vertragstest von PROJ-116 mit dem echten Kern.
Aufruf: python3 scripts/werkzeugkiste/kern-loesungsseite-bauen.py src/components/werkzeugkiste/editor/__fixtures__/kern-loesungsseite.html ../Werkzeugkiste
"""
import sys, json
sys.path.insert(0, sys.argv[2])  # Ordner des Kerns (Werkzeugkiste)
import seite
els = [
 {"type": "multiple_choice", "question": "Wer haftet?", "answers": [
   {"text": "Absender", "correct": False}, {"text": "Frachtführer", "correct": True}, {"text": "Empfänger", "correct": False}]},
 {"type": "single_choice", "question": "Welche Farbe?", "answers": [
   {"text": "rot", "correct": False}, {"text": "blau", "correct": False}, {"text": "grün", "correct": True}]},
 {"type": "true_false", "question": "Der Frachtführer haftet nach CMR.", "correct": True},
 {"type": "true_false", "question": "Der Himmel ist grün.", "correct": False},
 {"type": "fill_blanks", "text": "Der *Frachtführer/Carrier* haftet für *Schäden*."},
 {"type": "advanced_fill_blanks", "text": "Der *Spediteur* (Organisiert) arbeitet im *Lager*."},
 {"type": "drag_words", "text": "Die *Ware* wird im *Lager* gelagert.", "distractors": ["Auto", "Haus"]},
 {"type": "mark_words", "text": "Die *rote* Ampel und der *blauen* Himmel."},
 {"type": "reihenfolge", "items": ["Auftrag", "Abholung", "Zustellung"]},
 {"type": "drag_drop", "categories": ["Lager", "Transport"], "items": [
   {"text": "Regal", "category": "Lager"}, {"text": "LKW", "category": "Transport"}, {"text": "Palette", "category": "Lager"}]},
 {"type": "single_choice_set", "questions": [
   {"question": "Eins?", "correct": "richtig1", "wrong": ["falsch1", "falsch2"]}]},
 {"type": "question_set", "questions": [
   {"type": "multiple_choice", "question": "QA?", "answers": [{"text": "a", "correct": False}, {"text": "b", "correct": True}]},
   {"type": "true_false", "question": "QB?", "correct": False},
   {"type": "fill_blanks", "text": "Das *Wort* fehlt."}]},
]
daten = {"cover": {"title": "Test"}, "chapters": [{"title": "Thema", "elements": els}], "final_chapter": {"title": "Abschluss"}}
html = seite.baue_seite(daten, images={}, marken=True)
open(sys.argv[1], "w").write(html)
print(len(html))
