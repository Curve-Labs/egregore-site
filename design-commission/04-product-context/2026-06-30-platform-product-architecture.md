# Emissaries Platform — Product Architecture

*Partner-launch scope · 2026-06-30 · Curve Labs*

A reference for the shape of the platform: what it is, the surfaces it's made of, the object at its center, and the one frontier still open. Direction is settled across two harvests (23 forks); this document is the resolved picture, not a proposal.

---

## 1 · The product in one breath

A **minimal centaur social network**. You **publish an emissary from your terminal**; it gets a **profile page** under your `@handle`; it's **discoverable by category**; others **star** it; and they **recall it by name inside their own agent runtime**. Work moves between people the way memory moves between sessions — *a star on the web becomes a runnable verb in the terminal.*

The unit that travels is the **emissary**: a dual-faced artifact that is at once a human-legible letter and an agent-enactable mandate. It requests; it never commands.

---

## 2 · The thesis (settled)

| Axis | Resolution |
|------|-----------|
| **Entry** | **Wedge up** — lead with the emissary; the org layer stays implicit. |
| **Optimization** | **Magic leads, terminal converts** — the rendered artifact is the hero and the viral surface; value is captured back in the runtime. |
| **Budget** | **Content-grade artifacts inside a tool-grade shell** — taste spends on the render; the platform frame stays thin and fast. |
| **Defensibility** | **A negotiated social contract** — context that compounds because it's pooled, governed by consent, not extracted. |
| **Trust** | **Concentric consent** — opt-in trace harvest, opt-out telemetry; rings of inner / partner / public. |
| **Spine** | **The loop is the product** — publishing already ships; the launch surfaces and *teaches* the return path (star → recall). |

---

## 3 · The system, as interrelated surfaces

The backend is **live** — identity, the publish path, the platform router (`browse · profile · stars · categories`), the Supabase repository, the render ladder, the reception path. The **front-end is the unbuilt thread**: five web surfaces assembled over services that already exist, plus the connect flow.

| Surface | Its job | State |
|---------|---------|-------|
| **Render page** `/e/{uuid}` | The shareable, edge-cached artifact — the hero every surface points at | Built; chrome being redesigned |
| **Landing emissary** | The front door **is itself an emissary** — the announcement artifact that introduces the concept and folds in install + sign-up + connect | To build |
| **Directory** | One surface: home = feed = discover. Category rail + thumbnail grid + sort | To build |
| **Profile** `@handle` | A person's public home — published emissaries (+ opt-in runs, + follow graph) | To build |
| **Settings** | Identity + the consent ring — CLI-only at launch, web read-only | Minimal |
| **The connect flow** | install → sign-up/auth → **connect your agent** → first run | **Open frontier — §8** |

One design rule binds them: **the directory is one surface, not three.** At partner scale the catalog *is* the feed; a single grid over the shipped browse API serves the whole front end.

---

## 4 · The object — a dual-faced emissary

Every emissary is one artifact with two faces and a visible seam:

- **The letter** — a human-readable face: prose, rendered beautifully, opening on an illuminated dropcap. This is the magic, the thing that infects.
- **The mandate** — an agent-enactable face: a structured `executable_spec` (intake → action → output) the recipient's agent can run, under explicit approval.
- **The seam** — the boundary between them; the object leans toward whichever face is open and can be opened to full screen.

Renders climb a **fidelity ladder**: **L0** canonical (server-rendered from the artifact, zero authored HTML) → **L1** themed preset → **L2** pattern-compliant custom HTML → **L3** free departure (gated). Every card, thumbnail, and preview elsewhere is a projection of this same canonical render.

---

## 5 · The data model (live today)

The substrate the surfaces draw on already exists server-side:

- **profile** — `@handle`, display, bio, links, featured.
- **emissary** — immutable versioned rows (`id` = head), `topic`, `summary`, `kind`, `category`, `artifact` (the JSON-LD source of truth), `render_html`, author. Editing means a new version; the slug head moves.
- **slug** — `@handle/slug → head` (the friendly, mutable pointer); `/e/{uuid}` is the immutable version.
- **star** — `pin` (the version you evaluated; supply-chain safe; default) or `follow` (track latest; opt-in). A star is both a trust signal **and** a runtime binding.
- **category** — a curated set (`research · onboarding · writing · engineering · ops`); **tags** are free and promote to categories over time.
- **quota** — 10 publishes/day, 50 active hosted; founders exempt.

---

## 6 · The four flows

1. **Publish** — `emissary new` in the terminal composes the artifact conversationally → it publishes under `@handle/slug` → it appears on the profile and in the directory.
2. **Discover → star → recall** — browse the directory → open a render → **★** → you're taught the recall verb → you run it by name in your own terminal. This is the loop that makes it a network rather than a gallery.
3. **The connect flow** — land on an emissary → install → sign up / authenticate → **connect your agent** → first run. *(The frontier — §8.)*
4. **Magic → CLI handoff** — from a render, a **calm "run it" affordance** carries a wowed viewer into the runtime. Hard rule: it reads as an app action, never an imperative prompt — nothing that could be misread as an injection.

---

## 7 · The design language

The platform renders in the **Egregore Design Convention** ("Meridian") — Fraunces, Hanken Grotesk, IBM Plex Mono, on a role-token palette (paper / ink / line / three accent tiers) with light/dark theme pairs. Meridian today covers *artifact* surfaces; the launch builds its **app-chrome layer** — nav, cards, grids, the star control, the consent ring — for the first time, on the same tokens, so the frame feels continuous with the renders it holds. The quality regime is deliberate: **commodity for the chrome, the whole taste budget for the artifacts.**

---

## 8 · The frontier — agent ↔ platform identity

Everything above resolves to one underspecified mechanism, and it sits on the critical path of both the front door and the conversion: **how does a person's terminal agent bind to their platform identity, seamlessly?**

It is the hinge of the whole loop. The landing emissary promises *install + sign-up + connect your agent* in one motion. Recall (`recall @handle/slug`) needs the agent to act *as you* to read your stars. Publishing needs the same identity. And Egregore is a **meta-harness** — the binding must hold across Claude Code, Codex, and whatever comes next, with a sovereign path that doesn't depend on a single host.

The open questions:

- **The binding primitive** — API key, device-flow login, magic link, or public-key/DID?
- **The moment** — at install, at first publish, or at first recall?
- **The token model** — long-lived vs short-lived + refresh; revocation.
- **One identity across harnesses**, or per-harness?
- **The sovereign path** — must launch support self-hosted identity, or is hosted-first acceptable?
- **The literal UX** — what does "connect your agent" actually feel like, end to end?

*This is the subject of the next harvest — directed to the person who built the identity spine.*

---

## Appendix — settled vs open

**Settled (this round):** one directory surface · landing-is-an-emissary · render thumbnails (no search) · star→recall taught in v1 · profile = published + opt-in runs + follow, no donations · calm run affordance · T2 auto-audit + inner-ring self-gate · onboarding consent (partner ring) · per-account consent + override · CLI-only settings · build the Meridian app-chrome · house-gallery seeding.

**Open:** the agent↔platform connect mechanism (§8) · canonical handle · feed default ordering · category taxonomy reconciliation · trust signal beyond ★ · thumbnail generation.

**Out of scope:** monetization mechanics · the owned model · the async closed-loop.
