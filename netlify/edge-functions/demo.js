// demo — serve the demo-deck artifact at egregore.xyz/demo.
//
// The site is a static export, so this can't be a Next route handler;
// like the /@* platform namespace, an edge function does the serving.
// The artifact API injects its own OG block at serve time — we strip it
// and set the card copy here, so what Telegram/WhatsApp show for
// egregore.xyz/demo is owned by this file, not by the artifact row.
//
// Source order: curvelabs is the canonical org slug; the egregore copy
// is a legacy row from the 2026-07-20 slug rename (since reversed) that
// still serves already-circulated links. Preferring curvelabs means a
// fresh publish of the deck takes over /demo automatically.

const SOURCES = [
  "https://egregore-production-55f2.up.railway.app/api/artifacts/curvelabs/egregore-demo-deck",
  "https://egregore-production-55f2.up.railway.app/api/artifacts/egregore/egregore-demo-deck",
];

const OG_TITLE = "Egregore — organizational infrastructure for human-AI teams";
const OG_DESCRIPTION =
  "One shared memory for your team and its agents — everyone sees what was done, why it was done, and where to continue.";

const OG_TAGS = [
  `<meta property="og:type" content="article" />`,
  `<meta property="og:site_name" content="Egregore" />`,
  `<meta property="og:title" content="${OG_TITLE}" />`,
  `<meta property="og:description" content="${OG_DESCRIPTION}" />`,
  `<meta property="og:url" content="https://egregore.xyz/demo" />`,
  `<meta name="twitter:card" content="summary" />`,
  `<meta name="twitter:title" content="${OG_TITLE}" />`,
  `<meta name="twitter:description" content="${OG_DESCRIPTION}" />`,
].join("\n");

const INJECTED_OG_BLOCK =
  /<meta property="og:type"[\s\S]*?twitter:description" content="[^"]*" \/>\n?/;

export default async () => {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src);
      if (!res.ok) continue;
      let html = (await res.text()).replace(INJECTED_OG_BLOCK, "");

      const anchor = html.indexOf(`<meta name="viewport"`);
      if (anchor >= 0) {
        const end = html.indexOf(">", anchor) + 1;
        html = html.slice(0, end) + "\n" + OG_TAGS + html.slice(end);
      } else {
        html = html.replace("<head>", "<head>\n" + OG_TAGS);
      }

      return new Response(html, {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=300",
        },
      });
    } catch {
      // fall through to the next source
    }
  }
  // Both sources unreachable — send the visitor to the artifact directly.
  return Response.redirect(
    "https://egregore.xyz/view/egregore/egregore-demo-deck",
    307,
  );
};
