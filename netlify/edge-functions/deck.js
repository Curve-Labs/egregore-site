// Serve the canonical raise-deck artifact at egregore.xyz/deck while keeping
// the short URL in the browser and in social previews.

const SOURCE =
  "https://egregore-production-55f2.up.railway.app/api/artifacts/curvelabs/egregore-raise-deck";

const OG_TITLE = "Egregore — Raise Deck";
const OG_DESCRIPTION = "Egregore — seed raise deck";

const OG_TAGS = [
  `<meta property="og:type" content="article" />`,
  `<meta property="og:site_name" content="Egregore" />`,
  `<meta property="og:title" content="${OG_TITLE}" />`,
  `<meta property="og:description" content="${OG_DESCRIPTION}" />`,
  `<meta property="og:url" content="https://egregore.xyz/deck" />`,
  `<meta name="twitter:card" content="summary" />`,
  `<meta name="twitter:title" content="${OG_TITLE}" />`,
  `<meta name="twitter:description" content="${OG_DESCRIPTION}" />`,
].join("\n");

const INJECTED_OG_BLOCK =
  /<meta property="og:type"[\s\S]*?twitter:description" content="[^"]*" \/>\n?/g;

export default async () => {
  try {
    const response = await fetch(SOURCE);
    if (!response.ok) throw new Error(`Artifact returned ${response.status}`);

    let html = (await response.text()).replace(INJECTED_OG_BLOCK, "");
    const viewport = html.indexOf(`<meta name="viewport"`);

    if (viewport >= 0) {
      const end = html.indexOf(">", viewport) + 1;
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
    return Response.redirect(
      "https://egregore.xyz/view/curvelabs/egregore-raise-deck",
      307,
    );
  }
};
