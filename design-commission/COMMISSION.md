# Commission: the Emissaries design, throughout

**Client**: Cem Dagdelen, Egregore (Curve Labs)
**Date**: 2026-07-17
**Scope**: the complete emissary surface family — not one page. Landing, directory, account console, the emissary render itself (the artifact people actually receive), app chrome, OG/social cards. One design language carried end-to-end.

## What an emissary is

A portable, runnable task — one you hand to someone else's AI. It travels as a single link, gets audited by the receiving agent, runs in the receiver's environment with their consent, and replies ship back as new emissaries linked to the original. It is the atomic unit of the product: a thread of runnable work between people, not a thread of messages about work.

The design problem: make that *legible as an object*. An emissary should feel like a thing — sealed, carried, opened, answered — not like a web page about a feature.

## Why this commission exists

The current landing page (see `01-current-state/current-landing-SCREENSHOT.png`) is scaffolding shipped as design: generic hero, three uneven prose cards, a numbered list, a primary CTA rendering as an empty dark pill. The directory and account surfaces carry a competent Meridian re-skin but nothing sings yet. Public launch is targeted for next week; these surfaces are the product's face and the referral target for decks, investors, and outreach.

## Surfaces in scope

1. **`/emissary` — the landing** (worst state, highest priority). Ungated front door and referral target. Needs a real visual anchor: the emissary as object. Current copy inventory is in `01-current-state/EmissaryLanding.tsx` — treat as raw material, rewrite freely in the house voice.
2. **`/emissary/browse` — the directory.** Grid of published emissaries with filters, stars, categories. Functional today; needs the collection to feel like a *shelf of sealed letters*, not a card dump.
3. **`/emissary/account` — the console.** Identity, published addresses, stars/collection, devices+tokens, ChatGPT/Claude connector. Single-column Meridian flow today.
4. **The emissary render** — the page a receiver lands on from an `/e/{id}` link. This is the most-seen surface in the whole loop (every send produces one). The default "letterhead" render and how custom renders sit inside app chrome.
5. **App chrome** — nav, footer, gates (password gate screens included — they're first-contact moments today).
6. **OG/social cards** — bespoke 1200×630 for /emissary and ideally per-emissary renders.

## Deliverables

1. **A design language spec** — type scale, spacing rhythm, palette roles, the core visual metaphor, component inventory. Grounded in the existing Meridian tokens (`02-design-system/meridian.css`) — evolve them, don't replace them wholesale.
2. **2–3 divergent concepts for the landing** first (the gate: Cem picks), then high-fidelity comps or self-contained HTML prototypes for every surface in scope.
3. **Motion notes** — what moves, what doesn't, `prefers-reduced-motion` behavior.
4. **A handoff the build session can implement without interpretation** — tokens, not hexes; component specs, not vibes.

## Hard constraints

- **Fonts**: Fraunces (serif display), Hanken Grotesk (sans), IBM Plex Mono — already loaded, already the identity.
- **Tokens only** — every theme-sensitive color as a CSS variable. No inline hexes (dark-mode compatibility depends on it; a `meridian-nocturne` dark token set already exists).
- **Accessibility**: WCAG AA contrast, visible focus states, semantic structure, reduced-motion honored.
- **Copy voice**: per `05-voice-and-taste/egregore-voice.md` — manuscriptic, precise, zero SaaS slop. Plain language; no invented coinages in UI labels (established terms: emissary, directory, stars, pull).
- **Technical constraint that shapes render design**: under the public-launch audit posture, custom emissary renders containing scripts get blocked — so the *default* render must carry the beauty with HTML/CSS only. Design the letterhead like it's the product, because it is.
- **Don't redesign**: netlify routing, the gate passwords' existence (though the gate *screens* are yours), the information architecture of account (sections can be reordered/restyled, not removed).

## Taste (read `05-voice-and-taste/taste-notes.md` fully)

- One strong evolving visual beats many small boxes.
- No gold-parchment/vellum-brass pairings — the client has rejected that palette family explicitly.
- Editorial, manuscriptic, architectural. The existing Meridian look (paper/ink/prussian with brass/teal/rose accents) is the right family; push it to flagship, don't drift to generic SaaS.
- The client's reference points for "good" internally: the Meridian-rendered decision surfaces and living-paper scrolls (screenshots of the directory/account after re-skin are the closest live reference).

## Folder map

- `01-current-state/` — screenshot of the failed landing + all current component sources (TSX)
- `02-design-system/` — every live CSS file incl. the Meridian token system
- `03-prior-design/` — the Jul 2 design-context handoff (v2) + org design-systems notes
- `04-product-context/` — the platform surfaces spec (object model), product-scope decision, platform architecture artifact, launch-forks decision, and the build-session design brief
- `05-voice-and-taste/` — voice guide + taste notes
- `URLS.md` — live surfaces, preview, gates

## Process

Concepts for the landing first → Cem picks → design language locks → remaining surfaces. Nothing ships from this commission directly; a build session implements against your spec (its brief is `04-product-context/DESIGN-BRIEF-emissary-landing.md` — it will follow your design language once it exists).
