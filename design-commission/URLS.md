# Live surfaces + access

## Production (egregore.xyz)

- `/emissary` — currently the gated hub (pre-redesign) · gate: `egregore-cor`
- `/emissary/browse` — directory · gate: `emissary-cor`
- `/emissary/account` — account console (email magic-link sign-in; append `?demo=1` for a canned signed-in state, no auth needed)
- `/emissary/metrics` — telemetry stream · gate: `egregore-cor`
- Example emissary render: any `egregore.xyz/emissary/e/{id}` link (see the handoff artifact link in 03-prior-design, or create one)

## Preview (branch deploy — the work-in-progress branch)

- `https://preview--egregore-core.netlify.app/emissary` — the new ungated landing (the one the screenshot shows) + Meridian re-skinned browse/account behind it

## Notes

- Gates are soft demo passwords, not security — but treat them as non-public.
- The marketing homepage (`egregore.xyz`) currently has zero links to any
  emissary surface — the relationship between the main site and the
  emissaries family is an open design question inside this commission.
