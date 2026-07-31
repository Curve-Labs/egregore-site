// platform-namespace — proxy the emissary platform namespace to Railway.
//
// Spec §2.3 (platform architecture, 2026-06-11): @{handle} → profile,
// @{handle}/{slug} → the slug's head version, and /raw serves the
// canonical JSON at both address forms. Handle-prefixed paths like
// /@cem can't be expressed as netlify.toml redirect placeholders
// (":handle" must own a whole segment), so this edge function does the
// proxying for the /@* path space instead.
//
// UUID addresses (/emissary/e/{id}) keep their existing redirect rules
// and never change meaning.

const ORIGIN = "https://egregore-production-55f2.up.railway.app";

// @{handle} | @{handle}/{slug} | @{handle}/{slug}/raw — grammar
// [a-z0-9-]{1,64} per spec §2.3. Anything else falls through to the
// next handler (SPA catch-all).
const ADDRESS_RE = /^\/@[a-z0-9-]{1,64}(\/[a-z0-9-]{1,64}(\/raw)?)?$/;

export default async (request, context) => {
  const url = new URL(request.url);
  if (!ADDRESS_RE.test(url.pathname)) {
    return context.next();
  }

  const headers = new Headers({
    accept: request.headers.get("accept") || "*/*",
  });
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  if (authorization) headers.set("authorization", authorization);
  if (cookie) headers.set("cookie", cookie);

  let upstream;
  try {
    upstream = await fetch(ORIGIN + url.pathname + url.search, {
      // Do not create an empty Authorization header. The API correctly treats
      // a present but empty credential as a failed login. Real bearer tokens
      // and browser session cookies still pass through.
      headers,
    });
  } catch {
    return new Response("The emissary platform is unreachable.", {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") || "text/html; charset=utf-8",
      "cache-control": upstream.headers.get("cache-control") || "no-store",
    },
  });
};
