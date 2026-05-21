// /emissary/metrics — emissary telemetry dashboard.
//
// Server component. Fetches GET {API_BASE}/api/v1/emissary/metrics with the
// X-Emissary-Metrics-Key header, server-side only. The key comes from the
// EMISSARY_METRICS_KEY env var — NOT a NEXT_PUBLIC_ var, so it never reaches
// the browser bundle. The metrics endpoint is not deployed yet; any fetch
// failure or non-200 falls through to the EmissaryMetrics "unavailable"
// state instead of crashing the route.

import EmissaryMetrics from "@/components/emissary/EmissaryMetrics";
import type { EmissaryMetricsData } from "@/components/emissary/EmissaryMetrics";

export const metadata = {
  title: "Emissary telemetry — Emissary Courier",
  description:
    "A live reading of the Emissary Courier: registrations, verifications, emissaries sent, and where they landed.",
};

// always fresh — never serve a cached dashboard
export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://egregore-production-55f2.up.railway.app";

// Flat result shape: `data` present means success; `detail` present means
// the unavailable state. A boolean-literal discriminated union would not
// narrow here — the project compiles with `strict: false`.
type FetchResult = {
  data?: EmissaryMetricsData;
  detail?: string;
};

async function loadMetrics(): Promise<FetchResult> {
  const key = process.env.EMISSARY_METRICS_KEY;
  if (!key) {
    return { detail: "EMISSARY_METRICS_KEY is not configured." };
  }

  let resp: Response;
  try {
    resp = await fetch(`${API_BASE}/api/v1/emissary/metrics`, {
      method: "GET",
      headers: { "X-Emissary-Metrics-Key": key },
      cache: "no-store",
    });
  } catch {
    return { detail: "Could not reach the metrics endpoint." };
  }

  if (!resp.ok) {
    return { detail: `Metrics endpoint returned HTTP ${resp.status}.` };
  }

  try {
    const data = (await resp.json()) as EmissaryMetricsData;
    return { data };
  } catch {
    return { detail: "Metrics endpoint returned a malformed response." };
  }
}

export default async function EmissaryMetricsPage() {
  const { data, detail } = await loadMetrics();
  return <EmissaryMetrics data={data} detail={detail} />;
}
