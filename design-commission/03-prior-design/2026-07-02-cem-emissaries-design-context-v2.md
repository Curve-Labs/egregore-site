---
admin: false
date: 2026-07-02
from: cem
to: claude-design (wireframing session)
kind: design-handoff
status: claimed
claimed: 2026-07-02 · claude-design session (cem) · deliverable: egregore repo `.build/emissaries-app-chrome-wireframes.html` (low-fi v1 — kit + S5/S2/S0 + secondary sketches + OQ options)
supersedes: 2026-06-30-cem-emissaries-platform-design-wireframe
topic: Emissaries platform — partner-launch wireframes (context package v2)
sources:
  - knowledge/decisions/2026-07-02-emissaries-partner-launch-forks.md
  - knowledge/decisions/2026-06-30-emissaries-product-scope.md
  - knowledge/decisions/2026-06-29-emissaries-platform-intent.md
  - docs/specs/emissary-platform-surfaces.md (repo — resolutions ledger §8)
---

# Design Handoff v2 — Emissaries Platform: partner-launch wireframes

**This supersedes the 2026-06-30 brief.** Three things changed on 2026-07-02: (1) the handshake mechanism is **decided** — device-flow login, built spine-first, gating the partner launch — so S5 is now a happy path to wireframe, not an open question to flag; (2) the star loop is **web-star / agent-pull** — the ★ is a web collect verb and the agent pulls your collection, which changes the star affordance and the teach moment on S0/S2; (3) the category rail is **partner-shaped**, not the curated-5.

**Mission**: produce low-fidelity wireframes in the **MERIDIAN** design language — extending it to *app-chrome* for the first time. You may wireframe **all six surfaces** for full-system coherence, but they are tiered: we will *use* the launch-critical tier first. Scope is ~10 partners (VCs / power users + cofounders), private for ~2 weeks, then public. Stay low-fi: layout, hierarchy, states, component kit — not pixel polish.

---

## 1 · The deliverable — surfaces, tiered

| Tier | # | Surface | One-liner |
|------|---|---------|-----------|
| **LAUNCH-CRITICAL** | S5 | Connect / handshake flow | Device-flow login (decided) — install → sign-up → `egregore login` → first pull |
| **LAUNCH-CRITICAL** | S2 | The directory | ONE surface = home = feed = discover; partner-shaped category rail; the ★-collect surface |
| **LAUNCH-CRITICAL** | S0 | Per-emissary render page `/e/{uuid}` | The hero artifact (mostly built) — redesign the *chrome around it*: ★, calm run, pull-teach |
| secondary | S1 | The landing emissary | The front door **is itself an emissary** (announcement artifact) |
| secondary | S3 | Profile `@handle` | Published + opt-in runs + followers/following |
| secondary | S4 | Settings | CLI-only config; web **read-only** account card + consent-ring state |

Flows: **the handshake (decided — see §5/S5) · discover→star→pull · publish · magic→CLI handoff**.

**The aesthetic budget (unchanged):** *content-grade artifacts inside a tool-grade shell.* The emissary renders carry all the taste; the chrome is commodity — clean, fast, boring.

---

## 2 · What the platform is (60 seconds)

A **minimal centaur social network**. You **publish an emissary from your terminal** → it gets a page under your `@handle` → it's **discoverable by category** in the directory → others **★-collect** it on the web → **their agent pulls their stars** and enacts or ingests them. The star is the bridge verb: **collected on the web, spent in the terminal.**

An **emissary** is a **dual-faced artifact**: a human-legible *letter* (prose, rendered beautifully) fused to an agent-enactable *mandate* (a structured spec the recipient's agent can run). It **requests, never commands** — "standing, not authority."

---

## 3 · Settled direction — wireframe within these

From the intent harvest (Jun 29), the product-scope harvest (Jun 30), and the partner-launch forks harvest (Jul 2):

- **Wedge-up** — lead with the emissary; "egregore" stays upstairs/implicit.
- **Magic leads, terminal converts** — the render is the hero and viral surface; value capture happens back in the CLI.
- **Content object / tool shell** — taste on the render, thin/fast on the chrome.
- **Moat = negotiated social contract** — concentric consent rings (inner / partner / public).
- **The loop IS the product** — push (publish) ships; v1 must surface and teach the **pull** (★ → agent pulls your stars).
- **Discovery is a web experience** (Jul 2, load-bearing) — "you browse through categories in an engaging, interactive environment and collect things that then become available to your agent." The terminal is not a discovery surface. This is *why* the web session is being built before launch.

**Resolved decisions that shape layout:**

| Call | Resolution |
|------|-----------|
| Web session | **Device-flow login, spine-first** (Jul 2) — one `egregore login` binds agent + web session; no secret copy-paste; per-device tokens |
| Star loop | **Web-star / agent-pull** (Jul 2) — ★ collects on the web per user; agent command reads stars and offers enact/ingest |
| Category rail | **Partner-shaped** (Jul 2) — categories from launch partners' domains + house publications. Design for variable, wordier labels (e.g. "scientific publishing", "benchmarks") — not the old 5-verb set |
| Canonical handle | **Chosen at claim** (Jul 2) — verified-email-gated; display name separate |
| Day-one consent | **Ask once at onboarding** (Jul 2 confirms Jun 30 #12/#13) — one consent beat in the S5 flow sets the account default; per-emissary override exists but is not a recurring gate |
| Surface count | **One** directory surface (home = feed = discover) |
| Front door | The landing **is an emissary** (announcement); carries install + sign-up + connect |
| Discover richness | Per-emissary render **thumbnails** + sort (recent \| stars); **no search** at launch |
| Feed item | Emissary card with **counts** (★, runs) — anonymous, never "who" |
| Profile depth | Published + opt-in runs + followers/following; **no donation data** |
| Magic→CLI handoff | A **calm "run it" affordance** — bare npx / open-in-agent, never an imperative |
| Quality gate | T2 auto-audit; surfaces show **pending-audit vs published** |
| Settings | **CLI-only** config; web read-only |
| Chrome | **Build the MERIDIAN app-chrome layer** (this brief) |
| Seeding | House gallery ~15–25 exemplars → the sparse grid must look intentional |

**Out of scope (don't wireframe):** monetization/paywalls, the "egregore" org product, the async closed-loop, web compose (composition stays agent-conducted in the harness; a streamlined compose iteration is a *CLI/harness* design task, not yours).

---

## 4 · The design language (MERIDIAN) — and the gap you fill

**Typefaces (role tokens, never bare families):**
- **Fraunces** (`--serif`) — display, headings, card titles, the human "letter" face
- **Hanken Grotesk** (`--sans`) — body, UI labels
- **IBM Plex Mono** (`--mono`) — metadata, code, the agent "protocol" face, terminal surfaces

**Role-token contract (semantic; every theme defines these):**
- Surfaces: `--paper`, `--paper-2`, `--card` · Ink: `--ink`, `--ink-soft`, `--ink-faint` · Lines: `--line`, `--line-soft`
- Accents (3 tiers): `--t1 / --t1-bg`, `--t2 / --t2-bg`, `--t3 / --t3-bg`
- Texture: `--grain`, `--shadow`, `--contour` · base: `--maxw` (1080), `--ease`

**Theme pairs** (`packages/design-system/themes/registry.json`): use the **`meridian`** family (vellum/nocturne) as the chrome base; individual artifact renders carry their own theme.

> ⚠️ Canonical token source is `packages/design-system/themes/*.css`. Do **NOT** use `packages/egregore-artifacts/lib/tokens.js` — legacy marketing brand, off-target.

**THE GAP YOU'RE FILLING:** MERIDIAN covers artifact/document surfaces only. Nav, browse grids, cards, forms, sign-in screens, star buttons, filters, badges, empty states — none exist. You are defining the **app-chrome kit** from scratch on the role-token foundation, continuous with the artifact renders.

---

## 5 · Surfaces — spec per screen

### S5 · Connect / handshake — *LAUNCH-CRITICAL, now decided: wireframe the happy path*
The mechanism is settled (device-flow, forks H1–H8): **one `egregore login` binds the agent AND the web session.** Lazy binding — anonymous browse stays open; bind at the first identity-requiring action (★, claim, publish). Wireframe as horizontal step-by-step screens:
1. **Land** on an emissary (S0/S1) →
2. **Install** — the calm `npx … install` line →
3. **Sign-up** — account + verified email; **handle claim** beat (chosen handle, availability check) →
4. **Consent — the one ask** — pick your ring (inner / partner / public shown as concentric circles); sets the account default; framed as the trust moment, calm not legal →
5. **Connect your agent** — the web shows a short device code / confirm screen; the terminal runs `egregore login`; both sides confirm the bind ("this device is now @cem") →
6. **First pull** — "you've starred 3 things — ask your agent to pull your stars." The loop's first close.
Also wireframe the **returning-user sign-in** (same device-flow from the web side) and the **revoke-a-device** state (settings-adjacent, can be minimal).

### S2 · The directory — *LAUNCH-CRITICAL: one surface, and the collect surface*
Home **is** the browsable catalog (**directory**; the stream is the **feed** — the term "shelf" is retired, never use it).
- **Blocks**: **partner-shaped category rail** (variable labels — design for 4–8 categories with names like "scientific publishing"; the exact set derives from the confirmed partner list) · browse grid of render thumbnails · sort (recent | stars) · tag filter.
- **Card** = thumbnail + title + category chip + **★ count** + run count + author. Counts anonymous.
- **★ on the card and in the grid is the collect verb** — signed-out click routes into S5; signed-in click collects with a quiet confirm that teaches the pull ("in your stars — your agent can pull it").
- **States**: empty/low-volume matters most (house gallery ~15–25); loading; populated; pending-audit.

### S0 · Per-emissary render page `/e/{uuid}` — *LAUNCH-CRITICAL: the hero's chrome*
The shareable, edge-cached artifact. Dual-faced: human **letter** (`.face-human` — parchment, serif, prose, dropcap) + agent **protocol** face (`.face-agent` — dark, mono, from `executable_spec`), split by a visible spine seam, ~63/37 toward the open face, fullscreenable. Render ladder L0–L3; wireframe assumes **L0**.
- **Your job is the on-page chrome**: the **★ collect control** (pin default / follow opt-in) · the **pull-teach** moment ("★'d — ask your agent to pull your stars") · the **calm "run it" affordance** · author block → `/@handle` · "browse more" → directory · provenance line · version-lineage nav.
- 🚫 The live render still ships a `.prompt-pill` "Run this Egregore… (copies launch prompt)" — **BANNED** (reads as injection). Replace with the calm affordance (§8).
- **States**: `pending-audit` vs `published`.

### S1 · The landing emissary — *secondary*
No separate marketing homepage: the front door is an **announcement emissary** that explains the concept by being one. Fold in: install line · sign-up · connect-agent · entry into browse. Overlaps S5 heavily — treat together.

### S3 · Profile `@handle` — *secondary*
Header: `@handle`, display name, avatar, verified badge, bio, links. Body: published emissaries · opt-in runs · followers/following. **No donation data anywhere.** Affordances: open emissary, follow, ★.

### S4 · Settings — *secondary, minimal*
Config lives in the CLI; web is **read-only**: account card (@handle, verified email), **consent-ring state** (concentric circles), connected devices (from device-flow — with revoke as the one possible action), quota. No edit forms v1.

---

## 6 · Component inventory (the app-chrome kit)

- **Global nav** (wordmark · directory · profile · connect CTA)
- **Emissary card** (thumbnail · title · category chip · ★ count · run count · author · audit badge)
- **Category rail** — partner-shaped, variable-length labels, with counts
- **Sort + tag filter** controls
- **★ collect control** — signed-out (routes to S5) / signed-in (pin default, follow opt-in) / collected states, + the **pull-teach** inline ("★ → your agent pulls your stars")
- **Calm "run it" affordance** — bare npx / open-in-agent; no imperative copy (§8)
- **Device-flow connect screens** — code display · confirm · bound-device row (with revoke)
- **Consent-ring picker** (S5, the one ask) + **consent-ring display** (S4, read-only)
- **Handle-claim input** (availability check, `[a-z0-9-]`)
- **Profile header** (avatar · @handle · verified · bio · links · follow · counts)
- **Audit-state + verified badges**
- **Empty states** — especially the sparse directory

---

## 7 · The four core flows

1. **The handshake** (S5) — install → sign-up (+ handle claim) → the one consent ask → `egregore login` device bind → first pull. **Decided; wireframe the happy path + returning sign-in.**
2. **Discover → star → pull** — directory (S2) → open render (S0) → ★ → pull-teach → the user's agent pulls their stars and offers enact/ingest. The terminal half (the pull command's own UX) is a CLI design task — your job is the *web-side teach* that makes it inevitable.
3. **Publish** — terminal `emissary new` → appears on profile (S3) + directory (S2). Web is read-only here; wireframe only the result.
4. **Magic → CLI handoff** — render (S0) → calm "run it" → terminal. See §8.

---

## 8 · Hard constraints — wireframes MUST honor

- 🚫 **No injection-payload language anywhere.** "Launch this packet", "copy launch prompt", "paste this and run" — banned (founder: "REMOVE THIS AND MAKE SURE IT NEVER APPEARS"). Run affordances read as calm app actions (`▸ run it` + a bare `npx …`), never instructions to an agent.
- **Dual-faced always** — never flatten an emissary to one face.
- **Consent-first, ask-once** — one consent beat in onboarding sets the default; no recurring gates; nothing alarming at the share moment.
- **Audit states** — `pending-audit` vs `published` visible.
- **Counts, not identities** — default cards show how many, never who.
- **Quality regime** — chrome is commodity; the taste budget is spent on the renders.

---

## 9 · Data model — what each screen works with

*(`server` = live backend today; `designed` = schema/spec only.)*

- **profile** `emissary_profiles`: `handle` (unique, `[a-z0-9-]`), `display`, `bio`/`links[]`/`featured[]` *(designed, unset)*, `created_at`. — `server`
- **emissary** `emissary_emissaries`: `id` (uuid = head), `topic`, `summary`, `kind` (dialogue|build|documentation), `category` (FK), `version`, `parent_version`, `artifact` (handoff-v1 JSON-LD), `render_html`, `author_user_id`, 365-day expiry. Rows immutable — editing = new version, slug head moves. — `server`
- **slug** `emissary_slugs`: `@handle/slug` → `head_id`; `/e/{uuid}` → immutable version. — `server`
- **star** `emissary_stars`: `user_id` + `owner_handle` + `slug`, `mode` (pin|follow), `pinned_id`. Pin = version you evaluated (default, supply-chain safe). **The agent's pull reads these** (`GET /api/v1/platform/stars`). — `server`
- **category** `emissary_categories`: `slug`, `label`, `curated`, `sort`. **Launch set: partner-shaped** (partners' domains + house publications; exact list pending the confirmed partner set). — `server`
- **tag** `emissary_tags`: freeform. — `server`
- **quota_counters**: publishes 10/day, active_hosted 50, `publish_exempt` (founders). — `server`
- **user** `emissary_users`: `id`, `name`, `email`, `email_verified`, `harness`. — `server`
- **device/session** *(designed — spine build)*: per-device short-lived access + refresh tokens; revocable per device (H3).

---

## 10 · Open questions — flag, don't solve

*(Down from 7 — handshake mechanism, canonical handle, and category taxonomy are resolved.)*

1. **Feed default spine** — recent (current lean) vs trending vs for-you.
2. **Trust signal beyond ★** — reception/carry count? verified author? Where does it live on the card?
3. **Thumbnail generation** — how render previews are produced/cached for the grid.
4. **Profile editing** — `bio/links/featured` have no UI; CLI or a later web form?
5. **The exact partner category list** — design the rail for variability; the labels land when the partner set confirms.
6. **Pull-teach copy** — the web-side phrasing that makes "your agent pulls your stars" legible to someone who's never bound an agent. Propose options, don't lock one.

---

## 11 · References

- **Decisions**: `knowledge/decisions/2026-07-02-emissaries-partner-launch-forks.md` (this round) · `2026-06-30-emissaries-product-scope.md` · `2026-06-29-emissaries-platform-intent.md`
- **Spec (updated in place)**: repo `docs/specs/emissary-platform-surfaces.md` — see §8 resolutions ledger
- **Syntheses**: `knowledge/harvests/2026-07-02-emissaries-partner-launch-forks.md` · `2026-06-30-emissaries-product-scope.md`
- **Architecture**: `knowledge/research/2026-06-11-platform-architecture.md` · `2026-06-11-emissary-architecture.md`
- **Render**: `design/templates/canonical-dual-face.md` · render ladder spec
- **Design system**: `packages/design-system/` (themes, role tokens, SKILL.md)
- **Prior brief (superseded, kept for lineage)**: `handoffs/2026-06-30-cem-emissaries-platform-design-wireframe.md`
