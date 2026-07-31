// adoption-metrics — proxy for the public adoption metrics endpoint.
//
// Same shape as emissary-metrics.js, and for the same reason: the site is
// a static export (next.config `output: 'export'`), so there is no server
// runtime to hold a secret. The browser fetches /api/adoption-metrics with
// no credentials; this function adds the X-Adoption-Metrics-Key header
// from the ADOPTION_METRICS_KEY site env var and forwards to the Railway
// API. The key never reaches the browser.
//
// Query params (window_days, series_days) are passed through so the page
// can offer range switching without a second function.

const METRICS_URL =
  "https://egregore-production-55f2.up.railway.app/api/v1/adoption/public";

export default async (request) => {
  const key = Netlify.env.get("ADOPTION_METRICS_KEY");
  if (!key) {
    return Response.json(
      { detail: "ADOPTION_METRICS_KEY is not configured on the site." },
      { status: 503 },
    );
  }

  // Forward only the params we understand — never proxy arbitrary query
  // strings to an authenticated upstream.
  const incoming = new URL(request.url).searchParams;
  const target = new URL(METRICS_URL);
  for (const param of ["window_days", "series_days"]) {
    const value = incoming.get(param);
    if (value && /^\d{1,4}$/.test(value)) target.searchParams.set(param, value);
  }

  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: { "X-Adoption-Metrics-Key": key },
    });
  } catch {
    return Response.json(
      { detail: "Could not reach the adoption metrics endpoint." },
      { status: 502 },
    );
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "application/json",
      // Short shared-cache window: the underlying rollups change at most
      // daily, but we don't want a stale board after a manual snapshot run.
      "cache-control": "public, max-age=0, s-maxage=300",
    },
  });
};

export const config = { path: "/api/adoption-metrics" };
