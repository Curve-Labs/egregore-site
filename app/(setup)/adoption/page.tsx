// /adoption — the public adoption board.
//
// The site is a static export (next.config `output: 'export'`), so there is
// no server runtime. This page ships as a static shell; the client component
// fetches from /api/adoption-metrics — a Netlify edge function that injects
// the secret X-Adoption-Metrics-Key header. The key never reaches the browser.
//
// GATING — read before removing.
//
// This page is wrapped in PasswordGate on purpose, even though it is meant
// to become public. The numbers it shows are honest rather than flattering
// (real external installs and monthly-active orgs, not npm download badges),
// and whether to put them in front of the world is a positioning call that
// belongs to a human, not to whoever merges this branch.
//
// To publish: delete the PasswordGate wrapper and the import. Nothing else
// changes — the data path is already public-safe (no org slugs, no creator
// handles, no user handles; see get_public_adoption in
// api/services/adoption_metrics.py).

import AdoptionMetrics from "@/components/adoption/AdoptionMetrics";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "Adoption — Egregore",
  description:
    "Organizations running Egregore, and what they actually do in it. Counted from the registry and from sessions.",
};

export default function AdoptionPage() {
  return (
    <PasswordGate>
      <AdoptionMetrics />
    </PasswordGate>
  );
}
