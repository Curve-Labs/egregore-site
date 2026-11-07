# Private research desk

`/drafts/cem` is the public login shell. `/api/research-drafts/*` is a Netlify Function on Egregore’s existing site. Draft prose, password verifiers, comments and decisions live only in its private Netlify Blobs store; they are absent from Git and the public build.

Production uses the site-wide `cem-research-drafts-production` store, which survives deployments. Preview deployments use separate stores keyed by deploy ID. The one-time initialization endpoint requires a random capability whose hash is in the function; it cannot replace an initialized desk. Its raw capability and migration snapshot are held in the original task’s private run directory. Do not initialize previews with personal material.

Password checks use PBKDF2-SHA256 (100,000 rounds), opaque 14-day sessions, per-IP login limits, same-origin JSON writes and Secure/HttpOnly/SameSite cookies. Logout deletes the session. Changing the stored verifier invalidates all sessions. Strong reads and ETag-conditional updates prevent silent overwrites. Accept is an editorial status only and never publishes.

Run `node --test netlify/lib/research-drafts.test.mjs` for authorization, persistence, stale writes, idempotent comments, rate limiting and storage failure checks. Run `npm run build` for the complete site build. A deployment rollback must retain the production blob store. The previous hosted desk remains private until migration verification is complete.
