# egregore-site

This is the **canonical repo** for [egregore.xyz](https://egregore.xyz).

- **Repo:** `Curve-Labs/egregore-site`
- **Deploys to:** egregore.xyz via Netlify (auto-deploys from `main`)
- **Working branch:** `newest-version` (merge to `main` to deploy)
- **Framework:** Vite + React

## Key routes

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `App.jsx` | Marketing site + waitlist form |
| `/setup` | `SetupFlow.jsx` | Admin: create new Egregore instance |
| `/join` | `SetupFlow.jsx` | Join an existing org via invite link |
| `/callback` | `SetupFlow.jsx` | GitHub OAuth callback |
| `/research` | `ResearchPage.jsx` | Research articles |
| `/docs` | `DocsPage.jsx` | Documentation |

## Do NOT confuse with

There are stale copies of site code inside `curve-labs-core`:
- `curve-labs-core/egregore-site/` — old dashboard app, NOT deployed
- `curve-labs-core/site/` and `curve-labs-core/site 2/` — old versions, NOT deployed

**This repo (`Curve-Labs/egregore-site`) is the only one that deploys to egregore.xyz.**
