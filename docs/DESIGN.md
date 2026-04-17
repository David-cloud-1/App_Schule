# Design System

> Inspiriert von Duolingo & Instagram — modern, gamifiziert, jugendlich.

## Kernprinzipien

- **Mobile-First:** Alles wird zuerst für das Smartphone designt
- **Gamification-Ästhetik:** Runde Ecken, Animationen, Fortschrittsbalken — wie Duolingo
- **Social Media Feel:** Karten, Stories-ähnliche Layouts, klare Hierarchie — wie Instagram
- **Dark Mode als Standard:** Zeitgemäß, augenschonend, energiesparend
- **Touch-optimiert:** Alle interaktiven Elemente mindestens 44px groß

## Farben

```
Primary:      #58CC02   (Duolingo-Grün — XP, Erfolg, Bestätigung)
Secondary:    #1CB0F6   (Hellblau — Infos, Links, Highlights)
Accent:       #FF9600   (Orange — Streaks, Warnungen, Energie)
Danger:       #FF4B4B   (Rot — Fehler, falsche Antworten)
Gold:         #FFD700   (Gold — Badges, Top-Platzierungen)

Background:   #111827   (Dark — Haupthintergrund)
Surface:      #1F2937   (Cards, Modal-Hintergrund)
Surface2:     #374151   (Erhöhte Elemente, Hover-Zustände)
Border:       #4B5563   (Trennlinien, Input-Rahmen)

Text:         #F9FAFB   (Primärer Text)
TextMuted:    #9CA3AF   (Sekundärer Text, Labels)
```

## Typografie

- **Font:** Inter (Google Fonts) — klar, modern, gut lesbar
- **Headings:** `font-bold`, `tracking-tight`
- **Body:** `font-normal`, `leading-relaxed`
- **Größen:** Mobile-first, mindestens 16px Fließtext (kein eye-strain)

```
H1: text-3xl font-bold
H2: text-2xl font-bold
H3: text-xl font-semibold
Body: text-base
Small: text-sm text-muted
```

## Komponenten-Stil

### Buttons
- Runde Ecken: `rounded-2xl`
- Dicke, solide Buttons mit leichtem Schatten (Duolingo-Stil)
- Hover/Active: leichte Scale-Animation (`scale-95` on press)
- Primary: grüner Hintergrund, weißer Text
- Ghost: transparenter Hintergrund, farbiger Rand

### Cards
- `rounded-2xl`, `bg-surface`, `border border-border`
- Leichter Schatten: `shadow-lg`
- Padding: `p-4` bis `p-6`

### Inputs
- `rounded-xl`, dunkler Hintergrund, farbiger Fokus-Ring
- Keine weißen Inputs — passend zum Dark Mode

### Fortschrittsbalken
- Abgerundet: `rounded-full`
- Grüner Fill mit Shimmer-Animation (wie Duolingo)

### Badges & XP-Chips
- Kleine Pills: `rounded-full px-3 py-1`
- Icon + Text nebeneinander
- Leuchtende Farben auf dunklem Hintergrund

## Animationen

- **Übergangszeit:** 200ms (schnell, nicht störend)
- **Easing:** `ease-out` für Einblenden, `ease-in` für Ausblenden
- **Erfolgs-Animation:** kurzes Bounce/Pulse bei richtiger Antwort
- **Fehler-Animation:** kurzes Shake bei falscher Antwort
- **Streak/XP-Anstieg:** Zahlen-Counter-Animation (`+10 XP` auftauchen)
- Tailwind-Klassen: `transition-all duration-200`, `animate-bounce`, `animate-pulse`

## Icons

- Bibliothek: **Lucide React** (bereits in shadcn/ui enthalten)
- Größen: `size-4` (inline), `size-5` (Buttons), `size-6` (Navigation)
- Keine bunten SVGs — Icons erben Textfarbe

## Layout & Abstände

- **Max-Width:** `max-w-md mx-auto` (Smartphone-Breite, zentriert auf Desktop)
- **Padding:** `px-4` seitlich, `py-6` vertikal
- **Gap:** `gap-3` bis `gap-4` zwischen Cards/Elementen
- **Bottom Navigation:** Fixiert am unteren Rand (wie Instagram/Duolingo)

## Gamification-spezifische UI

- **XP-Anzeige:** Grüne Pill oben rechts mit Blitz-Icon ⚡
- **Streak:** Flammen-Icon mit Tages-Counter 🔥
- **Level-Badge:** Runder Badge mit Nummer, farblich nach Level-Stufe
- **Rangliste:** Nutzer-Avatar + Name + XP, Top-3 mit Gold/Silber/Bronze
- **Richtig/Falsch-Feedback:** Ganzer Screen-Flash (grün/rot) für 500ms

## Dos & Don'ts

**Do:**
- Viel Weißraum (auch im Dark Mode — Luft zwischen Elementen)
- Klare visuelle Hierarchie — eine Hauptaktion pro Screen
- Micro-Animationen für Feedback
- Emojis sparsam als visuelle Anker einsetzen

**Don't:**
- Keine hellen/weißen Hintergründe (Dark Mode only)
- Kein serifenloses Design mit zu vielen verschiedenen Farben
- Keine langen Textwände — kurze Lerneinheiten, kurze Texte
- Kein Desktop-first Layout
