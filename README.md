# egregore-site

The web frontend for [Egregore](https://egregore.xyz) — setup, invite, and onboarding flows.

## Stack

- React 19 + Vite
- Zero external UI dependencies (inline styling)
- Single-page app with client-side routing

## Setup flows

- **Founder**: GitHub OAuth → org picker → repo picker → setup → Telegram → install command
- **Joiner**: invite link → GitHub OAuth → accept → Telegram → install command
- **Interactive**: `npx create-egregore` (terminal fallback, no website needed)

## Development

```bash
npm install
npm run dev
```

Set `VITE_API_URL` to point at a local or staging API:

```bash
VITE_API_URL=http://localhost:8000 npm run dev
```

## Deploy

Deployed to production via Vercel (or any static host). Build:

```bash
npm run build
```

Output is in `dist/`.
