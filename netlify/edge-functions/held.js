// held — the answer for hosted surfaces paused during security recovery.
//
// Since the 22 Oct 2026 security incident the old hosted API no longer
// serves requests, and egregore.xyz must not proxy to a host it no longer
// controls. Every path that used to reach that API is declared for this
// function in netlify.toml. It answers 503 itself, never fetches and
// never caches: people get a short page, API clients and agents get JSON.
// The artifact-recovery routes are excluded in netlify.toml so they keep
// reaching their redirects.

const HELD_DETAIL = "Temporarily unavailable during security recovery.";

// The artifact-recovery routes (redirects to the independent API) are
// never held, even if a declaration in netlify.toml matches them by
// mistake: they continue to their redirects.
const RECOVERY_PATH =
  /^\/(view\/curvelabs\/|api\/auth\/recovery\/|recovery\/)|^\/callback\/?$/;

// API, OAuth and agent payload paths answer JSON; everything else is a
// page for a person.
const MACHINE_PATH =
  /^\/(api|oauth|\.well-known)\/|^\/emissary\/(manifest\.json|plugin\.zip)$|^\/emissary\/raw\/|\/(reply|raw)\/?$/;

const BASE_HEADERS = {
  "cache-control": "no-store",
  "netlify-cdn-cache-control": "no-store",
  "x-robots-tag": "noindex, nofollow",
};

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Temporarily unavailable · Egregore</title>
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500&display=swap" rel="stylesheet">
<style>
@font-face { font-family: 'LT Superior Serif'; src: url('/fonts/LTSuperiorSerif-Regular.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
:root {
  --cream: #F5F2ED;
  --black: #16100B;
  --terracotta: #D4875A;
  --font-serif: 'LT Superior Serif', Georgia, 'Times New Roman', serif;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', monospace;
}
*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { background: var(--cream); }
body { min-height: 100vh; display: flex; flex-direction: column; background: var(--cream); color: var(--black); font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
.grid-overlay { position: fixed; top: 0; left: 50%; transform: translateX(-50%); width: 752px; height: 100%; pointer-events: none; border-left: 1px dotted rgba(59, 45, 33, 0.2); border-right: 1px dotted rgba(59, 45, 33, 0.2); }
header { display: flex; justify-content: center; padding: 24px 16px 16px; }
header img { height: 33px; width: auto; display: block; }
.grid-line { border-top: 1px dotted rgba(59, 45, 33, 0.2); }
main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 72px 16px 96px; }
h1 { font-family: var(--font-serif); font-weight: 400; font-size: clamp(34px, 8vw, 48px); line-height: 1.05; letter-spacing: -0.03em; margin-bottom: 20px; }
p { max-width: 440px; font-size: 15px; line-height: 1.6; letter-spacing: -0.01em; opacity: 0.7; }
p + p { margin-top: 8px; }
a.home { margin-top: 32px; font-family: var(--font-mono); font-size: 13px; color: var(--black); text-decoration: none; border-bottom: 1px solid var(--terracotta); padding-bottom: 2px; }
a.home:hover { color: var(--terracotta); }
@media (max-width: 800px) { .grid-overlay { display: none; } }
</style>
</head>
<body>
<div class="grid-overlay" aria-hidden="true"></div>
<header><a href="/" aria-label="Egregore home"><img src="/logo_egregore.svg" alt="egregore" height="33"></a></header>
<div class="grid-line" aria-hidden="true"></div>
<main>
<h1>Temporarily unavailable</h1>
<p>Some Egregore services are paused during security recovery. This link has not been deleted.</p>
<p>Local Egregore memory and search keep working.</p>
<a class="home" href="/">Back to egregore.xyz</a>
</main>
</body>
</html>
`;

export default (request, context) => {
  const { pathname } = new URL(request.url);
  if (RECOVERY_PATH.test(pathname)) {
    return context.next();
  }
  if (MACHINE_PATH.test(pathname)) {
    return Response.json(
      { detail: HELD_DETAIL },
      { status: 503, headers: BASE_HEADERS },
    );
  }
  return new Response(PAGE, {
    status: 503,
    headers: { ...BASE_HEADERS, "content-type": "text/html; charset=utf-8" },
  });
};
