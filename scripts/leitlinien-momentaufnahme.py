"""Momentaufnahme der Handlungsleitlinien für die Checklisten (PROJ-122).

Liest den geprüften Schulrecht-Text (Werkzeugkiste/schulrecht.py, Kürzel HLL)
und schreibt src/lib/checklisten/daten/leitlinien.json. Die Checklisten merken
sich die Prüfsumme der Leitlinie, zu der sie geschrieben wurden; der Test
`quellen.test.ts` schlägt fehl, sobald Momentaufnahme und Liste auseinanderlaufen.

Aufruf (nach jeder Änderung an den HLL in Schulrecht):
    python3 scripts/leitlinien-momentaufnahme.py

Personenbezug (Spezifikation: Namen und persönliche Kontaktdaten nicht fest
einbauen): Die Schlusszeile „<Name> Schulleiterin/Schulleiter“ wird entfernt,
persönliche E-Mail-Adressen („vorname.nachname@…“, samt davorstehendem Namen)
und Handynummern werden durch einen Verweis auf das Original ersetzt.
Funktionspostfächer und Festnetznummern der Dienststelle bleiben stehen.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent.parent
KERN = HIER.parent / 'Werkzeugkiste'
ZIEL = HIER / 'src' / 'lib' / 'checklisten' / 'daten' / 'leitlinien.json'

UNTERSCHRIFT = re.compile(r'\n[^\n]{3,60}\s(Schulleiterin|Schulleiter|stellv\. Schulleiterin|stellv\. Schulleiter)\s*$')


PERSON_MAIL = re.compile(r'(?:[A-ZÄÖÜ][a-zäöüß]+ [A-ZÄÖÜ][a-zäöüß]+ )?[a-zäöüß]+\.[a-zäöüß]+@[\w.-]+')
HANDY = re.compile(r'\b01[5-7]\d[\s\d]{6,}\d')


def entpersonalisiere(text: str) -> str:
    text = PERSON_MAIL.sub('[Kontakt der zuständigen Person: siehe Original-PDF]', text)
    return HANDY.sub('[Handynummer: siehe Original-PDF]', text)


def pruefsumme(text: str) -> str:
    return hashlib.sha256(text.encode('utf-8')).hexdigest()[:12]


def main() -> None:
    sys.path.insert(0, str(KERN))
    from schulrecht import SCHULRECHT  # noqa: E402

    hll = SCHULRECHT['HLL']
    normen = []
    for n in hll['normen']:
        text = entpersonalisiere(UNTERSCHRIFT.sub('', n['text'].rstrip()))
        normen.append({
            'kennung': n['nr'],
            'bereich': n.get('titel', ''),
            'stand': n.get('stand') or None,
            'text': text,
            'pruefsumme': pruefsumme(text),
        })
    ZIEL.write_text(json.dumps({'quelle': hll.get('quelle', ''), 'normen': normen}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'{len(normen)} Leitlinien -> {ZIEL.relative_to(HIER)}')


if __name__ == '__main__':
    main()
