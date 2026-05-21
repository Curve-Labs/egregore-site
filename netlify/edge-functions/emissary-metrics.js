// emissary-metrics — proxy for the emissary telemetry endpoint.
//
// The site is a static export (next.config `output: 'export'`), so there
// is no server runtime to hold a secret. This edge function does it: the
// browser fetches /api/emissary-metrics with no credentials; this adds
// the X-Emissary-Metrics-Key header from the EMISSARY_METRICS_KEY site
// env var and forwards to the Railway metrics API. The key never reaches
// the browser.

const METRICS_URL =
  "https://egregore-production-55f2.up.railway.app/api/v1/emissary/metrics";

export default async () => {
  const key = Netlify.env.get("EMISSARY_METRICS_KEY");
  if (!key) {
    return Response.json(
      { detail: "EMISSARY_METRICS_KEY is not configured on the site." },
      { status: 503 },
    );
  }

  let upstream;
  try {
    upstream = await fetch(METRICS_URL, {
      headers: { "X-Emissary-Metrics-Key": key },
    });
  } catch {
    return Response.json(
      { detail: "Could not reach the metrics endpoint." },
      { status: 502 },
    );
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};

export const config = {
  path: "/api/emissary-metrics",
};
