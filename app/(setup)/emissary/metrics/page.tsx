// /emissary/metrics — emissary telemetry dashboard.
//
// The site is a static export (next.config `output: 'export'`), so there
// is no server runtime. This page ships as a static shell; the client
// component fetches its data in the browser from /api/emissary-metrics —
// a Netlify edge function that injects the secret X-Emissary-Metrics-Key
// header. The key never reaches the browser.

import EmissaryMetrics from "@/components/emissary/EmissaryMetrics";

export const metadata = {
  title: "Emissary telemetry — Emissary Courier",
  description:
    "A live reading of the Emissary Courier: registrations, verifications, emissaries sent, and where they landed.",
};

export default function EmissaryMetricsPage() {
  return <EmissaryMetrics />;
}
