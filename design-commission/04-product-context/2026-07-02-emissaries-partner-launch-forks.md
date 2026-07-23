# Decision: Emissaries partner-launch forks — spine-first, web-star/agent-pull, partner-shaped taxonomy

**Date**: 2026-07-02
**Author**: Cem (decision surface: `ds-2026-07-02-emissaries-partner-launch`, harvest: `harvest-2026-07-02-emissaries-partner-launch-forks`)
**Applies to**: `docs/specs/emissary-platform-surfaces.md` (resolutions folded in, §8 ledger added)

## Context

Two weeks past the original June 19/20 partner-launch target, a session-wide re-evaluation found: the terminal→platform publish path live in production, the browse front-end stranded on a preview branch, the identity spine (device-flow login + web session) spec'd but unbuilt, and three forks open since the June 30 product-scope harvest — one of them a live contradiction between shipped code and Cem's stated position. Eight forks went onto a decision surface; six resolved, two stayed deliberately open with direction.

## Decisions

### 1. Launch gate — SPINE-FIRST
The identity spine (device-flow `egregore login` binding agent + web session, per the H1–H8 handshake ledger) is built **before** partners arrive. The lean-cut alternative (defer spine to public launch, ship CLI-only identity) was explicitly rejected.

**Why (reconstructed from Q2):** the star model Cem wants requires a web session — browsing/collecting is a *web* experience, so the spine is load-bearing for the launch's own success loop, not just public infrastructure.

### 2. Star → recall — WEB-STAR / AGENT-PULL (direction set; mechanism open)
Agent-side starring is rejected as the primary UX: *"the terminal is not a good place for discovering new skills."* The decided shape:

- **Star = web verb.** You browse the directory by category in an engaging, interactive environment and collect with ★. Stars are stored per user ID.
- **Pull = agent verb.** A command reads the user's stars (`GET /api/v1/platform/stars` — live today) and asks which to **enact or ingest**.

Open: the exact pull-command UX (invocation, presentation, enact-vs-ingest framing). Marked UNDECIDED on the surface — direction is binding, mechanism is not.

### 3. Partner compose — OPEN, with a new task
Clone-to-create (the replicant template path, PRs #1003/#1005/#1020) is unconfirmed. Instead: **build a streamlined iteration of compose** — a tighter emissary-creation UX. The template PRs' fate rides on that design pass.

### 4. UF-1 consent — ASK ONCE AT ONBOARDING + OVERRIDE
Resolves the live contradiction with shipped code. Consent is asked **once at onboarding**, sets a per-account default, with per-emissary override — per June 30 decisions #12+#13. **PR #877's per-donation gate must change to match before partner onboarding.**

### 5. Canonical handle — CHOSEN AT CLAIM
As shipped (`npx egregore-emissary handle <name>`, fork H6): chosen handle claimed at sign-up, gated by verified email; display name separate. Squat/reclaim policy needed before public launch.

### 6. Category taxonomy — PARTNER-SHAPED
Categories are sourced from **launch partners' domains plus what we publish ourselves** — not the curated-5 set (research/onboarding/writing/engineering/ops) in the earlier spec. This resolves the on-record conflict in favor of the S6 seeding direction. The concrete category list derives from the confirmed partner set.

### 7. Design handoff — RE-SCOPED, context package v2
Claude-design may run the **full** MERIDIAN app-chrome pass, but only launch-necessary surfaces get used; priority tier is **connect/identity · directory · render chrome**. The June 30 wireframe brief is superseded by `memory/handoffs/2026-07-02-cem-emissaries-design-context-v2.md`, which folds in this decision set (notably: the S5 handshake is no longer an open question to flag — it's decided device-flow, to be wireframed as the happy path).

### 8. Dates — PARTNER DATE COMMITTED; PUBLIC FLOATS
Commit a partner date out loud; the public date floats on its remaining gate (T2 publication audit — the web-session gate collapses into the partner phase by construction, since spine-first pulls it forward).

**⚠ Follow-up required:** the date window authored on the surface (Jul 9–11) predates the spine-first call in decision 1. The committed window must be re-derived from the spine build estimate — realistically **Jul 16–18** if the spine is ~1.5 weeks, or Jul 9–11 only if the spine descopes to the login+star minimum. This is the single open scheduling call.

## Implications

- **Build order** (spec §6, updated): device-flow login → web starring on directory + render → star pull command → profile/settings wiring → follow/feed/notifications. Partner launch wants steps 1–2.
- **Code changes owed:** PR #877 consent gate → ask-once model; render page's banned "Run this Egregore packet" CTA → calm affordance; browse redesign merges off the preview branch with shelf→directory terminology fixed.
- **Design:** context package v2 goes to claude-design; category rail becomes partner-shaped.
- **Pipeline is still the bottleneck:** 1 confirmed partner (Oliver) of ~10 target. Spine-first buys the pipeline lane time — use it for partner calls.
