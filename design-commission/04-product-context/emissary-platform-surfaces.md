# Emissary Platform — Requirements, Architecture & Surfaces

> For Cem. The product view: what the platform *is*, the object model under it,
> and every surface needed to make it a functioning product — what exists today,
> what's partial, and what's missing. Companion to the technical
> `emissary-architecture.md` (how an emissary runs) and `emissary-api-contract.md`
> (the API). This one is about **surfaces and product shape**, not plumbing.

---

## 1. What the platform is

**An emissary is a portable, runnable task you hand to another person — readable as a page, executable by their agent.** The platform is the place those emissaries live at a permanent address, get discovered, accumulate proof they work, and trace back to the people who made them.

One sentence: **GitHub for executable handoffs** — named addresses (`@cem/decision-surface`), versioned, starred, with a public author identity — except the unit isn't code, it's a task an agent can pick up and run.

The unit of value is the **emissary**. The verbs around it are the product:

- **Compose** — author an emissary (agent-conducted, not a form).
- **Publish** — give it a permanent address on the shelf.
- **Carry** — a receiver's agent ingests and runs it (the real adoption signal).
- **Star** — a human marks one worth keeping.
- **Trace** — every emissary points back to an author and a version lineage.

The strategic gap this doc exists to name: **today the platform is agent-first / terminal-first.** Identity is minted through the API from the CLI or an MCP client; the website is mostly *read* surfaces (a shelf, a profile, a rendered emissary). To be a "functioning product" in the landing → signup → feed → discover → profile → settings sense, it needs a **web account layer** and **engagement surfaces** that don't exist yet. Sections 4–5 map exactly where that line falls.

---

## 2. Object model (the nouns the surfaces render)

Grounded in the live backend (`api/services/emissary.py`, `platform.py`):

| Object | Key fields | Notes |
|---|---|---|
| **User** | `id`, `name`, `email`, `email_verified`, `harness` | Minted by `POST /register`. Verification by email magic link. |
| **Profile** | `handle`, `display`, `bio`, `links[]`, `featured[]`, `verified`, `created_at`, `shelf[]` | Public face at `/@handle`. `bio/links/featured` exist in the schema but are **unset for everyone** and have no editing UI. |
| **Emissary** | `id` (head_id), `topic`, `summary`, `kind`, `category`, `version`, `parent_version`, `artifact` (handoff-v1 JSON-LD), `created_at`, expiry | `kind` ∈ {dialogue, build, documentation} — the live organizing axis. |
| **Address** | `@handle/slug` → `head_id` | Permanent, human-memorable. Vanity slugs also supported. |
| **Star** | (handle, slug) → count | Human "worth keeping." **Currently 0 across the board** — no web sign-in to star with. |
| **Receipt / carry** | per-emissary count | Incremented when an agent fetches the raw payload to run it (`/emissary/e/{id}/raw`). The honest adoption metric. |
| **Category / Tag** | curated categories; freeform tags | Categories are **empty** today; `kind` is doing the categorization work. |
| **Quota** | publish rate, active-hosted cap, `publish_exempt` | Launch partners are exempt. |
| **MCP config** | `server_url`, `header_template` | Returned at registration; how an agent client connects. |

---

## 3. Two audiences, two reading modes

Every surface serves one or both. Naming this keeps design honest:

- **Humans** browse, star, read the rendered page, decide whether to run something, and (eventually) manage an account.
- **Agents** fetch the raw artifact, ingest it, and run it. They are first-class users — "carries" are agent events, not page views.

A functioning product needs surfaces that are legible to *both* without compromising either. The shelf is the current crossover surface: a human stars on the web; their agent enacts in the terminal.

---

## 4. The surface map

Status legend: **● built** · **◐ partial** · **○ missing**

### 4.1 Landing — `/`  ● built (marketing)
The pitch. Today this is the marketing site. **Product gap:** it sells Egregore-the-framework, not emissary-the-platform. A platform landing needs a clear "publish an executable handoff / browse the shelf" call to action and a path into signup.

### 4.2 Auth — Signup / Verify / Sign-in  ◐ partial (API only, no web)
- **Signup** `○` — `POST /register` exists (name, email, harness → token + MCP config). There is **no web signup page**; identity is minted from the CLI/MCP today.
- **Email verification** `◐` — magic-link `GET /verify?token=` works; no polished web landing for the verified state.
- **Sign-in / session** `○` — **there is no web login or session.** This is the single biggest missing piece. Without it there's no "logged-in" web experience: no starring, no settings, no "my emissaries." Everything social on the web is read-only until this exists.

> **Architecture decision needed (the load-bearing one):** how does a human get a *web session*? Options: email magic-link sign-in (reuse the verify mechanism), or treat the registration token as a web credential. Pick one before building feed/settings/starring — they all depend on it.

### 4.3 Home / Feed  ○ missing
The logged-in default surface: what's new from people and topics you follow — recently published, recently carried, new versions of things you've starred. **Depends on:** web session (4.2) + a follow/subscription model (doesn't exist yet). This is the surface that turns a directory into a product people return to.

### 4.4 Discover — the Shelf  ● built (just redesigned)
`/emissary/browse`. The public catalog. **Now leads with real signals:** filter by `kind`, sort by *Most carried / Newest / Most starred*, a contributors strip, carry counts labeled "N carried." **Next:** search, tag/category facets once they're populated, "trending by carries this week," and per-author shelves linked from cards.

### 4.5 Emissary detail / view  ● built
`/emissary/e/{id}` — server-rendered HTML of the artifact (the readable face) + `/raw` (the agent payload). **Product gaps:** a web "Star" and "Run / how to run" affordance, version-lineage navigation (`parent_version` exists in data, no UI), and a clear author attribution block linking to the profile.

### 4.6 Compose / Publish  ◐ partial (agent-conducted)
Authoring is **agent-conducted by design** — `emissary new` launches a harness and the agent composes the artifact with the author; it is never a hand-typed form. Publishing assigns the address. **Product gap:** the web has no "draft → preview → publish" management view, no "my drafts," no edit-and-version flow. Decide how much of compose belongs on the web vs. staying in the harness (recommendation: keep *composition* in the harness, bring *management* — list, version, unpublish, edit metadata — to the web).

### 4.7 Profile (public)  ◐ partial
`/@handle` — display name, verified tick, and the author's shelf render today. **Unbuilt despite existing in the schema:** `bio`, `links[]`, `featured[]`. A real profile is the social anchor: avatar, bio, links, a featured/pinned emissary, total carries, follower count (needs a follow model). This is high-leverage and mostly **wiring up fields that already exist**.

### 4.8 Settings / Account  ○ missing
Edit profile (display, bio, links, featured), manage email + verification, see/rotate your auth token & MCP config, set your handle, manage published emissaries and quota, delete account. **Depends on:** web session (4.2). None of this has a UI; the data and tokens exist.

### 4.9 Connect / MCP  ◐ partial
The agent-onboarding surface: "connect your agent" — the MCP token-URL connector flow (register → token-URL → `/mcp/u/<token>`). Exists as a model; needs a clean web surface that issues and explains the connection. This is how the *agent* half of the audience onboards.

### 4.10 Notifications  ○ missing
"Your emissary was carried 5 times," "someone starred X," "@renc published a new version." Drives return visits. **Depends on:** web session + a follow model. Telegram is the current notification transport for the team; a product needs in-app + email.

### 4.11 Admin / Moderation  ◐ partial
Quota enforcement and `publish_exempt` exist server-side; there's a metrics endpoint. A public platform eventually needs report/abuse handling and a moderation view. Low priority pre-scale, but name it.

---

## 5. Build status at a glance

| Surface | Status | Blocks on |
|---|---|---|
| Landing | ● (marketing) | product-framing rewrite |
| Signup (web) | ○ | — |
| Verify | ◐ | polish |
| **Web session / sign-in** | ○ | **nothing — this unblocks everything below** |
| Home / Feed | ○ | session + follow model |
| Discover / Shelf | ● | search, facets |
| Emissary view | ● | star + version UI |
| Compose | ◐ | (stays in harness) |
| Publish management | ○ | session |
| Profile (public) | ◐ | wire bio/links/featured |
| Settings | ○ | session |
| Connect / MCP | ◐ | dedicated surface |
| Notifications | ○ | session + follow model |
| Admin / moderation | ◐ | scale |

---

## 6. The critical path (suggested sequence)

Everything social on the web hangs off one decision and one build:

1. **Decide the web-session model** (§4.2) — magic-link sign-in vs. token-as-credential. *Nothing else in the logged-in product can be built until this is chosen.*
2. **Web signup + sign-in** — turn the existing `/register` + `/verify` API into real web surfaces with a session.
3. **Profile + Settings** — wire up `bio/links/featured` (already in the schema) and let people edit them. Cheapest high-visibility win once sessions exist.
4. **Web starring on Shelf + Emissary view** — makes the star metric real (it's all zeros today because there's no signed-in human to star).
5. **Follow model → Feed → Notifications** — the retention loop. Largest net-new build; do last.

Discover (the shelf) and Emissary view are already live and just got the redesign — they're the proof surface to point new users at while the account layer gets built.

---

## 7. Open product questions for Cem

- **Handle = identity.** Is `@handle` the durable identity, or a vanity layer over email? Affects signup and settings.
- **Stars vs. carries as the headline metric.** Carries are honest (agents running things); stars need humans + sessions. Which leads the product narrative?
- **How much of compose comes to the web?** Recommendation: composition stays agent-conducted; *management* (list/version/edit-metadata/unpublish) comes to the web.
- **Following: people, topics (kinds/tags), or both?** Determines the feed's shape.
- **Public vs. invite-only.** The shelf is password-gated today (`emissary-cor`). The signup surface's design depends on when that gate comes down.

---

*Surfaces that exist today are read-mostly and agent-first. The product Cem is describing — landing, signup, feed, discover, profile, settings — is largely the **web account + engagement layer** that sits on top of an already-working publishing/running substrate. The substrate is real; the account layer is the build.*
