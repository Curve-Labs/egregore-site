# Decision: Emissaries Platform — product shape & scope (the centaur social loop)

**Date**: 2026-06-30
**Author**: Cem (decided on a self-harvest decision surface)
**Status**: Accepted — governs the front-end surface build (the five surfaces over the live platform router)
**Surface**: `memory/knowledge/harvests/2026-06-30-emissaries-product-scope-surface.html` (data: `surfaces/2026-06-30-emissaries-product-scope.json`)
**Sources**: `SCOPE-emissaries-platform.md` (16 surface forks) + `emissaries-platform-launch.json` (6 launch forks); upstream of these, the settled `2026-06-29-emissaries-platform-intent.md`.

## Context

The June 29 **intent** harvest settled the *why* (wedge-up · magic leads, terminal converts · moat-as-negotiated-social-contract · concentric consent) and the backend is live (platform router, profiles, slugs, stars, categories, render ladder). What was left open was the **product shape** one rung down — the centaur social loop: *publish from your terminal → your profile page → discover by category → star → recall in your runtime.* This surface folded the open **scope** (8) + **launch** (6) forks into one categorized harvest, deduped against the settled intent, and added the two framing cards they lacked: **content-vs-tool** (the budget fork) and the **star→recall loop** (the runtime-addressability path — *designed but unbuilt*, the literal heart of "centaur social media").

Decided on the V2.1 rail surface. **All 15 forks resolved.** The 14 inline picks all took the ★ (zero divergences); profile-depth (Q4) was re-posed in plain language and resolved as a bespoke blend.

## Decisions (15 settled)

| # | Fork | Choice | Refinement from notes |
|---|------|--------|-----------------------|
| 1 | Content site or tool site | **Content-grade artifacts inside a tool-grade shell** | The taste budget goes to the emissary render; the platform frame stays thin and fast |
| 2 | Surface count | **One surface** — the directory IS home = discover = feed | — |
| 3 | The front door's form | **The landing IS an emissary** | It's the *announcement emissary* that introduces the concept and carries **install + sign-up/authenticate + connect-your-agent** in one flow (mechanism TBD) |
| 4 | Profile-page depth | **Published emissaries + opt-in runs + follow graph** (no donations) | Re-posed plainly; donations dropped as a data-handling concern, follow added |
| 5 | The magic→CLI handoff | **A calm "run it" affordance** (bare npx / open-in-agent, no imperative) | The *real* question under this: **how the user's terminal agent connects to their platform identity, seamlessly.** Present the options as horizontal, step-by-step **user flows** with tradeoffs, not abstract cards |
| 6 | Discover richness | **Per-emissary render thumbnails** | (search deferred — net-new scope) |
| 7 | The star → recall loop | **Surface it** — the web teaches "★ → recall @x/y in your terminal" | The recall verb is v1, taught on the web; the conversion gesture |
| 8 | Feed item | **Emissary card with counts** | **Terminology**: "shelf" is **retired** — backend calls it the **directory**; the stream is the **feed** |
| 9 | What "launched" means | **The loop closes** — cross-person runs → new publishes (infection) | North star, but a **basket**: also track total emissaries · total views · total runs |
| 10 | Empty-shelf / seeding | **A small house gallery** (~15–25 hand-made exemplars), partners add on top | "it's the feed, not shelf" |
| 11 | Publish-quality gate | **T2 auto + inner-ring partners self-gate taste** — Cem out of the per-publish loop | The relief from the burnout he flagged |
| 12 | Day-one trust moment | **Ask once at onboarding** — partner opts traces into the cohort (partner) ring | — |
| 13 | Consent granularity | **Per-account default ring + per-emissary override** | — |
| 14 | Web settings page | **CLI-only** config; the web profile is read-only | — |
| 15 | Nav + app chrome | **Build the MERIDIAN app-chrome layer** | One language end-to-end; the frame matches the renders |

**Divergences from the ★**: none on the 14 inline picks. Profile-depth (Q4) resolved as a bespoke blend — footprint **minus donations**, **plus** the follow graph — diverging from the ★ (which kept donations and deferred follow).

## What this locks for the build

- **One surface, content object / tool shell.** A single directory grid (home = discover = feed) over the shipped `browse` API, rendered in **MERIDIAN app-chrome** (new layer). All taste spends on the emissary renders; the frame stays thin and fast.
- **The front door is a live emissary** — the announcement emissary that explains the concept and folds **install + sign-up/auth + connect-agent** into itself. This makes Q5's "real question" load-bearing: the **terminal-agent ↔ platform-identity handshake** is now the spine of both the landing and the conversion path, and it's underspecified — it needs its own design pass (present as step-by-step user flows).
- **The loop is the product.** Push already ships; this commits to **surfacing + teaching pull** ("★ → `recall @x/y`") in v1 — that's what makes it a network, not a gallery. Success = the loop closing (cross-person run → new publish), tracked alongside totals (emissaries/views/runs).
- **Cards show counts** (anonymous telemetry), thumbnails on discover.
- **Cem exits the per-publish taste loop**: T2 auto-gates security/conformance; inner-ring partners self-gate taste. Seed with a **house gallery** of ~15–25 exemplars to set the bar.
- **Consent**: ask once at onboarding (traces → partner ring), per-account default + per-emissary override, **CLI-only** settings at launch.
- **Profile**: published emissaries (always) + what you've run (opt-in / public) + **followers & following**; **no donation data** surfaced on the profile.

## Terminology correction (propagate everywhere)
**"Shelf" is retired.** Use **directory** (the backend catalog: profiles × slugs × stars) and **feed** (the user-facing stream). Purge "shelf" from scope docs, surfaces, and copy.

## Still open (not posed or left open)
- The **identity-connection handshake** under Q3/Q5 — how the terminal agent binds to the platform identity seamlessly. Needs a dedicated user-flow design pass.
- From the SCOPE doc, not posed here: **④ canonical handle**, **⑨ feed default spine** (recent/trending/for-you), **⑫ category taxonomy** (fixed vs tag-promotion), **⑬ trust signal beyond ★**, **⑯ full-transcript donation vs traces-only**.

## Out of scope (by prior decision)
Monetization mechanics, the owned model, and the async closed-loop — all explicitly parked upstream (intent harvest ⑤/⑦/⑧).

## Process notes (for `/harvest`)
- The profile-depth card failed for using insider lingo — a self-harvest still needs plain framing.
- Flow-shaped forks (the handoff) want **horizontal step-by-step user-flow visuals** with the tradeoffs inline, not abstract option cards.
