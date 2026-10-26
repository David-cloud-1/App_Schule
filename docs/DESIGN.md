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

---

## Lehrkräfte-Bereich (PROJ-45)

> Die Schülerseite bleibt wie oben beschrieben (Mobile-First, immer dunkel). Der Lehrkräfte-Bereich unter `/admin` ist ein ruhiges Arbeitswerkzeug für Laptop, Beamer und Handy (Vorbilder: Linear, Notion, Vercel).

### Farben nur über Tokens
Im Lehrkräfte-Bereich gibt es **keine festen Farbwerte** (`#111827`, `text-white`, `green-500` …). Jede Farbe kommt aus der Farb-Schicht in `src/app/globals.css` und heißt in Tailwind `ws-*` (Deckkraft geht: `bg-ws-green/15`).

| Token | Zweck | Dunkel (Standard) | Hell |
|---|---|---|---|
| `ws-bg` | Seitenhintergrund | #111827 | #F4F5F7 |
| `ws-surface` | Karten, Tabellen, Dialoge, Seitenleiste | #1F2937 | #FFFFFF |
| `ws-raised` | Hover, erhöhte Flächen | #374151 | #EBEDF0 |
| `ws-line` | Rahmen, Trennlinien | #4B5563 | #D1D5DB |
| `ws-text` | Haupttext | #F9FAFB | #111827 |
| `ws-muted` | Nebentext, Labels | #A6ACB7 | #4B5563 |
| `ws-faint` | Hinweise, Gruppentitel | #8B93A1 | #5F6673 |
| `ws-green` / `-hover` | Hauptaktion, Erfolg, aktiv | #58CC02 / #4CAD02 | #2D6800 / #245400 |
| `ws-blue` / `-hover` | Info, Links | #3EBCF7 / #1CB0F6 | #095F90 / #074E77 |
| `ws-red` / `-hover` | Fehler, Löschen | #FF7B7B / #FF5C5C | #AA2222 / #8E1C1C |
| `ws-orange` | Warnung, „läuft noch“ | #FF9600 | #8D4700 |
| `ws-gold` | Auszeichnungen, „episch“ | #FFD700 | #715900 |
| `ws-on-accent` | Schrift auf gefüllten Farbflächen | #111827 | #FFFFFF |

- **Gefüllte Buttons:** `bg-ws-green hover:bg-ws-green-hover text-ws-on-accent`. Im dunklen Modus ist die Schrift darauf fast schwarz, im hellen weiß. So erreichen beide Modi WCAG AA (Entscheidung 2026-10-26).
- **Getönte Pills/Hinweise:** `bg-ws-<farbe>/15 text-ws-<farbe> border-ws-<farbe>/30`. Die Tönung hinter gleichfarbigem Text beträgt **höchstens /20, bei Rot höchstens /15**. Sonst reicht der Kontrast nicht, und der Test schlägt fehl.
- **Ausnahmen:** Papier-Ansichten (Druckbögen, QR-Code-Hintergrund) bleiben bewusst `bg-white text-black`.
- Neue Tokens immer in **beiden** Modi (und im Block „Wie System“) anlegen. Der Test `src/lib/workspace-theme.test.ts` prüft die Kontraste (Text ≥ 4,5 : 1).

### Darstellung
- Wählbar im Konto-Menü und in der Schnellsuche: **Dunkel** (Standard), **Hell**, **Wie System**. Gemerkt als Cookie `ws_theme`, deshalb erscheint die Seite ohne Aufblitzen.
- Der Rahmen setzt `data-ws-theme` an `.ws-root`. Über `html:has(.ws-root…)` gelten die Werte auch für Dialoge, Menüs und Toasts.
- Druck ist immer hell auf weiß, ohne Navigation und Kopfzeile.

### Layout
- **Rahmen:** shadcn-`Sidebar` (einklappbar auf Icons, Zustand im Cookie `sidebar_state`, ⌘B / Strg+B) ab 1024 px. Darunter (Handy, Tablet hochkant) eine Schublade, die nach Auswahl, beim Tippen daneben und per Wischen schließt.
- **Kopfzeile:** Desktop mit Brotkrumen und Suchfeld (⌘K), Handy mit Menü, Seitentitel, Suche und Konto.
- **Seitenkopf:** Jede Seite beginnt mit `AdminPageHeader` (Titel, ein Satz Beschreibung, rechts die Aktionen). Es gibt **höchstens eine** grüne Hauptaktion, weitere Aktionen sind `variant="outline"`. Detailseiten übergeben `breadcrumb={titel}`.
- **Breite:** Inhalt bis `max-w-screen-2xl`, Tabellen und Listen nutzen die Breite. Formulare und Lesetexte bleiben schmal (`max-w-xl` bis `max-w-3xl`, Beschreibungen `max-w-prose`).
- **Tabellen:** Der Container trägt `ws-table-scroll`, dann scrollt die Tabelle in ihrem Rahmen und die Seite nie seitlich. Zusätzlich `ws-table-sticky`, wenn die erste Spalte die Zeile benennt (Titel, Name): Dann bleibt sie beim Scrollen stehen. Bei einer Checkbox-Spalte vorne weglassen. Aufgeklappte Zeilen mit `colSpan` bleiben nie stehen.
- **Bedienelemente** mindestens 44 × 44 px (`min-h-11`, `size-11`). Auf Touch-Geräten vergrößert `globals.css` alle Buttons im Bereich automatisch auf 44 px; Checkboxen und Schalter sind ausgenommen und bekommen ihre Fläche über das Label.
- **Hauptaktion:** Im Seitenkopf rechts, auch auf Detailseiten (Status-Aktionen). Bei leerer Liste steht sie nur im Leerzustand, nicht zusätzlich im Kopf.
- **Tastenkürzel** über `useIsApplePlatform()` anzeigen: ⌘ auf Apple-Geräten, sonst Strg.

### Zustände (`src/components/admin/admin-states.tsx`)
- **Laden:** `AdminLoadingState` (`table`, `list`, `cards`, `form`) oder Skeleton-Zeilen in Tabellenform. Kein Drehkreis über die ganze Seite.
- **Leer:** `AdminEmptyState`: Icon, ein Satz, die passende Hauptaktion.
- **Fehler:** `AdminErrorState`: verständlicher Satz und „Erneut versuchen“, keine technischen Texte.
- **Erfolg:** kurzer Toast (`toast.success`). Löschen immer erst nach `AlertDialog`.

### Barrierefreiheit
- Link „Zum Inhalt springen“, sichtbarer Fokus (`focus-visible:ring-ws-green`), Icons ohne Text mit `aria-label`.
- Animationen höchstens 200 ms. Bei „Bewegung reduzieren“ entfallen sie im ganzen Bereich.
- Lange Namen werden mit „…“ gekürzt, der volle Text steht im `title`.
