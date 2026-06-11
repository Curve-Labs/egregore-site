// /emissary/browse — the categorized shelf of published emissaries.
//
// A static site page (this repo is a Next static export); the shelf data
// is fetched client-side from the public platform API on Railway. This
// replaced the netlify.toml proxy to the Railway-rendered browse page —
// same data, the site's own design.

import EmissaryBrowse from "@/components/emissary/EmissaryBrowse";
import PasswordGate from "@/components/emissary/PasswordGate";

export const metadata = {
  title: "The shelf — Browse emissaries",
  description:
    "Every published emissary, at a named address. Star on the web, enact in the terminal.",
};

export default function EmissaryBrowsePage() {
  return (
    <PasswordGate password="emissary-cor" storageKey="emissary-browse-gate">
      <EmissaryBrowse />
    </PasswordGate>
  );
}
