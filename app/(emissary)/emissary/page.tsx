import type { Metadata } from "next";
import EmissaryLanding from "@/components/emissary/EmissaryLanding";

// Ungated front door — the referral target for decks and outreach.
// The directory itself stays gated at /emissary/browse.
export const metadata: Metadata = {
  title: "Emissaries — portable, runnable tasks for any AI",
  description:
    "An emissary is a portable, runnable task — one you hand to someone else's AI. Paste the link into any harness and the agent runs it.",
  openGraph: {
    title: "Emissaries — portable, runnable tasks for any AI",
    description:
      "An emissary is a portable, runnable task — one you hand to someone else's AI. Paste the link into any harness and the agent runs it.",
    url: "https://egregore.xyz/emissary",
    siteName: "Egregore",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Emissaries — portable, runnable tasks for any AI",
    description:
      "An emissary is a portable, runnable task — one you hand to someone else's AI.",
    images: ["/og-image.png"],
  },
};

export default function EmissaryLandingPage() {
  return <EmissaryLanding />;
}
