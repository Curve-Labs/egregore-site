# Pickup brief — redesign /emissary landing to flagship quality

Paste-prompt for a fresh session (or point the session at this file).

## Context

- Repo: egregore-site, branch `dev/fcdagdelen/emissary-account-meridian` (commit 655e61c is the placeholder version)
- The current /emissary page is scaffolding shipped as design: generic hero, three uneven prose cards, a numbered list, and a **bug** — the primary CTA renders as an empty dark pill (invisible label; likely `setup-btn` classes colliding with Meridian tokens inside the `(emissary)` layout)
- Treat the current page as a content inventory, not a design
- Do NOT touch: netlify.toml, gated /emissary/browse, /emissary/account, vanity slugs

## Process — explicit gates, no jumping to code

**PHASE 1 — DESIGN RESEARCH (no code).** One-page design brief from primary sources:
`components/emissary/meridian.css` (tokens: paper/ink/prussian/brass/teal/rose; Fraunces + Hanken Grotesk + IBM Plex Mono), `chrome.css`, the re-skinned browse/account surfaces (the Meridian look that already works), the egregore.xyz homepage (brand feel), and org memory: `memory/knowledge/design-systems.md`, the Meridian/egregore-artifacts convention, Cem's recorded taste (dislikes gold-parchment/vellum-brass pairings; one strong evolving visual over many small boxes; plain language, no coinages). Brief states: type scale, spacing rhythm, palette roles, and the ONE visual idea that carries the page.

**PHASE 2 — CONCEPTS (gate: Cem picks).** 2–3 genuinely different page concepts as throwaway static HTML sketches, screenshotted, presented via AskUserQuestion with previews. Every concept needs a real hero visual anchor — an emissary rendered as an object (live-looking emissary card, envelope/seal motif, animated compose→send→run→respond diagram) — not prose cards. Each concept notes typographic hierarchy and how the four-step flow becomes visual. Wait for selection.

**PHASE 3 — BUILD to frontend best practices.** Tokens only, zero raw hex in components (every theme-sensitive color via `var(--token)`); fluid `clamp()` type scale; consistent spacing scale; CSS grid, intentional breakpoints (390/768/1280); WCAG AA contrast, visible focus states, semantic landmarks, `prefers-reduced-motion`; font loading without FOUT/CLS; fix the CTA bug at the token level; bespoke OG image (1200×630) for /emissary. Copy in the egregore-voice register.

**PHASE 4 — VERIFY.** Dev server, screenshots at all three breakpoints + hover/focus states, self-critique against the Phase-1 brief, iterate until it survives a design review. `npx next build` green → push branch → deploy preview (push to `preview` branch; Netlify serves preview--egregore-core.netlify.app/emissary) → hand Cem the preview link + screenshots inline.

## Hard gates

No PR to main, no production deploy, nothing sent to anyone. Cem approves every phase transition after Phase 2 and signs off the final page.
