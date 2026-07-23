# Design Systems Registry — Curve Labs

Two brand systems. One shared intelligence layer. This document is the single
source of truth for AI-assisted design work across both properties.

**Last updated:** 2026-02-24
**Maintained by:** pali
**Status:** Audited — fonts cleaned, deprecated elements flagged for codebase removal

---

## Cross-Site Rule

**IBM Plex Mono is the only monospace font across both brands.** Any other mono
font found in either codebase (Space Mono, JetBrains Mono) is deprecated and
must be replaced with IBM Plex Mono.

---

## Egregore (egregore.xyz)

### Identity

Illuminated manuscript meets hacker terminal. Parchment, calligraphic display,
monospace body, ASCII art as primary visual medium. Light background, warm tones,
medieval-digital aesthetic.

### Stack

- React 19 + Vite 7 (SPA, React Router v7)
- **No Tailwind** — all inline styles via `tokens.js`
- Deploy: Netlify
- Source: `Curve-Labs/egregore-site` (live), `site/` in egregore-curve-labs (local copy)

### Colors (confirmed)

| Token | Hex | Usage |
|---|---|---|
| `C.parchment` | `#F4F1EA` | Page background, light surfaces |
| `C.ink` | `#1a1714` | Primary text, dark backgrounds |
| `C.crimson` | `#7A0F1B` | Brand accent, headings, logo, links |
| `C.gold` | `#c8a55a` | Dividers, card borders, highlights, hover states |
| `C.termBg` | `#0e0d0b` | Terminal/dark section background |
| `C.muted` | `#8a8578` | Secondary text, captions |
| `C.warmGray` | `#d4cfc5` | Divider lines, borders |

Additional inline values:
- `#5a5650` — darker body text in value prop cards
- `rgba(122,15,27,0.3)` / `rgba(122,15,27,0.5)` — scrollbar thumb (crimson at opacity)
- Selection: crimson background, parchment text

### Typography (confirmed)

| Role | Token | Font | Weight | Source |
|---|---|---|---|---|
| Display / hero | `font.slovic` | Slovic_Demo | normal | Self-hosted (Slovic_Demo-Historic.otf) |
| Body text | `font.serif` / `font.courierPrime` | Courier Prime | 400 | Google Fonts |
| Nav, UI labels | `font.ibmPlex` | IBM Plex Mono | 400, 700 | Google Fonts |
| Menu Index | (from Figma) | IBM Plex Mono | 400 | 14px / 16px line-height / ALL CAPS |

Note: `font.serif` is actually monospace (Courier Prime) — intentional for the
"printed manuscript" aesthetic.

#### Deprecated fonts — remove from codebase

| Font | Was used for | Replace with |
|---|---|---|
| UnifrakturMaguntia | Brand name, gothic headings | Slovic_Demo |
| Space Mono | UI labels, section labels (`font.mono`) | IBM Plex Mono |

**Cleanup needed in code:**
- `tokens.js`: remove `font.gothic` entry, update `font.mono` from Space Mono to IBM Plex Mono
- `main.jsx` GlobalStyles: remove UnifrakturMaguntia and Space Mono from Google Fonts import
- `App.jsx`: replace any `font.gothic` usage with `font.slovic`, replace `font.mono` usage (now IBM Plex Mono)

### Breakpoints

| Name | Value | Effect |
|---|---|---|
| Mobile | `max-width: 480px` | Full mobile overrides (375px baseline) |
| Tablet | `max-width: 768px` | Hide `.ascii-hide-mobile`, scale Egregore text 0.45 |
| Laptop | `max-width: 1024px` | Hide `.ascii-hide-tablet` |
| Wide | `max-width: 1200px` | Scale Egregore text 0.7 |

### Layout

- **Container:** `maxWidth: 1500px`, centered with `margin: '0 auto'`
- **Mobile container:** `padding: 0 5%, max-width: 100%`
- **Nav height:** ~80px (desktop), 70px (mobile)
- **Section padding:** varies per section, typically `3rem` to `5rem` vertical
- **Mobile section:** `min-height: 600px`, `padding: 3rem 1.25rem`

### Component Patterns

**SectionLabel:** Uppercase, IBM Plex Mono, `letterSpacing: '0.15em'`, `fontSize: 11px`, `color: C.muted`

**Divider:** Horizontal rule with crimson diamond center — `gold` line + `crimson` `◆` symbol + `gold` line

**Container:** `div` with `maxWidth: 1500px`, `margin: '0 auto'`, `padding: '0 2rem'`

**Card (ValueProps):** `background: C.parchment`, `border: 1px solid C.gold`, `padding: 2.5rem`, gold top border accent

**Terminal section:** `background: C.termBg`, light text (`C.parchment`), monospace throughout

**Navigation:** Fixed top, transparent → parchment background on scroll, IBM Plex Mono links

### Inline Style Pattern

All components use React inline `style={{}}` spreading from tokens:
```jsx
<h2 style={{ ...font.slovic, color: C.crimson, fontSize: 48 }}>
```
No CSS classes for styling (only for responsive utility overrides via GlobalStyles).

---

## Curve Labs (curvelabs.eu)

### Identity

Dark minimal tech lab. Near-black backgrounds, monochrome zinc palette, clean
geometric grid, subtle 3D elements. Professional, restrained, contemporary.

### Stack

- React 19 + Vite 6 + TypeScript
- **Tailwind CSS 3.4** with PostCSS
- Three.js for 3D semantic graph
- Framer Motion for animations
- Unicorn Studio for hero animation
- Deploy: Netlify
- Source: `Curve-Labs/lab-derivative-website-v2` (GitHub), local at `lab-derivative-website-v2/`

### Colors (confirmed)

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| background | `#09090b` | `bg-background` / `zinc-950` | Page background |
| surface | `#18181b` | `bg-surface` / `zinc-900` | Card hover, elevated surfaces |
| border | `#27272a` | `border-border` / `zinc-800` | All borders, grid lines, dividers |
| text primary | `#f4f4f5` | `text-zinc-100` | Headlines, primary text |
| text body | `#d4d4d8` | `text-zinc-300` | Body copy |
| text secondary | `#a1a1aa` | `text-zinc-400` | Nav links, taglines |
| text muted | `#71717a` | `text-zinc-500` | Section numbers, labels |
| text dim | `#52525b` | `text-zinc-600` | Decorative dots, patterns |
| accent | `#22d3ee` | `cyan-400` | 3D graph (labels, edges, halos) |

Additional:
- `#050505` — contact overlay panel
- Grid overlay: `#27272a` lines at 60% opacity, 120px cell size

### Typography (confirmed)

| Role | Tailwind class | Font | Weight | Source |
|---|---|---|---|---|
| Body, headers | `font-sans` / `font-header` / `font-body-text` | Gotham Book | normal, bold | Self-hosted .otf |
| Nav, UI labels, code | `font-nav` / `font-mono` | IBM Plex Mono | normal | Google Fonts |

Font sizes in use:
- Nav brand: `text-base` (16px)
- Nav links: `text-sm` (14px)
- Section labels: `text-[14px]` IBM Plex Mono
- Section headings: `text-[30px]` bold, `tracking-tight`
- Body: `text-[20px]` light
- Team names: `text-lg` (18px)
- Team bios: `text-[15px]`
- CTA headline: `text-5xl` → `md:text-6xl` → `lg:text-7xl`
- Footer: `text-sm`, `text-xs`

#### Deprecated fonts — remove from codebase

| Font | Was used for | Replace with |
|---|---|---|
| JetBrains Mono | `font-mono` (hero tagline, form labels) | IBM Plex Mono |
| Florderuina | `font-display` (defined but never used) | Remove entirely |
| FT88-Gothique | Loaded but no Tailwind class | Remove entirely |
| N27-Light | Loaded but no Tailwind class | Remove entirely |
| Format_1452 | 3D graph canvas labels | IBM Plex Mono or Gotham Book |
| Stitch Warrior | Mobile body text carve-out | Gotham Book |
| Inter | Inline on LACE heading only | Gotham Book |

**Cleanup needed in code:**
- `tailwind.config.js`: change `font-mono` from JetBrains Mono to IBM Plex Mono, remove `font-display` (Florderuina), remove `font-stitch-warrior`
- `index.html`: remove Google Fonts link for JetBrains Mono, remove `@font-face` declarations for Florderuina, FT88-Gothique, N27-Light, Stitch Warrior
- `components/Lace.tsx`: replace inline `Inter` reference with Gotham Book
- `components/SemanticGraph3D.tsx`: replace Format_1452 with IBM Plex Mono or Gotham Book
- Remove unused font files from `/fonts/` directory

### Breakpoints

Standard Tailwind defaults:
| Name | Min-width |
|---|---|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

### Layout

- **Container:** `max-w-[1600px] mx-auto px-6` (standard), `max-w-[1680px]` (Offerings)
- **Nav height:** `h-20` (80px), sticky, z-50
- **Section padding:** `p-8` mobile → `p-12` lg+
- **Grid overlay:** Fixed, 120px cells, `#27272a` lines, 60% opacity
- **Background:** Always `#09090b`, dark mode only (no light toggle)

### Component Patterns

**Section wrapper** (`ui/Section.tsx`):
- `border-t border-border` (top rule)
- Decorative `+` crosshairs at all 4 corners (positioned -1.5 outside border)
- Optional `border-b`

**Section inner structure:**
```
Section (border + crosshairs)
  └── max-w-[1600px] mx-auto px-6
      └── border-x border-border (side rails)
          ├── header row: border-b, p-8/12, section number + title
          └── content: grid or flex
```

**Section label:** `text-[14px] font-nav text-zinc-500 tracking-[0.1em]` — format: `[01]`, `[02]`

**Team card:** `p-8`, `border-r border-border` (vertical divider between cards), avatar with `bg-zinc-800 rounded-full w-12 h-12`

**Contact overlay:** Slide-in from right, `fixed inset-0`, backdrop `bg-black/40 backdrop-blur-sm`, panel `w-full md:w-[60vw] lg:w-[50vw]`

**Footer:** `py-12 px-6`, `max-w-[1600px]`, flex row with address + links

---

## Shared Elements

| Element | Egregore | Curve Labs |
|---|---|---|
| IBM Plex Mono | Nav, UI labels, Menu Index | Nav, UI labels, code, forms |
| Section structure | Container + SectionLabel + Divider | Section wrapper + border rails + crosshairs |
| Dark sections | Terminal sections only (`#0e0d0b`) | Entire site (`#09090b`) |
| Nav height | ~80px | 80px (`h-20`) |

---

## Blending Rules

When designing components that bridge both brands (e.g., Egregore section on CL site):

### Egregore content on Curve Labs site
- **Use CL containers:** `max-w-[1600px] mx-auto px-6` with `border-x border-border`
- **Use CL section wrapper:** `Section` component with crosshair corners
- **Use Egregore colors:** crimson (`#7A0F1B`), gold (`#c8a55a`), parchment (`#F4F1EA`) as accent against dark bg
- **Use Egregore typography:** Slovic_Demo for headings, Courier Prime for body
- **Breakpoints:** Follow CL Tailwind breakpoints (sm/md/lg/xl)
- **Padding:** Follow CL `p-8 lg:p-12` pattern

### Curve Labs content on Egregore site
- **Use Egregore containers:** `maxWidth: 1500px`, `margin: '0 auto'`
- **Use Egregore inline style pattern:** `style={{ ...font.ibmPlex, color: C.ink }}`
- **Use CL typography mapping:** Gotham Book → Courier Prime, IBM Plex Mono → stays IBM Plex Mono
- **Use CL color mapping:** zinc-100 → `C.ink`, zinc-500 → `C.muted`, border → `C.warmGray`
- **Breakpoints:** Follow Egregore breakpoints (480/768/1024/1200)

### Social media / standalone assets
- Choose one brand per asset — don't mix
- Egregore assets: parchment bg, crimson/gold accents, Slovic or Courier Prime
- CL assets: zinc-950 bg, zinc text hierarchy, Gotham Book, minimal

---

## File Locations

| What | Where |
|---|---|
| Egregore tokens | `site/src/tokens.js` (in egregore-curve-labs or egregore-site) |
| Egregore global styles | `site/src/main.jsx` → `GlobalStyles` component |
| Egregore components | `site/src/App.jsx` (all sections inline) |
| CL tailwind config | `lab-derivative-website-v2/frontend/tailwind.config.js` |
| CL components | `lab-derivative-website-v2/frontend/components/` |
| CL section primitive | `lab-derivative-website-v2/frontend/components/ui/Section.tsx` |
| CL design system pkg | `packages/design-system/tokens.css` (dark teal palette, NOT used by either site) |
