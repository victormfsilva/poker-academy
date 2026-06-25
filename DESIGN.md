# Poker Academy — Design System

## Identity

Dark premium gaming aesthetic. Think PokerStars VR lobby meets Linear app.
Not a generic dark theme — a poker-specific visual language where every
surface feels like green felt under warm light, and every accent recalls
the gold of championship bracelets.

## Colors

### Core Surfaces
- `--bg`: `#09090b` — true dark, deeper than generic
- `--surface-1`: `#131316` — card backgrounds, primary surface
- `--surface-2`: `#1c1c21` — elevated cards, modals
- `--surface-3`: `#26262d` — inputs, secondary containers
- `--border`: `#2e2e38` — subtle borders
- `--border-strong`: `#3a3a47` — emphasized borders, hover

### Brand
- `--emerald`: `#34d399` — primary accent (GTO correct, success)
- `--emerald-soft`: `rgba(52, 211, 153, 0.12)` — emerald backgrounds
- `--gold`: `#f59e0b` — secondary accent (streaks, highlights, premium)
- `--gold-soft`: `rgba(245, 158, 11, 0.12)` — gold backgrounds
- `--crimson`: `#ef4444` — error, incorrect, danger
- `--crimson-soft`: `rgba(239, 68, 68, 0.10)` — error backgrounds
- `--sapphire`: `#3b82f6` — info, links, call actions
- `--sapphire-soft`: `rgba(59, 130, 246, 0.12)` — info backgrounds

### Text
- `--text-primary`: `#f4f4f5` — headings, primary
- `--text-secondary`: `#a1a1aa` — body text
- `--text-tertiary`: `#71717a` — labels, captions
- `--text-muted`: `#52525b` — disabled, placeholders

### Suit Colors (Cards)
- Spades: `#a1a1aa`
- Hearts: `#ef4444`
- Diamonds: `#3b82f6`
- Clubs: `#34d399`

## Typography

### Font Stack
- Display: `'Inter', system-ui, sans-serif` — clean, modern, no-nonsense
- Mono: `'JetBrains Mono', 'Fira Code', monospace` — stats, cards, data

### Scale
| Token | Size | Weight | Tracking | Use |
|-------|------|--------|----------|-----|
| display-lg | 32px | 700 | -0.025em | Page titles |
| display-md | 24px | 700 | -0.02em | Section heads |
| display-sm | 20px | 600 | -0.015em | Card titles |
| title | 16px | 600 | -0.01em | Subsection, labels |
| body | 14px | 400 | 0 | Default text |
| caption | 12px | 500 | 0.02em | Tags, badges |
| mono-lg | 20px | 700 | 0 | Stats, big numbers |
| mono-md | 14px | 500 | 0 | Card values, data |
| mono-sm | 11px | 500 | 0.04em | Micro labels |

### Principles
- Negative letter-spacing on all display sizes
- Weight 600-700 for display, never 800+
- Mono for all numerical data — percentages, stats, card notation
- Uppercase + tracking only for micro labels (POKER ACADEMY, META DIARIA)

## Spacing

4px base grid:
- `--space-1`: 4px
- `--space-2`: 8px
- `--space-3`: 12px
- `--space-4`: 16px
- `--space-5`: 20px
- `--space-6`: 24px
- `--space-8`: 32px
- `--space-10`: 40px
- `--space-12`: 48px
- `--space-16`: 64px

## Radius

- `--radius-sm`: 6px — inputs, small buttons
- `--radius-md`: 10px — cards, buttons
- `--radius-lg`: 14px — panels, modals
- `--radius-xl`: 20px — hero sections
- `--radius-full`: 9999px — pills, avatars

## Shadows

- `--shadow-sm`: `0 1px 2px rgba(0,0,0,0.3)` — subtle lift
- `--shadow-md`: `0 4px 12px rgba(0,0,0,0.4)` — cards
- `--shadow-lg`: `0 8px 24px rgba(0,0,0,0.5)` — modals, dropdowns
- `--shadow-glow-emerald`: `0 0 20px rgba(52,211,153,0.15)` — active/success glow
- `--shadow-glow-gold`: `0 0 20px rgba(245,158,11,0.12)` — premium glow

## Components

### Cards
```
background: var(--surface-1)
border: 1px solid var(--border)
border-radius: var(--radius-lg)
padding: var(--space-6)
transition: border-color 0.2s, box-shadow 0.2s
hover: border-color var(--border-strong), shadow-sm
```

### Buttons
Primary: emerald bg, dark text, 600 weight, radius-md
Secondary: transparent, border, text-secondary, hover emerald-soft
Danger: crimson bg, white text
Ghost: no border, text-tertiary, hover surface-2

### Inputs
background: var(--surface-3)
border: 1px solid var(--border)
radius: var(--radius-sm)
focus: border emerald, glow-emerald

### Navigation
Desktop: top bar, surface-1 bg, glass blur, 56px height
Mobile: bottom bar, surface-1 bg, safe-area padding
Active: emerald text + emerald-soft bg pill

### Progress Bars
Track: var(--surface-3)
Fill: gradient from emerald to emerald-soft
Height: 6px, radius-full

### Badges/Pills
background: color-soft variant
text: color strong variant
radius: radius-full
padding: 2px 10px
font: caption size, 500 weight

## Signature Element

A subtle emerald gradient line at the top of the page (2px height,
full width) — like the felt edge of a poker table. This single element
brands every page without being heavy.

## Anti-patterns (DO NOT)

- No cream/warm backgrounds — this is a dark-first product
- No serif fonts — poker is precision, not editorial
- No gratuitous gradients on cards
- No shadows heavier than shadow-md on cards
- No neon/acid colors — emerald and gold are warm, not electric
- No rounded-full on rectangular containers
- No inline styles when a CSS class exists
